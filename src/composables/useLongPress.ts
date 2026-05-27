/**
 * 长按检测 Hook
 * 用于移动端的长按交互
 */

import { ref, type Ref } from 'vue'

export interface UseLongPressOptions {
  /** 触发长按的持续时间（毫秒） */
  duration?: number
  /** 移动取消的阈值（像素） */
  moveThreshold?: number
}

export interface UseLongPressReturn {
  /** 是否正在长按中 */
  isPressing: Ref<boolean>
  /** 开始长按 */
  start: (event: MouseEvent | TouchEvent) => void
  /** 结束长按 */
  end: (event?: MouseEvent | TouchEvent) => void
  /** 移动检测 */
  move: (event: MouseEvent | TouchEvent) => void
}

/**
 * 长按检测 Hook
 * @param callback 长按触发时的回调函数
 * @param options 配置选项
 */
export function useLongPress(
  callback: () => void,
  options: UseLongPressOptions = {}
): UseLongPressReturn {
  const { duration = 500, moveThreshold = 10 } = options

  const isPressing = ref(false)
  let pressTimer: number | null = null
  let startX = 0
  let startY = 0

  /**
   * 开始长按
   */
  function start(event: MouseEvent | TouchEvent) {
    // 获取坐标
    if (event.type === 'touchstart') {
      const touch = (event as TouchEvent).touches[0]
      startX = touch.clientX
      startY = touch.clientY
    } else {
      startX = (event as MouseEvent).clientX
      startY = (event as MouseEvent).clientY
    }

    isPressing.value = true

    // 设置定时器
    pressTimer = window.setTimeout(() => {
      if (isPressing.value) {
        callback()
        isPressing.value = false
      }
    }, duration)
  }

  /**
   * 结束长按
   */
  function end(_event?: MouseEvent | TouchEvent) {
    if (pressTimer) {
      clearTimeout(pressTimer)
      pressTimer = null
    }
    isPressing.value = false
  }

  /**
   * 移动检测
   */
  function move(event: MouseEvent | TouchEvent) {
    if (!isPressing.value) return

    let currentX = 0
    let currentY = 0

    if (event.type === 'touchmove') {
      const touch = (event as TouchEvent).touches[0]
      currentX = touch.clientX
      currentY = touch.clientY
    } else {
      currentX = (event as MouseEvent).clientX
      currentY = (event as MouseEvent).clientY
    }

    // 如果移动超过阈值，取消长按
    const deltaX = Math.abs(currentX - startX)
    const deltaY = Math.abs(currentY - startY)

    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      end()
    }
  }

  return {
    isPressing,
    start,
    end,
    move
  }
}

/**
 * 长按指令（用于 v-long-press）
 * 在 Vue 组件中可以直接使用 v-long-press="callback"
 */
export function useLongPressDirective(
  el: HTMLElement,
  callback: () => void,
  options: UseLongPressOptions = {}
) {
  const { start, end, move } = useLongPress(callback, options)

  // 绑定事件
  el.addEventListener('mousedown', start)
  el.addEventListener('mouseup', end)
  el.addEventListener('mouseleave', end)
  el.addEventListener('mousemove', move)

  // 触摸事件
  el.addEventListener('touchstart', start, { passive: true })
  el.addEventListener('touchend', end)
  el.addEventListener('touchcancel', end)
  el.addEventListener('touchmove', move, { passive: true })

  // 返回清理函数
  return () => {
    el.removeEventListener('mousedown', start)
    el.removeEventListener('mouseup', end)
    el.removeEventListener('mouseleave', end)
    el.removeEventListener('mousemove', move)
    el.removeEventListener('touchstart', start)
    el.removeEventListener('touchend', end)
    el.removeEventListener('touchcancel', end)
    el.removeEventListener('touchmove', move)
  }
}
