import { ref } from 'vue'

export interface UseRetryOptions {
  maxRetries?: number
  baseDelay?: number
}

export function useRetry(options: UseRetryOptions = {}) {
  const { maxRetries = 3, baseDelay = 500 } = options
  
  const retryCount = ref(0)
  const isRetrying = ref(false)
  
  async function withRetry<T>(
    fn: () => Promise<T>,
    customOptions?: Partial<UseRetryOptions>
  ): Promise<T> {
    const retries = customOptions?.maxRetries ?? maxRetries
    const delay = customOptions?.baseDelay ?? baseDelay
    
    isRetrying.value = true
    retryCount.value = 0
    
    try {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          retryCount.value = attempt
          const result = await fn()
          return result
        } catch (error) {
          if (attempt === retries - 1) {
            throw error
          }
          
          // 递增延迟
          await sleep(delay * (attempt + 1))
        }
      }
      
      throw new Error('重试次数耗尽')
    } finally {
      isRetrying.value = false
    }
  }
  
  return {
    retryCount,
    isRetrying,
    withRetry
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
