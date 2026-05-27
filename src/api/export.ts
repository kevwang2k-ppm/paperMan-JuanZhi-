import client from './client'
import type { ExportConfig, ApiResponse } from '@/types'

// 导出任务响应
export interface ExportTask {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  stage: string
  stage_name: string
  message: string
  result?: {
    file_path: string
    filename: string
    total_questions: number
    file_size: number
    download_url: string
  }
  error?: string
  updated_at: string
}

// 导出配置方案
export interface ExportProfile {
  profile_name: string
  description: string
  paper_size: string
}

// 创建导出任务请求
export interface CreateExportRequest {
  // 模式选择
  mode?: 'single' | 'multi'
  
  // Single 模式参数
  paper_id?: string
  question_uuids?: string[]
  
  // Multi 模式参数
  question_ids?: string[]
  
  // 通用参数
  student_id: string
  config: ExportConfig
}

export const exportApi = {
  // 获取学生的导出配置方案列表
  getExportProfiles(studentId: string): Promise<ApiResponse<{
    student_id: string
    profiles: ExportProfile[]
  }>> {
    return client.get(`/web-fastlane/export-profiles/${studentId}`)
  },

  // 创建导出任务（异步）
  createExport(data: CreateExportRequest): Promise<ApiResponse<{
    task_id: string
    status: string
    message: string
    created_at: string
  }>> {
    return client.post('/web-fastlane/export', data)
  },

  // 查询导出任务状态（轮询使用）
  getStatus(taskId: string): Promise<ApiResponse<ExportTask>> {
    return client.get(`/web-fastlane/export/${taskId}/status`)
  },

  // 下载导出的文件
  downloadFile(taskId: string): string {
    const baseUrl = client.defaults.baseURL || ''
    return `${baseUrl}/web-fastlane/export/${taskId}/download`
  },

  // 触发下载（参考 openPaperPdf 方案：先 fetch blob，再本地 URL 下载）
  async triggerDownload(taskId: string, filename?: string): Promise<void> {
    const url = `/web-fastlane/export/${taskId}/download`
    const fileName = filename || `错题导出_${taskId}.pdf`

    try {
      const response = await client.get(url, {
        responseType: 'blob'
      })
      const blob = response as unknown as Blob
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
    } catch (e: any) {
      console.error('下载失败:', e)
      throw e
    }
  },

  // 导出错题（错整功能用）
  exportCorrections(data: {
    question_ids: string[]
    student_id: string
    export_config?: {
      输出幅面: string
      背景模板: string
    }
  }): Promise<ApiResponse<{
    template_path: string
    template_data: any
    slice_count: number
    slice_files: string[]
  }>> {
    return client.post('/corrections/export', data)
  }
}
