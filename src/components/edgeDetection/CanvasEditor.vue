<template>
  <div class="canvas-editor" ref="containerRef">
    <canvas
      ref="canvasRef"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      class="cursor-crosshair"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import type { Corners, Point } from '@/types/edgeDetection'

interface Props {
  imageUrl: string
  corners: Corners | null
  imageSize: { width: number; height: number }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:corners', corners: Corners): void
}>()

const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()
const ctx = ref<CanvasRenderingContext2D | null>(null)
const image = ref<HTMLImageElement>()

// 编辑器状态
const state = ref({
  isDragging: false,
  draggedCornerIndex: -1, // 0:TL, 1:TR, 2:BR, 3:BL
  scale: 1,
  offset: { x: 0, y: 0 }
})

// 当前四角（可编辑副本）
const currentCorners = ref<Corners>({
  tl: [0, 0],
  tr: [100, 0],
  br: [100, 100],
  bl: [0, 100]
})

// 初始化 Canvas
onMounted(() => {
  nextTick(() => {
    initCanvas()
  })
})

watch(() => props.imageUrl, () => {
  nextTick(() => {
    initCanvas()
  })
})

watch(() => props.corners, (newVal) => {
  if (newVal) {
    currentCorners.value = { ...newVal }
    draw()
  }
}, { deep: true })

async function initCanvas() {
  if (!canvasRef.value || !containerRef.value) return
  
  // 加载图片
  image.value = new Image()
  image.value.crossOrigin = 'anonymous'
  image.value.src = props.imageUrl
  
  await new Promise<void>((resolve, reject) => {
    if (!image.value) return resolve()
    image.value.onload = () => resolve()
    image.value.onerror = () => reject(new Error('图片加载失败'))
  })
  
  // 设置Canvas尺寸为容器尺寸
  const container = containerRef.value
  const canvas = canvasRef.value
  
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
  
  ctx.value = canvas.getContext('2d')
  
  // 使用 props.imageSize 作为参考尺寸
  const refWidth = props.imageSize.width || image.value.naturalWidth
  const refHeight = props.imageSize.height || image.value.naturalHeight
  
  // 计算缩放比例（保持比例，适应容器）
  const scale = Math.min(
    canvas.width / refWidth,
    canvas.height / refHeight
  )
  state.value.scale = scale
  
  // 计算居中偏移
  state.value.offset.x = (canvas.width - refWidth * scale) / 2
  state.value.offset.y = (canvas.height - refHeight * scale) / 2
  
  // 初始化四角（如果没有提供）
  if (!props.corners) {
    currentCorners.value = {
      tl: [10, 10],
      tr: [refWidth - 10, 10],
      br: [refWidth - 10, refHeight - 10],
      bl: [10, refHeight - 10]
    }
  } else {
    currentCorners.value = { ...props.corners }
  }
  
  draw()
}

// 绘制函数
function draw() {
  if (!ctx.value || !image.value) return
  const c = ctx.value
  if (!c.canvas) return
  const scale = state.value.scale
  const offsetX = state.value.offset.x
  const offsetY = state.value.offset.y
  
  // 清空画布
  c.clearRect(0, 0, c.canvas.width, c.canvas.height)
  
  // 绘制图片（保持比例，居中）
  const imgWidth = (props.imageSize.width || image.value.naturalWidth) * scale
  const imgHeight = (props.imageSize.height || image.value.naturalHeight) * scale
  c.drawImage(image.value, offsetX, offsetY, imgWidth, imgHeight)
  
  // 绘制半透明遮罩（四边形外部）
  drawOverlay()
  
  // 绘制四边形边框
  drawPolygon()
  
  // 绘制四角控制点
  drawCorners()
}

function drawOverlay() {
  if (!ctx.value) return
  const c = ctx.value
  const corners = currentCorners.value
  const scale = state.value.scale
  const offsetX = state.value.offset.x
  const offsetY = state.value.offset.y
  
  c.save()
  c.fillStyle = 'rgba(0, 0, 0, 0.5)'
  c.beginPath()
  c.rect(0, 0, c.canvas.width, c.canvas.height)
  
  // 挖空四边形区域（添加偏移）
  c.moveTo(corners.tl[0] * scale + offsetX, corners.tl[1] * scale + offsetY)
  c.lineTo(corners.tr[0] * scale + offsetX, corners.tr[1] * scale + offsetY)
  c.lineTo(corners.br[0] * scale + offsetX, corners.br[1] * scale + offsetY)
  c.lineTo(corners.bl[0] * scale + offsetX, corners.bl[1] * scale + offsetY)
  c.closePath()
  
  c.fill('evenodd')
  c.restore()
}

function drawPolygon() {
  if (!ctx.value) return
  const c = ctx.value
  const corners = currentCorners.value
  const scale = state.value.scale
  const offsetX = state.value.offset.x
  const offsetY = state.value.offset.y
  
  c.save()
  c.strokeStyle = '#3B82F6'
  c.lineWidth = 3
  c.beginPath()
  c.moveTo(corners.tl[0] * scale + offsetX, corners.tl[1] * scale + offsetY)
  c.lineTo(corners.tr[0] * scale + offsetX, corners.tr[1] * scale + offsetY)
  c.lineTo(corners.br[0] * scale + offsetX, corners.br[1] * scale + offsetY)
  c.lineTo(corners.bl[0] * scale + offsetX, corners.bl[1] * scale + offsetY)
  c.closePath()
  c.stroke()
  c.restore()
}

function drawCorners() {
  if (!ctx.value) return
  const c = ctx.value
  const corners = [
    currentCorners.value.tl,
    currentCorners.value.tr,
    currentCorners.value.br,
    currentCorners.value.bl
  ]
  const labels = ['TL', 'TR', 'BR', 'BL']
  const scale = state.value.scale
  const offsetX = state.value.offset.x
  const offsetY = state.value.offset.y
  
  corners.forEach((corner, idx) => {
    const x = corner[0] * scale + offsetX
    const y = corner[1] * scale + offsetY
    
    // 控制点圆圈（视觉上小一些，无填充）
    const visualRadius = 5  // 视觉半径 - 小一些
    
    // 绘制视觉圆圈（无填充，只有边框）
    c.beginPath()
    c.arc(x, y, visualRadius, 0, Math.PI * 2)
    c.fillStyle = 'transparent'
    c.fill()
    c.strokeStyle = '#3B82F6'
    c.lineWidth = 2
    c.stroke()
    
    // 绘制白色内边框增加对比度
    c.beginPath()
    c.arc(x, y, visualRadius - 1, 0, Math.PI * 2)
    c.strokeStyle = 'white'
    c.lineWidth = 1
    c.stroke()
    
    // 标签
    c.fillStyle = 'white'
    c.font = '12px sans-serif'
    c.fillText(labels[idx], x + visualRadius + 4, y - visualRadius - 4)
  })
}

// 鼠标/触摸事件处理
function handleMouseDown(e: MouseEvent) {
  const pos = getMousePos(e)
  const hitIndex = hitTestCorner(pos)
  
  if (hitIndex >= 0) {
    state.value.isDragging = true
    state.value.draggedCornerIndex = hitIndex
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!state.value.isDragging) return
  
  const pos = getMousePos(e)
  updateCornerPosition(pos)
}

function handleMouseUp() {
  if (state.value.isDragging) {
    state.value.isDragging = false
    state.value.draggedCornerIndex = -1
    // 通知父组件更新
    emit('update:corners', { ...currentCorners.value })
  }
}

// 触摸事件
function handleTouchStart(e: TouchEvent) {
  e.preventDefault()
  const touch = e.touches[0]
  const pos = getTouchPos(touch)
  const hitIndex = hitTestCorner(pos)
  
  if (hitIndex >= 0) {
    state.value.isDragging = true
    state.value.draggedCornerIndex = hitIndex
  }
}

function handleTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (!state.value.isDragging) return
  
  const touch = e.touches[0]
  const pos = getTouchPos(touch)
  updateCornerPosition(pos)
}

function handleTouchEnd(e: TouchEvent) {
  e.preventDefault()
  if (state.value.isDragging) {
    state.value.isDragging = false
    state.value.draggedCornerIndex = -1
    emit('update:corners', { ...currentCorners.value })
  }
}

// 辅助函数
function getMousePos(e: MouseEvent): Point {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left - state.value.offset.x) / state.value.scale,
    y: (e.clientY - rect.top - state.value.offset.y) / state.value.scale
  }
}

function getTouchPos(touch: Touch): Point {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: (touch.clientX - rect.left - state.value.offset.x) / state.value.scale,
    y: (touch.clientY - rect.top - state.value.offset.y) / state.value.scale
  }
}

function hitTestCorner(pos: Point): number {
  const corners = [
    currentCorners.value.tl,
    currentCorners.value.tr,
    currentCorners.value.br,
    currentCorners.value.bl
  ]
  // 触摸阈值 44px（在屏幕坐标系中）
  const threshold = 44 / state.value.scale
  
  for (let i = 0; i < corners.length; i++) {
    const dist = Math.sqrt(
      Math.pow(pos.x - corners[i][0], 2) + 
      Math.pow(pos.y - corners[i][1], 2)
    )
    if (dist < threshold) return i
  }
  return -1
}

function updateCornerPosition(pos: Point) {
  const idx = state.value.draggedCornerIndex
  const cornerKeys: (keyof Corners)[] = ['tl', 'tr', 'br', 'bl']
  const key = cornerKeys[idx]
  
  // 限制在图片范围内
  const maxX = props.imageSize.width
  const maxY = props.imageSize.height
  
  currentCorners.value[key] = [
    Math.max(0, Math.min(maxX, pos.x)),
    Math.max(0, Math.min(maxY, pos.y))
  ]
  
  draw()
}
</script>

<style scoped>
.canvas-editor {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

canvas {
  /* 限制最大尺寸，保持比例 */
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  touch-action: none; /* 防止触摸滚动 */
}
</style>
