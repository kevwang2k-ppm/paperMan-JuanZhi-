<template>
  <div 
    class="image-thumbnail relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all"
    :class="{
      'border-blue-500 ring-2 ring-blue-200': isSelected,
      'border-gray-200': !isSelected,
      'opacity-75': isDefault
    }"
    @click="$emit('click')"
  >
    <!-- 缩略图 -->
    <img 
      :src="thumbnailUrl" 
      :alt="`Page ${pageNumber}`"
      class="thumbnail-img w-full h-full object-cover"
    />
    
    <!-- 四边形覆盖层 -->
    <!-- 使用 xMidYMid slice 保持与 object-cover 一致的裁剪行为 -->
    <svg 
      class="corner-overlay absolute inset-0 w-full h-full pointer-events-none"
      :viewBox="`0 0 ${imgWidth} ${imgHeight}`"
      preserveAspectRatio="xMidYMid slice"
    >
      <polygon
        :points="polygonPoints"
        fill="rgba(59, 130, 246, 0.2)"
        stroke="#3B82F6"
        stroke-width="2"
      />
      <circle
        v-for="(corner, idx) in scaledCorners"
        :key="idx"
        :cx="corner.x"
        :cy="corner.y"
        r="4"
        fill="#3B82F6"
      />
    </svg>
    
    <!-- 页码 -->
    <div class="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
      {{ pageNumber }}
    </div>
    
    <!-- 默认四角警告 -->
    <div 
      v-if="isDefault"
      class="absolute top-1 right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded"
      title="使用默认四角，建议调整"
    >
      <i class="fas fa-exclamation-triangle"></i>
    </div>
    
    <!-- 删除按钮 -->
    <button
      v-if="!hideDelete"
      class="absolute top-1 left-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
      @click.stop="$emit('remove')"
    >
      <i class="fas fa-times text-xs"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Corners } from '@/types/edgeDetection'

interface Props {
  thumbnailUrl: string
  pageNumber: number
  corners: Corners | null
  imgWidth: number
  imgHeight: number
  isSelected?: boolean
  isDefault?: boolean
  hideDelete?: boolean
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'click'): void
  (e: 'remove'): void
}>()

// 缩放后的四角坐标（基于 viewBox）
const scaledCorners = computed(() => {
  if (!props.corners) {
    // 默认四角
    return [
      { x: 10, y: 10 },
      { x: props.imgWidth - 10, y: 10 },
      { x: props.imgWidth - 10, y: props.imgHeight - 10 },
      { x: 10, y: props.imgHeight - 10 }
    ]
  }
  
  return [
    { x: props.corners.tl[0], y: props.corners.tl[1] },
    { x: props.corners.tr[0], y: props.corners.tr[1] },
    { x: props.corners.br[0], y: props.corners.br[1] },
    { x: props.corners.bl[0], y: props.corners.bl[1] }
  ]
})

// 多边形点字符串
const polygonPoints = computed(() => {
  return scaledCorners.value.map(p => `${p.x},${p.y}`).join(' ')
})
</script>

<style scoped>
.image-thumbnail {
  aspect-ratio: 3/4;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.corner-overlay {
  position: absolute;
  inset: 0;
}

/* 悬停时显示删除按钮 */
.image-thumbnail:hover button[title="删除"] {
  opacity: 1;
}
</style>
