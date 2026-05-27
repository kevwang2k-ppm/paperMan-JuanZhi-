import client from './client'
import type { Student, ApiResponse } from '@/types'

export const studentApi = {
  // 获取学生列表（后端返回纯数组）
  getStudents(): Promise<Student[]> {
    return client.get('/students')
  },

  // 获取单个学生
  getStudent(id: string): Promise<ApiResponse<Student>> {
    return client.get(`/students/${id}`)
  },

  // 创建学生
  createStudent(data: {
    nickname: string
    grade?: string
    semester?: string
  }): Promise<ApiResponse<Student>> {
    return client.post('/students', data)
  },

  // 更新学生
  updateStudent(id: string, data: {
    nickname?: string
    grade?: string
    semester?: string
    is_default?: boolean
  }): Promise<ApiResponse<Student>> {
    return client.put(`/students/${id}`, data)
  },

  // 删除学生
  deleteStudent(id: string): Promise<ApiResponse<void>> {
    return client.delete(`/students/${id}`)
  }
}
