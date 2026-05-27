/**
 * 对话框工具函数
 */

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}

/**
 * 显示确认对话框
 */
export function showConfirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const confirmed = window.confirm(`${options.title}\n\n${options.message}`)
    resolve(confirmed)
  })
}

/**
 * 显示提示消息
 */
export function showToast(message: string, duration: number = 2000): void {
  // 简单的 alert 实现，生产环境可以使用更好的 UI 组件
  alert(message)
}

/**
 * 显示加载中
 */
export function showLoading(message: string = '加载中...'): () => void {
  console.log(message)
  // 返回关闭函数
  return () => {
    console.log('loading closed')
  }
}
