/**
 * 错题订正状态管理 (Pinia Store)
 * 核心逻辑：
 * 1. 仅存储第一张原题和订正图片
 * 2. 订正图片按优先级显示：题目级 > 试卷级
 * 3. 同时存储所有订正图片（用于查看器）
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CorrectionImage, OriginalSlice, UploadConfig } from '@/types/correction'
import { correctionsApi } from '@/api/corrections'

export const useCorrectionStore = defineStore('correction', () => {
  // ============ State ============
  const currentQuestionUuid = ref<string | null>(null)
  const currentPaperId = ref<string | null>(null)
  const firstOriginalImage = ref<OriginalSlice | null>(null)
  const firstCorrectionImage = ref<CorrectionImage | null>(null)
  const allCorrectionImages = ref<CorrectionImage[]>([])
  const isLoading = ref(false)
  const uploadConfig = ref<UploadConfig>({
    onlyThisQuestion: false
  })

  // ============ Getters ============
  const hasOriginalImage = computed(() => !!firstOriginalImage.value)
  const hasCorrectionImage = computed(() => !!firstCorrectionImage.value)

  /** 是否有任何订正图片（包括所有级别） */
  const hasAnyCorrection = computed(() => allCorrectionImages.value.length > 0)

  /** 获取题目级订正图片 */
  const questionLevelCorrections = computed(() =>
    allCorrectionImages.value.filter(img => img.level === 'question')
  )

  /** 获取试卷级订正图片 */
  const paperLevelCorrections = computed(() =>
    allCorrectionImages.value.filter(img => img.level === 'paper')
  )

  // ============ Actions ============

  /**
   * 加载原题切片 - 仅取第一张
   */
  async function loadFirstOriginalImage(paperId: string, questionUuid: string) {
    isLoading.value = true
    try {
      console.log('[DEBUG] Loading original slices for:', paperId, questionUuid)
      const response = await correctionsApi.getSlices(paperId, questionUuid)
      console.log('[DEBUG] Slices API raw response:', response)
      
      // 后端直接返回数据，不是 {data: ...} 格式
      const images = (response as any).images || []
      console.log('[DEBUG] Parsed images:', images)
      
      // 仅取第一张
      firstOriginalImage.value = images.length > 0 ? images[0] : null
      console.log('[DEBUG] firstOriginalImage:', firstOriginalImage.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 加载订正图片 - 使用 query API（与 Desktop 版本一致）
   */
  async function loadFirstCorrectionImage(paperId: string, questionUuid: string) {
    isLoading.value = true
    try {
      console.log('[DEBUG] Loading corrections for:', paperId, questionUuid)
      const response = await correctionsApi.getList(paperId, questionUuid)
      console.log('[DEBUG] API raw response:', response)
      
      // 使用 query API，返回格式不同：{items: [{correction_images: [...]}]}
      const items = (response as any).items || []
      const questionData = items[0]  // 取第一条记录
      
      if (!questionData) {
        console.log('[DEBUG] No question data found')
        allCorrectionImages.value = []
        firstCorrectionImage.value = null
        return
      }
      
      // 转换 correction_images 文件名数组为 CorrectionImage 对象数组
      const correctionImages = questionData.correction_images || []
      console.log('[DEBUG] Raw correction_images:', correctionImages)
      
      const files: CorrectionImage[] = correctionImages.map((filename: string, index: number) => {
        // 判断级别：文件名包含 questionUuid 为题目级，否则为试卷级
        const isQuestionLevel = filename.includes(questionUuid.replace(/-/g, '')) || 
                               filename.includes(questionUuid)
        // 使用正确的文件下载 API 路径
        // GET /api/v1/corrections/files/{paper_id}/{filename}?folder=correction
        return {
          id: `${questionUuid}_${index}`,
          filename,
          url: `/api/v1/corrections/files/${paperId}/${filename}?folder=correction`,
          size: 0,  // query API 不返回大小
          level: isQuestionLevel ? 'question' : 'paper',
          createdAt: questionData.created_at || new Date().toISOString()
        }
      })
      
      console.log('[DEBUG] Parsed files:', files)
      console.log('[DEBUG] Files count:', files.length)
      
      allCorrectionImages.value = files

      // 按优先级取第一张：题目级 > 试卷级
      const questionLevel = files.find(img => img.level === 'question')
      const paperLevel = files.find(img => img.level === 'paper')
      console.log('[DEBUG] questionLevel:', questionLevel)
      console.log('[DEBUG] paperLevel:', paperLevel)

      firstCorrectionImage.value = questionLevel || paperLevel || null
      console.log('[DEBUG] firstCorrectionImage:', firstCorrectionImage.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 同时加载原题和订正
   */
  async function loadImages(paperId: string, questionUuid: string) {
    currentPaperId.value = paperId
    currentQuestionUuid.value = questionUuid

    await Promise.all([
      loadFirstOriginalImage(paperId, questionUuid),
      loadFirstCorrectionImage(paperId, questionUuid)
    ])
  }

  /**
   * 上传订正图片
   */
  async function uploadCorrection(
    paperId: string,
    files: File[],
    questionUuid?: string
  ): Promise<boolean> {
    const namingLevel = uploadConfig.value.onlyThisQuestion && questionUuid
      ? 'question'
      : 'paper'

    const response = await correctionsApi.upload(paperId, files, {
      questionUuid: namingLevel === 'question' ? questionUuid : undefined,
      namingLevel
    })

    // 刷新显示
    if (questionUuid) {
      await loadFirstCorrectionImage(paperId, questionUuid)
    }

    return response.code === 200
  }

  /**
   * 删除订正图片
   */
  async function deleteCorrection(paperId: string, filename: string): Promise<boolean> {
    await correctionsApi.delete(paperId, filename)

    // 从列表中移除
    allCorrectionImages.value = allCorrectionImages.value.filter(
      img => img.filename !== filename
    )

    // 重新计算第一张
    const questionLevel = allCorrectionImages.value.find(img => img.level === 'question')
    const paperLevel = allCorrectionImages.value.find(img => img.level === 'paper')
    firstCorrectionImage.value = questionLevel || paperLevel || null

    return true
  }

  /**
   * 重置状态
   */
  function reset() {
    currentQuestionUuid.value = null
    currentPaperId.value = null
    firstOriginalImage.value = null
    firstCorrectionImage.value = null
    allCorrectionImages.value = []
    uploadConfig.value = {
      onlyThisQuestion: false
    }
  }

  return {
    // State
    currentQuestionUuid,
    currentPaperId,
    firstOriginalImage,
    firstCorrectionImage,
    allCorrectionImages,
    isLoading,
    uploadConfig,
    // Getters
    hasOriginalImage,
    hasCorrectionImage,
    hasAnyCorrection,
    questionLevelCorrections,
    paperLevelCorrections,
    // Actions
    loadImages,
    loadFirstOriginalImage,
    loadFirstCorrectionImage,
    uploadCorrection,
    deleteCorrection,
    reset
  }
})
