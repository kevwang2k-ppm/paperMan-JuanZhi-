<template>
  <div class="bg-white mt-3 px-4 py-4">
    <h3 class="text-sm font-medium text-gray-700 mb-3">
      <i class="fas fa-info-circle mr-2 text-blue-500"></i>处理详情
    </h3>
    
    <div class="space-y-3">
      <div 
        v-for="(step, index) in steps" 
        :key="step.name"
        class="flex items-center"
      >
        <div 
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
          :class="getIconClass(step.status)"
        >
          <i :class="step.icon"></i>
        </div>
        <span 
          class="ml-3 text-sm"
          :class="getTextClass(step.status)"
        >
          {{ step.name }}
        </span>
        <i 
          v-if="step.status === 'processing'" 
          class="fas fa-circle-notch fa-spin ml-auto text-blue-500"
        ></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Step {
  name: string
  icon: string
  status: 'completed' | 'processing' | 'pending'
}

interface Props {
  currentStep: number // 0-3
  isCompleted: boolean
}

const props = defineProps<Props>()

const steps = computed<Step[]>(() => {
  const baseSteps = [
    { name: '上传图片', icon: 'fas fa-cloud-upload-alt', status: 'completed' as const },
    { name: '去手写处理', icon: 'fas fa-magic', status: 'pending' as const },
    { name: '题目识别', icon: 'fas fa-search', status: 'pending' as const },
    { name: '数据导入', icon: 'fas fa-database', status: 'pending' as const }
  ]
  
  if (props.isCompleted) {
    return baseSteps.map(s => ({ ...s, status: 'completed' as const }))
  }
  
  return baseSteps.map((step, index) => {
    if (index < props.currentStep) {
      return { ...step, status: 'completed' as const }
    } else if (index === props.currentStep) {
      return { ...step, status: 'processing' as const }
    }
    return step
  })
})

function getIconClass(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-500 text-white'
    case 'processing': return 'bg-blue-500 text-white'
    default: return 'bg-gray-200 text-gray-400'
  }
}

function getTextClass(status: string) {
  switch (status) {
    case 'completed': return 'text-green-700'
    case 'processing': return 'text-blue-700 processing-text'
    default: return 'text-gray-400'
  }
}
</script>

<style scoped>
.processing-text {
  animation: processing-pulse 1.5s infinite;
}

@keyframes processing-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
