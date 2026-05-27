<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- 顶部导航 -->
    <header class="bg-white safe-area-top shadow-sm z-10">
      <div class="flex items-center justify-between px-4 py-3">
        <button @click="$router.back()" class="p-2 -ml-2 text-gray-600">
          <i class="fas fa-chevron-left"></i>
        </button>
        <h1 class="text-lg font-semibold text-gray-800">AI 智能处理</h1>
        <div class="w-10"></div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="flex-1 overflow-y-auto">
      <!-- 总体进度 -->
      <section class="bg-white px-6 py-8">
        <div class="flex items-center justify-center mb-6">
          <ProgressRing :percent="progressPercent" :status="status" />
        </div>
        
        <!-- 统计 -->
        <div class="flex justify-center space-x-8">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ completedPages }}</div>
            <div class="text-xs text-gray-500">已完成</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-800">{{ totalPages }}</div>
            <div class="text-xs text-gray-500">总页数</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ questionCount }}</div>
            <div class="text-xs text-gray-500">识别题目</div>
          </div>
        </div>
      </section>

      <!-- 处理详情步骤 -->
      <ProcessSteps 
        :current-step="currentStep" 
        :is-completed="status === 'completed'" 
      />

      <!-- 页面状态列表 -->
      <section class="bg-white mt-3 px-4 py-4">
        <h3 class="text-sm font-medium text-gray-700 mb-3">
          <i class="fas fa-file-image mr-2 text-blue-500"></i>页面处理状态
        </h3>
        
        <div class="space-y-2">
          <PageStatusCard 
            v-for="page in pageStatuses" 
            :key="page.pageNum"
            :page="page"
          />
        </div>
      </section>

      <!-- 状态提示 -->
      <section class="px-4 py-4">
        <StatusTip :status="status" :retry-count="retryCount" :question-count="questionCount" />
      </section>

      <!-- 底部留白 -->
      <div class="h-20"></div>
    </main>

    <!-- 继续按钮 -->
    <footer class="fixed bottom-0 left-0 right-0 bg-white border-t safe-area-bottom z-20">
      <div class="p-4">
        <button 
          @click="goToReview"
          :disabled="status !== 'completed'"
          class="w-full py-3 rounded-xl font-medium flex items-center justify-center transition-colors"
          :class="status === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'"
        >
          <span>继续</span>
          <i class="fas fa-chevron-right ml-2"></i>
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBatchStore } from '@/stores'
import ProgressRing from '@/components/processing/ProgressRing.vue'
import PageStatusCard from '@/components/processing/PageStatusCard.vue'
import StatusTip from '@/components/processing/StatusTip.vue'
import ProcessSteps from '@/components/processing/ProcessSteps.vue'

const route = useRoute()
const router = useRouter()
const batchStore = useBatchStore()

const batchId = route.params.batchId as string
const status = ref<'processing' | 'completed' | 'failed'>('processing')
const retryCount = ref(0)
let unwatchProgress: (() => void) | null = null
let unwatchBatch: (() => void) | null = null

const progressPercent = computed(() => batchStore.progressPercent)
const totalPages = computed(() => batchStore.totalPages)
const completedPages = computed(() => batchStore.completedPages)
// 题目数优先从 questions 数组获取（meta.json 实际数据最准确）
// progress.question_count 可能更新不及时，仅作为备用
const questionCount = computed(() => {
  // 优先使用 meta.json 加载的题目数据
  if (batchStore.questions.length > 0) {
    return batchStore.questions.length
  }
  // 备用：从 progress API 获取
  const fromProgress = batchStore.progress?.question_count
  if (typeof fromProgress === 'number' && fromProgress > 0) {
    return fromProgress
  }
  return 0
})

const pageStatuses = computed(() => {
  return Array.from({ length: totalPages.value }, (_, i) => {
    const pageNum = i + 1
    const isCompleted = i < completedPages.value
    const isProcessing = i === completedPages.value && batchStore.isProcessing
    
    // 计算该页的题目数（根据 page_number 统计）
    const pageQuestions = batchStore.questions.filter(q => q.page_number === pageNum).length
    
    return {
      pageNum,
      status: isCompleted ? 'completed' : isProcessing ? 'processing' : 'pending',
      questions: pageQuestions
    }
  })
})

// 计算当前处理步骤 (0-3)
const currentStep = computed(() => {
  if (status.value === 'completed') return 3
  if (questionCount.value > 0) return 2
  if (completedPages.value > 0 || batchStore.isProcessing) return 1
  return 0
})

onMounted(async () => {
  // 检查是否是恢复模式（从主页面点击"确认导入"进入）
  const isResumeMode = batchStore.batchId && batchStore.batchId === batchId
  
  if (isResumeMode && batchStore.batch) {
    // 恢复模式：batch 已加载，检查状态
    const batchStatus = batchStore.batch.status
    
    if (batchStatus === 'completed' || batchStatus === 'analyzed') {
      // 处理已完成，直接执行步骤 5：获取结果和题目列表
      console.log('恢复模式：处理已完成，加载结果...')
      status.value = 'completed'
      
      try {
        // 只有当前没有题目数据时才加载（避免覆盖）
        if (batchStore.questions.length === 0) {
          console.log('当前题目列表为空，执行加载...')
          await batchStore.loadQuestionsFromMeta()
        } else {
          console.log('已有题目数据，跳过加载:', batchStore.questions.length, '题')
        }
      } catch (err) {
        console.error('加载题目列表失败:', err)
      }
      return
    }
  }
  
  // 非恢复模式或批次未加载：执行正常处理流程
  // 如果批次未加载，先加载
  if (!batchStore.batch) {
    try {
      await batchStore.loadBatchFromMeta(batchId)
    } catch (err) {
      console.error('加载批次失败:', err)
      status.value = 'failed'
      return
    }
  }
  
  // 检查加载后的状态
  const currentStatus = batchStore.batch?.status
  if (currentStatus === 'completed' || currentStatus === 'analyzed') {
    console.log('批次已完成，跳过处理流程')
    status.value = 'completed'
    // 只有当前没有题目数据时才加载（避免与 processAllPages 的最终加载冲突）
    if (batchStore.questions.length === 0) {
      console.log('题目列表为空，从 meta.json 加载...')
      await batchStore.loadQuestionsFromMeta()
    } else {
      console.log('已有题目数据，跳过重复加载:', batchStore.questions.length, '题')
    }
    return
  }
  
  // 启动处理
  try {
    await batchStore.startProcessing()
    // 开始逐个处理页面
    await batchStore.processAllPages()
  } catch (err) {
    status.value = 'failed'
  }
  
  // 监听进度变化
  unwatchProgress = watch(() => batchStore.progress, (progress) => {
    if (progress) {
      status.value = progress.status as 'processing' | 'completed' | 'failed'
    }
  }, { immediate: true })
  
  // 也监听 batch 状态
  unwatchBatch = watch(() => batchStore.batch, (batch) => {
    if (batch && batch.status) {
      status.value = batch.status as 'processing' | 'completed' | 'failed'
    }
  })
})

onUnmounted(() => {
  batchStore.stopPolling()
  if (unwatchBatch) unwatchBatch()
  if (unwatchProgress) unwatchProgress()
})

function goToReview() {
  // 处理完成后先跳转到导入确认页
  router.push(`/import-confirm/${batchId}`)
}

</script>
