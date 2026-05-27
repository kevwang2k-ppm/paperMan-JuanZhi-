<template>
  <div class="correction-section flex flex-col h-full min-h-0 overflow-hidden">
    <!-- 标题 -->
    <div class="text-xs text-gray-400 mb-2 flex items-center justify-center">
      <i class="fas fa-edit mr-1"></i>
      <span>订正</span>
    </div>

    <!-- 加载中 -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <i class="fas fa-circle-notch fa-spin text-gray-500"></i>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="!hasAny"
      class="flex-1 flex flex-col items-center justify-center text-center p-2 cursor-pointer"
      @click="$emit('add')"
    >
      <div class="text-gray-500 mb-2">
        <i class="fas fa-edit text-lg mb-1"></i>
        <div class="text-[10px]">长按以添加图片</div>
      </div>
      <button
        class="px-3 py-1 bg-blue-600 text-white text-[10px] rounded-full hover:bg-blue-500 transition-colors"
      >
        <i class="fas fa-plus mr-1"></i>添加
      </button>
    </div>

    <!-- 有图片 - 仅显示单张 -->
    <div
      v-else
      class="flex-1 relative cursor-pointer overflow-hidden rounded-lg bg-gray-800 min-h-0"
      @click="$emit('view')"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
      @touchmove="handleTouchMove"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <img
        :src="image?.url"
        class="w-full h-full object-contain max-h-full"
        alt="订正图片"
      />
      
      <!-- 级别标签 -->
      <span
        v-if="image?.level"
        class="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] rounded font-medium"
        :class="image.level === 'question' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'"
      >
        {{ image.level === 'question' ? '题' : '卷' }}
      </span>

      <!-- 长按/点击查看提示 -->
      <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent py-1">
        <span class="text-[10px] text-white/80 text-center block">
          {{ hasMultiple ? '长按管理' : '点击查看' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CorrectionImage } from '@/types/correction'

const props = defineProps<{
  image: CorrectionImage | null
  hasAny: boolean
  isLoading: boolean
  hasMultiple?: boolean
}>()

const emit = defineEmits<{
  view: []
  'long-press': []
  add: []
}>()

// 长按检测
const pressTimer = ref<number | null>(null)
const isPressing = ref(false)
const startX = ref(0)
const startY = ref(0)
const LONG_PRESS_DURATION = 500
const MOVE_THRESHOLD = 10

function handleTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  startX.value = touch.clientX
  startY.value = touch.clientY
  isPressing.value = true
  
  pressTimer.value = window.setTimeout(() => {
    if (isPressing.value) {
      emit('long-press')
      isPressing.value = false
    }
  }, LONG_PRESS_DURATION)
}

function handleTouchEnd() {
  if (pressTimer.value) {
    clearTimeout(pressTimer.value)
    pressTimer.value = null
  }
  isPressing.value = false
}

function handleTouchMove(e: TouchEvent) {
  if (!isPressing.value) return
  
  const touch = e.touches[0]
  const deltaX = Math.abs(touch.clientX - startX.value)
  const deltaY = Math.abs(touch.clientY - startY.value)
  
  if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
    handleTouchEnd()
  }
}

function handleMouseDown(e: MouseEvent) {
  startX.value = e.clientX
  startY.value = e.clientY
  isPressing.value = true
  
  pressTimer.value = window.setTimeout(() => {
    if (isPressing.value) {
      emit('long-press')
      isPressing.value = false
    }
  }, LONG_PRESS_DURATION)
}

function handleMouseUp() {
  if (pressTimer.value) {
    clearTimeout(pressTimer.value)
    pressTimer.value = null
  }
  isPressing.value = false
}
</script>
