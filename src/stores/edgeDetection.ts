/**
 * 边缘检测 Pinia Store
 * 
 * 管理边缘检测相关的状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { edgeDetectionApi } from '@/api/edgeDetection'
import type { 
  EdgeDetectionImage, 
  DetectionResultItem,
  Corners 
} from '@/types/edgeDetection'

export const useEdgeDetectionStore = defineStore('edgeDetection', () => {
  // ============ State ============
  
  /** 图片列表（按当前显示顺序排列） */
  const images = ref<EdgeDetectionImage[]>([])
  
  /** 是否正在检测 */
  const isDetecting = ref(false)
  
  /** 是否正在矫正 */
  const isCorrecting = ref(false)
  
  /** 当前编辑的图片索引 */
  const currentEditingIndex = ref<number | null>(null)
  
  /** 批次ID */
  const batchId = ref<string>('')
  
  /** 是否启用合并模式 */
  const mergeMode = ref(false)
  
  /** 是否启用图像增强 */
  const imageEnhance = ref(false)

  // ============ Getters ============
  
  /** 所有图片是否都已检测 */
  const allDetected = computed(() => 
    images.value.every(img => img.corners !== null)
  )
  
  /** 是否可以开始处理 */
  const canProceed = computed(() => 
    images.value.length > 0 && 
    !isDetecting.value && 
    !isCorrecting.value
  )
  
  /** 已检测成功的图片数量 */
  const detectedCount = computed(() =>
    images.value.filter(img => img.corners !== null).length
  )
  
  /** 使用默认四角的图片数量 */
  const defaultCornersCount = computed(() =>
    images.value.filter(img => img.is_default).length
  )

  // ============ Actions ============
  
  /**
   * 初始化批次
   * 
   * @param id 批次ID
   * @param merge 是否启用合并模式
   * @param enhance 是否启用图像增强
   */
  function initBatch(id: string, merge: boolean = false, enhance: boolean = false) {
    batchId.value = id
    mergeMode.value = merge
    imageEnhance.value = enhance
  }
  
  /**
   * 上传图片并检测四角
   * 
   * @param files 图片文件列表
   */
  async function uploadAndDetectImages(files: File[]) {
    isDetecting.value = true
    
    try {
      // 1. 批量上传图片到临时目录
      const uploadResponse = await edgeDetectionApi.uploadBatch(files, batchId.value || undefined)
      
      if (uploadResponse.code !== 200) {
        throw new Error(uploadResponse.message || '上传失败')
      }
      
      const { images: uploadedImages, batch_id: newBatchId } = uploadResponse.data
      
      // 始终使用后端返回的 batchId（每次上传都会创建新批次）
      if (newBatchId) {
        batchId.value = newBatchId
      }
      
      // 2. 批量检测四角
      const imagePaths = uploadedImages.map(img => img.image_path)
      const detectResponse = await edgeDetectionApi.detectBatch(imagePaths, batchId.value)
      
      if (detectResponse.code !== 200) {
        throw new Error(detectResponse.message || '检测失败')
      }
      
      // 3. 初始化状态
      const results = detectResponse.data.results
      
      // 检查结果数量是否一致，警告可能的丢失
      if (results.length !== uploadedImages.length) {
        console.warn(`检测结果数量不匹配: 上传${uploadedImages.length}张, 检测返回${results.length}张`)
      }
      
      // 通过 image_path 匹配结果，避免多进程导致的顺序混乱
      const resultMap = new Map(results.map((r: any) => [r.image_path, r]))
      
      images.value = uploadedImages.map((img, idx) => {
        // 尝试通过 image_path 匹配，如果失败则使用索引（兼容性回退）
        const detectResult = resultMap.get(img.image_path) || results[idx]
        return {
          image_id: img.image_id,
          image_path: img.image_path,
          image_size: img.image_size,
          corners: detectResult?.corners || null,
          is_default: detectResult?.is_default || !detectResult?.success,
          thumbnailUrl: URL.createObjectURL(files[idx]),
          file: files[idx]
        }
      })
      
      return {
        successCount: detectResponse.data.success_count,
        failCount: detectResponse.data.fail_count,
        skipped: detectResponse.data.skipped || []  // 被跳过的文件列表
      }
      
    } finally {
      isDetecting.value = false
    }
  }
  
  /**
   * 新增图片
   * 
   * 单独上传并检测，追加到列表
   * @param file 图片文件
   */
  async function addImage(file: File) {
    // 1. 上传新文件
    const uploadResult = await edgeDetectionApi.uploadTemp(file, batchId.value || undefined)
    
    if (uploadResult.code !== 200) {
      throw new Error(uploadResult.message || '上传失败')
    }
    
    // 如果之前没有 batchId，更新它
    if (!batchId.value && uploadResult.data.image_path) {
      // 从路径中提取 batch_id
      const match = uploadResult.data.image_path.match(/batches\/([^/]+)/)
      if (match) {
        batchId.value = match[1]
      }
    }
    
    // 2. 单独检测四角
    const detectResult = await edgeDetectionApi.detectBatch(
      [uploadResult.data.image_path],
      batchId.value
    )
    
    if (detectResult.code !== 200) {
      throw new Error(detectResult.message || '检测失败')
    }
    
    const result = detectResult.data.results[0]
    
    // 3. 追加到数组
    images.value.push({
      image_id: uploadResult.data.image_id,
      image_path: uploadResult.data.image_path,
      image_size: uploadResult.data.image_size,
      corners: result?.corners || null,
      is_default: result?.is_default || !result?.success,
      thumbnailUrl: URL.createObjectURL(file),
      file
    })
  }
  
  /**
   * 删除图片
   * 
   * 只从数组移除，不删除 temp/ 文件
   * @param index 图片索引
   */
  function removeImage(index: number) {
    if (index >= 0 && index < images.value.length) {
      // 释放 Blob URL
      const img = images.value[index]
      if (img.thumbnailUrl && img.thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.thumbnailUrl)
      }
      
      images.value.splice(index, 1)
      
      // 如果当前编辑的索引受影响，更新它
      if (currentEditingIndex.value !== null) {
        if (currentEditingIndex.value === index) {
          currentEditingIndex.value = null
        } else if (currentEditingIndex.value > index) {
          currentEditingIndex.value--
        }
      }
    }
  }
  
  /**
   * 更新四角坐标
   * 
   * @param index 图片索引
   * @param corners 新的四角坐标
   */
  function updateCorners(index: number, corners: Corners) {
    if (images.value[index]) {
      images.value[index].corners = corners
      images.value[index].is_default = false  // 手动调整后不再是默认四角
    }
  }
  
  /**
   * 调整图片顺序
   * 
   * @param oldIndex 原索引
   * @param newIndex 新索引
   */
  function reorderImages(oldIndex: number, newIndex: number) {
    if (oldIndex < 0 || oldIndex >= images.value.length) return
    if (newIndex < 0 || newIndex >= images.value.length) return
    
    const movedItem = images.value[oldIndex]
    images.value.splice(oldIndex, 1)
    images.value.splice(newIndex, 0, movedItem)
    
    // 更新当前编辑索引
    if (currentEditingIndex.value !== null) {
      if (currentEditingIndex.value === oldIndex) {
        currentEditingIndex.value = newIndex
      } else if (oldIndex < currentEditingIndex.value && newIndex >= currentEditingIndex.value) {
        currentEditingIndex.value--
      } else if (oldIndex > currentEditingIndex.value && newIndex <= currentEditingIndex.value) {
        currentEditingIndex.value++
      }
    }
  }
  
  /**
   * 提交矫正
   * 
   * 只提交当前数组中存在的图片（已排除删除的）
   * @param targetBatchId 目标批次ID（可选，使用 store 中的 batchId）
   * @param studentId 学生ID（创建批次记录时使用）
   */
  async function submitCorrection(targetBatchId?: string, studentId?: string) {
    const bid = targetBatchId || batchId.value
    
    if (!bid) {
      throw new Error('批次ID不能为空')
    }
    
    if (images.value.length === 0) {
      throw new Error('没有需要处理的图片')
    }
    
    isCorrecting.value = true
    
    try {
      // 构造 corrections 数组
      const corrections = images.value.map((img, idx) => {
        // 如果没有 corners，使用默认四角
        let corners = img.corners
        if (!corners) {
          corners = {
            tl: [5, 5],
            tr: [img.image_size.width - 5, 5],
            br: [img.image_size.width - 5, img.image_size.height - 5],
            bl: [5, img.image_size.height - 5]
          }
        }
        
        return {
          image_id: img.image_id,
          input_path: img.image_path,
          corners,
          output_filename: `P${idx + 1}.jpg`,  // 按当前数组顺序命名
          order: idx
        }
      })
      
      // 传递 mergeMode 和 imageEnhance 配置
      const result = await edgeDetectionApi.correctBatch(
        bid, 
        corrections, 
        studentId,
        mergeMode.value,
        imageEnhance.value
      )
      
      return result.data
      
    } finally {
      isCorrecting.value = false
    }
  }
  
  /**
   * 打开编辑器
   * 
   * @param index 图片索引
   */
  function openEditor(index: number) {
    if (index >= 0 && index < images.value.length) {
      currentEditingIndex.value = index
    }
  }
  
  /**
   * 关闭编辑器
   */
  function closeEditor() {
    currentEditingIndex.value = null
  }
  
  /**
   * 切换到上一张图片
   */
  function goToPrev() {
    if (currentEditingIndex.value !== null && currentEditingIndex.value > 0) {
      currentEditingIndex.value--
    }
  }
  
  /**
   * 切换到下一张图片
   */
  function goToNext() {
    if (currentEditingIndex.value !== null && currentEditingIndex.value < images.value.length - 1) {
      currentEditingIndex.value++
    }
  }
  
  /**
   * 重置状态
   */
  function reset() {
    // 释放所有 Blob URL
    images.value.forEach(img => {
      if (img.thumbnailUrl && img.thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.thumbnailUrl)
      }
    })
    
    images.value = []
    isDetecting.value = false
    isCorrecting.value = false
    currentEditingIndex.value = null
    batchId.value = ''
    mergeMode.value = false
    imageEnhance.value = false
  }

  // ============ 导出 ============
  return {
    // State
    images,
    isDetecting,
    isCorrecting,
    currentEditingIndex,
    batchId,
    mergeMode,
    imageEnhance,
    
    // Getters
    allDetected,
    canProceed,
    detectedCount,
    defaultCornersCount,
    
    // Actions
    initBatch,
    uploadAndDetectImages,
    addImage,
    removeImage,
    updateCorners,
    reorderImages,
    submitCorrection,
    openEditor,
    closeEditor,
    goToPrev,
    goToNext,
    reset
  }
})
