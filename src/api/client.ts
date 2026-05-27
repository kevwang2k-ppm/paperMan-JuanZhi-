import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// 获取后端地址
// 优先使用环境变量 VITE_API_BASE_URL，其次根据当前页面地址推断
export const getBaseUrl = () => {
  // 1. 优先使用 .env 中配置的地址（生产部署时必须配置）
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) {
    return envUrl
  }

  // 2. 开发环境回退：从当前页面地址推断后端地址
  const hostname = window.location.hostname
  return `http://${hostname}:8000/api/v1`
}

// 创建 axios 实例
const client: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加认证 Token
client.interceptors.request.use(
  async (config) => {
    // 如果是 FormData，删除 Content-Type 让浏览器自动设置 multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    // 从 localStorage 获取 Token（避免 Pinia 在拦截器外部的问题）
    const token = localStorage.getItem('access_token')
    
    // 添加 Token 到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理 401 错误
client.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status
    const errorData = error.response?.data as any
    
    // 401 未授权 - Token 过期或无效
    if (status === 401) {
      const authStore = useAuthStore()
      
      // 尝试刷新 Token
      const refreshed = await authStore.refreshToken()
      
      if (refreshed) {
        // 刷新成功，重试原请求
        const config = error.config
        if (config) {
          config.headers.Authorization = `Bearer ${authStore.accessToken}`
          return client.request(config)
        }
      } else {
        // 刷新失败，登出并跳转登录页
        authStore.clearAuth()
        router.push('/login?expired=true')
        return Promise.reject(new Error('登录已过期，请重新登录'))
      }
    }
    
    // 显示详细错误信息
    console.error('API Error:', status, errorData)
    
    // 处理详细错误信息（detail 可能是对象或字符串）
    if (errorData?.detail) {
      const detail = errorData.detail
      if (typeof detail === 'object') {
        return Promise.reject(new Error(`${detail.error || '请求失败'} (${detail.stage || 'unknown'})`))
      }
      return Promise.reject(new Error(detail))
    }
    
    // 422 验证错误显示详细信息
    if (status === 422 && errorData) {
      const detail = JSON.stringify(errorData, null, 2)
      return Promise.reject(new Error(`验证失败: ${detail}`))
    }
    
    const message = errorData?.message || error.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)

// 带重试的请求封装
export async function requestWithRetry<T>(
  config: AxiosRequestConfig,
  maxRetries: number = 3,
  baseDelay: number = 500
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.request<ApiResponse<T>>(config)
      return response.data as T
    } catch (error) {
      lastError = error as Error
      
      // 最后一次尝试，直接抛出错误
      if (attempt === maxRetries - 1) {
        throw lastError
      }
      
      // 等待后重试（递增延迟）
      await sleep(baseDelay * (attempt + 1))
    }
  }
  
  throw lastError || new Error('请求失败')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default client
