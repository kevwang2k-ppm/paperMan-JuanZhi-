<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <!-- 左侧：表单 -->
    <div class="md:col-span-1 bg-white rounded-xl border p-3 md:p-4 space-y-2 md:space-y-3">
      <h2 class="font-semibold text-gray-800">学生信息</h2>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          学生昵称 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.nickname"
          type="text"
          placeholder="请输入学生昵称"
          class="w-full px-2 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          年级 <span class="text-red-500">*</span>
        </label>
        <select
          v-model="form.grade"
          class="w-full px-2 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
        >
          <option value="">请选择年级</option>
          <option v-for="g in gradeOptions" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          学期 <span class="text-red-500">*</span>
        </label>
        <select
          v-model="form.semester"
          class="w-full px-2 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
        >
          <option value="">请选择学期</option>
          <option v-for="s in semesterOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="flex items-center gap-2 pt-2">
        <input id="isDefault" v-model="form.is_default" type="checkbox" class="rounded text-blue-600" />
        <label for="isDefault" class="text-sm text-gray-700">设为默认学生</label>
      </div>
      <div class="flex gap-2 pt-2">
        <button
          @click="handleAdd"
          class="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          添加
        </button>
        <button
          @click="handleUpdate"
          :disabled="!selectedStudent"
          class="flex-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          更新
        </button>
        <button
          @click="handleDelete"
          :disabled="!selectedStudent"
          class="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          删除
        </button>
      </div>
    </div>

    <!-- 右侧：列表 -->
    <div class="md:col-span-2 bg-white rounded-xl border p-3 md:p-4 space-y-2 md:space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-gray-800">已添加学生</h2>
        <span class="text-sm text-gray-500">共 {{ students.length }} 人</span>
      </div>
      <div class="border rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-3 py-1.5 text-left">昵称</th>
              <th class="px-3 py-1.5 text-left">年级</th>
              <th class="px-3 py-1.5 text-left">学期</th>
              <th class="px-3 py-1.5 text-left">编号</th>
              <th class="px-3 py-1.5 text-center">默认</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="s in students"
              :key="s.id"
              class="hover:bg-blue-50 cursor-pointer"
              :class="{ 'bg-blue-50': selectedStudent?.id === s.id }"
              @click="selectStudentRow(s)"
            >
              <td class="px-3 py-1.5 font-medium">{{ s.nickname }}</td>
              <td class="px-3 py-1.5">{{ s.grade }}</td>
              <td class="px-3 py-1.5">{{ s.semester }}</td>
              <td class="px-3 py-1.5 text-gray-500 font-mono text-sm">{{ s.id }}</td>
              <td class="px-3 py-1.5 text-center">
                <i v-if="s.is_default" class="fas fa-check text-green-500"></i>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="selectedStudent" class="bg-gray-50 rounded-lg px-3 py-2 text-sm">
        <span class="text-gray-600">当前选中学生编号：</span>
        <span class="font-mono text-gray-800">{{ selectedStudent.id }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStudentStore } from '@/stores/student'
import { studentApi, configApi } from '@/api'
import type { Student } from '@/types'

const studentStore = useStudentStore()
const students = computed(() => studentStore.students)
const selectedStudent = ref<Student | null>(null)

const gradeOptions = ref<string[]>([])
const semesterOptions = ref<string[]>([])

const form = ref({
  nickname: '',
  grade: '',
  semester: '',
  is_default: false
})

function selectStudentRow(s: Student) {
  selectedStudent.value = s
  form.value = {
    nickname: s.nickname,
    grade: s.grade,
    semester: s.semester,
    is_default: s.is_default
  }
}

function resetForm() {
  selectedStudent.value = null
  form.value = {
    nickname: '',
    grade: '',
    semester: '',
    is_default: false
  }
}

async function handleAdd() {
  if (!form.value.nickname.trim()) {
    alert('请输入学生昵称')
    return
  }
  if (!form.value.grade) {
    alert('请选择年级')
    return
  }
  if (!form.value.semester) {
    alert('请选择学期')
    return
  }
  try {
    await studentApi.createStudent({
      nickname: form.value.nickname.trim(),
      grade: form.value.grade,
      semester: form.value.semester
    })
    await studentStore.loadStudents()
    resetForm()
  } catch (err: any) {
    alert(err.message || '添加学生失败')
  }
}

async function handleUpdate() {
  if (!selectedStudent.value) return
  if (!form.value.nickname.trim()) {
    alert('请输入学生昵称')
    return
  }
  try {
    await studentApi.updateStudent(selectedStudent.value.id, {
      nickname: form.value.nickname.trim(),
      grade: form.value.grade,
      semester: form.value.semester,
      is_default: form.value.is_default
    })
    await studentStore.loadStudents()
    resetForm()
  } catch (err: any) {
    alert(err.message || '更新学生失败')
  }
}

async function handleDelete() {
  if (!selectedStudent.value) return
  if (!confirm(`确定要删除学生 "${selectedStudent.value.nickname}" 吗？`)) return
  try {
    await studentApi.deleteStudent(selectedStudent.value.id)
    await studentStore.loadStudents()
    resetForm()
  } catch (err: any) {
    alert(err.message || '删除学生失败')
  }
}

async function loadSystemConfig() {
  try {
    const res = await configApi.getSystemConfig()
    const data = (res as any).data || res
    if (data) {
      gradeOptions.value = data.grades || []
      semesterOptions.value = data.semesters || []
    }
  } catch (err) {
    console.error('加载系统配置失败:', err)
  }
}

onMounted(async () => {
  await studentStore.loadStudents()
  await loadSystemConfig()
})
</script>
