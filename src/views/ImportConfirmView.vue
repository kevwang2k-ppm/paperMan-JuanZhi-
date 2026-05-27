<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- 顶部导航 -->
    <header class="bg-white safe-area-top shadow-sm z-10">
      <div class="flex items-center justify-between px-4 py-3">
        <button @click="$router.back()" class="p-2 -ml-2 text-gray-600">
          <i class="fas fa-chevron-left"></i>
        </button>
        <h1 class="text-lg font-semibold text-gray-800">导入确认</h1>
        <div class="w-10"></div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="flex-1 overflow-y-auto p-4">
      <!-- 加载提示 -->
      <section v-if="!batchStore.batch" class="bg-yellow-50 rounded-xl p-4 mb-4">
        <div class="flex items-center text-yellow-800">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          <span>批次信息加载中或不可用</span>
        </div>
      </section>
      
      <!-- 试卷预览 -->
      <section class="bg-white rounded-2xl p-4 mb-4">
        <div class="flex items-center mb-3">
          <i class="fas fa-file-alt text-blue-500 mr-2"></i>
          <span class="font-medium text-gray-800">识别结果</span>
        </div>
        <div v-if="batchStore.batch" class="bg-blue-50 rounded-xl p-3">
          <p class="text-sm text-gray-600">识别到的试卷名称：</p>
          <p class="text-lg font-medium text-blue-800 mt-1">
            {{ batchStore.batch.exam_name || '识别中...' }}
          </p>
        </div>
        <div v-else class="bg-gray-50 rounded-xl p-3 text-gray-500">
          无法获取试卷信息
        </div>
      </section>

      <!-- 导入信息表单 -->
      <section class="bg-white rounded-2xl p-4">
        <h3 class="font-medium text-gray-800 mb-4">完善试卷信息</h3>
        
        <div class="space-y-4">
          <!-- 学生（只读） -->
          <div>
            <label class="block text-sm text-gray-600 mb-2">
              <i class="fas fa-user mr-1"></i>学生 <span class="text-gray-400">(不可修改)</span>
            </label>
            <div class="w-full px-4 py-3 bg-gray-100 rounded-xl text-gray-700">
              {{ studentName }}
            </div>
          </div>

          <!-- 学科（必填） -->
          <div>
            <label class="block text-sm text-gray-600 mb-2">
              <i class="fas fa-book mr-1"></i>学科 <span class="text-red-500">*</span>
            </label>
            <select 
              v-model="form.subject"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择学科</option>
              <option value="数学">数学</option>
              <option value="语文">语文</option>
              <option value="英语">英语</option>
              <option value="物理">物理</option>
              <option value="化学">化学</option>
              <option value="生物">生物</option>
              <option value="历史">历史</option>
              <option value="地理">地理</option>
              <option value="道法">道法</option>
            </select>
          </div>

          <!-- 年级（可修改，默认从学生表） -->
          <div>
            <label class="block text-sm text-gray-600 mb-2">
              <i class="fas fa-graduation-cap mr-1"></i>年级
            </label>
            <select 
              v-model="form.grade"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择年级</option>
              <option v-for="g in gradeOptions" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>

          <!-- 学期（可修改，默认从学生表） -->
          <div>
            <label class="block text-sm text-gray-600 mb-2">
              <i class="fas fa-calendar mr-1"></i>学期
            </label>
            <select 
              v-model="form.semester"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择学期</option>
              <option value="上半学期">上半学期</option>
              <option value="下半学期">下半学期</option>
            </select>
          </div>

          <!-- 试卷名称（可编辑，默认后端识别结果） -->
          <div>
            <label class="block text-sm text-gray-600 mb-2">
              <i class="fas fa-heading mr-1"></i>试卷名称 <span class="text-red-500">*</span>
              <span class="text-xs text-gray-400 ml-1">(可编辑)</span>
            </label>
            <input 
              v-model="form.paperName"
              type="text"
              placeholder="请输入试卷名称"
              class="w-full px-4 py-3 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
              :class="paperNameError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'"
            >
            <p v-if="paperNameError" class="text-xs text-red-500 mt-1">
              <i class="fas fa-exclamation-circle mr-1"></i>{{ paperNameError }}
            </p>
            <p v-else-if="batchStore.batch?.exam_name && batchStore.batch.exam_name !== form.paperName" 
               class="text-xs text-blue-600 mt-1">
              <i class="fas fa-info-circle mr-1"></i>已编辑，原识别结果：{{ batchStore.batch.exam_name }}
            </p>
          </div>
        </div>
      </section>

      <!-- 提示信息 -->
      <section class="mt-4 bg-yellow-50 rounded-xl p-4">
        <div class="flex items-start">
          <i class="fas fa-lightbulb text-yellow-600 mt-1 mr-3"></i>
          <div class="text-sm text-yellow-800">
            <p class="font-medium mb-1">导入说明</p>
            <ul class="space-y-1 text-xs">
              <li>• 确认导入后，试卷将复制到学生资料目录</li>
              <li>• 可在桌面端查看和编辑错题</li>
              <li>• 学科信息用于后续分类和筛选</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 底部留白 -->
      <div class="h-24"></div>
    </main>

    <!-- 底部操作栏 -->
    <footer class="fixed bottom-0 left-0 right-0 bg-white border-t safe-area-bottom z-20">
      <div class="p-4">
        <button 
          @click="confirmImport"
          :disabled="!canSubmit || isImporting"
          class="w-full py-3 rounded-xl font-medium flex items-center justify-center transition-colors"
          :class="canSubmit && !isImporting ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'"
        >
          <i v-if="isImporting" class="fas fa-circle-notch fa-spin mr-2"></i>
          <span>{{ isImporting ? '导入中...' : '确认导入' }}</span>
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBatchStore, useStudentStore } from '@/stores'
import { paperApi, batchApi } from '@/api'

const route = useRoute()
const router = useRouter()
const batchStore = useBatchStore()
const studentStore = useStudentStore()

const batchId = route.params.batchId as string
const isImporting = ref(false)

// URL 不安全的特殊字符（与后端保持一致）
// 半角: ? # &  |  全角: ？ ＃ ＆
const URL_UNSAFE_CHARS = '?#&？＃＆'

// 校验试卷名称
function validatePaperName(name: string): string | null {
  const found: string[] = []
  for (const char of name) {
    if (URL_UNSAFE_CHARS.includes(char)) {
      found.push(char)
    }
  }
  if (found.length > 0) {
    return `不能包含以下字符: ${found.join(', ')}`
  }
  return null
}

// 表单数据
const form = ref({
  subject: '',
  grade: '',
  semester: '',
  paperName: ''
})

// 年级选项
const gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', 
                      '初一', '初二', '初三', '高一', '高二', '高三']

// 计算属性
const studentName = computed(() => {
  if (!batchStore.batch?.student_id) return '加载中...'
  const student = studentStore.students.find(s => s?.id === batchStore.batch?.student_id)
  return student?.nickname || '未知学生'
})

const paperNameError = computed(() => {
  return validatePaperName(form.value.paperName)
})

const canSubmit = computed(() => {
  return form.value.subject && 
         form.value.grade && 
         form.value.semester && 
         form.value.paperName && 
         !paperNameError.value
})

onMounted(async () => {
  // 检查 batchId
  if (!batchId) {
    alert('批次ID缺失，请重新上传')
    router.push('/')
    return
  }
  
  // 如果 store 中没有 batch 数据（如页面刷新后），尝试恢复
  if (!batchStore.batch) {
    try {
      // 调用 API 获取批次基本信息
      const response = await batchApi.getBatch(batchId)
      const data = (response as any).data || response
      if (data) {
        // 字段映射：后端返回 batch_id，前端期望 id
        const batchData = {
          ...data,
          id: data.batch_id || data.id
        }
        batchStore.setBatch(batchData)
        console.log('恢复批次信息:', batchData)
      }
    } catch (err) {
      console.warn('恢复批次信息失败:', err)
    }
  }
  
  // 加载批次信息（获取识别出的试卷名称）
  try {
    await batchStore.loadQuestions()
  } catch (err) {
    console.error('加载批次信息失败:', err)
  }
  
  // 加载学生信息
  try {
    await studentStore.loadStudents()
  } catch (err) {
    console.error('加载学生信息失败:', err)
  }
  
  // 初始化表单
  if (batchStore.batch) {
    // 试卷名称使用后端识别结果
    form.value.paperName = batchStore.batch.exam_name || ''
    console.log('试卷名称已设置:', form.value.paperName)
    
    // 年级/学期从学生信息获取
    const student = studentStore.students.find(s => s?.id === batchStore.batch?.student_id)
    if (student) {
      form.value.grade = student.grade || '三年级'
      form.value.semester = '上半学期' // 默认上半学期，学生表可能没有这个字段
    }
  } else {
    console.warn('批次信息不可用')
  }
})

async function confirmImport() {
  if (!canSubmit.value || !batchStore.batch) return
  
  // 二次校验试卷名称
  const nameError = validatePaperName(form.value.paperName)
  if (nameError) {
    alert('试卷名称错误: ' + nameError)
    return
  }
  
  // 检查 student_id
  if (!batchStore.batch.student_id) {
    alert('学生信息缺失，请刷新页面重试')
    return
  }
  
  isImporting.value = true
  
  // 调试日志
  const requestData = {
    batch_id: batchId,
    student_id: batchStore.batch.student_id,
    subject: form.value.subject,
    grade: form.value.grade,
    semester: form.value.semester,
    paper_name: form.value.paperName
  }
  console.log('导入请求参数:', requestData)
  
  try {
    // 调用导入 API
    const response = await paperApi.importPaper(requestData) as any
    const result = response.data || response
    
    // 导入成功，使用返回的 paper_id 跳转到 paper 模式的审阅页
    const paperId = result?.paper_id
    if (paperId) {
      console.log('导入成功，跳转到 paper 模式:', paperId)
      router.push(`/review/${paperId}?from=import`)
    } else {
      // 兼容：如果没有 paper_id，仍然使用 batch 模式
      router.push(`/review/${batchId}`)
    }
  } catch (err) {
    console.error('导入失败:', err)
    alert('导入失败: ' + (err instanceof Error ? err.message : '未知错误'))
    isImporting.value = false
  }
}
</script>
