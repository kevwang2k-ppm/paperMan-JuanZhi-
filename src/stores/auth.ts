import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createClient, User, Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export const useAuthStore = defineStore('auth', () => {
  // ========== State ==========
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // ========== Getters ==========
  const isAuthenticated = computed(() => !!session.value)
  const accessToken = computed(() => session.value?.access_token || null)
  const userEmail = computed(() => user.value?.email || '')
  
  // Token 是否即将过期（5分钟内）
  const isTokenExpiringSoon = computed(() => {
    if (!session.value?.expires_at) return false
    const expiresAt = session.value.expires_at * 1000
    return expiresAt - Date.now() < 5 * 60 * 1000
  })
  
  // ========== Actions ==========
  
  /**
   * 检查认证状态（应用启动时调用）
   */
  async function checkAuth(): Promise<boolean> {
    // 1. 检查内存中的 session
    if (session.value) {
      return true
    }
    
    // 2. 检查 localStorage
    const storedToken = localStorage.getItem('access_token')
    if (!storedToken) {
      return false
    }
    
    // 3. 验证 Token 有效性
    const { data, error: getUserError } = await supabase.auth.getUser(storedToken)
    
    if (getUserError || !data.user) {
      // 尝试刷新
      return await refreshToken()
    }
    
    // 4. 恢复 session
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session) {
      setSession(sessionData.session)
      return true
    }
    
    return false
  }
  
  /**
   * 设置 Session
   */
  function setSession(newSession: Session) {
    session.value = newSession
    user.value = newSession.user
    
    // 持久化
    localStorage.setItem('access_token', newSession.access_token)
    localStorage.setItem('refresh_token', newSession.refresh_token)
    localStorage.setItem('expires_at', String(newSession.expires_at))
  }
  
  /**
   * 刷新 Token
   */
  async function refreshToken(): Promise<boolean> {
    const refresh_token = localStorage.getItem('refresh_token')
    if (!refresh_token) return false
    
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token
      })
      
      if (refreshError || !data.session) {
        clearAuth()
        return false
      }
      
      setSession(data.session)
      return true
    } catch (err) {
      clearAuth()
      return false
    }
  }
  
  /**
   * 登出
   */
  async function signOut() {
    await supabase.auth.signOut()
    clearAuth()
  }
  
  /**
   * 清除认证状态
   */
  function clearAuth() {
    user.value = null
    session.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('expires_at')
  }
  
  // ========== 监听认证状态变化 ==========
  supabase.auth.onAuthStateChange((event, newSession) => {
    if (event === 'SIGNED_IN' && newSession) {
      setSession(newSession)
    } else if (event === 'SIGNED_OUT') {
      clearAuth()
    } else if (event === 'TOKEN_REFRESHED' && newSession) {
      setSession(newSession)
    }
  })
  
  return {
    // State
    user,
    session,
    loading,
    error,
    
    // Getters
    isAuthenticated,
    accessToken,
    userEmail,
    isTokenExpiringSoon,
    
    // Actions
    checkAuth,
    setSession,
    refreshToken,
    signOut,
    clearAuth
  }
})
