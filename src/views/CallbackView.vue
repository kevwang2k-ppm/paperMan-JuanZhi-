<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <!-- 处理中 -->
    <div v-if="processing" class="text-center">
      <div class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      <h2 class="text-xl font-semibold text-gray-800 mb-2">正在登录...</h2>
      <p class="text-gray-500">请稍候，正在验证您的身份</p>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
      <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-clock text-orange-600 text-2xl"></i>
      </div>
      <h2 class="text-xl font-semibold text-gray-800 mb-2">登录链接已过期</h2>
      <p class="text-gray-500 mb-4">Magic Link 只能使用一次，且有效期很短</p>
      
      <!-- 备用登录方式 -->
      <div class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
        <p class="text-sm text-gray-600 mb-3">请使用邮箱+密码登录：</p>
        <form @submit.prevent="handlePasswordLogin" class="space-y-3">
          <input 
            v-model="email" 
            type="email" 
            placeholder="邮箱"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
          <input 
            v-model="password" 
            type="password" 
            placeholder="密码"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
          <button 
            type="submit"
            :disabled="loginLoading"
            class="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {{ loginLoading ? '登录中...' : '登录' }}
          </button>
        </form>
      </div>
      
      <router-link 
        to="/login" 
        class="text-blue-600 hover:text-blue-700 text-sm"
      >
        返回登录页
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { createClient } from '@supabase/supabase-js'

const router = useRouter()
const authStore = useAuthStore()
const processing = ref(true)
const error = ref('')

// 备用登录表单
const email = ref('')
const password = ref('')
const loginLoading = ref(false)
const loginError = ref('')

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

onMounted(async () => {
  try {
    // 从 URL hash 解析参数
    const hash = window.location.hash
    const params = new URLSearchParams(hash.substring(1))
    
    // 检查是否有错误
    const errorCode = params.get('error_code')
    if (errorCode === 'otp_expired') {
      error.value = 'Magic Link 已过期，请使用密码登录'
      processing.value = false
      return
    }
    
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    
    // 如果没有 token，尝试从当前 session 获取（Supabase 自动处理）
    if (!accessToken || !refreshToken) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        error.value = '登录链接无效，请使用密码登录'
        processing.value = false
        return
      }
      
      // 使用当前 session
      authStore.setSession(session)
      router.replace('/')
      return
    }
    
    // 设置 session
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    if (sessionError || !data.session) {
      error.value = sessionError?.message || '登录失败，请使用密码登录'
      processing.value = false
      return
    }
    
    // 保存到 store
    authStore.setSession(data.session)
    
    // 清除 URL hash
    window.history.replaceState({}, '', '/callback')
    
    // 跳转到首页
    router.replace('/')
    
  } catch (err: any) {
    error.value = '登录失败，请使用密码登录'
    processing.value = false
  }
})

// 备用：密码登录
async function handlePasswordLogin() {
  loginLoading.value = true
  loginError.value = ''
  
  try {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    if (signInError) {
      alert(signInError.message)
      return
    }
    
    if (data.session) {
      authStore.setSession(data.session)
      router.replace('/')
    }
  } catch (err: any) {
    alert(err.message || '登录失败')
  } finally {
    loginLoading.value = false
  }
}
</script>
