import { ref, onMounted, onUnmounted } from 'vue'

export interface CanvasState {
  scale: number
  translateX: number
  translateY: number
}

export function useCanvas(canvasRef: Ref<HTMLCanvasElement | null>) {
  const scale = ref(1)
  const translateX = ref(0)
  const translateY = ref(0)
  const isDragging = ref(false)
  
  let startX = 0
  let startY = 0
  let initialTranslateX = 0
  let initialTranslateY = 0
  
  // 缩放
  function zoomIn(factor: number = 1.2): void {
    scale.value = Math.min(scale.value * factor, 3)
    applyTransform()
  }
  
  function zoomOut(factor: number = 0.8): void {
    scale.value = Math.max(scale.value * factor, 0.5)
    applyTransform()
  }
  
  function resetZoom(): void {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
    applyTransform()
  }
  
  // 应用变换
  function applyTransform(): void {
    const canvas = canvasRef.value
    if (!canvas) return
    
    canvas.style.transform = `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`
  }
  
  // 触摸事件处理
  function handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      isDragging.value = true
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      initialTranslateX = translateX.value
      initialTranslateY = translateY.value
    }
  }
  
  function handleTouchMove(e: TouchEvent): void {
    if (!isDragging.value || e.touches.length !== 1) return
    
    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY
    
    translateX.value = initialTranslateX + dx
    translateY.value = initialTranslateY + dy
    
    applyTransform()
  }
  
  function handleTouchEnd(): void {
    isDragging.value = false
  }
  
  // 滚轮缩放
  function handleWheel(e: WheelEvent): void {
    e.preventDefault()
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    scale.value = Math.min(Math.max(scale.value * delta, 0.5), 3)
    
    applyTransform()
  }
  
  // 绑定事件
  onMounted(() => {
    const canvas = canvasRef.value
    if (!canvas) return
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true })
    canvas.addEventListener('touchend', handleTouchEnd)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
  })
  
  onUnmounted(() => {
    const canvas = canvasRef.value
    if (!canvas) return
    
    canvas.removeEventListener('touchstart', handleTouchStart)
    canvas.removeEventListener('touchmove', handleTouchMove)
    canvas.removeEventListener('touchend', handleTouchEnd)
    canvas.removeEventListener('wheel', handleWheel)
  })
  
  return {
    scale,
    translateX,
    translateY,
    isDragging,
    zoomIn,
    zoomOut,
    resetZoom
  }
}

// 辅助类型
import type { Ref } from 'vue'
