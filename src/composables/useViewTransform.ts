import { ref, computed } from 'vue'

export function useViewTransform() {
  const scale = ref(1)
  const translateX = ref(0)
  const translateY = ref(0)
  
  // 平移状态
  const isPanning = ref(false)
  const panStart = ref({ x: 0, y: 0 })
  const panStartTranslate = ref({ x: 0, y: 0 })
  
  // 双指缩放状态
  const initialPinchDistance = ref(0)
  const pinchStartScale = ref(1)
  
  // 视图变换样式
  const viewTransform = computed(() => ({
    transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
    transformOrigin: 'center center'
  }))
  
  // 开始平移
  function startPan(e: MouseEvent | TouchEvent) {
    const isLeftClick = 'button' in e && e.button === 0
    const isSingleTouch = 'touches' in e && e.touches.length === 1
    
    if (!isLeftClick && !isSingleTouch) return false
    
    e.preventDefault()
    isPanning.value = true
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    panStart.value = { x: clientX, y: clientY }
    panStartTranslate.value = { x: translateX.value, y: translateY.value }
    
    return true
  }
  
  // 平移中
  function onPan(e: MouseEvent | TouchEvent, onPinch?: (e: TouchEvent) => void) {
    // 双指缩放
    if ('touches' in e && e.touches.length === 2) {
      e.preventDefault()
      handlePinch(e)
      return 'pinch'
    }
    
    if (!isPanning.value) return null
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    translateX.value = panStartTranslate.value.x + (clientX - panStart.value.x)
    translateY.value = panStartTranslate.value.y + (clientY - panStart.value.y)
    
    return 'pan'
  }
  
  // 停止平移
  function stopPan() {
    isPanning.value = false
    initialPinchDistance.value = 0
  }
  
  // 双指缩放
  function getPinchDistance(touches: TouchList): number {
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
  
  function handlePinch(e: TouchEvent) {
    if (e.touches.length !== 2) return
    
    const distance = getPinchDistance(e.touches)
    const center = getTouchCenter(e.touches)
    
    if (initialPinchDistance.value === 0) {
      initialPinchDistance.value = distance
      pinchStartScale.value = scale.value
      return
    }
    
    const scaleRatio = distance / initialPinchDistance.value
    const newScale = Math.max(0.5, Math.min(3, pinchStartScale.value * scaleRatio))
    
    const scaleChange = newScale / scale.value
    translateX.value = center.x - (center.x - translateX.value) * scaleChange
    translateY.value = center.y - (center.y - translateY.value) * scaleChange
    scale.value = newScale
  }
  
  // 缩放控制
  function zoomIn() {
    scale.value = Math.min(scale.value * 1.2, 3)
  }
  
  function zoomOut() {
    scale.value = Math.max(scale.value * 0.8, 0.5)
  }
  
  function handleWheel(e: WheelEvent) {
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    scale.value = Math.max(0.5, Math.min(3, scale.value * delta))
  }
  
  function resetView(imageWidth?: number, imageHeight?: number) {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
  }
  
  return {
    scale,
    translateX,
    translateY,
    isPanning,
    viewTransform,
    startPan,
    onPan,
    stopPan,
    zoomIn,
    zoomOut,
    handleWheel,
    resetView
  }
}
