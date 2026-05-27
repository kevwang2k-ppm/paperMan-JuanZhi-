<template>
  <div class="bg-white px-4 py-4 border-b">
    <div class="flex items-center justify-center space-x-1">
      <template v-for="(step, index) in displaySteps" :key="index">
        <div class="flex items-center">
          <div 
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
            :class="getStepClass(index)"
          >
            <i v-if="index + 1 < currentStep" class="fas fa-check text-xs"></i>
            <template v-else>{{ index + 1 }}</template>
          </div>
          <span 
            class="ml-1.5 text-xs sm:text-sm whitespace-nowrap"
            :class="getTextClass(index)"
          >
            {{ step }}
          </span>
        </div>
        <div 
          v-if="index < displaySteps.length - 1" 
          class="w-4 sm:w-8 h-0.5 mx-1"
          :class="index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200'"
        ></div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentStep: number
  steps?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  steps: () => ['上传', '处理', '审阅']
})

const displaySteps = computed(() => props.steps)

function getStepClass(index: number) {
  const stepNumber = index + 1
  if (stepNumber < props.currentStep) {
    return 'bg-green-500 text-white'
  } else if (stepNumber === props.currentStep) {
    return 'bg-blue-600 text-white'
  } else {
    return 'bg-gray-200 text-gray-500'
  }
}

function getTextClass(index: number) {
  const stepNumber = index + 1
  if (stepNumber < props.currentStep) {
    return 'font-medium text-green-600'
  } else if (stepNumber === props.currentStep) {
    return 'font-medium text-blue-600'
  } else {
    return 'text-gray-400'
  }
}
</script>

<script lang="ts">
import { computed } from 'vue'
</script>
