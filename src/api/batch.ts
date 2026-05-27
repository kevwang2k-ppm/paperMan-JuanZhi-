import client, { requestWithRetry, getBaseUrl } from './client'
import type { Batch, BatchProgress, Question, ApiResponse } from '@/types'

export const batchApi = {
  // 获取批次列表
  getBatches(params?: {
    student_id?: string
    status?: string
  }): Promise<ApiResponse<Array<{
    batch_id: string
    exam_name: string
    student_id: string
    status: string
    total_pages: number
    processed_pages: number
    question_count: number
    created_at: string
  }>>> {
    const query = new URLSearchParams()
    if (params?.student_id) query.append('student_id', params.student_id)
    if (params?.status) query.append('status', params.status)
    const queryStr = query.toString()
    return client.get(`/batches${queryStr ? '?' + queryStr : ''}`)
  },

  // 创建批次（同时上传所有图片）
  createBatch(
    examName: string,
    studentId: string,
    files: File[],
    mergeMode: boolean = false,
    imageEnhance: boolean = false,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<Batch>> {
    const formData = new FormData()
    formData.append('exam_name', examName)
    formData.append('student_id', studentId)
    formData.append('merge_mode', mergeMode ? 'true' : 'false')
    formData.append('image_enhance', imageEnhance ? 'true' : 'false')
    
    // 添加所有文件（使用相同的字段名 files）
    files.forEach((file, index) => {
      console.log(`添加文件 ${index}:`, file.name, file.type, file.size)
      formData.append('files', file)
    })
    
    // 调试：打印 FormData 内容
    console.log('FormData 内容:', {
      exam_name: examName,
      student_id: studentId,
      fileCount: files.length
    })
    
    // 使用 axios，但确保不设置默认的 Content-Type
    return client.post('/batches/', formData, {
      headers: {},  // 清空 headers，让浏览器自动设置 Content-Type with boundary
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
        }
      }
    })
  },

  // 启动批次处理
  startBatch(batchId: string): Promise<ApiResponse<void>> {
    return client.post(`/batches/${batchId}/start`)
  },

  // 查询处理进度
  getProgress(batchId: string): Promise<ApiResponse<BatchProgress>> {
    return client.get(`/batches/${batchId}/progress`)
  },

  // 处理单页（带重试）
  processPage(batchId: string, pageNumber: number): Promise<ApiResponse<{
    status: string
    question_count: number
  }>> {
    return requestWithRetry({
      method: 'POST',
      url: `/batches/${batchId}/process-page/${pageNumber}`
    }, 3, 500)
  },

  // 获取批次详情
  getBatch(batchId: string): Promise<ApiResponse<Batch>> {
    return client.get(`/batches/${batchId}`)
  },

  // 获取批次结果
  getResults(batchId: string): Promise<ApiResponse<{
    exam_name?: string
    batch: Batch
    questions: Question[]
  }>> {
    return client.get(`/batches/${batchId}/results`)
  },

  // 删除批次
  deleteBatch(batchId: string): Promise<ApiResponse<void>> {
    return client.delete(`/batches/${batchId}`)
  },

  // 获取批次 meta.json（和 PC 端一致，读取整理后的层级数据）
  getMeta(batchId: string): Promise<ApiResponse<any[]>> {
    return client.get(`/batches/${batchId}/meta`)
  },

  // 获取页面图片 URL（原图或去手写后的图）
  getPageImageUrl(batchId: string, pageNumber: number, mode: 'original' | 'output' = 'output', maxWidth?: number): string {
    // 后端使用 image_type 参数: original 或 output
    const baseUrl = getBaseUrl()
    const widthParam = maxWidth !== undefined ? `&max_width=${maxWidth}` : ''
    return `${baseUrl}/batches/${batchId}/images/${pageNumber}?image_type=${mode}${widthParam}`
  }
}
