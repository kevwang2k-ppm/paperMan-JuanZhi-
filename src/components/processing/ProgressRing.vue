<template>
  <div class="relative w-40 h-40">
    <!-- 背景圆环 -->
    <svg class="w-full h-full -rotate-90" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" stroke-width="8"/>
      <circle 
        cx="60" cy="60" r="54" fill="none" 
        :stroke="status === 'failed' ? '#ef4444' : '#3b82f6'" 
        stroke-width="8" 
        stroke-linecap="round" 
        stroke-dasharray="339.292" 
        :stroke-dashoffset="strokeDashoffset"
        class="transition-all duration-500"
      />
    </svg>
    
    <!-- 中心内容 -->
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="text-3xl font-bold text-gray-800">{{ percent }}%</span>
      <span class="text-xs text-gray-500 mt-1">{{ statusText }}</span>
    </div>
    
    <!-- 波浪效果 -->
    <div v-if="status === 'processing'" class="absolute inset-0 rounded-full wave"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  percent: number
  status: string
}

const props = defineProps<Props>()

const circumference = 339.292
const strokeDashoffset = computed(() => 
  circumference - (props.percent / 100) * circumference
)

const statusText = computed(() => {
  switch (props.status) {
    case 'completed': return '完成'
    case 'failed': return '失败'
    default: return '处理中'
  }
})
</script>

<style scoped>
.wave::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%);
  transform: translate(-50%, -50%) scale(0);
  animation: wave-anim 2s infinite;
}

@keyframes wave-anim {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}
</style>
