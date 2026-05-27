import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { studentApi } from '@/api'
import type { Student } from '@/types'

const STORAGE_KEY = 'selected_student_id'

export const useStudentStore = defineStore('student', () => {
  // State
  const students = ref<Student[]>([])
  const currentStudent = ref<Student | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // 从 localStorage 恢复学生选择
  function restoreSelectedStudent() {
    const savedId = localStorage.getItem(STORAGE_KEY)
    console.log('[studentStore] 尝试恢复学生选择:', savedId)
    if (savedId && students.value.length > 0) {
      const found = students.value.find(s => s.id === savedId)
      if (found) {
        currentStudent.value = found
        console.log('[studentStore] 已恢复学生选择:', found.nickname, found.id)
      } else {
        console.log('[studentStore] 未找到保存的学生ID:', savedId)
      }
    }
  }

  // Getters
  const studentOptions = computed(() => 
    (students.value || []).map(s => ({
      value: s.id,
      label: s.nickname,
      grade: s.grade
    }))
  )
  
  const defaultStudentId = computed(() => {
    // 查找 is_default=true 的学生
    const defaultStudent = students.value.find(s => s.is_default)
    if (defaultStudent) return defaultStudent.id
    // 如果没有默认学生，返回第一个
    return students.value.length > 0 ? students.value[0].id : null
  })

  // Actions
  
  // 加载学生列表
  async function loadStudents() {
    loading.value = true
    error.value = null
    
    try {
      const response = await studentApi.getStudents()
      // 后端返回的是数组，不是包装对象
      students.value = Array.isArray(response) ? response : (response.data || [])
      
      // 加载完成后尝试恢复之前选择的学生
      restoreSelectedStudent()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载学生列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 选择学生
  function selectStudent(studentId: string) {
    const found = students.value.find(s => s.id === studentId)
    currentStudent.value = found || null
    
    // 保存到 localStorage
    if (studentId) {
      localStorage.setItem(STORAGE_KEY, studentId)
      console.log('[studentStore] 已保存学生选择:', studentId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // 创建学生
  async function createStudent(nickname: string, grade?: string) {
    try {
      const response = await studentApi.createStudent({ nickname, grade })
      students.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建学生失败'
      throw err
    }
  }

  // 重置状态（用户登出时调用）
  function reset() {
    students.value = []
    currentStudent.value = null
    localStorage.removeItem(STORAGE_KEY)
    console.log('[studentStore] 已重置学生状态')
  }

  return {
    // State
    students,
    currentStudent,
    loading,
    error,

    // Getters
    studentOptions,
    defaultStudentId,

    // Actions
    loadStudents,
    selectStudent,
    createStudent,
    reset
  }
})
