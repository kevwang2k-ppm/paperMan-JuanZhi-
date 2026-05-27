import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { batchApi, questionApi } from '@/api'
import type { Batch, BatchProgress, Question, UploadImage } from '@/types'

export const useBatchStore = defineStore('batch', () => {
  // State
  const batch = ref<Batch | null>(null)
  const progress = ref<BatchProgress | null>(null)
  const questions = ref<Question[]>([])
  const images = ref<UploadImage[]>([])
  const isProcessing = ref(false)
  const error = ref<string | null>(null)
  
  // 轮询定时器
  let progressInterval: number | null = null
  
  // 防止重复加载的标记
  let isLoadingMeta = false

  // Getters
  const batchId = computed(() => batch.value?.id || '')
  const totalPages = computed(() => batch.value?.total_pages || images.value.length || 0)
  const completedPages = computed(() => progress.value?.completed_pages || 0)
  const progressPercent = computed(() => {
    if (!progress.value || progress.value.total_pages === 0) return 0
    return Math.round((progress.value.completed_pages / progress.value.total_pages) * 100)
  })
  const selectedQuestions = computed(() => 
    questions.value.filter(q => q.is_error)
  )

  // Actions
  
  // 设置图片列表
  function setImages(newImages: UploadImage[]) {
    images.value = newImages.map((img, index) => ({
      ...img,
      pageNumber: index + 1
    }))
  }

  // 创建批次（同时上传所有图片）
  async function createBatch(examName: string, studentId: string, uploadImages: UploadImage[], mergeMode: boolean = false, imageEnhance: boolean = false) {
    try {
      error.value = null
      
      // 保存图片到 store
      images.value = uploadImages
      
      // 准备文件列表
      const files = images.value.map(img => img.file)
      
      // 检查文件是否存在
      if (files.length === 0) {
        throw new Error('没有选择图片')
      }
      
      console.log('创建批次:', { examName, studentId, mergeMode, imageEnhance, fileCount: files.length })
      
      // 更新状态为上传中
      images.value.forEach(img => img.status = 'uploading')
      
      // 创建批次并上传图片
      const response = await batchApi.createBatch(
        examName,
        studentId,
        files,
        mergeMode,
        imageEnhance,
        (progress) => {
          // 更新每张图片的进度（简单平均分配）
          images.value.forEach(img => {
            img.progress = Math.min(progress, 99)
          })
        }
      )
      
      // 标记所有图片上传成功
      images.value.forEach(img => {
        img.status = 'success'
        img.progress = 100
      })
      
      // 适配后端返回的数据结构
      // axios 经过 client.ts 拦截器后返回的是 response.data
      const responseData = (response as any)?.data || response as any
      
      if (!responseData || !responseData.batch_id) {
        console.error('Invalid response:', response)
        throw new Error('后端返回数据格式错误')
      }
      
      const batchData: Batch = {
        id: responseData.batch_id,
        exam_name: responseData.exam_name || examName,
        student_id: studentId,
        total_pages: responseData.total_pages || files.length,
        status: responseData.status || 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      batch.value = batchData
      return batchData
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建批次失败'
      // 标记失败
      images.value.forEach(img => {
        if (img.status === 'uploading') img.status = 'error'
      })
      throw err
    }
  }

  // 启动处理
  async function startProcessing() {
    if (!batch.value) throw new Error('批次未创建')
    
    try {
      await batchApi.startBatch(batch.value.id)
      isProcessing.value = true
      startPolling()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '启动处理失败'
      throw err
    }
  }

  // 处理所有页面（逐个调用）
  async function processAllPages() {
    if (!batch.value) return
    
    const total = batch.value.total_pages
    let lastQuestionCount = 0
    
    for (let page = 1; page <= total; page++) {
      try {
        // 调用单页处理 API（带3次重试）
        const response: any = await batchApi.processPage(batch.value.id, page)
        
        // 更新当前进度（本地乐观更新）
        if (progress.value) {
          progress.value.completed_pages = page
        }
        
        // ========== 关键：实时加载题目数据，使页面能够显示该页的题目数 ==========
        // 安全地获取题目数（处理不同响应格式）
        let currentCount = 0
        if (response) {
          // 尝试不同的响应格式
          const data = response.data || response
          currentCount = data?.question_count || 0
        }
        
        // 每页处理完成后都加载（简化逻辑，确保数据实时更新）
        // 注意：这里每页都加载，因为即使当前页没识别出题，之前的页可能有
        if (page % 1 === 0) {  // 所有整数页都加载
          // 延迟一小段时间确保后端文件写入完成
          await new Promise(resolve => setTimeout(resolve, 200))
          await loadQuestionsFromMeta()
          console.log(`第${page}页处理完成，该页题目: ${currentCount}，当前总数: ${questions.value.length}`)
        }
        
      } catch (err) {
        console.error(`第${page}页处理失败:`, err)
        // 继续处理下一页，不中断
      }
      
      // 小延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 全部处理完成，更新状态
    isProcessing.value = false
    if (progress.value) {
      progress.value.status = 'completed'
    }
    if (batch.value) {
      batch.value.status = 'completed'
    }
    
    // ========== 关键：最终确认加载，带重试机制确保数据不丢失 ==========
    console.log('所有页面处理完成，开始最终确认加载...')
    let retryCount = 0
    const maxRetries = 5
    
    while (retryCount < maxRetries) {
      // 延迟等待后端写入完成
      const delay = 300 + retryCount * 200  // 递增延迟：300ms, 500ms, 700ms...
      await new Promise(resolve => setTimeout(resolve, delay))
      
      await loadQuestionsFromMeta()
      
      // 检查是否成功加载到数据
      if (questions.value.length > 0) {
        console.log(`最终确认成功：加载到 ${questions.value.length} 题`)
        break
      }
      
      if (retryCount === maxRetries - 1) {
        console.warn(`最终确认失败：${maxRetries}次重试后仍未加载到数据`)
      } else {
        console.log(`数据为空，${delay}ms后重试 (${retryCount + 1}/${maxRetries})...`)
      }
      retryCount++
    }
  }

  // 开始轮询进度
  function startPolling(interval: number = 2000) {
    stopPolling()
    
    progressInterval = window.setInterval(async () => {
      if (!batch.value) return
      
      try {
        const response = await batchApi.getProgress(batch.value.id)
        // 后端直接返回数据，不是 {data: ...} 格式
        const data = (response as any).data || response
        progress.value = data
        
        // 处理完成
        if (data.status === 'completed') {
          stopPolling()
          isProcessing.value = false
          // 更新进度为100%
          if (progress.value) {
            progress.value.completed_pages = progress.value.total_pages
          }
          // 从 meta.json 加载题目（Web 版流程中 Question 表是空的）
          await loadQuestionsFromMeta()
        }
        
        // 处理失败
        if (data.status === 'failed') {
          stopPolling()
          isProcessing.value = false
          error.value = data.message || '处理失败'
        }
        
        // 更新 batch 状态
        if (batch.value) {
          batch.value.status = data.status
        }
      } catch (err) {
        console.error('轮询进度失败:', err)
      }
    }, interval)
  }

  // 停止轮询
  function stopPolling() {
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
  }

  // 加载题目列表（从Question表读取）
  async function loadQuestions() {
    if (!batch.value) return
    
    try {
      // 先更新 batch 信息（包括识别后的 exam_name）
      const response = await batchApi.getResults(batch.value.id)
      const data = (response as any).data || response
      
      if (data.exam_name && batch.value) {
        batch.value.exam_name = data.exam_name
        console.log('Updated batch exam_name:', batch.value.exam_name)
      }
      
      // 从Question表读取题目
      console.log('Loading questions from DB for batch:', batch.value.id)
      const qResponse = await questionApi.getQuestions(batch.value.id)
      const qData = (qResponse as any).data || qResponse
      
      if (Array.isArray(qData)) {
        questions.value = qData.map((q: any) => ({
          uuid: q.uuid,
          batch_id: batch.value!.id,
          page_number: q.page_number || 1,
          question_number: String(q.question_number || '1'),
          bbox_relative: q.bbox_relative || [0.4, 0.3, 0.5, 0.4],
          bbox_absolute: [0, 0, 100, 100],
          is_error: q.is_error || false,
          created_at: new Date().toISOString(),
          // 层级信息
          level_1: q.level_1 || '0',
          level_2: q.level_2 || '0',
          level_3: q.level_3 || '0',
          level_4: q.level_4 || '0'
        }))
        console.log('Loaded questions from DB:', questions.value.length, '题')
      } else {
        questions.value = []
      }
    } catch (err) {
      console.error('加载题目失败:', err)
    }
  }

  // 从 meta.json 加载题目（和 PC 端一致，读取整理后的层级数据）
  // force: 是否强制清空已有数据（默认false，保护机制）
  async function loadQuestionsFromMeta(force = false) {
    if (!batch.value) return
    
    // 防止竞态：如果正在加载且不是强制加载，跳过
    if (isLoadingMeta && !force) {
      console.log('loadQuestionsFromMeta: 已有加载在进行中，跳过')
      return
    }
    
    isLoadingMeta = true
    
    try {
      // 先更新 batch 信息
      const response = await batchApi.getResults(batch.value.id)
      const data = (response as any).data || response
      
      if (data.exam_name && batch.value) {
        batch.value.exam_name = data.exam_name
      }
      
      // 从 meta.json 读取题目（和 PC 端一致）
      console.log('Loading questions from meta.json for batch:', batch.value.id)
      const metaResponse = await batchApi.getMeta(batch.value.id)
      const metaData = (metaResponse as any).data || metaResponse
      
      if (Array.isArray(metaData) && metaData.length > 0) {
        questions.value = metaData.map((item: any) => {
          // 解析位置信息 [P{page}: y0,x0,y1,x1]
          let pageNum = 1
          let bbox: [number, number, number, number] = [0, 0, 0.1, 0.1]
          const positionStr = item['所在位置'] || ''
          if (positionStr && positionStr.startsWith('[P')) {
            try {
              const parts = positionStr.slice(1, -1).split(': ')
              if (parts.length === 2) {
                pageNum = parseInt(parts[0].slice(1), 10) || 1
                const coords = parts[1].split(',').map(x => parseFloat(x.trim()))
                if (coords.length === 4) {
                  bbox = [coords[0], coords[1], coords[2], coords[3]]
                }
              }
            } catch (e) {
              console.warn('解析位置失败:', positionStr)
            }
          }
          
          return {
            uuid: item.UUID || item.uuid || `meta-${Math.random()}`,
            batch_id: batch.value!.id,
            page_number: pageNum,
            question_number: String(item['二级目录'] || '1'),
            bbox_relative: bbox,
            bbox_absolute: [0, 0, 100, 100],
            is_error: item['对错标签'] === 'F',
            created_at: new Date().toISOString(),
            // 层级信息（从 meta.json 读取，已整理）
            level_1: String(item['一级目录'] || '0'),
            level_2: String(item['二级目录'] || '0'),
            level_3: String(item['三级目录'] || '0'),
            level_4: String(item['四级目录'] || '0'),
            // 位置信息（用于扩展框）
            position: item['所在位置'] || '',
            position_1: (item['所在位置1'] && item['所在位置1'] !== '0') ? item['所在位置1'] : ''
          }
        })
        console.log('Loaded questions from meta.json:', questions.value.length, '题')
        console.log('Sample level_1:', questions.value.slice(0, 3).map(q => q.level_1))
        
        // 从 Question 表获取位置信息并合并
        // 注意：batch 模式下矩形框位置保存到了 Question 表，但题目数据从 meta.json 加载
        // 需要合并才能正确显示调整后的位置和扩展框
        try {
          const qResponse = await questionApi.getQuestions(batch.value.id)
          const qData = (qResponse as any).data || qResponse || []
          if (Array.isArray(qData) && qData.length > 0) {
            const questionMap = new Map<string, { 
              position: string, 
              position_1: string, 
              bbox: number[],
              paper_id: string 
            }>()
            qData.forEach((q: any) => {
              const hasPosition = q.position && q.position.trim() !== '' && q.position !== '0'
              const hasPosition1 = q.position_1 && q.position_1.trim() !== '' && q.position_1 !== '0'
              if (hasPosition || hasPosition1 || q.paper_id) {
                questionMap.set(q.uuid, {
                  position: hasPosition ? q.position : '',
                  position_1: hasPosition1 ? q.position_1 : '',
                  bbox: q.bbox_relative || [],
                  paper_id: q.paper_id || ''
                })
              }
            })
            questions.value.forEach(q => {
              const data = questionMap.get(q.uuid)
              if (data) {
                // 更新 paper_id（用于导出）
                if (data.paper_id) {
                  q.paper_id = data.paper_id
                }
                // 更新扩展框位置
                if (data.position_1) {
                  q.position_1 = data.position_1
                }
                // 更新主位置和 bbox（如果后端有更新的位置）
                if (data.position && data.bbox.length === 4) {
                  q.position = data.position
                  q.bbox_relative = data.bbox as [number, number, number, number]
                }
              }
            })
            console.log('Merged question data from Question table:', questionMap.size, '个题目')
          }
        } catch (e) {
          console.warn('从 Question 表获取位置信息失败:', e)
        }
      } else if (metaData && Array.isArray(metaData) && metaData.length === 0) {
        // ========== 关键修复：meta.json 为空时，不清空已有数据（除非强制刷新）==========
        if (force) {
          questions.value = []
          console.warn('meta.json 数据为空，强制清空题目列表')
        } else {
          console.warn('meta.json 数据为空，保留现有题目列表:', questions.value.length, '题')
          // 不执行 questions.value = []，保留现有数据
        }
      } else {
        // 数据格式错误
        console.warn('meta.json 格式错误，保留现有题目列表')
        if (force) {
          questions.value = []
        }
      }
    } catch (err) {
      console.error('从 meta.json 加载题目失败:', err)
      // 失败时不自动回退，避免覆盖已有数据（除非强制模式）
      if (force) {
        console.log('强制模式：回退到从 Question 表加载...')
        await loadQuestions()
      } else {
        console.log('加载失败，保留现有题目列表:', questions.value.length, '题')
      }
    } finally {
      isLoadingMeta = false
    }
  }

  // 切换题目选中状态（本地切换，不立即同步到后端）
  function toggleQuestion(uuid: string) {
    const question = questions.value.find(q => q.uuid === uuid)
    if (!question) return
    
    question.is_error = !question.is_error
    console.log('切换题目状态:', uuid, 'is_error:', question.is_error)
  }
  
  // 同步题目状态到后端
  async function syncQuestionStatus(uuid: string) {
    const question = questions.value.find(q => q.uuid === uuid)
    if (!question) return
    
    try {
      await questionApi.updateQuestion(uuid, { is_error: question.is_error })
    } catch (err) {
      console.error('同步题目状态失败:', err)
    }
  }
  
  // 批量同步所有题目状态
  async function syncAllQuestionStatus() {
    const updates = questions.value.map(q => ({
      uuid: q.uuid,
      is_error: q.is_error
    }))
    
    try {
      await questionApi.batchUpdateQuestions(updates)
    } catch (err) {
      console.error('批量同步题目状态失败:', err)
    }
  }

  // 重置状态
  function reset() {
    batch.value = null
    progress.value = null
    questions.value = []
    images.value = []
    isProcessing.value = false
    error.value = null
    stopPolling()
  }

  // 设置 batch（用于页面刷新后恢复）
  function setBatch(batchData: Batch) {
    batch.value = batchData
  }
  
  // 从 batch_id 加载 batch 信息（用于继续导入流程）
  async function loadBatchFromMeta(batchId: string, fallbackStudentId?: string) {
    try {
      error.value = null
      
      // 获取 batch 基本信息
      const response = await batchApi.getBatch(batchId)
      const batchData = (response as any).data || response
      
      if (!batchData || !batchData.batch_id) {
        throw new Error('批次不存在')
      }
      
      // 优先使用后端返回的 student_id，如果为空则使用传入的 fallbackStudentId
      const studentId = batchData.student_id || fallbackStudentId || ''
      
      // 设置 batch
      batch.value = {
        id: batchData.batch_id,
        exam_name: batchData.exam_name || '未命名试卷',
        student_id: studentId,
        total_pages: batchData.total_pages || 1,
        status: batchData.status || 'analyzed',
        created_at: batchData.created_at || new Date().toISOString(),
        updated_at: batchData.updated_at || new Date().toISOString()
      }
      
      // 加载图片列表（如果有）
      if (batchData.images && Array.isArray(batchData.images)) {
        images.value = batchData.images.map((img: any, index: number) => ({
          id: img.id || `img-${index}`,
          file: null as any,
          preview: img.url || '',
          status: 'success' as const,
          progress: 100,
          pageNumber: index + 1
        }))
      }
      
      // 加载 meta.json 题目数据
      await loadQuestionsFromMeta()
      
      return batch.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载批次信息失败'
      throw err
    }
  }

  return {
    // State
    batch,
    progress,
    questions,
    images,
    isProcessing,
    error,
    
    // Getters
    batchId,
    totalPages,
    completedPages,
    progressPercent,
    selectedQuestions,
    
    // Actions
    setImages,
    createBatch,
    startProcessing,
    processAllPages,
    startPolling,
    stopPolling,
    loadQuestions,        // 从 Question 表读取（备用）
    loadQuestionsFromMeta, // 从 meta.json 读取（和 PC 端一致）
    toggleQuestion,
    reset,
    setBatch,
    loadBatchFromMeta     // 从 batch_id 恢复完整状态
  }
})
