<template>
  <div :class="tipClass">
    <div class="flex items-start">
      <i :class="iconClass" class="mt-0.5 mr-3"></i>
      <div>
        <h4 :class="titleClass">{{ title }}</h4>
        <p :class="descClass">{{ description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  status: string
  retryCount?: number
  questionCount?: number
}

const props = defineProps<Props>()

const tipClass = computed(() => {
  switch (props.status) {
    case 'completed': return 'bg-green-50 rounded-xl p-4'
    case 'failed': return 'bg-red-50 rounded-xl p-4'
    case 'retrying': return 'bg-yellow-50 rounded-xl p-4'
    default: return 'bg-blue-50 rounded-xl p-4'
  }
})

const iconClass = computed(() => {
  switch (props.status) {
    case 'completed': return 'fas fa-check-circle text-green-500'
    case 'failed': return 'fas fa-exclamation-circle text-red-500'
    case 'retrying': return 'fas fa-exclamation-triangle text-yellow-500'
    default: return 'fas fa-robot text-blue-500'
  }
})

const titleClass = computed(() => {
  switch (props.status) {
    case 'completed': return 'text-sm font-medium text-green-800'
    case 'failed': return 'text-sm font-medium text-red-800'
    case 'retrying': return 'text-sm font-medium text-yellow-800'
    default: return 'text-sm font-medium text-blue-800'
  }
})

const descClass = computed(() => {
  switch (props.status) {
    case 'completed': return 'text-xs text-green-700 mt-1'
    case 'failed': return 'text-xs text-red-700 mt-1'
    case 'retrying': return 'text-xs text-yellow-700 mt-1'
    default: return 'text-xs text-blue-700 mt-1'
  }
})

const title = computed(() => {
  switch (props.status) {
    case 'completed': return '处理完成！'
    case 'failed': return '处理失败'
    case 'retrying': return `正在重试 (${props.retryCount}/3)`
    default: return '正在分析试卷'
  }
})

const description = computed(() => {
  switch (props.status) {
    case 'completed': 
      return `共识别 ${props.questionCount || 0} 道题目，点击"继续"进入审阅`
    case 'failed': return '处理过程中遇到问题，请重试或联系管理员'
    case 'retrying': return '当前页面处理遇到问题，正在自动重试...'
    default: return 'AI正在去除手写痕迹并识别题目区域，请稍候...'
  }
})
</script>
