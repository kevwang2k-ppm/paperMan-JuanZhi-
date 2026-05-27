<template>
  <div 
    class="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50 max-w-4xl mx-auto transition-transform duration-300"
    :class="{ 'translate-y-0': true }"
  >
    <!-- 摘要栏（点击展开/收起） -->
    <div 
      class="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-t-2xl cursor-pointer border-t border-gray-200"
      @click="toggleExpand"
    >
      <div class="flex items-center gap-2">
        <i class="fas transition-transform duration-200" :class="isExpanded ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
        <span class="font-semibold text-gray-800">已选 {{ totalSelected }} 题</span>
        <span class="text-sm text-gray-500">(来自 {{ groupedByPaper.length }} 份试卷)</span>
      </div>
      <!-- 收起时显示导出按钮 -->
      <button 
        v-if="!isExpanded && totalSelected > 0"
        @click.stop="goToConfirm"
        class="px-4 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
      >
        确认并查看错整
      </button>
    </div>
    
    <!-- 展开内容 -->
    <div 
      v-show="isExpanded" 
      class="px-4 pb-4 max-h-80 overflow-y-auto"
    >
      <!-- 试卷列表 -->
      <div 
        v-for="group in groupedByPaper" 
        :key="group.paperId"
        class="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
            <i class="fas fa-file-alt text-purple-600 text-sm"></i>
          </div>
          <div class="min-w-0">
            <div class="font-medium text-gray-800 truncate">{{ group.paperName }}</div>
            <div class="text-xs text-gray-400">{{ formatDate(group.importedAt) }} 导入</div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            @click.stop="emit('editPaper', group.paperId, group.paperName, group.importedAt)"
            class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full hover:bg-purple-200 transition-colors cursor-pointer flex items-center gap-1"
            title="点击编辑题目"
          >
            <i class="fas fa-edit text-[10px]"></i>
            {{ group.questions.length }} 题
          </button>
          <button 
            @click.stop="removePaper(group.paperId)"
            class="w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
            title="移除该试卷"
          >
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="totalSelected === 0" class="py-8 text-center text-gray-500">
        <i class="fas fa-clipboard-list text-4xl text-gray-300 mb-3"></i>
        <p class="text-sm">点击试卷选择错题</p>
      </div>
      
      <!-- 确认并查看错整按钮 -->
      <button 
        v-if="totalSelected > 0"
        @click="goToConfirm"
        class="w-full mt-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center"
      >
        <i class="fas fa-eye mr-2"></i>确认并查看错整
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCorrectionReviewStore } from '@/stores/correctionReview'


const router = useRouter()
const store = useCorrectionReviewStore()
const isExpanded = ref(true)

const emit = defineEmits<{
  editPaper: [paperId: string, paperName: string, importedAt: string]
}>()

const totalSelected = computed(() => store.totalSelected)
const groupedByPaper = computed(() => store.groupedByPaper)

// 当列表为空时，自动收起
watch(totalSelected, (newCount) => {
  if (newCount === 0) {
    isExpanded.value = false
    console.log('[CorrectionSelectionPanel] 列表为空，自动收起')
  }
})

// 初始状态检查
onMounted(() => {
  if (totalSelected.value === 0) {
    isExpanded.value = false
    console.log('[CorrectionSelectionPanel] 初始为空，自动收起')
  }
})

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function removePaper(paperId: string) {
  // 直接移除，不需要确认
  store.removePaperQuestions(paperId)
}

async function goToConfirm() {
  if (totalSelected.value === 0) return
  
  // 先加载题目详情
  await store.loadQuestionDetails()
  // 跳转到确认页面
  router.push('/correction-confirm')
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}
</script>
