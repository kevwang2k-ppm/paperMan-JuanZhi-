/**
 * 边缘检测 API 客户端
 * 
 * 提供四角检测和透视矫正功能
 */

import client from './client'
import type { 
  DetectResponseData, 
  CorrectResponseData, 
  UploadTempResponseData,
  BatchUploadResponseData,
  Corners
} from '@/types/edgeDetection'
import type { ApiResponse } from '@/types'

export const edgeDetectionApi = {
  /**
   * 批量检测图片四角
   * 
   * @param imagePaths 图片路径列表
   * @param batchId 可选的批次ID
   */
  detectBatch(
    imagePaths: string[],
    batchId?: string
  ): Promise<ApiResponse<DetectResponseData>> {
    return client.post('/edge-detection/detect', {
      image_paths: imagePaths,
      batch_id: batchId
    })
  },

  /**
   * 批量矫正图片
   * 
   * @param batchId 批次ID
   * @param corrections 矫正参数列表
   * @param studentId 学生ID（创建批次记录时使用）
   * @param mergeMode 是否启用合并模式
   * @param imageEnhance 是否启用图像增强
   */
  correctBatch(
    batchId: string,
    corrections: Array<{
      image_id: string
      input_path: string
      corners: Corners
      output_filename: string
      order: number
    }>,
    studentId?: string,
    mergeMode?: boolean,
    imageEnhance?: boolean
  ): Promise<ApiResponse<CorrectResponseData>> {
    return client.post('/edge-detection/correct', {
      batch_id: batchId,
      student_id: studentId,
      merge_mode: mergeMode,
      image_enhance: imageEnhance,
      corrections
    })
  },

  /**
   * 预览矫正效果
   * 
   * @param imagePath 图片路径
   * @param corners 四角坐标
   * @param maxWidth 预览图最大宽度
   * @returns Blob URL
   */
  async previewCorrection(
    imagePath: string,
    corners: Corners,
    maxWidth: number = 800
  ): Promise<string> {
    const response = await client.post(
      '/edge-detection/preview',
      {
        image_path: imagePath,
        corners,
        max_width: maxWidth
      },
      {
        responseType: 'blob'
      }
    )
    
    // 创建 Blob URL
    const blob = new Blob([response], { type: 'image/jpeg' })
    return URL.createObjectURL(blob)
  },

  /**
   * 上传单张图片到临时目录
   * 
   * @param file 图片文件
   * @param batchId 可选的批次ID
   */
  uploadTemp(
    file: File,
    batchId?: string
  ): Promise<ApiResponse<UploadTempResponseData>> {
    const formData = new FormData()
    formData.append('file', file)
    if (batchId) {
      formData.append('batch_id', batchId)
    }

    return client.post('/edge-detection/upload-temp', formData, {
      headers: {}
    })
  },

  /**
   * 批量上传图片到临时目录
   * 
   * @param files 图片文件列表
   * @param batchId 可选的批次ID
   */
  uploadBatch(
    files: File[],
    batchId?: string
  ): Promise<ApiResponse<BatchUploadResponseData>> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    if (batchId) {
      formData.append('batch_id', batchId)
    }

    return client.post('/edge-detection/upload-batch', formData, {
      headers: {}
    })
  },

  /**
   * 获取图片的完整 URL
   * 
   * @param imagePath 相对路径
   */
  getImageUrl(imagePath: string): string {
    // 如果已经是完整 URL，直接返回
    if (imagePath.startsWith('http')) {
      return imagePath
    }
    
    // 获取基础 URL
    const baseUrl = import.meta.env.DEV 
      ? `http://${window.location.hostname}:8000`
      : ''
    
    // 组合 URL
    return `${baseUrl}/${imagePath}`
  }
}
