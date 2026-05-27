<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
    <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col m-0 sm:m-4">
      <!-- 头部 -->
      <div class="sticky top-0 bg-white px-4 py-3 border-b flex items-center justify-between rounded-t-2xl">
        <button @click="close" class="text-gray-600 hover:text-gray-800 p-1">
          <i class="fas fa-arrow-left text-lg"></i>
        </button>
        <div class="text-center">
          <h3 class="font-semibold text-gray-800">选择错题</h3>
          <p class="text-xs text-gray-500">{{ paper?.name }}</p>
        </div>
        <div class="w-8"></div>
      </div>
      
      <!-- 全选工具栏 -->
      <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            v-model="selectAll" 
            @change="toggleSelectAll"
            class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          >
          <span class="ml-2 text-sm text-gray-700">全选</span>
        </label>
        <span class="text-xs text-gray-500">
          已选 {{ selectedCount }}/{{ errorQuestions.length }} 题
        </span>
      </div>
      
      <!-- 题目列表 -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- 按大题分组 -->
        <div v-for="(group, groupIndex) in groupedQuestions" :key="groupIndex" class="mb-4">
          <!-- 大题标题 -->
          <div class="px-3 py-2 bg-gray-100 rounded-lg mb-2 flex items-center">
            <span class="font-medium text-gray-800">{{ group.title }}</span>
            <span class="ml-2 text-xs text-gray-500">({{ group.questions.length }}题)</span>
          </div>
          
          <!-- 小题列表 -->
          <div class="space-y-2">
            <label 
              v-for="question in group.questions" 
              :key="question.UUID"
              class="flex items-start p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
              :class="{ 'opacity-50': question.对错标签 !== 'F' }"
            >
              <input 
                type="checkbox" 
                v-model="selectedUuids"
                :value="question.UUID"
                :disabled="question.对错标签 !== 'F'"
                class="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
              >
              <div class="ml-3 flex-1">
                <div class="flex items-center mb-1">
                  <span class="font-medium text-gray-800">{{ question.题号 }}</span>
                  <span 
                    v-if="question.对错标签 === 'F'" 
                    class="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded"
                  >
                    错
                  </span>
                  <span 
                    v-else 
                    class="ml-2 px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded"
                  >
                    对
                  </span>
                  <span 
                    v-if="question.题目类型"
                    class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded"
                  >
                    {{ question.题目类型 }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 line-clamp-2">{{ question.内容引用 || '暂无内容' }}</p>
                <div class="flex items-center mt-2 text-xs text-gray-400">
                  <span><i class="fas fa-file mr-1"></i>第{{ question.所在页码 }}页</span>
                  <span v-if="question.主要错误类型" class="ml-3">
                    <i class="fas fa-tag mr-1"></i>{{ question.主要错误类型 }}
                  </span>
                </div>
              </div>
            </label>
          </div>
        </div>
        
        <!-- 加载状态 -->
        <div v-if="isLoading" class="py-8 text-center text-gray-500">
          <i class="fas fa-circle-notch fa-spin text-2xl mb-2"></i>
          <p class="text-sm">加载中...</p>
        </div>
        
        <!-- 空状态 -->
        <div v-if="!isLoading && errorQuestions.length === 0" class="py-8 text-center text-gray-500">
          <i class="fas fa-inbox text-4xl mb-3 text-gray-300"></i>
          <p class="text-sm">该试卷暂无错题</p>
          <p class="text-xs text-gray-400 mt-2">
            共 {{ questions.length }} 题，其中错题 {{ errorQuestions.length }} 题
          </p>
        </div>
      </div>
      
      <!-- 底部操作栏 -->
      <div class="sticky bottom-0 bg-white border-t px-4 py-3 flex items-center justify-between">
        <div class="text-sm">
          <span class="text-gray-500">已选择 </span>
          <span class="font-semibold text-purple-600">{{ selectedCount }}</span>
          <span class="text-gray-500"> 题</span>
        </div>
        <div class="flex space-x-3">
          <button 
            @click="close"
            class="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button 
            @click="confirm"
            :disabled="selectedCount === 0"
            class="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            确认添加
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { paperApi } from '@/api/paper'
import type { PaperQuestion } from '@/api/paper'

interface Props {
  paper: {
    id: string
    name: string
    created_at: string
    subject: string
  } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  confirm: [questions: PaperQuestion[], paperInfo: { id: string; name: string; created_at: string; subject: string }]
}>()

const isLoading = ref(false)
const questions = ref<PaperQuestion[]>([])
const selectedUuids = ref<string[]>([])
const selectAll = ref(false)

// 只显示错题
const errorQuestions = computed(() => {
  return questions.value.filter(q => q.对错标签 === 'F')
})

// 按大题分组
const groupedQuestions = computed(() => {
  const groups: { title: string; questions: PaperQuestion[] }[] = []
  let currentGroup: { title: string; questions: PaperQuestion[] } | null = null
  
  errorQuestions.value.forEach(q => {
    // 如果 level_1 变化，创建新分组
    if (!currentGroup || currentGroup.title !== q.level_1) {
      currentGroup = {
        title: q.level_1 || '其他',
        questions: []
      }
      groups.push(currentGroup)
    }
    currentGroup.questions.push(q)
  })
  
  return groups
})

const selectedCount = computed(() => selectedUuids.value.length)

// 监听 paper 变化，加载题目
watch(() => props.paper, async (newPaper) => {
  if (!newPaper) {
    console.log('[DEBUG] paper 为空')
    return
  }
  
  console.log('[DEBUG] 加载题目，paper id:', newPaper.id)
  isLoading.value = true
  selectedUuids.value = []  // 重置选择
  selectAll.value = false
  
  try {
    const response = await paperApi.getTreeDetail(newPaper.id)
    console.log('[DEBUG] API 返回类型:', typeof response)
    console.log('[DEBUG] API 返回:', response)
    
    // 处理不同的响应结构
    // 情况1: 后端返回 {code, message, data: {questions}}
    // 情况2: 后端直接返回 {paper_id, questions}
    let qs: PaperQuestion[] = []
    
    if (response && typeof response === 'object') {
      // 检查是否是标准 ApiResponse 结构
      if ('data' in response && response.data && typeof response.data === 'object') {
        // 标准结构: {code, message, data: {questions}}
        qs = (response.data as any).questions || []
      } else if ('questions' in response) {
        // 直接结构: {paper_id, questions}
        qs = (response as any).questions || []
      }
    }
    
    questions.value = qs
    
    // 默认全选所有错题
    const errorQs = qs.filter(q => q.对错标签 === 'F')
    selectedUuids.value = errorQs.map(q => q.UUID)
    selectAll.value = errorQs.length > 0
    
    console.log('[DEBUG] 题目数量:', questions.value.length)
    console.log('[DEBUG] 错题数量:', errorQs.length)
    console.log('[DEBUG] 默认选中:', selectedUuids.value.length)
  } catch (error) {
    console.error('[DEBUG] 加载题目失败:', error)
  } finally {
    isLoading.value = false
  }
}, { immediate: true })

function toggleSelectAll() {
  if (selectAll.value) {
    selectedUuids.value = errorQuestions.value.map(q => q.UUID)
  } else {
    selectedUuids.value = []
  }
}

function close() {
  emit('close')
}

function confirm() {
  if (!props.paper || selectedCount.value === 0) return
  
  const selectedQuestions = questions.value.filter(q => 
    selectedUuids.value.includes(q.UUID)
  )
  
  emit('confirm', selectedQuestions, {
    id: props.paper.id,
    name: props.paper.name,
    created_at: props.paper.created_at,
    subject: props.paper.subject
  })
}
</script>
