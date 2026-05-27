<template>
  <div 
    class="flex items-center p-3 rounded-xl border transition-all"
    :class="cardClass"
  >
    <!-- 页面缩略图 -->
    <img 
      :src="thumbnailUrl" 
      class="w-12 h-16 object-cover rounded bg-white shadow-sm mr-3"
      alt=""
    >
    <div class="flex-1">
      <div class="flex items-center justify-between">
        <span class="font-medium text-gray-800">第 {{ page.pageNum }} 页</span>
        <StatusIcon :status="page.status" />
      </div>
      <span class="text-xs" :class="statusTextClass">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StatusIcon from './StatusIcon.vue'

interface PageStatus {
  pageNum: number
  status: 'pending' | 'processing' | 'completed' | 'retrying' | 'failed'
  questions: number
}

interface Props {
  page: PageStatus
}

const props = defineProps<Props>()

// 生成页面缩略图（根据页码生成不同颜色的占位图）
const thumbnailUrl = computed(() => {
  const colors = ['#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5', '#ede9fe']
  const color = colors[(props.page.pageNum - 1) % colors.length]
  
  // 创建 canvas 绘制简单缩略图
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 133
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // 背景
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 100, 133)
    
    // 页码
    ctx.fillStyle = '#374151'
    ctx.font = 'bold 10px sans-serif'
    ctx.fillText(`P${props.page.pageNum}`, 8, 18)
  }
  
  return canvas.toDataURL()
})

const cardClass = computed(() => {
  switch (props.page.status) {
    case 'completed': return 'bg-green-50 border-green-200'
    case 'processing': return 'bg-blue-50 border-blue-200'
    case 'retrying': return 'bg-yellow-50 border-yellow-200'
    case 'failed': return 'bg-red-50 border-red-200'
    default: return 'bg-gray-50 border-gray-200'
  }
})

const statusText = computed(() => {
  switch (props.page.status) {
    case 'completed': return `${props.page.questions} 题`
    case 'processing': return '处理中...'
    case 'retrying': return '重试中...'
    case 'failed': return '失败'
    default: return '等待中'
  }
})

const statusTextClass = computed(() => {
  switch (props.page.status) {
    case 'completed': return 'text-green-600'
    case 'processing': return 'text-blue-600'
    case 'retrying': return 'text-yellow-600'
    case 'failed': return 'text-red-600'
    default: return 'text-gray-400'
  }
})
</script>
