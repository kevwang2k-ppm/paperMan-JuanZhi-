import { ref } from 'vue'
import type { Question } from '@/types'

export function useBoxDrag(imageWidth: number, imageHeight: number, scale: number) {
  const isDragging = ref(false)
  const isResizing = ref(false)
  const selectedBox = ref<Question | null>(null)
  
  const dragStartPos = ref({ x: 0, y: 0 })
  const dragStartBox = ref({ y0: 0, x0: 0, y1: 0, x1: 0 })
  const currentResizeHandle = ref('')
  
  function startDrag(e: MouseEvent | TouchEvent, question: Question) {
    selectedBox.value = question
    isDragging.value = true
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    dragStartPos.value = { x: clientX, y: clientY }
    dragStartBox.value = { 
      y0: question.bbox_relative[0],
      x0: question.bbox_relative[1],
      y1: question.bbox_relative[2],
      x1: question.bbox_relative[3]
    }
    
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
    document.addEventListener('touchmove', onDrag, { passive: false })
    document.addEventListener('touchend', stopDrag)
    
    return true
  }
  
  function onDrag(e: MouseEvent | TouchEvent) {
    if (!isDragging.value && !isResizing.value) return
    e.preventDefault()
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const deltaX = (clientX - dragStartPos.value.x) / (imageWidth * scale)
    const deltaY = (clientY - dragStartPos.value.y) / (imageHeight * scale)
    
    if (isDragging.value && selectedBox.value) {
      let newX0 = dragStartBox.value.x0 + deltaX
      let newY0 = dragStartBox.value.y0 + deltaY
      let newX1 = dragStartBox.value.x1 + deltaX
      let newY1 = dragStartBox.value.y1 + deltaY
      
      const w = newX1 - newX0
      const h = newY1 - newY0
      newX0 = Math.max(0, Math.min(1 - w, newX0))
      newY0 = Math.max(0, Math.min(1 - h, newY0))
      newX1 = newX0 + w
      newY1 = newY0 + h
      
      selectedBox.value.bbox_relative[0] = newY0
      selectedBox.value.bbox_relative[1] = newX0
      selectedBox.value.bbox_relative[2] = newY1
      selectedBox.value.bbox_relative[3] = newX1
    } else if (isResizing.value && selectedBox.value) {
      const box = selectedBox.value.bbox_relative
      const minSize = 0.02
      
      let newY0 = box[0], newX0 = box[1], newY1 = box[2], newX1 = box[3]
      
      if (currentResizeHandle.value.includes('e')) {
        newX1 = Math.min(1, Math.max(newX0 + minSize, dragStartBox.value.x1 + deltaX))
      }
      if (currentResizeHandle.value.includes('w')) {
        newX0 = Math.max(0, Math.min(newX1 - minSize, dragStartBox.value.x0 + deltaX))
      }
      if (currentResizeHandle.value.includes('s')) {
        newY1 = Math.min(1, Math.max(newY0 + minSize, dragStartBox.value.y1 + deltaY))
      }
      if (currentResizeHandle.value.includes('n')) {
        newY0 = Math.max(0, Math.min(newY1 - minSize, dragStartBox.value.y0 + deltaY))
      }
      
      box[0] = newY0
      box[1] = newX0
      box[2] = newY1
      box[3] = newX1
    }
  }
  
  function stopDrag() {
    isDragging.value = false
    isResizing.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
    document.removeEventListener('touchmove', onDrag)
    document.removeEventListener('touchend', stopDrag)
  }
  
  function startResize(e: MouseEvent | TouchEvent, question: Question, handlePos: string) {
    e.stopPropagation()
    selectedBox.value = question
    isResizing.value = true
    currentResizeHandle.value = handlePos
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    dragStartPos.value = { x: clientX, y: clientY }
    dragStartBox.value = { 
      y0: question.bbox_relative[0],
      x0: question.bbox_relative[1],
      y1: question.bbox_relative[2],
      x1: question.bbox_relative[3]
    }
    
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
    document.addEventListener('touchmove', onDrag, { passive: false })
    document.addEventListener('touchend', stopDrag)
    
    return true
  }
  
  function selectBox(question: Question) {
    selectedBox.value = question
  }
  
  function clearSelection() {
    selectedBox.value = null
  }
  
  return {
    isDragging,
    isResizing,
    selectedBox,
    startDrag,
    onDrag,
    stopDrag,
    startResize,
    selectBox,
    clearSelection
  }
}
