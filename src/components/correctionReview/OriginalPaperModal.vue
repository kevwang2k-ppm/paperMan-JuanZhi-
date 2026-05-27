<template>
  <div class="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
    <!-- 头部 - 适配 iPhone 刘海屏 -->
    <div class="flex items-center justify-between px-4 pb-3 bg-black text-white header-safe-area">
      <div>
        <h3 class="font-medium">原卷预览 - 第 {{ currentPage }} 页</h3>
        <p class="text-xs text-gray-400">{{ paperName }}</p>
      </div>
      <button @click="close" class="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <!-- 工具栏 -->
    <div class="px-4 py-2 bg-gray-900 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button @click="zoomOut" class="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700">
          <i class="fas fa-minus text-sm"></i>
        </button>
        <span class="text-sm text-gray-300 w-16 text-center">{{ Math.round(scale * 100) }}%</span>
        <button @click="zoomIn" class="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700">
          <i class="fas fa-plus text-sm"></i>
        </button>
        <button @click="resetZoom" class="px-3 py-1 bg-gray-800 rounded-lg text-xs hover:bg-gray-700 ml-2">
          适应
        </button>
      </div>
    </div>
    
    <!-- 图片区域 -->
    <div 
      class="flex-1 overflow-auto bg-gray-950 cursor-grab active:cursor-grabbing relative" 
      ref="containerRef"
      @mousedown="onDragStart"
      @mousemove="onDragMove"
      @mouseup="onDragEnd"
      @mouseleave="onDragEnd"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- 图片容器 - 使用 inline-block 确保大小随内容扩展 -->
      <div 
        class="inline-block p-4" 
        ref="imageContainerRef"
        :style="{ minWidth: '100%', minHeight: '100%' }"
      >
        <!-- 错误状态 -->
        <div v-if="imageError" class="text-white text-center py-12 max-w-md">
          <i class="fas fa-exclamation-circle text-4xl mb-4 text-red-400"></i>
          <p class="mb-2">图片加载失败</p>
          <p class="text-xs text-gray-400 break-all">{{ pageImageUrl }}</p>
        </div>
        
        <!-- 图片 + SVG 覆盖层 - 使用 transform 进行平移 -->
        <!-- 图片容器始终保持渲染，用 v-show 控制显示/隐藏 -->
        <div 
          v-show="!imageError"
          class="relative"
          :style="containerStyle"
        >
          <img 
            ref="imageRef"
            :key="currentPage"
            :src="pageImageUrl" 
            class="block w-full h-full"
            alt="原卷页面"
            @load="onImageLoad"
            @error="handleImageError"
            draggable="false"
          >
          <!-- 加载遮罩层 -->
          <div 
            v-if="isLoading"
            class="absolute inset-0 bg-black/80 flex items-center justify-center z-20"
          >
            <div class="text-white text-center">
              <i class="fas fa-circle-notch fa-spin text-3xl mb-4"></i>
              <p>加载中...</p>
            </div>
          </div>
          <!-- SVG 矩形框覆盖层 -->
          <svg 
            v-if="hasValidBbox && imageLoaded"
            class="absolute top-0 left-0 w-full h-full pointer-events-none"
            style="z-index: 10;"
          >
            <!-- 外发光效果 -->
            <rect
              :x="scaledBbox.x - 2"
              :y="scaledBbox.y - 2"
              :width="scaledBbox.width + 4"
              :height="scaledBbox.height + 4"
              fill="none"
              stroke="#FF0000"
              stroke-width="6"
              opacity="0.3"
              rx="2"
            />
            <!-- 主矩形框 -->
            <rect
              :x="scaledBbox.x"
              :y="scaledBbox.y"
              :width="scaledBbox.width"
              :height="scaledBbox.height"
              fill="none"
              stroke="#FF0000"
              stroke-width="3"
              rx="2"
            />
            <!-- 标签 -->
            <text
              :x="scaledBbox.x + 5"
              :y="scaledBbox.y - 8"
              fill="#FF0000"
              font-size="14"
              font-weight="bold"
            >错题位置</text>
          </svg>
        </div>
      </div>
    </div>
    
    <!-- 底部导航 -->
    <div class="px-4 py-3 bg-black flex justify-center items-center gap-4 footer-safe-area">
      <button 
        @click="prevPage" 
        :disabled="currentPage <= 1"
        class="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i class="fas fa-chevron-left mr-2"></i>上一页
      </button>
      
      <span class="text-white">
        {{ currentPage }} / {{ totalPages }}
      </span>
      
      <button 
        @click="nextPage" 
        :disabled="currentPage >= totalPages"
        class="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        下一页<i class="fas fa-chevron-right ml-2"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface Props {
  paperId: string       // 试卷 UUID
  paperName: string
  pageNumber: number
  totalPages: number
  bbox?: number[]       // [y0, x0, y1, x1] 相对坐标 (0-1)
  questionPositions?: {page: number, bbox: number[]}[]  // 题目位置信息（支持多页）
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

// 状态
const currentPage = ref(props.pageNumber)
const scale = ref(1.0)
const baseScale = ref(1.0)
const isLoading = ref(false)
const imageError = ref(false)
const imageLoaded = ref(false)
const imageNaturalSize = ref({ width: 0, height: 0 })
const containerRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)

// 拖动/平移状态
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 触摸状态
let initialDistance = 0
let initialScale = 1
let initialTranslateX = 0
let initialTranslateY = 0
let isTouchZooming = false

// 图片 URL - 使用 papers API 获取原图
const pageImageUrl = computed(() => {
  console.log('[DEBUG] paperId:', props.paperId, 'page:', currentPage.value)
  if (!props.paperId) {
    console.log('[DEBUG] paperId is empty!')
    return ''
  }
  // 使用 papers API 获取原卷页面，dpi 150 平衡质量和速度
  // 添加时间戳防止缓存，确保翻页时触发新的请求
  const timestamp = Date.now()
  const url = `/api/v1/papers/${props.paperId}/pages/${currentPage.value}?dpi=150&t=${timestamp}`
  console.log('[DEBUG] pageImageUrl:', url)
  return url
})

// 获取当前页对应的 bbox
const currentBbox = computed(() => {
  // 如果有 questionPositions，根据当前页码匹配
  if (props.questionPositions && props.questionPositions.length > 0) {
    const match = props.questionPositions.find(p => p.page === currentPage.value)
    if (match && match.bbox.length === 4) {
      return match.bbox
    }
  }
  // 否则使用传入的 bbox（仅当当前页等于 pageNumber 时）
  if (currentPage.value === props.pageNumber && props.bbox) {
    return props.bbox
  }
  return null
})

// 是否有有效的 bbox
const hasValidBbox = computed(() => {
  const valid = currentBbox.value && currentBbox.value.length === 4 && currentBbox.value.some(v => v > 0)
  console.log('[DEBUG] hasValidBbox:', valid, 'currentPage:', currentPage.value, 'bbox:', currentBbox.value)
  return valid
})

// 计算缩放后的图片尺寸
const scaledImageSize = computed(() => {
  return {
    width: imageNaturalSize.value.width * scale.value,
    height: imageNaturalSize.value.height * scale.value
  }
})

// 图片容器样式 - 使用 transform 进行缩放和平移
const containerStyle = computed(() => {
  return {
    width: `${scaledImageSize.value.width}px`,
    height: `${scaledImageSize.value.height}px`,
    transform: `translate(${translateX.value}px, ${translateY.value}px) scale(1)`,
    transformOrigin: 'center center'
  }
})

// 计算缩放后的 bbox 像素坐标
const scaledBbox = computed(() => {
  if (!hasValidBbox.value || imageNaturalSize.value.width === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  
  const imgW = imageNaturalSize.value.width
  const imgH = imageNaturalSize.value.height
  
  // 使用当前页对应的 bbox
  const bbox = currentBbox.value
  if (!bbox) return { x: 0, y: 0, width: 0, height: 0 }
  
  const [y0, x0, y1, x1] = bbox
  
  // 转换为像素坐标并应用缩放
  const px = x0 * imgW * scale.value
  const py = y0 * imgH * scale.value
  const pw = (x1 - x0) * imgW * scale.value
  const ph = (y1 - y0) * imgH * scale.value
  
  return {
    x: px,
    y: py,
    width: pw,
    height: ph
  }
})

// 图片加载完成
function onImageLoad() {
  if (imageRef.value) {
    imageNaturalSize.value = {
      width: imageRef.value.naturalWidth,
      height: imageRef.value.naturalHeight
    }
    imageLoaded.value = true
    isLoading.value = false
    
    // 首次加载时自动适应窗口
    if (scale.value === 1.0 && baseScale.value === 1.0) {
      nextTick(() => {
        fitToWindow()
      })
    }
  }
}

// 图片加载错误
function handleImageError() {
  imageError.value = true
  isLoading.value = false
  console.error('[DEBUG] 原卷图片加载失败:', pageImageUrl.value, 'paperId:', props.paperId)
}

// 缩放操作 - 以中心为基准缩放
function zoomIn() {
  const oldScale = scale.value
  scale.value *= 1.25
  // 调整位置以保持中心点
  adjustTranslateOnZoom(oldScale, scale.value)
}

function zoomOut() {
  const oldScale = scale.value
  scale.value /= 1.25
  if (scale.value < 0.2) scale.value = 0.2
  adjustTranslateOnZoom(oldScale, scale.value)
}

function resetZoom() {
  scale.value = baseScale.value || 1.0
  translateX.value = 0
  translateY.value = 0
}

// 缩放时调整位置以保持中心
function adjustTranslateOnZoom(oldScale: number, newScale: number) {
  // 简单的中心缩放，可以根据需要调整
  const scaleRatio = newScale / oldScale
  translateX.value = translateX.value * scaleRatio
  translateY.value = translateY.value * scaleRatio
}

// 鼠标拖动事件
function onDragStart(e: MouseEvent) {
  isDragging.value = true
  dragStart.value = { x: e.clientX - translateX.value, y: e.clientY - translateY.value }
}

function onDragMove(e: MouseEvent) {
  if (!isDragging.value) return
  e.preventDefault()
  translateX.value = e.clientX - dragStart.value.x
  translateY.value = e.clientY - dragStart.value.y
}

function onDragEnd() {
  isDragging.value = false
}

// 适应窗口
function fitToWindow() {
  if (!containerRef.value || imageNaturalSize.value.width === 0) return
  
  const containerWidth = containerRef.value.clientWidth - 32 // padding
  const containerHeight = containerRef.value.clientHeight - 32
  const imgWidth = imageNaturalSize.value.width
  const imgHeight = imageNaturalSize.value.height
  
  // 计算适应比例，保持宽高比
  const scaleX = containerWidth / imgWidth
  const scaleY = containerHeight / imgHeight
  const newScale = Math.min(scaleX, scaleY, 1.5) // 最大 150%
  
  scale.value = newScale
  baseScale.value = newScale
  // 适应窗口时重置位置
  translateX.value = 0
  translateY.value = 0
}

// 翻页
function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    resetPageState()
  }
}

function nextPage() {
  if (currentPage.value < props.totalPages) {
    currentPage.value++
    resetPageState()
  }
}

// 重置页面状态
function resetPageState() {
  imageLoaded.value = false
  imageError.value = false
  isLoading.value = true
  // 保持当前缩放比例
}

// 关闭
function close() {
  emit('close')
}

// 监听 pageNumber prop 变化
watch(() => props.pageNumber, (newPage) => {
  currentPage.value = newPage
  resetPageState()
})

// 监听图片 URL 变化，重置加载状态
watch(pageImageUrl, () => {
  if (pageImageUrl.value) {
    isLoading.value = true
    imageError.value = false
    imageLoaded.value = false
  }
})

function getTouchDistance(touches: TouchList) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getTouchCenter(touches: TouchList) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  }
}

// 触摸事件处理 - 支持单指拖动和双指缩放
// 双指缩放时记录的中心点（相对于视口）
let pinchCenterX = 0
let pinchCenterY = 0

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    // 双指缩放开始
    isTouchZooming = true
    initialDistance = getTouchDistance(e.touches)
    initialScale = scale.value
    initialTranslateX = translateX.value
    initialTranslateY = translateY.value
    // 记录双指中心点（相对于视口）
    const center = getTouchCenter(e.touches)
    pinchCenterX = center.x
    pinchCenterY = center.y
  } else if (e.touches.length === 1) {
    // 单指拖动开始
    isTouchZooming = false
    dragStart.value = {
      x: e.touches[0].clientX - translateX.value,
      y: e.touches[0].clientY - translateY.value
    }
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2 && isTouchZooming) {
    // 双指缩放 - 以双指中心为基准
    e.preventDefault()
    const currentDistance = getTouchDistance(e.touches)
    const scaleFactor = currentDistance / initialDistance
    const newScale = Math.max(0.2, Math.min(3.0, initialScale * scaleFactor))
    
    // 以双指中心为基准进行缩放
    // 计算中心点相对于图片的位置
    const containerRect = containerRef.value?.getBoundingClientRect()
    if (containerRect) {
      // 中心点相对于容器的位置
      const centerX = pinchCenterX - containerRect.left
      const centerY = pinchCenterY - containerRect.top
      
      // 计算新的位置，使得中心点在缩放前后保持在同一位置
      const scaleRatio = newScale / initialScale
      translateX.value = centerX - (centerX - initialTranslateX) * scaleRatio
      translateY.value = centerY - (centerY - initialTranslateY) * scaleRatio
    }
    
    scale.value = newScale
  } else if (e.touches.length === 1 && !isTouchZooming) {
    // 单指拖动
    e.preventDefault()
    translateX.value = e.touches[0].clientX - dragStart.value.x
    translateY.value = e.touches[0].clientY - dragStart.value.y
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) {
    isTouchZooming = false
  }
  if (e.touches.length === 0) {
    isDragging.value = false
  }
}

</script>

<style scoped>
/* 防止图片拖拽 */
img {
  -webkit-user-drag: none;
  user-select: none;
}

/* iPhone 刘海屏适配 */
.header-safe-area {
  padding-top: max(12px, env(safe-area-inset-top));
}

/* 底部导航也适配安全区域 */
.footer-safe-area {
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}
</style>
