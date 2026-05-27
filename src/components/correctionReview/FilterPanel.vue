<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center" @click.self="close">
    <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto m-0 sm:m-4">
      <!-- 头部 -->
      <div class="sticky top-0 bg-white px-4 py-3 border-b flex items-center justify-between">
        <h3 class="font-semibold text-gray-800">过滤条件</h3>
        <button @click="close" class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
          <i class="fas fa-times text-gray-600"></i>
        </button>
      </div>
      
      <div class="p-4">
        <!-- 学科信息（只读，从错整选择页面自动获取） -->
        <div class="mb-6">
          <h4 class="font-medium text-gray-700 mb-3 flex items-center">
            <i class="fas fa-book mr-2 text-indigo-500"></i>当前学科
          </h4>
          <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <span class="text-sm font-medium text-indigo-700">
              {{ store.currentSubject || '未设置' }}
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-2">
            <i class="fas fa-info-circle mr-1"></i>学科信息来自试卷选择页面
          </p>
        </div>

        <!-- 学生信息 -->
        <div class="mb-6 p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">当前学生</span>
            <span class="text-sm font-medium text-gray-800">
              {{ currentStudentName || '系统默认' }}
            </span>
          </div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-sm text-gray-600">学生ID</span>
            <span class="text-xs font-mono text-gray-500 truncate max-w-[200px]" :title="currentStudentId">
              {{ currentStudentId || '未选择' }}
            </span>
          </div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-sm text-gray-600">学科范围</span>
            <span class="text-sm font-medium text-gray-800">
              {{ store.currentSubject || '未设置' }}
            </span>
          </div>
        </div>
        
        <!-- 题目类型 -->
        <div class="mb-6">
          <h4 class="font-medium text-gray-700 mb-3 flex items-center">
            <i class="fas fa-layer-group mr-2 text-blue-500"></i>题目类型
            <span class="ml-2 text-xs text-orange-500">(选中将被排除)</span>
            <span v-if="isLoadingQuestionTypes" class="ml-2 text-xs text-gray-400">
              <i class="fas fa-circle-notch fa-spin"></i>加载中...
            </span>
          </h4>
          <div class="flex flex-wrap gap-2">
            <label 
              v-for="type in allQuestionTypes" 
              :key="type.code"
              class="flex items-center px-3 py-2 rounded-lg transition-colors"
              :class="[
                isSubjectMatch(type.subject) 
                  ? 'bg-gray-50 cursor-pointer hover:bg-gray-100' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                { 'bg-blue-50 border border-blue-200': selectedQuestionTypes.includes(type.code) && isSubjectMatch(type.subject) }
              ]"
            >
              <input 
                type="checkbox" 
                v-model="selectedQuestionTypes"
                :value="type.code"
                :disabled="!isSubjectMatch(type.subject)"
                class="mr-2 rounded text-blue-600 focus:ring-blue-500"
                :class="{ 'opacity-50 cursor-not-allowed': !isSubjectMatch(type.subject) }"
              >
              <span class="text-sm" :class="{ 'opacity-50': !isSubjectMatch(type.subject) }">{{ getTypeDisplayLabel(type) }}</span>
            </label>
          </div>
          <p v-if="loadError" class="text-sm text-red-400 mt-2">{{ loadError }}</p>
          <p v-else-if="allQuestionTypes.length === 0 && !isLoadingQuestionTypes" class="text-sm text-gray-400 mt-2">
            暂无数据
          </p>
        </div>
        
        <!-- 错题类型 -->
        <div class="mb-6">
          <h4 class="font-medium text-gray-700 mb-3 flex items-center">
            <i class="fas fa-tag mr-2 text-red-500"></i>错题类型
            <span class="ml-2 text-xs text-orange-500">(选中将被排除)</span>
            <span v-if="isLoadingErrorTypes" class="ml-2 text-xs text-gray-400">
              <i class="fas fa-circle-notch fa-spin"></i>加载中...
            </span>
          </h4>
          <div class="flex flex-wrap gap-2">
            <label 
              v-for="type in allErrorTypes" 
              :key="type.code"
              class="flex items-center px-3 py-2 rounded-lg transition-colors"
              :class="[
                isSubjectMatch(type.subject) 
                  ? 'bg-gray-50 cursor-pointer hover:bg-gray-100' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                { 'bg-red-50 border border-red-200': selectedErrorTypes.includes(type.code) && isSubjectMatch(type.subject) }
              ]"
            >
              <input 
                type="checkbox" 
                v-model="selectedErrorTypes"
                :value="type.code"
                :disabled="!isSubjectMatch(type.subject)"
                class="mr-2 rounded text-red-600 focus:ring-red-500"
                :class="{ 'opacity-50 cursor-not-allowed': !isSubjectMatch(type.subject) }"
              >
              <span class="text-sm" :class="{ 'opacity-50': !isSubjectMatch(type.subject) }">{{ getTypeDisplayLabel(type) }}</span>
            </label>
          </div>
          <p v-if="loadError" class="text-sm text-red-400 mt-2">{{ loadError }}</p>
          <p v-else-if="allErrorTypes.length === 0 && !isLoadingErrorTypes" class="text-sm text-gray-400 mt-2">
            暂无数据
          </p>
        </div>
        
        <!-- 上次错整时间 -->
        <div class="mb-6">
          <h4 class="font-medium text-gray-700 mb-3 flex items-center">
            <i class="far fa-clock mr-2 text-green-500"></i>上次错整时间
          </h4>
          <div class="flex items-center gap-2">
            <input 
              type="date" 
              v-model="dateFrom"
              class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
            <span class="text-gray-400">至</span>
            <input 
              type="date" 
              v-model="dateTo"
              class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
          </div>
        </div>
      </div>
      
      <!-- 底部按钮 -->
      <div class="sticky bottom-0 bg-white border-t px-4 py-3 flex gap-3">
        <button 
          @click="reset"
          class="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          重置
        </button>
        <button 
          @click="apply"
          class="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          应用 ({{ filteredCount }}题)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { configApi } from '@/api'
import { useCorrectionReviewStore } from '@/stores/correctionReview'
import { useStudentStore } from '@/stores/student'

interface QuestionTypeItem {
  code: string
  description: string
  subject: string
  source: 'default' | 'custom' | 'override'
}

interface ErrorTypeItem {
  code: string
  description: string
  subject: string
  source: 'default' | 'custom' | 'override'
}

const emit = defineEmits<{
  close: []
  apply: []
}>()

const store = useCorrectionReviewStore()
const studentStore = useStudentStore()

// 状态
const allQuestionTypes = ref<QuestionTypeItem[]>([])  // 当前学科的题目类型
const allErrorTypes = ref<ErrorTypeItem[]>([])        // 当前学科的错题类型
const isLoadingQuestionTypes = ref(false)
const isLoadingErrorTypes = ref(false)
const loadError = ref('')

// 筛选条件
const selectedQuestionTypes = ref<string[]>([...store.filterSettings.questionTypes])
const selectedErrorTypes = ref<string[]>([...store.filterSettings.errorTypes])
const dateFrom = ref(store.filterSettings.dateRange.from)
const dateTo = ref(store.filterSettings.dateRange.to)

// 获取当前学生ID
const currentStudentId = computed(() => {
  const id = studentStore.currentStudent?.id || studentStore.defaultStudentId || undefined
  console.log('[FilterPanel] currentStudentId computed:', {
    'currentStudent?.id': studentStore.currentStudent?.id,
    'defaultStudentId': studentStore.defaultStudentId,
    'result': id
  })
  return id
})

// 获取当前学生名称
const currentStudentName = computed(() => {
  return studentStore.currentStudent?.nickname || 
    studentStore.students.find(s => s.id === currentStudentId.value)?.nickname
})

const filteredCount = computed(() => {
  return store.sortedAndFilteredQuestions.length
})

// 判断类型是否应该显示（因为只加载了当前学科的类型，所以都显示）
function isSubjectMatch(typeSubject: string): boolean {
  // 后端已经根据 currentSubject 过滤了，这里直接返回 true
  // 但为了保险起见，还是检查一下是否是当前学科或公用
  const subject = store.currentSubject
  if (!subject || subject === '未分类') {
    return typeSubject === '公用'
  }
  return typeSubject === subject || typeSubject === '公用'
}

// 加载题目类型和错题类型（只加载当前学科的类型）
async function loadTypes() {
  const studentId = currentStudentId.value
  // 使用 store 中的 currentSubject，如果没有则默认为 'all'
  const subject = store.currentSubject || 'all'
  
  console.log('[FilterPanel] ========== 开始加载类型数据 ==========')
  console.log('[FilterPanel] 参数:', { subject, studentId })
  console.log('[FilterPanel] currentStudent:', studentStore.currentStudent)
  console.log('[FilterPanel] students:', studentStore.students)
  console.log('[FilterPanel] defaultStudentId:', studentStore.defaultStudentId)
  
  // 并行加载题目类型和错题类型
  await Promise.all([
    loadQuestionTypes(subject, studentId),
    loadErrorTypes(subject, studentId)
  ])
  
  console.log('[FilterPanel] ========== 类型数据加载完成 ==========')
}

// 加载题目类型
async function loadQuestionTypes(subject: string, studentId?: string) {
  isLoadingQuestionTypes.value = true
  loadError.value = ''
  
  try {
    console.log('[FilterPanel] >>> 开始加载题目类型:', { subject, studentId })
    
    // follow review9 API 调用方式
    const response = await configApi.getQuestionTypes({
      subject,
      studentId,
      includeDefault: true,
      includeCommon: true
    }) as any
    
    console.log('[FilterPanel] 题目类型原始响应:', response)
    console.log('[FilterPanel] 题目类型响应类型:', typeof response)
    console.log('[FilterPanel] 题目类型 response.code:', response?.code)
    console.log('[FilterPanel] 题目类型 response.message:', response?.message)
    console.log('[FilterPanel] 题目类型 response.data:', response?.data)
    
    // 处理 ApiResponse 结构: { code, message, data: { subject, student_id, items } }
    const data = response?.data || response
    console.log('[FilterPanel] 题目类型解析后的 data:', data)
    
    const items = data?.items || []
    console.log('[FilterPanel] 题目类型 items 数组:', items)
    console.log('[FilterPanel] 题目类型 items 数量:', items.length)
    
    // 详细打印每个 item 的 source 字段
    if (items.length > 0) {
      console.log('[FilterPanel] 题目类型详细数据:')
      items.forEach((item: any, index: number) => {
        console.log(`  [${index}] code=${item.code}, desc=${item.description}, subject=${item.subject}, source=${item.source}, student_id=${item.student_id}`)
      })
    }
    
    allQuestionTypes.value = items.map((item: any) => ({
      code: item.code,
      description: item.description || item.code,
      subject: item.subject || '公用',
      source: item.source || 'default'
    }))
    
    console.log('[FilterPanel] 题目类型映射后的数据:', allQuestionTypes.value)
    
    // 调试：统计各类型的数量
    const defaultCount = allQuestionTypes.value.filter(i => i.source === 'default').length
    const overrideCount = allQuestionTypes.value.filter(i => i.source === 'override').length
    const customCount = allQuestionTypes.value.filter(i => i.source === 'custom').length
    console.log(`[FilterPanel] 题目类型统计: default=${defaultCount}, override=${overrideCount}, custom=${customCount}`)
    
    console.log('[FilterPanel] <<< 题目类型加载完成:', allQuestionTypes.value.length, '条')
  } catch (error: any) {
    console.error('[FilterPanel] 加载题目类型失败:', error)
    loadError.value = error.message || '加载题目类型失败'
  } finally {
    isLoadingQuestionTypes.value = false
  }
}

// 加载错题类型
async function loadErrorTypes(subject: string, studentId?: string) {
  isLoadingErrorTypes.value = true
  loadError.value = ''
  
  try {
    console.log('[FilterPanel] >>> 开始加载错题类型:', { subject, studentId })
    
    // follow review9 API 调用方式
    const response = await configApi.getErrorTypes({
      subject,
      studentId,
      includeDefault: true,
      includeCommon: true
    }) as any
    
    console.log('[FilterPanel] 错题类型原始响应:', response)
    console.log('[FilterPanel] 错题类型响应类型:', typeof response)
    console.log('[FilterPanel] 错题类型 response.code:', response?.code)
    console.log('[FilterPanel] 错题类型 response.message:', response?.message)
    console.log('[FilterPanel] 错题类型 response.data:', response?.data)
    
    // 处理 ApiResponse 结构: { code, message, data: { subject, student_id, items } }
    const data = response?.data || response
    console.log('[FilterPanel] 错题类型解析后的 data:', data)
    
    const items = data?.items || []
    console.log('[FilterPanel] 错题类型 items 数组:', items)
    console.log('[FilterPanel] 错题类型 items 数量:', items.length)
    
    // 详细打印每个 item 的 source 字段
    if (items.length > 0) {
      console.log('[FilterPanel] 错题类型详细数据:')
      items.forEach((item: any, index: number) => {
        console.log(`  [${index}] code=${item.code}, desc=${item.description}, subject=${item.subject}, source=${item.source}, student_id=${item.student_id}`)
      })
    }
    
    allErrorTypes.value = items.map((item: any) => ({
      code: item.code,
      description: item.description || item.code,
      subject: item.subject || '公用',
      source: item.source || 'default'
    }))
    
    console.log('[FilterPanel] 错题类型映射后的数据:', allErrorTypes.value)
    
    // 调试：统计各类型的数量
    const defaultCount = allErrorTypes.value.filter(i => i.source === 'default').length
    const overrideCount = allErrorTypes.value.filter(i => i.source === 'override').length
    const customCount = allErrorTypes.value.filter(i => i.source === 'custom').length
    console.log(`[FilterPanel] 错题类型统计: default=${defaultCount}, override=${overrideCount}, custom=${customCount}`)
    
    console.log('[FilterPanel] <<< 错题类型加载完成:', allErrorTypes.value.length, '条')
  } catch (error: any) {
    console.error('[FilterPanel] 加载错题类型失败:', error)
    loadError.value = error.message || '加载错题类型失败'
  } finally {
    isLoadingErrorTypes.value = false
  }
}

// 监视学生ID变化
watch(currentStudentId, (newId, oldId) => {
  console.log('[FilterPanel] currentStudentId changed:', { oldId, newId })
})

onMounted(async () => {
  console.log('[FilterPanel] ========== onMounted 开始 ==========')
  console.log('[FilterPanel] onMounted, 当前学生:', studentStore.currentStudent)
  console.log('[FilterPanel] onMounted, 学生列表:', studentStore.students)
  console.log('[FilterPanel] onMounted, localStorage selected_student_id:', localStorage.getItem('selected_student_id'))
  
  // 确保学生列表已加载
  if (studentStore.students.length === 0) {
    console.log('[FilterPanel] 学生列表为空，开始加载...')
    await studentStore.loadStudents()
    console.log('[FilterPanel] 学生列表加载完成:', studentStore.students)
    console.log('[FilterPanel] loadStudents 后 currentStudent:', studentStore.currentStudent)
  }
  
  // 等待一下确保 computed 更新
  await new Promise(resolve => setTimeout(resolve, 0))
  
  console.log('[FilterPanel] 最终 currentStudentId:', currentStudentId.value)
  console.log('[FilterPanel] 最终 currentStudent:', studentStore.currentStudent)
  console.log('[FilterPanel] 当前学科:', store.currentSubject)
  
  // 加载类型数据（根据 store.currentSubject）
  await loadTypes()
  console.log('[FilterPanel] ========== onMounted 完成 ==========')
})

// 获取显示文本 - 根据source加前缀，并显示学科
function getTypeDisplayLabel(item: QuestionTypeItem | ErrorTypeItem): string {
  console.log('[FilterPanel] getTypeDisplayLabel:', item)
  
  // 根据 source 显示不同前缀
  // default:  [默] 默认配置
  // override: [改] 学生覆盖默认的配置
  // custom:   [自] 学生自定义的新配置
  let prefix: string
  switch (item.source) {
    case 'default':
      prefix = '[默]'
      break
    case 'override':
      prefix = '[改]'
      break
    case 'custom':
      prefix = '[自]'
      break
    default:
      prefix = '[默]'
  }
  const subjectPrefix = item.subject !== '公用' ? `[${item.subject}]` : ''
  const result = `${prefix}${subjectPrefix}${item.description}`
  console.log('[FilterPanel] getTypeDisplayLabel result:', result)
  return result
}

function reset() {
  selectedQuestionTypes.value = []
  selectedErrorTypes.value = []
  dateFrom.value = null
  dateTo.value = null
  
  store.resetFilter()
  
  // 重置后重新加载类型数据
  loadTypes()
}

function apply() {
  store.setFilter({
    questionTypes: selectedQuestionTypes.value,
    errorTypes: selectedErrorTypes.value,
    dateRange: {
      from: dateFrom.value,
      to: dateTo.value
    }
  })
  emit('apply')
}

function close() {
  emit('close')
}
</script>
