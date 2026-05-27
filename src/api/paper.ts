import client from './client'
import type { ApiResponse } from '@/types'

// 题目类型定义
export interface PaperQuestion {
  UUID: string
  id: string
  题号: string
  所在页码: number
  所在位置: string
  所在位置1: string | null
  题目类型: string
  question_type_id: string
  对错标签: string
  主要错误类型: string
  次要错误类型: string
  内容引用: string
  相关知识点: string
  导出错整: string
  level_1: string
  level_2: string
  level_3: string
  level_4: string
  试卷编号: string
  试卷名: string
}

export const paperApi = {
  // 导入试卷（从 batch 导入到学生资料目录）
  importPaper(data: {
    batch_id: string
    student_id: string
    subject: string
    grade: string
    semester: string
    paper_name: string
  }): Promise<ApiResponse<{
    paper_id: string
    paper_dir: string
    question_count: number
  }>> {
    return client.post('/papers/import', data)
  },

  // 获取学生试卷列表
  getStudentPapers(studentId: string, params?: {
    subject?: string
    status?: string
    check_batch_status?: boolean
    include_deleted?: boolean
    page?: number
    page_size?: number
  }): Promise<ApiResponse<Array<{
    id: string
    name: string
    subject: string
    grade: string
    semester: string
    total_pages: number
    question_count: number
    status: string
    created_at: string
  }>>> {
    const query = new URLSearchParams()
    query.append('student_id', studentId)
    if (params?.subject) query.append('subject', params.subject)
    if (params?.status) query.append('status', params.status)
    if (params?.check_batch_status) query.append('check_batch_status', 'true')
    if (params?.include_deleted) query.append('include_deleted', 'true')
    if (params?.page !== undefined) query.append('page', String(params.page))
    if (params?.page_size !== undefined) query.append('page_size', String(params.page_size))
    const queryStr = query.toString()
    return client.get(`/papers?${queryStr}`)
  },

  // 获取试卷详情
  getPaper(paperId: string): Promise<ApiResponse<{
    id: string
    name: string
    subject: string
    grade: string
    semester: string
    total_pages: number
    status: string
  }>> {
    return client.get(`/papers/${paperId}`)
  },

  // 更新试卷信息
  updatePaper(paperId: string, data: {
    name?: string
    subject?: string
    grade?: string
    semester?: string
  }): Promise<ApiResponse<void>> {
    return client.put(`/papers/${paperId}`, data)
  },

  // 获取试卷树详情（包含题目列表，兼容 meta.json 格式）
  getTreeDetail(paperId: string): Promise<ApiResponse<{
    paper_id: string
    paper_number: string
    paper_name: string
    student_id: string
    subject: string
    grade: string
    semester: string
    total_pages: number
    questions: Array<{
      UUID: string
      id: string
      题号: string
      所在页码: number
      所在位置: string
      所在位置1: string | null
      题目类型: string
      question_type_id: string
      对错标签: string
      主要错误类型: string
      次要错误类型: string
      内容引用: string
      相关知识点: string
      导出错整: string
      level_1: string
      level_2: string
      level_3: string
      level_4: string
      试卷编号: string
      试卷名: string
    }>
    tree_structure: any[]
  }>> {
    return client.get(`/papers/${paperId}/tree/detail`)
  },

  // 获取试卷页面图片 URL
  getPageImageUrl(paperId: string, pageNumber: number, dpi?: number, clean?: boolean): string {
    const baseUrl = client.defaults.baseURL || ''
    const params = new URLSearchParams()
    if (dpi) params.append('dpi', dpi.toString())
    if (clean) params.append('clean', 'true')
    const queryStr = params.toString()
    return `${baseUrl}/papers/${paperId}/pages/${pageNumber}${queryStr ? '?' + queryStr : ''}`
  },

  // ========== 删除/恢复/重命名 API ==========

  // 删除试卷（软删除或物理删除）
  deletePaper(paperId: string): Promise<ApiResponse<{
    paper_id: string
    status: string
    delete_type: 'soft' | 'permanent'
    deleted_at?: string
    original_name?: string
  }>> {
    return client.post(`/papers/${paperId}/delete`)
  },

  // 恢复已删除的试卷
  restorePaper(paperId: string): Promise<ApiResponse<{
    paper_id: string
    status: string
    name: string
    pdf_path: string
    restored_at: string
  }>> {
    return client.post(`/papers/${paperId}/restore`)
  },

  // 物理删除试卷（清除）
  permanentDeletePaper(paperId: string): Promise<ApiResponse<{
    paper_id: string
    deleted_questions: number
    deleted_corrections: number
  }>> {
    return client.delete(`/papers/${paperId}/permanent`)
  },

  // 重命名试卷
  renamePaper(paperId: string, newName: string): Promise<ApiResponse<{
    paper_id: string
    old_name: string
    new_name: string
    old_path: string
    new_path: string
    pdf_renamed: boolean
  }>> {
    return client.post(`/papers/${paperId}/rename`, { new_name: newName })
  },

  // 获取学生试卷列表（包含已删除）
  getStudentPapersWithDeleted(studentId: string, includeDeleted: boolean = false): Promise<ApiResponse<Array<{
    id: string
    name: string
    subject: string
    grade: string
    semester: string
    total_pages: number
    question_count: number
    error_count?: number
    status: string
    created_at: string
    updated_at: string
  }>>> {
    return client.get(`/papers?student_id=${studentId}&include_deleted=${includeDeleted}`)
  },

  // 获取试卷统计数量（不分页）
  getPaperStatistics(studentId: string, includeDeleted: boolean = false): Promise<ApiResponse<{
    status_counts: {
      all: number
      imported: number
      analyzing: number
      analyzed: number
      deleted: number
    }
    subject_counts: Record<string, number>
    deleted_subject_counts: Record<string, number>
  }>> {
    return client.get(`/papers/statistics/counts?student_id=${studentId}&include_deleted=${includeDeleted}`)
  }
}
