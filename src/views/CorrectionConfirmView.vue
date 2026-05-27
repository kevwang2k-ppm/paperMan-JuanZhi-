<template>
  <div class="h-screen bg-gray-50 flex flex-col overflow-hidden">
    <!-- 顶部导航 -->
    <header class="bg-white shadow-sm z-20 safe-area-top flex-shrink-0">
      <div class="flex items-center justify-between px-4 py-3">
        <button @click="goBack" class="text-gray-600 hover:text-gray-800 p-1">
          <i class="fas fa-arrow-left text-lg"></i>
        </button>
        <h1 class="text-lg font-semibold text-gray-800">错整确认</h1>
        <button 
          @click="goToExport" 
          class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-purple-50 transition-colors"
          :disabled="stats.willExport === 0"
          :class="stats.willExport === 0 ? 'text-gray-300' : 'text-purple-600'"
        >
          <i class="fas fa-chart-pie text-xl"></i>
        </button>
      </div>
    </header>

    <!-- 排序和过滤栏 -->
    <section class="bg-white px-4 py-3 border-b flex items-center gap-4 overflow-x-auto flex-shrink-0">
      <!-- 排序 -->
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-sm text-gray-500">排序:</span>
        <select 
          v-model="sortField" 
          @change="updateSort"
          class="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
        >
          <option value="review_date">上次错整时间</option>
          <option value="paper_name">试卷名称</option>
          <option value="question_type">题目类型</option>
        </select>
        <button 
          @click="toggleSortOrder" 
          class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg transition-colors"
        >
          <i class="fas" :class="sortOrder === 'asc' ? 'fa-sort-amount-up' : 'fa-sort-amount-down'"></i>
        </button>
      </div>
      
      <!-- 过滤 -->
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-sm text-gray-500">过滤:</span>
        <button 
          @click="showFilterPanel = true" 
          class="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors flex items-center"
        >
          <i class="fas fa-filter mr-1"></i>条件
          <span v-if="hasActiveFilters" class="ml-1 w-2 h-2 bg-purple-600 rounded-full"></span>
        </button>
        <button 
          @click="store.toggleHideFiltered()" 
          class="text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center"
          :class="store.hideFilteredQuestions ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        >
          <i class="fas" :class="store.hideFilteredQuestions ? 'fa-eye-slash' : 'fa-eye'"></i>
          <span class="ml-1">{{ store.hideFilteredQuestions ? '隐藏已排除' : '显示所有' }}</span>
        </button>
      </div>
    </section>

    <!-- 主内容区 -->
    <main class="flex-1 flex min-h-0">
      <!-- 左侧：题目列表 - 独立滚动 -->
      <div class="w-2/5 overflow-y-auto border-r bg-white">
        <div class="p-3 text-sm text-gray-500 border-b bg-gray-50 flex items-center justify-between">
          <span>共 {{ filteredQuestions.length }} 题</span>
          <span v-if="stats.excluded + stats.filtered > 0" class="text-gray-400">已排除 {{ stats.excluded + stats.filtered }} 题</span>
        </div>
        
        <div 
          v-for="(question, index) in filteredQuestions" 
          :key="question.uuid"
          class="p-3 border-b cursor-pointer transition-colors"
          :class="{
            'bg-purple-50 border-l-4 border-l-purple-500': currentIndex === index,
            'opacity-50': isExcluded(question.uuid) || isFiltered(question.uuid),
            'hover:bg-gray-50': currentIndex !== index
          }"
          @click="selectQuestion(index)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="font-medium text-gray-800">{{ getQuestionNumber(question) }}</span>
                <span 
                  v-if="question.question_type_name" 
                  class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded"
                >
                  {{ question.question_type_name }}
                </span>
                <!-- 主要错误类型 -->
                <span 
                  v-if="question.error_type_name" 
                  class="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded"
                >
                  {{ question.error_type_name }}
                </span>
                <!-- 次要错误类型 -->
                <span 
                  v-if="question.secondary_error_type_name" 
                  class="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded"
                >
                  {{ question.secondary_error_type_name }}
                </span>
                <span v-if="isExcluded(question.uuid) || isFiltered(question.uuid)" class="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                  已排除
                </span>
              </div>
              <!-- 题目内容 -->
              <div class="text-xs text-gray-600 mb-1 line-clamp-2">{{ question.content || '无内容' }}</div>
              <!-- 试卷名称和上次错整时间 -->
              <div class="flex items-center gap-2 text-xs text-gray-400">
                <span class="truncate">{{ question.paper_name }}</span>
                <span class="flex items-center shrink-0">
                  <i class="far fa-clock mr-1"></i>
                  {{ formatReviewDate(question.review_date) }}
                </span>
              </div>
            </div>
            <input 
              type="checkbox" 
              :checked="!isExcluded(question.uuid) && !isFiltered(question.uuid)"
              @click.stop="toggleExclude(question.uuid)"
              class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 ml-2"
            >
          </div>
        </div>
        
        <!-- 加载状态 -->
        <div v-if="isLoading" class="py-8 text-center text-gray-500">
          <i class="fas fa-circle-notch fa-spin text-2xl mb-2"></i>
          <p class="text-sm">加载中...</p>
        </div>
        
        <!-- 空状态 -->
        <div v-if="!isLoading && filteredQuestions.length === 0" class="py-8 text-center text-gray-500">
          <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
          <p class="text-sm">暂无符合条件的题目</p>
        </div>
      </div>
      
      <!-- 右侧：图片预览 - 固定位置，内部可滚动 -->
      <div class="flex-1 overflow-hidden bg-gray-100 p-4">
        <div v-if="currentQuestion" class="h-full overflow-y-auto space-y-4">
          <!-- 原题图片 -->
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="font-medium text-gray-700">
                  <i class="fas fa-image mr-2 text-blue-500"></i>原题
                </h3>
                <p class="text-xs text-gray-400 mt-0.5 font-mono">{{ currentQuestion.uuid }}</p>
              </div>
              <button 
                @click="showOriginalPaper" 
                class="text-sm text-blue-600 hover:text-blue-800"
              >
                查看原卷 <i class="fas fa-external-link-alt ml-1"></i>
              </button>
            </div>
            <div 
              class="relative bg-gray-50 rounded-lg overflow-hidden min-h-[200px] flex items-center justify-center cursor-pointer"
              @click="showOriginalPaper()"
            >
              <img 
                v-if="currentQuestion.slice_image"
                :src="getSliceImageUrl(currentQuestion.slice_image)" 
                class="w-full h-auto max-h-[300px] object-contain"
                alt="原题"
                @error="$event.target.style.display='none'"
              >
              <div v-else class="text-center text-gray-400 py-12">
                <i class="fas fa-image text-4xl mb-3 text-gray-300"></i>
                <p>原题图片不存在</p>
              </div>
            </div>
          </div>
          
          <!-- 订正图片 -->
          <div v-if="currentQuestion.correction_images?.length > 0" class="bg-white rounded-xl p-4 shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-gray-700">
                <i class="fas fa-check-circle mr-2 text-green-500"></i>
                订正 ({{ currentQuestion.correction_images.length }}张)
              </h3>
            </div>
            <div 
              class="relative bg-gray-50 rounded-lg overflow-hidden min-h-[200px] flex items-center justify-center cursor-zoom-in"
              @click="showImagePreview"
            >
              <img 
                :src="getCorrectionImageUrl(currentQuestion.correction_images[currentCorrectionIndex])" 
                class="w-full h-auto max-h-[300px] object-contain rounded-lg"
                alt="订正"
                @error="handleImageError"
              >
              <div class="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                <i class="fas fa-expand mr-1"></i>点击查看
              </div>
            </div>
            <!-- 切换按钮 -->
            <div v-if="currentQuestion.correction_images.length > 1" class="flex justify-center gap-4 mt-3">
              <button 
                @click="prevCorrection"
                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                <i class="fas fa-chevron-left mr-1"></i>上一张
              </button>
              <span class="py-2 text-gray-500 text-sm">
                {{ currentCorrectionIndex + 1 }} / {{ currentQuestion.correction_images.length }}
              </span>
              <button 
                @click="nextCorrection"
                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                下一张<i class="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
          
          <div v-else class="bg-white rounded-xl p-4 shadow-sm text-center text-gray-400 py-12">
            <i class="fas fa-inbox text-4xl mb-3 text-gray-300"></i>
            <p>暂无订正图片</p>
          </div>
        </div>
        
        <!-- 题目切换按钮 -->
        <div class="fixed bottom-24 right-4 flex flex-col gap-2 z-10">
          <button 
            @click="prevQuestion" 
            :disabled="currentIndex === 0"
            class="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30"
          >
            <i class="fas fa-chevron-up text-gray-600"></i>
          </button>
          <button 
            @click="nextQuestion" 
            :disabled="currentIndex >= filteredQuestions.length - 1"
            class="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30"
          >
            <i class="fas fa-chevron-down text-gray-600"></i>
          </button>
        </div>
      </div>
    </main>

    <!-- 底部统计栏 -->
    <footer class="bg-white border-t px-4 py-3 flex items-center justify-between z-20 flex-shrink-0">
      <div class="text-sm">
        <span v-if="stats.excluded + stats.filtered > 0" class="text-gray-500">已排除 {{ stats.excluded + stats.filtered }} 题</span>
        <span class="text-purple-600 font-medium ml-3">将导出 {{ stats.willExport }} 题</span>
      </div>
      <button 
        @click="goToExport" 
        :disabled="stats.willExport === 0"
        class="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
      >
        <i class="fas fa-file-export mr-2"></i>
        确认导出
      </button>
    </footer>

    <!-- 过滤面板弹窗 -->
    <FilterPanel 
      v-if="showFilterPanel" 
      @close="showFilterPanel = false" 
      @apply="showFilterPanel = false"
    />
    
    <!-- 原卷预览弹窗 -->
    <OriginalPaperModal 
      v-if="showOriginalPaperModal && currentQuestion" 
      :paper-id="currentQuestion.paper_id"
      :paper-name="currentQuestion.paper_name"
      :page-number="getPageNumber(currentQuestion)"
      :total-pages="currentPaperTotalPages"
      :bbox="getBbox(currentQuestion)"
      :question-positions="currentQuestionPositions"
      @close="showOriginalPaperModal = false"
    />
    
    <!-- 订正图片全屏预览弹窗 - 支持缩放和拖动 -->
    <div 
      v-if="showImagePreviewModal && currentQuestion" 
      class="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col"
    >
      <!-- 头部 - 适配 iPhone 刘海屏 -->
      <div class="flex items-center justify-between px-4 pb-3 bg-black text-white header-safe-area">
        <div>
          <h3 class="font-medium">订正图片 {{ currentCorrectionIndex + 1 }} / {{ currentQuestion.correction_images.length }}</h3>
          <p class="text-xs text-gray-400">{{ currentQuestion.paper_name }}</p>
        </div>
        <button 
          @click="closeImagePreview" 
          class="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <!-- 工具栏 -->
      <div class="px-4 py-2 bg-gray-900 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button @click="zoomOutCorrection" class="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700">
            <i class="fas fa-minus text-sm"></i>
          </button>
          <span class="text-sm text-gray-300 w-16 text-center">{{ Math.round(correctionScale * 100) }}%</span>
          <button @click="zoomInCorrection" class="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700">
            <i class="fas fa-plus text-sm"></i>
          </button>
          <button @click="resetCorrectionZoom" class="px-3 py-1 bg-gray-800 rounded-lg text-xs hover:bg-gray-700 ml-2">
            适应
          </button>
        </div>
      </div>
      
      <!-- 图片区域 - 支持缩放和拖动 -->
      <div 
        class="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
        ref="correctionImageContainer"
        @mousedown="onCorrectionDragStart"
        @mousemove="onCorrectionDragMove"
        @mouseup="onCorrectionDragEnd"
        @mouseleave="onCorrectionDragEnd"
        @touchstart="onCorrectionTouchStart"
        @touchmove="onCorrectionTouchMove"
        @touchend="onCorrectionTouchEnd"
      >
        <div 
          class="absolute inset-0 flex items-center justify-center"
          :style="correctionImageStyle"
        >
          <img 
            :src="getCorrectionImageUrl(currentQuestion.correction_images[currentCorrectionIndex])" 
            class="max-w-none max-h-none object-contain select-none"
            :style="{ width: 'auto', height: 'auto', transform: `scale(${correctionScale})`, transformOrigin: 'center center' }"
            alt="订正预览"
            draggable="false"
            @click.stop
          >
        </div>
        
        <!-- 左右切换按钮（多张时显示） -->
        <button 
          v-if="currentQuestion.correction_images.length > 1"
          @click.stop="prevCorrectionImage"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-colors z-20"
        >
          <i class="fas fa-chevron-left text-xl"></i>
        </button>
        <button 
          v-if="currentQuestion.correction_images.length > 1"
          @click.stop="nextCorrectionImage"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-colors z-20"
        >
          <i class="fas fa-chevron-right text-xl"></i>
        </button>
      </div>
      
      <!-- 底部指示器 -->
      <div 
        v-if="currentQuestion.correction_images.length > 1" 
        class="flex justify-center gap-2 pb-safe px-4 py-3 bg-black z-10"
      >
        <button 
          v-for="(img, idx) in currentQuestion.correction_images" 
          :key="idx"
          @click.stop="goToCorrectionImage(idx)"
          class="w-2 h-2 rounded-full transition-colors"
          :class="currentCorrectionIndex === idx ? 'bg-white' : 'bg-gray-600'"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCorrectionReviewStore } from '@/stores/correctionReview'
import { useStudentStore } from '@/stores/student'
import { exportApi, paperApi } from '@/api'
import { showToast, showConfirmDialog } from '@/utils/dialog'
import { getFilename } from '@/utils/helpers'
import FilterPanel from '@/components/correctionReview/FilterPanel.vue'
import OriginalPaperModal from '@/components/correctionReview/OriginalPaperModal.vue'
import type { QuestionDetail } from '@/stores/correctionReview'

const router = useRouter()
const store = useCorrectionReviewStore()
const studentStore = useStudentStore()

const currentIndex = ref(0)
const currentCorrectionIndex = ref(0)
const showFilterPanel = ref(false)
const showOriginalPaperModal = ref(false)
const showImagePreviewModal = ref(false)
const isExporting = ref(false)
const currentPaperTotalPages = ref(6)  // 默认6页，打开模态框时获取实际页数
const currentQuestionPositions = ref<{page: number, bbox: number[]}[]>([])  // 题目位置信息（支持多页）

// 订正图片预览的缩放和拖动状态
const correctionScale = ref(1)
const correctionTranslateX = ref(0)
const correctionTranslateY = ref(0)
const isCorrectionDragging = ref(false)
const correctionDragStart = ref({ x: 0, y: 0 })
const correctionImageContainer = ref<HTMLElement | null>(null)

// 触摸缩放状态
let correctionInitialDistance = 0
let correctionInitialScale = 1
let correctionInitialTranslateX = 0
let correctionInitialTranslateY = 0
let correctionIsTouchZooming = false

// 订正图片样式
const correctionImageStyle = computed(() => {
  return {
    transform: `translate(${correctionTranslateX.value}px, ${correctionTranslateY.value}px)`,
  }
})

const sortField = computed({
  get: () => store.sortField,
  set: (value) => store.setSort(value, store.sortOrder)
})

const sortOrder = computed(() => store.sortOrder)

const filteredQuestions = computed(() => store.sortedAndFilteredQuestions)
const currentQuestion = computed(() => filteredQuestions.value[currentIndex.value])
const stats = computed(() => store.stats)
const isLoading = computed(() => store.isLoading)

const hasActiveFilters = computed(() => {
  return store.filterSettings.questionTypes.length > 0 ||
         store.filterSettings.errorTypes.length > 0 ||
         store.filterSettings.dateRange.from !== null ||
         store.filterSettings.dateRange.to !== null
})

onMounted(() => {
  // 如果没有题目详情，返回上一页
  if (store.selectedQuestions.length === 0) {
    router.back()
    return
  }
  
  // 加载题目详情
  if (store.questionDetails.size === 0) {
    store.loadQuestionDetails()
  }
})

function selectQuestion(index: number) {
  currentIndex.value = index
  currentCorrectionIndex.value = 0
}

function nextQuestion() {
  if (currentIndex.value < filteredQuestions.value.length - 1) {
    currentIndex.value++
    currentCorrectionIndex.value = 0
  }
}

function prevQuestion() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    currentCorrectionIndex.value = 0
  }
}

function nextCorrection() {
  if (currentQuestion.value && currentCorrectionIndex.value < currentQuestion.value.correction_images.length - 1) {
    currentCorrectionIndex.value++
  }
}

function prevCorrection() {
  if (currentCorrectionIndex.value > 0) {
    currentCorrectionIndex.value--
  }
}

function toggleExclude(uuid: string) {
  store.toggleExclude(uuid)
}

function isExcluded(uuid: string) {
  return store.isExcluded(uuid)
}

function isFiltered(uuid: string) {
  return store.isFiltered(uuid)
}

function getQuestionNumber(question: QuestionDetail) {
  // 过滤掉为 0 或空的 level
  const levels = []
  if (question.level_1 && question.level_1 !== '0') levels.push(question.level_1)
  if (question.level_2 && question.level_2 !== '0') levels.push(question.level_2)
  
  return levels.length > 0 ? levels.join(' ') : '未知题号'
}

function formatReviewDate(date: string | null) {
  if (!date) return '从未'
  return new Date(date).toLocaleDateString('zh-CN')
}

function getSliceImageUrl(path: string) {
  if (!path || !currentQuestion.value) return ''
  // 使用 getFilename 提取文件名（兼容 Windows/Linux 路径，对应后端 PathCompat.get_filename）
  const filename = getFilename(path)
  const paperId = currentQuestion.value.paper_id
  // 使用 /corrections/{paper_id}/slices/{filename} API（与 Review 页面一致）
  const url = `/api/v1/corrections/${paperId}/slices/${filename}`
  console.log('[DEBUG] 原题图片 URL:', url)
  return url
}

function getCorrectionImageUrl(filename: string) {
  if (!filename || !currentQuestion.value) return ''
  // 使用与 stores/correction.ts 中相同的 URL 格式
  const url = `/api/v1/corrections/files/${currentQuestion.value.paper_number}/${filename}?folder=correction`
  console.log('[DEBUG] 订正图片 URL:', url)
  return url
}

// 处理图片加载错误
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  // 显示错误提示
  const parent = img.parentElement
  if (parent) {
    const errorDiv = document.createElement('div')
    errorDiv.className = 'text-center text-gray-400 py-12'
    errorDiv.innerHTML = '<i class="fas fa-exclamation-circle text-4xl mb-3 text-gray-300"></i><p>图片加载失败</p>'
    parent.appendChild(errorDiv)
  }
}

function getPageNumber(question: QuestionDetail) {
  if (!question.position || question.position === '0') return 1
  
  // 解析格式: [P{n}: y0,x0,y1,x1]
  const match = question.position.match(/\[P(\d+):/)
  if (match) {
    return parseInt(match[1], 10)
  }
  
  // 尝试 JSON 格式
  try {
    const position = JSON.parse(question.position)
    return position.page || 1
  } catch {
    return 1
  }
}

function getBbox(question: QuestionDetail): number[] {
  if (!question.position || question.position === '0') return []
  
  console.log('[DEBUG] parsing position:', question.position)
  
  // 解析格式: [P{n}: y0,x0,y1,x1]
  // 示例: [P3: 0.1,0.2,0.5,0.6] -> bbox: [0.1, 0.2, 0.5, 0.6] (y0, x0, y1, x1)
  const match = question.position.match(/\[P\d+:\s*([\d.]+),([\d.]+),([\d.]+),([\d.]+)\]/)
  if (match) {
    const bbox = [
      parseFloat(match[1]), // y0
      parseFloat(match[2]), // x0
      parseFloat(match[3]), // y1
      parseFloat(match[4])  // x1
    ]
    console.log('[DEBUG] parsed bbox:', bbox)
    return bbox
  }
  
  // 尝试 JSON 格式
  try {
    const position = JSON.parse(question.position)
    console.log('[DEBUG] parsed JSON position:', position)
    return position.bbox || []
  } catch (e) {
    console.log('[DEBUG] parse position failed:', question.position)
    return []
  }
}

async function showOriginalPaper() {
  if (!currentQuestion.value) return
  
  // 获取试卷实际总页数和题目位置信息
  try {
    console.log('[DEBUG] 正在获取试卷树详情:', currentQuestion.value.paper_id)
    const response = await paperApi.getTreeDetail(currentQuestion.value.paper_id)
    console.log('[DEBUG] 试卷树详情响应:', response)
    const data = response.data || (response as any)
    
    if (data?.total_pages) {
      currentPaperTotalPages.value = data.total_pages
      console.log('[DEBUG] 试卷实际总页数:', currentPaperTotalPages.value)
    }
    
    // 从题目列表中找到当前题目的位置信息
    if (data?.questions) {
      const question = data.questions.find((q: any) => q.UUID === currentQuestion.value?.uuid)
      if (question) {
        const positions: {page: number, bbox: number[]}[] = []
        
        // 解析主位置
        if (question.所在位置 && question.所在位置 !== '0') {
          const page = _extractPageFromPosition(question.所在位置)
          const bbox = _extractBboxFromPosition(question.所在位置)
          if (page > 0 && bbox.length === 4) {
            positions.push({ page, bbox })
          }
        }
        
        // 解析副位置（position1）
        if (question.所在位置1 && question.所在位置1 !== '0') {
          const page = _extractPageFromPosition(question.所在位置1)
          const bbox = _extractBboxFromPosition(question.所在位置1)
          if (page > 0 && bbox.length === 4) {
            positions.push({ page, bbox })
          }
        }
        
        currentQuestionPositions.value = positions
        console.log('[DEBUG] 题目位置信息:', positions)
      }
    }
  } catch (error) {
    console.error('获取试卷详情失败:', error)
    // 使用默认值
    const pageNum = getPageNumber(currentQuestion.value)
    currentPaperTotalPages.value = Math.max(pageNum, 1)
    currentQuestionPositions.value = [{ page: pageNum, bbox: getBbox(currentQuestion.value) }]
  }
  
  showOriginalPaperModal.value = true
}

// 从位置字符串解析页码
function _extractPageFromPosition(position: string): number {
  if (!position || position === '0') return 0
  const match = position.match(/\[P(\d+):/)
  return match ? parseInt(match[1], 10) : 0
}

// 从位置字符串解析bbox
function _extractBboxFromPosition(position: string): number[] {
  if (!position || position === '0') return []
  const match = position.match(/\[P\d+:\s*([\d.]+),([\d.]+),([\d.]+),([\d.]+)\]/)
  if (match) {
    return [
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3]),
      parseFloat(match[4])
    ]
  }
  return []
}

function showImagePreview() {
  if (!currentQuestion.value?.correction_images?.length) return
  showImagePreviewModal.value = true
  // 重置缩放状态
  correctionScale.value = 1
  correctionTranslateX.value = 0
  correctionTranslateY.value = 0
}

function closeImagePreview() {
  showImagePreviewModal.value = false
}

function goToCorrectionImage(idx: number) {
  currentCorrectionIndex.value = idx
  // 切换图片时重置缩放
  correctionScale.value = 1
  correctionTranslateX.value = 0
  correctionTranslateY.value = 0
}

function nextCorrectionImage() {
  if (!currentQuestion.value) return
  if (currentCorrectionIndex.value < currentQuestion.value.correction_images.length - 1) {
    currentCorrectionIndex.value++
  } else {
    currentCorrectionIndex.value = 0 // 循环到第一张
  }
  // 切换图片时重置缩放
  correctionScale.value = 1
  correctionTranslateX.value = 0
  correctionTranslateY.value = 0
}

function prevCorrectionImage() {
  if (!currentQuestion.value) return
  if (currentCorrectionIndex.value > 0) {
    currentCorrectionIndex.value--
  } else {
    currentCorrectionIndex.value = currentQuestion.value.correction_images.length - 1 // 循环到最后一张
  }
  // 切换图片时重置缩放
  correctionScale.value = 1
  correctionTranslateX.value = 0
  correctionTranslateY.value = 0
}

// 订正图片缩放控制
function zoomInCorrection() {
  correctionScale.value *= 1.25
}

function zoomOutCorrection() {
  correctionScale.value /= 1.25
  if (correctionScale.value < 0.2) correctionScale.value = 0.2
}

function resetCorrectionZoom() {
  correctionScale.value = 1
  correctionTranslateX.value = 0
  correctionTranslateY.value = 0
}

// 订正图片拖动 - 鼠标
function onCorrectionDragStart(e: MouseEvent) {
  isCorrectionDragging.value = true
  correctionDragStart.value = {
    x: e.clientX - correctionTranslateX.value,
    y: e.clientY - correctionTranslateY.value
  }
}

function onCorrectionDragMove(e: MouseEvent) {
  if (!isCorrectionDragging.value) return
  e.preventDefault()
  correctionTranslateX.value = e.clientX - correctionDragStart.value.x
  correctionTranslateY.value = e.clientY - correctionDragStart.value.y
}

function onCorrectionDragEnd() {
  isCorrectionDragging.value = false
}

// 触摸距离计算
function getCorrectionTouchDistance(touches: TouchList) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getCorrectionTouchCenter(touches: TouchList) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  }
}

// 订正图片触摸事件 - 支持双指缩放和单指拖动
function onCorrectionTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    // 双指缩放开始
    correctionIsTouchZooming = true
    correctionInitialDistance = getCorrectionTouchDistance(e.touches)
    correctionInitialScale = correctionScale.value
    correctionInitialTranslateX = correctionTranslateX.value
    correctionInitialTranslateY = correctionTranslateY.value
  } else if (e.touches.length === 1) {
    // 单指拖动开始
    correctionIsTouchZooming = false
    correctionDragStart.value = {
      x: e.touches[0].clientX - correctionTranslateX.value,
      y: e.touches[0].clientY - correctionTranslateY.value
    }
  }
}

function onCorrectionTouchMove(e: TouchEvent) {
  if (e.touches.length === 2 && correctionIsTouchZooming) {
    // 双指缩放
    e.preventDefault()
    const currentDistance = getCorrectionTouchDistance(e.touches)
    const scaleFactor = currentDistance / correctionInitialDistance
    correctionScale.value = Math.max(0.2, Math.min(3.0, correctionInitialScale * scaleFactor))
  } else if (e.touches.length === 1 && !correctionIsTouchZooming) {
    // 单指拖动
    e.preventDefault()
    correctionTranslateX.value = e.touches[0].clientX - correctionDragStart.value.x
    correctionTranslateY.value = e.touches[0].clientY - correctionDragStart.value.y
  }
}

function onCorrectionTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) {
    correctionIsTouchZooming = false
  }
  if (e.touches.length === 0) {
    isCorrectionDragging.value = false
  }
}

function updateSort() {
  store.setSort(sortField.value, sortOrder.value)
}

function toggleSortOrder() {
  const newOrder = sortOrder.value === 'asc' ? 'desc' : 'asc'
  store.setSort(sortField.value, newOrder)
}

function goToExport() {
  // 获取要导出的题目
  const exportQuestions = filteredQuestions.value.filter(q => 
    !store.isExcluded(q.uuid) && !store.isFiltered(q.uuid)
  )
  
  if (exportQuestions.length === 0) {
    showToast('请先选择要导出的题目')
    return
  }
  
  // 构建导出数据
  const exportData = {
    mode: 'multi',  // 标记为 multi 模式
    questions: exportQuestions.map(q => ({
      uuid: q.uuid,
      paper_id: q.paper_id,
      paper_name: q.paper_name,
      page_number: parseInt(q.position?.match(/\[P(\d+):/)?.[1] || '1'),
      level_1: q.level_1,
      level_2: q.level_2,
      level_3: q.level_3,
      level_4: q.level_4,
      position: q.position,
      position_1: q.position_1
    })),
    studentId: studentStore.currentStudent?.id || '',
    subject: store.currentSubject
  }
  
  // 保存到 sessionStorage
  sessionStorage.setItem('exportData', JSON.stringify(exportData))
  
  // 跳转到导出错题页面
  router.push('/export/multi')
}

function goBack() {
  router.back()
}
</script>

<style scoped>
/* iPhone 安全区域适配 */
.pt-safe {
  padding-top: max(16px, env(safe-area-inset-top));
}

.pb-safe {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}

/* 头部安全区域 - 适配刘海屏 */
.header-safe-area {
  padding-top: max(12px, env(safe-area-inset-top));
}

/* 底部安全区域 - 适配Home Indicator */
.footer-safe-area {
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}
</style>
