/**
 * 错题订正 API 封装
 * 完全复用现有的 Review Correction API
 */

import client from './client'
import type { ApiResponse } from '@/types'
import type {
  SlicesResponse,
  ListResponse,
  UploadOptions,
  UploadResponse
} from '@/types/correction'

/**
 * 完全复用现有的 Review Correction API
 */
export const correctionsApi = {
  /**
   * 获取原题切片 - 复用现有接口
   * GET /api/v1/corrections/{paper_id}/slices
   */
  getSlices(paperId: string, questionUuid: string): Promise<ApiResponse<SlicesResponse>> {
    return client.get(`/corrections/${paperId}/slices`, {
      params: { question_uuid: questionUuid }
    })
  },

  /**
   * 获取订正图片列表 - 使用 query API（与 Desktop 版本一致）
   * GET /api/v1/corrections/query?uuid={questionUuid}
   */
  getList(paperId: string, questionUuid: string): Promise<ApiResponse<ListResponse>> {
    // 使用 query API，通过 uuid 参数查询特定题目的订正图片
    return client.get('/corrections/query', {
      params: { 
        uuid: questionUuid,
        paper_number: paperId,  // 同时限制试卷
        page_size: 1  // 只需要一条记录
      }
    })
  },

  /**
   * 上传订正图片 - 复用现有接口
   * POST /api/v1/corrections/correction-uploads
   */
  upload(
    paperId: string,
    files: File[],
    options: UploadOptions
  ): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData()
    formData.append('paper_id', paperId)
    formData.append('naming_level', options.namingLevel)

    if (options.questionUuid) {
      formData.append('question_uuid', options.questionUuid)
    }

    files.forEach(file => {
      formData.append('files', file)
    })

    return client.post('/corrections/correction-uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * 删除订正图片 - 复用现有接口
   * DELETE /api/v1/corrections/files/{paper_id}/{filename}
   */
  delete(paperId: string, filename: string): Promise<ApiResponse<void>> {
    return client.delete(`/corrections/files/${paperId}/${filename}`, {
      params: { folder: 'correction' }
    })
  },

  /**
   * 查询错题（批量）- 错整功能用
   * GET /api/v1/corrections/query?uuid=uuid1,uuid2,...
   */
  query(params: {
    uuid?: string           // 逗号分隔的多个UUID
    paper_number?: string
    question_type?: string
    error_type?: string
    date_from?: string
    date_to?: string
    page_size?: number
  }): Promise<ApiResponse<{
    items: Array<{
      uuid: string
      paper_id: string
      paper_name: string
      paper_number: string
      review_date: string | null
      question_type_name: string
      question_type_id: string
      error_type_name: string
      error_type_id: string
      slice_image: string
      correction_images: string[]
      correction_count: number
      has_correction: boolean
      position: string
      level_1: string
      level_2: string
      content: string
      created_at: string
      updated_at: string
    }>
    total: number
    page: number
    page_size: number
  }>> {
    const queryParams = new URLSearchParams()
    if (params.uuid) queryParams.append('uuid', params.uuid)
    if (params.paper_number) queryParams.append('paper_number', params.paper_number)
    if (params.question_type) queryParams.append('question_type', params.question_type)
    if (params.error_type) queryParams.append('error_type', params.error_type)
    if (params.date_from) queryParams.append('date_from', params.date_from)
    if (params.date_to) queryParams.append('date_to', params.date_to)
    if (params.page_size) queryParams.append('page_size', params.page_size.toString())
    
    return client.get(`/corrections/query?${queryParams.toString()}`)
  }
}
