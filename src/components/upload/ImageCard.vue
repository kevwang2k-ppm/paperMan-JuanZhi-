<template>
  <div class="relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm bg-white group">
    <img :src="image.preview" class="w-full h-full object-cover">
    
    <!-- 页码标签 -->
    <div class="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
      {{ image.pageNumber }}
    </div>
    
    <!-- 删除按钮 -->
    <button 
      @click="$emit('remove', image.id)"
      class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <i class="fas fa-times"></i>
    </button>
    
    <!-- 移动按钮 -->
    <button 
      v-if="index > 0"
      @click="$emit('move', index, index - 1)"
      class="absolute bottom-2 left-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center text-xs shadow"
    >
      <i class="fas fa-chevron-left"></i>
    </button>
    <button 
      v-if="index < total - 1"
      @click="$emit('move', index, index + 1)"
      class="absolute bottom-2 right-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center text-xs shadow"
    >
      <i class="fas fa-chevron-right"></i>
    </button>
    
    <!-- 上传进度 -->
    <div v-if="image.status === 'uploading'" class="absolute inset-0 bg-black/50 flex items-center justify-center">
      <div class="text-white text-center">
        <i class="fas fa-circle-notch fa-spin text-xl mb-1"></i>
        <div class="text-xs">{{ image.progress }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadImage } from '@/types'

interface Props {
  image: UploadImage
  index: number
  total: number
}

defineProps<Props>()

defineEmits<{
  (e: 'remove', id: string): void
  (e: 'move', from: number, to: number): void
}>()
</script>
