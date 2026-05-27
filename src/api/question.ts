import client from './client'
import type { Question, ApiResponse } from '@/types'

export const questionApi = {
  // 获取题目列表（从Question表读取）
  getQuestions(batchId: string): Promise<ApiResponse<Question[]>> {
    return client.get(`/batches/${batchId}/questions`)
  },

  // 更新题目（审阅结果）
  updateQuestion(
    uuid: string,
    data: {
      is_error?: boolean
      position?: string  // JSON string of bbox (主位置)
      position_1?: string  // 扩展框/副位置
    }
  ): Promise<ApiResponse<Question>> {
    return client.put(`/questions/${uuid}/review`, data)
  },

  // 批量更新题目
  batchUpdateQuestions(
    updates: Array<{
      uuid: string
      is_error: boolean
    }>
  ): Promise<ApiResponse<void>> {
    return client.post('/questions/batch-review', { updates })
  },

  // 创建手动框
  createManualBox(data: {
    batch_id: string
    page_number: number
    bbox_relative: [number, number, number, number]
    question_number?: string
  }): Promise<ApiResponse<Question>> {
    return client.post('/questions/manual', data)
  },

  // 创建新题目（用于审核页面手动添加）
  // 注意：后端直接返回 Question 对象（通过 response_model 序列化），不是 ApiResponse 包装
  createQuestion(paperId: string, data: {
    level_1: string
    level_2: string
    level_3: string
    level_4: string
    position: string
    is_error?: boolean
    question_type?: string
    primary_error_type_id?: string
  }): Promise<Question> {
    return client.post(`/papers/${paperId}/questions`, data)
  },

  // 删除题目
  deleteQuestion(uuid: string): Promise<void> {
    return client.delete(`/questions/${uuid}`)
  }
}
