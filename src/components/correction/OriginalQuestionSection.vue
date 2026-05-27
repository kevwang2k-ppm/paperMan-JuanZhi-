<template>
  <div class="original-section flex flex-col h-full min-h-0 overflow-hidden">
    <!-- 标题 -->
    <div class="text-xs text-gray-400 mb-2 flex items-center justify-center">
      <i class="fas fa-camera mr-1"></i>
      <span>原题</span>
    </div>

    <!-- 加载中 -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <i class="fas fa-circle-notch fa-spin text-gray-500"></i>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="!image"
      class="flex-1 flex flex-col items-center justify-center text-center p-2"
    >
      <div class="text-gray-500 mb-2">
        <i class="fas fa-camera text-lg mb-1"></i>
        <div class="text-[10px] leading-tight">
          导出订正后将生成<br />题目截图
        </div>
      </div>
      <button
        @click="$emit('export')"
        class="text-[10px] text-blue-400 hover:text-blue-300 flex items-center"
      >
        去导出 <i class="fas fa-chevron-right ml-1 text-[8px]"></i>
      </button>
    </div>

    <!-- 有图片 - 仅显示单张 -->
    <div
      v-else
      class="flex-1 relative cursor-pointer overflow-hidden rounded-lg bg-gray-800 min-h-0"
      @click="$emit('view')"
    >
      <img
        :src="image.url"
        class="w-full h-full object-contain max-h-full"
        alt="原题截图"
      />
      <!-- 点击查看提示 -->
      <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent py-1">
        <span class="text-[10px] text-white/80 text-center block">点击查看</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OriginalSlice } from '@/types/correction'

defineProps<{
  image: OriginalSlice | null
  isLoading: boolean
}>()

defineEmits<{
  view: []
  export: []
}>()
</script>
