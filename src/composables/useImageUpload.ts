import { ref } from 'vue'
import { generateUUID } from '@/utils/helpers'
import { compressImage, convertToPNG, createPreview, isValidImageType, isValidFileSize } from '@/utils/image'
import type { UploadImage } from '@/types'

export interface UseImageUploadOptions {
  maxCount?: number
  maxSizeMB?: number
  compress?: boolean
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { maxCount = 40, maxSizeMB = 10, compress = true } = options
  
  const images = ref<UploadImage[]>([])
  const isProcessing = ref(false)
  const error = ref<string | null>(null)
  
  // 添加图片
  async function addImages(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return
    
    error.value = null
    
    // 检查总数限制
    if (images.value.length + files.length > maxCount) {
      error.value = `最多只能上传 ${maxCount} 张图片`
      return
    }
    
    isProcessing.value = true
    
    try {
      const newImages: UploadImage[] = []
      
      for (const file of Array.from(files)) {
        // 验证文件类型
        if (!isValidImageType(file)) {
          console.warn(`跳过不支持的文件类型: ${file.name}`)
          continue
        }
        
        // 验证文件大小
        if (!isValidFileSize(file, maxSizeMB)) {
          console.warn(`跳过超过大小限制的文件: ${file.name}`)
          continue
        }
        
        // 处理图片
        let processedFile = file
        if (compress) {
          const blob = await compressImage(file)
          processedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' })
        } else {
          const blob = await convertToPNG(file)
          processedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' })
        }
        
        // 生成预览
        const preview = await createPreview(processedFile)
        
        newImages.push({
          id: generateUUID(),
          file: processedFile,
          preview,
          pageNumber: images.value.length + newImages.length + 1,
          status: 'pending'
        })
      }
      
      images.value.push(...newImages)
      
      // 重新编号
      renumberImages()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '图片处理失败'
      throw err
    } finally {
      isProcessing.value = false
    }
  }
  
  // 删除图片
  function removeImage(id: string): void {
    const index = images.value.findIndex(img => img.id === id)
    if (index > -1) {
      images.value.splice(index, 1)
      renumberImages()
    }
  }
  
  // 移动图片
  function moveImage(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= images.value.length) return
    if (toIndex < 0 || toIndex >= images.value.length) return
    
    const [moved] = images.value.splice(fromIndex, 1)
    images.value.splice(toIndex, 0, moved)
    renumberImages()
  }
  
  // 重新编号
  function renumberImages(): void {
    images.value.forEach((img, index) => {
      img.pageNumber = index + 1
    })
  }
  
  // 清空
  function clearImages(): void {
    images.value = []
  }
  
  return {
    images,
    isProcessing,
    error,
    addImages,
    removeImage,
    moveImage,
    clearImages
  }
}
