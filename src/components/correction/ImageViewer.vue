<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/90 z-[100] flex flex-col"
      @click.self="close"
    >
      <!-- 顶部导航栏 -->
      <div class="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-black/50 safe-area-top">
        <button
          @click="close"
          class="text-white/80 hover:text-white p-1 sm:p-2 flex-shrink-0"
        >
          <i class="fas fa-times text-base sm:text-lg"></i>
        </button>
        
        <div class="text-white text-xs sm:text-sm truncate text-center mx-2 flex-1 max-w-[60vw]">
          <span class="truncate">{{ title }}</span>
          <span class="whitespace-nowrap">({{ currentIndex + 1 }}/{{ images.length }})</span>
          <span
            v-if="currentImage?.level"
            class="ml-1 sm:ml-2 px-1 py-0.5 text-[10px] rounded inline-block"
            :class="currentImage.level === 'question' ? 'bg-green-500' : 'bg-blue-500'"
          >
            {{ currentImage.level === 'question' ? '题' : '卷' }}
          </span>
        </div>
        
        <div class="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <button
            v-if="showDownload"
            @click="downloadCurrent"
            class="text-white/80 hover:text-white p-1 sm:p-2"
          >
            <i class="fas fa-download text-sm sm:text-base"></i>
          </button>
        </div>
      </div>

      <!-- 图片显示区域 -->
      <div class="flex-1 relative overflow-hidden flex items-center justify-center">
        <!-- 左切换按钮 -->
        <button
          v-if="images.length > 1"
          @click="prev"
          class="absolute left-2 z-10 w-10 h-10 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50"
          :class="{ 'opacity-30 cursor-not-allowed': currentIndex === 0 }"
          :disabled="currentIndex === 0"
        >
          <i class="fas fa-chevron-left"></i>
        </button>

        <!-- 图片 -->
        <div
          class="relative max-w-full max-h-full transition-transform duration-300"
          :style="{ transform: `scale(${scale})` }"
          @dblclick="toggleZoom"
        >
          <img
            :src="currentImage?.url"
            class="max-w-full max-h-[70vh] object-contain select-none"
            alt="查看图片"
            draggable="false"
          />
        </div>

        <!-- 右切换按钮 -->
        <button
          v-if="images.length > 1"
          @click="next"
          class="absolute right-2 z-10 w-10 h-10 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50"
          :class="{ 'opacity-30 cursor-not-allowed': currentIndex >= images.length - 1 }"
          :disabled="currentIndex >= images.length - 1"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <!-- 底部缩略图栏（仅订正图片显示） -->
      <div v-if="showThumbnails && images.length > 1" class="bg-black/50 p-1 sm:p-2">
        <div class="flex space-x-1 sm:space-x-2 overflow-x-auto">
          <div
            v-for="(img, index) in images"
            :key="img.id || index"
            class="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded cursor-pointer border-2 overflow-hidden"
            :class="index === currentIndex ? 'border-blue-500' : 'border-transparent'"
            @click="currentIndex = index"
          >
            <img
              :src="img.url"
              class="w-full h-full object-cover"
              alt=""
            />
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="bg-black/50 px-2 sm:px-4 py-2 flex items-center justify-between safe-area-bottom">
        <div class="text-white/60 text-[10px] sm:text-xs">
          双击缩放
        </div>
        <div class="flex items-center space-x-2 sm:space-x-4">
          <button
            @click="zoomOut"
            class="text-white/80 hover:text-white p-1"
            :disabled="scale <= 0.5"
          >
            <i class="fas fa-minus text-sm sm:text-base"></i>
          </button>
          <span class="text-white text-xs sm:text-sm min-w-[3ch] text-center">{{ Math.round(scale * 100) }}%</span>
          <button
            @click="zoomIn"
            class="text-white/80 hover:text-white p-1"
            :disabled="scale >= 3"
          >
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface ImageItem {
  id?: string
  url: string
  level?: 'question' | 'paper'
  filename?: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  images: ImageItem[]
  title?: string
  initialIndex?: number
  showThumbnails?: boolean
  showDownload?: boolean
}>(), {
  title: '图片查看',
  initialIndex: 0,
  showThumbnails: false,
  showDownload: true
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:currentIndex': [value: number]
}>()

const currentIndex = ref(props.initialIndex)
const scale = ref(1)

const currentImage = computed(() => {
  return props.images[currentIndex.value] || null
})

// 监听 visible 变化，打开时重置状态
watch(() => props.visible, (val) => {
  if (val) {
    currentIndex.value = props.initialIndex
    scale.value = 1
  }
})

function close() {
  emit('update:visible', false)
}

function prev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    scale.value = 1
  }
}

function next() {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
    scale.value = 1
  }
}

function zoomIn() {
  if (scale.value < 3) {
    scale.value = Math.min(3, scale.value + 0.25)
  }
}

function zoomOut() {
  if (scale.value > 0.5) {
    scale.value = Math.max(0.5, scale.value - 0.25)
  }
}

function toggleZoom() {
  if (scale.value > 1) {
    scale.value = 1
  } else {
    scale.value = 2
  }
}

function downloadCurrent() {
  if (!currentImage.value?.url) return
  
  const link = document.createElement('a')
  link.href = currentImage.value.url
  link.download = currentImage.value.filename || 'image.jpg'
  link.click()
}
</script>
