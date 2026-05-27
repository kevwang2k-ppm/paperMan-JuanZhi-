<template>
  <div class="original-page h-full flex flex-col overflow-hidden">
    <!-- 加载中 -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <i class="fas fa-circle-notch fa-spin text-gray-500"></i>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="!image"
      class="flex-1 flex flex-col items-center justify-center text-center"
    >
      <div class="text-gray-500 mb-2">
        <i class="fas fa-camera text-2xl mb-2"></i>
        <div class="text-xs">暂无原题截图</div>
        <div class="text-[10px] text-gray-600 mt-1">导出订正后将生成</div>
      </div>
    </div>

    <!-- 有图片 - 支持手势操作 -->
    <div
      v-else
      ref="containerRef"
      class="flex-1 relative overflow-hidden bg-gray-800 cursor-grab active:cursor-grabbing"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @dblclick="handleDoubleClick"
    >
      <!-- 图片容器 -->
      <div
        class="absolute inset-0 flex items-start justify-center pt-2"
        :style="containerStyle"
      >
        <img
          ref="imageRef"
          :src="image.url"
          class="max-w-full select-none"
          :style="imageStyle"
          alt="原题截图"
          draggable="false"
        />
      </div>

      <!-- 缩放提示 -->
      <div class="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/60 text-[10px] bg-black/30 px-2 py-0.5 rounded z-10">
        {{ Math.round(scale * 100) }}% · 双指缩放 · 双击还原
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OriginalSlice } from '@/types/correction'

const props = defineProps<{
  image: OriginalSlice | null
  isLoading: boolean
}>()

// 容器和图片引用
const containerRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)

// 变换状态
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)

// 触摸/鼠标状态
let isDragging = false
let isPinching = false
let startTouches: { x: number; y: number }[] = []
let lastDistance = 0
let startTranslate = { x: 0, y: 0 }

// 最小/最大缩放
const MIN_SCALE = 1
const MAX_SCALE = 5

// 检查是否可以拖动（图片超出容器）
function canDrag(): boolean {
  const container = containerRef.value
  const image = imageRef.value
  if (!container || !image) return false
  
  // 放大时永远可以拖动
  if (scale.value > 1) return true
  
  // 检查图片是否超出容器
  const imageHeight = image.naturalHeight * (container.clientWidth / image.naturalWidth)
  return imageHeight > container.clientHeight
}

// 图片样式
const imageStyle = computed(() => {
  return {
    transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
    transition: isDragging || isPinching ? 'none' : 'transform 0.2s ease-out'
  }
})

// 容器样式
const containerStyle = computed(() => {
  return {
    overflow: scale.value > 1 ? 'hidden' : 'visible'
  }
})

// 监听图片变化
watch(() => props.image, () => {
  resetTransform()
})

// 重置变换
function resetTransform() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

// 双击还原
function handleDoubleClick() {
  resetTransform()
}

// 获取触摸点距离
function getDistance(t1: { x: number; y: number }, t2: { x: number; y: number }) {
  const dx = t1.x - t2.x
  const dy = t1.y - t2.y
  return Math.sqrt(dx * dx + dy * dy)
}

// 限制平移范围
function constrainTranslate() {
  if (scale.value <= 1) {
    translateX.value = 0
    translateY.value = 0
    return
  }

  const container = containerRef.value
  const image = imageRef.value
  if (!container || !image) return

  const maxTranslateX = (image.clientWidth * scale.value - container.clientWidth) / 2
  const maxTranslateY = (image.clientHeight * scale.value - container.clientHeight) / 2

  // 取整避免子像素模糊
  translateX.value = Math.round(Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value)))
  translateY.value = Math.round(Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value)))
}

// 触摸开始
function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    isPinching = true
    isDragging = false
    startTouches = [
      { x: e.touches[0].clientX, y: e.touches[0].clientY },
      { x: e.touches[1].clientX, y: e.touches[1].clientY }
    ]
    lastDistance = getDistance(startTouches[0], startTouches[1])
  } else if (e.touches.length === 1) {
    isDragging = true
    startTouches = [{ x: e.touches[0].clientX, y: e.touches[0].clientY }]
    startTranslate = { x: translateX.value, y: translateY.value }
  }
}

// 触摸移动
function handleTouchMove(e: TouchEvent) {
  e.preventDefault()

  if (isPinching && e.touches.length === 2) {
    const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
    const distance = getDistance(t1, t2)

    if (lastDistance > 0) {
      const scaleFactor = distance / lastDistance
      let newScale = scale.value * scaleFactor
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
      scale.value = newScale
    }
    lastDistance = distance
  } else if (isDragging && e.touches.length === 1 && canDrag()) {
    const touch = e.touches[0]
    const dx = touch.clientX - startTouches[0].x
    const dy = touch.clientY - startTouches[0].y

    translateX.value = Math.round(startTranslate.x + dx)
    translateY.value = Math.round(startTranslate.y + dy)
  }
}

// 触摸结束
function handleTouchEnd(e: TouchEvent) {
  if (isPinching) {
    isPinching = false
    lastDistance = 0
    constrainTranslate()
  } else if (isDragging) {
    isDragging = false
    constrainTranslate()
  }
  startTouches = []
}

// 鼠标事件
let isMouseDown = false
let mouseStart = { x: 0, y: 0 }

function handleMouseDown(e: MouseEvent) {
  if (canDrag()) {
    isMouseDown = true
    isDragging = true
    mouseStart = { x: e.clientX, y: e.clientY }
    startTranslate = { x: translateX.value, y: translateY.value }
  }
}

function handleMouseMove(e: MouseEvent) {
  if (isMouseDown && isDragging && canDrag()) {
    const dx = e.clientX - mouseStart.x
    const dy = e.clientY - mouseStart.y
    translateX.value = Math.round(startTranslate.x + dx)
    translateY.value = Math.round(startTranslate.y + dy)
  }
}

function handleMouseUp() {
  if (isMouseDown) {
    isMouseDown = false
    isDragging = false
    constrainTranslate()
  }
}
</script>
