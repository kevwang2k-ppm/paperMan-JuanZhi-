<template>
  <div class="image-grid">
    <!-- 空状态 -->
    <div v-if="images.length === 0" class="empty-state">
      <slot name="empty">
        <div class="text-center py-12">
          <i class="fas fa-images text-4xl text-gray-300 mb-4"></i>
          <p class="text-gray-500">暂无图片</p>
        </div>
      </slot>
    </div>

    <!-- 图片网格 -->
    <div 
      v-else
      class="grid gap-3"
      :class="gridColsClass"
    >
      <div
        v-for="(image, index) in images"
        :key="image.image_id"
        class="image-item relative"
        :class="{ 'opacity-50': dragIndex === index }"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragover.prevent="handleDragOver($event, index)"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
      >
        <ImageThumbnail
          :thumbnail-url="image.thumbnailUrl || ''"
          :page-number="index + 1"
          :corners="image.corners"
          :img-width="image.image_size.width"
          :img-height="image.image_size.height"
          :is-selected="selectedIndex === index"
          :is-default="image.is_default"
          @click="$emit('select', index)"
          @remove="$emit('remove', index)"
        />
        
        <!-- 拖拽指示器 -->
        <div 
          v-if="dropIndex === index && dragIndex !== index"
          class="absolute inset-y-0 -left-1.5 w-1 bg-blue-500 rounded-full"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ImageThumbnail from './ImageThumbnail.vue'
import type { EdgeDetectionImage } from '@/types/edgeDetection'

interface Props {
  images: EdgeDetectionImage[]
  selectedIndex?: number | null
  columns?: number
}

const props = withDefaults(defineProps<Props>(), {
  selectedIndex: null,
  columns: 3
})

const emit = defineEmits<{
  (e: 'select', index: number): void
  (e: 'remove', index: number): void
  (e: 'reorder', oldIndex: number, newIndex: number): void
}>()

// 网格列数
const gridColsClass = computed(() => {
  const cols = props.columns
  if (cols === 2) return 'grid-cols-2'
  if (cols === 3) return 'grid-cols-3'
  if (cols === 4) return 'grid-cols-4'
  if (cols === 5) return 'grid-cols-5'
  return 'grid-cols-3'
})

// 拖拽状态
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)

function handleDragStart(e: DragEvent, index: number) {
  dragIndex.value = index
  
  // 设置拖拽数据
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  
  if (dragIndex.value !== null && dragIndex.value !== index) {
    dropIndex.value = index
  }
}

function handleDrop(e: DragEvent, index: number) {
  e.preventDefault()
  
  const fromIndex = dragIndex.value
  if (fromIndex !== null && fromIndex !== index) {
    emit('reorder', fromIndex, index)
  }
  
  // 重置状态
  dragIndex.value = null
  dropIndex.value = null
}

function handleDragEnd() {
  dragIndex.value = null
  dropIndex.value = null
}
</script>

<style scoped>
.image-grid {
  width: 100%;
}

.image-item {
  cursor: grab;
}

.image-item:active {
  cursor: grabbing;
}

.image-item.opacity-50 {
  cursor: grabbing;
}

/* 拖拽时的样式 */
.image-item[draggable="true"] {
  user-select: none;
}
</style>
