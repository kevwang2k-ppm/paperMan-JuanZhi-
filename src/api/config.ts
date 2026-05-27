import client from './client'
import type { ApiResponse } from '@/types'

export interface QuestionType {
  code: string
  description: string
  subject: string
  source: 'default' | 'custom' | 'override'
}

export interface ErrorType {
  code: string
  description: string
  subject: string
  source: 'default' | 'custom' | 'override'
}

export interface CorrectionGroup {
  code: string
  description: string
  subject: string
  error_type_codes: string[]
  source: 'default' | 'custom' | 'override'
}

export interface SystemSettings {
  material_dir: string
  subjects: string[]
  grades: string[]
  semesters: string[]
  pdf_max_width: number
  stream_max_width: number
}

export interface GetQuestionTypesOptions {
  subject?: string        // 学科，默认"公用"，传"all"获取所有学科
  studentId?: string      // 学生ID，用于获取个性化配置
  includeDefault?: boolean    // 是否包含默认配置，默认true
  includeCommon?: boolean     // 当subject不是"公用"时，是否同时包含"公用"学科的配置，默认true
}

export interface GetErrorTypesOptions {
  subject?: string        // 学科，默认"公用"，传"all"获取所有学科
  studentId?: string      // 学生ID，用于获取个性化配置
  includeDefault?: boolean    // 是否包含默认配置，默认true
  includeCommon?: boolean     // 当subject不是"公用"时，是否同时包含"公用"学科的配置，默认true
}

export interface GetGroupsOptions {
  subject?: string        // 学科，默认"公用"
  studentId?: string      // 学生ID，用于获取个性化配置
  includeDefault?: boolean    // 是否包含默认配置，默认true
  includeCommon?: boolean     // 当subject不是"公用"时，是否同时包含"公用"学科的配置，默认true
}

function buildConfigParams(options: { subject?: string; studentId?: string; includeDefault?: boolean; includeCommon?: boolean }) {
  const {
    subject = '公用',
    studentId,
    includeDefault = true,
    includeCommon = true
  } = options

  const params = new URLSearchParams()
  params.append('subject', subject)
  if (studentId) params.append('student_id', studentId)
  params.append('include_default', String(includeDefault))
  params.append('include_common', String(includeCommon))
  return params.toString()
}

export const configApi = {
  // 获取系统基础配置（学科、年级、学期等）
  getSystemConfig(): Promise<ApiResponse<SystemSettings>> {
    return client.get('/config/system')
  },

  // 获取试题类型列表
  getQuestionTypes(options: GetQuestionTypesOptions = {}): Promise<ApiResponse<{
    subject: string
    student_id?: string
    include_default: boolean
    items: QuestionType[]
  }>> {
    const query = buildConfigParams(options)
    console.log(`[configApi] 获取试题类型: ${query}`)
    return client.get(`/config/question-types?${query}`)
  },

  // 创建试题类型
  createQuestionType(data: { description: string; subject?: string; student_id?: string }): Promise<ApiResponse<QuestionType>> {
    return client.post('/config/question-types', data)
  },

  // 更新试题类型
  updateQuestionType(code: string, data: { description?: string; subject?: string }, studentId?: string): Promise<ApiResponse<QuestionType>> {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    const query = params.toString()
    return client.put(`/config/question-types/${code}${query ? '?' + query : ''}`, data)
  },

  // 删除试题类型
  deleteQuestionType(code: string, studentId?: string): Promise<ApiResponse<void>> {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    const query = params.toString()
    return client.delete(`/config/question-types/${code}${query ? '?' + query : ''}`)
  },

  // 获取错题类型列表
  getErrorTypes(options: GetErrorTypesOptions = {}): Promise<ApiResponse<{
    subject: string
    student_id?: string
    include_default: boolean
    items: ErrorType[]
  }>> {
    const query = buildConfigParams(options)
    console.log(`[configApi] 获取错题类型: ${query}`)
    return client.get(`/config/error-types?${query}`)
  },

  // 创建错题类型
  createErrorType(data: { description: string; subject?: string; student_id?: string }): Promise<ApiResponse<ErrorType>> {
    return client.post('/config/error-types', data)
  },

  // 更新错题类型
  updateErrorType(code: string, data: { description?: string; subject?: string }, studentId?: string): Promise<ApiResponse<ErrorType>> {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    const query = params.toString()
    return client.put(`/config/error-types/${code}${query ? '?' + query : ''}`, data)
  },

  // 删除错题类型
  deleteErrorType(code: string, studentId?: string): Promise<ApiResponse<void>> {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    const query = params.toString()
    return client.delete(`/config/error-types/${code}${query ? '?' + query : ''}`)
  },

  // 获取错整分组列表
  getGroups(options: GetGroupsOptions = {}): Promise<ApiResponse<{
    subject: string
    student_id?: string
    include_default: boolean
    items: CorrectionGroup[]
  }>> {
    const query = buildConfigParams(options)
    console.log(`[configApi] 获取错整分组: ${query}`)
    return client.get(`/config/groups?${query}`)
  },

  // 创建错整分组
  createGroup(data: { description: string; subject?: string; student_id?: string }): Promise<ApiResponse<CorrectionGroup>> {
    return client.post('/config/groups', data)
  },

  // 更新错整分组
  updateGroup(code: string, data: { description?: string; subject?: string }, studentId?: string): Promise<ApiResponse<CorrectionGroup>> {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    const query = params.toString()
    return client.put(`/config/groups/${code}${query ? '?' + query : ''}`, data)
  },

  // 删除错整分组
  deleteGroup(code: string, studentId?: string): Promise<ApiResponse<void>> {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    const query = params.toString()
    return client.delete(`/config/groups/${code}${query ? '?' + query : ''}`)
  },

  // 分配错题类型到分组
  assignErrorTypesToGroup(code: string, errorTypeCodes: string[], studentId?: string): Promise<ApiResponse<{ message: string; source?: string }>> {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    const query = params.toString()
    return client.post(`/config/groups/${code}/assign${query ? '?' + query : ''}`, { error_type_codes: errorTypeCodes })
  },

  // ========== 打印格式 ==========

  // 获取打印格式列表
  getPrintFormats(options: { studentId?: string; includeDefault?: boolean } = {}): Promise<ApiResponse<{
    student_id?: string
    include_default: boolean
    items: PrintFormat[]
  }>> {
    const params = new URLSearchParams()
    if (options.studentId) params.append('student_id', options.studentId)
    params.append('include_default', String(options.includeDefault ?? true))
    const query = params.toString()
    return client.get(`/config/print-formats?${query}`)
  },

  // 创建打印格式
  createPrintFormat(data: {
    description: string
    front_lines: number
    back_lines: number
    allow_dual_column: boolean
    allow_page_break: boolean
    student_id?: string
  }): Promise<ApiResponse<PrintFormat>> {
    return client.post('/config/print-formats', data)
  },

  // 更新打印格式
  updatePrintFormat(
    code: string,
    data: {
      description?: string
      front_lines?: number
      back_lines?: number
      allow_dual_column?: boolean
      allow_page_break?: boolean
    },
    studentId?: string
  ): Promise<ApiResponse<PrintFormat>> {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    const query = params.toString()
    return client.put(`/config/print-formats/${code}${query ? '?' + query : ''}`, data)
  },

  // 删除打印格式
  deletePrintFormat(code: string, studentId?: string): Promise<ApiResponse<void>> {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    const query = params.toString()
    return client.delete(`/config/print-formats/${code}${query ? '?' + query : ''}`)
  }
}

// 打印格式接口定义
export interface PrintFormat {
  id: number
  code: string
  description: string
  front_lines: number
  back_lines: number
  allow_dual_column: boolean
  allow_page_break: boolean
  student_id?: string
  is_default: boolean
  source: 'default' | 'custom' | 'override'
  created_at: string
  updated_at: string
}
