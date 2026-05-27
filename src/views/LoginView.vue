<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-graduation-cap text-white text-2xl"></i>
        </div>
        <h1 class="text-2xl font-bold text-gray-800">PaperManager</h1>
        <p class="text-gray-500 mt-2">智能试卷处理系统</p>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ error }}
      </div>

      <!-- 邮箱登录表单 -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input 
            v-model="email"
            type="email"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="your@email.com"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input 
            v-model="password"
            type="password"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="请输入密码"
          />
        </div>

        <!-- 登录按钮 -->
        <button 
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <span>{{ loading ? '登录中...' : '登录' }}</span>
        </button>

        <!-- 忘记密码链接 -->
        <div class="text-center mt-3">
          <router-link to="/forgot-password" class="text-sm text-gray-500 hover:text-blue-600 transition">
            忘记密码？
          </router-link>
        </div>
      </form>

      <!-- 注册链接 -->
      <div class="mt-6 text-center text-sm">
        <span class="text-gray-500">还没有账号？</span>
        <button @click="showRegister = true" class="text-blue-600 hover:text-blue-700 font-medium ml-1">
          立即注册
        </button>
      </div>
    </div>

    <!-- 注册弹窗 -->
    <div v-if="showRegister" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 class="text-xl font-bold text-gray-800 mb-4">注册账号</h2>
        
        <!-- 步骤1: 输入邮箱发送验证码 -->
        <form v-if="registerStep === 1" @submit.prevent="handleRegisterSendOTP" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input 
              v-model="registerEmail"
              type="email"
              required
              :disabled="registerLoading"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              placeholder="your@email.com"
            />
          </div>

          <div v-if="registerError" class="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
            {{ registerError }}
          </div>

          <div class="flex gap-3 pt-2">
            <button 
              type="button"
              @click="showRegister = false"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button 
              type="submit"
              :disabled="registerLoading || !registerEmail"
              class="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {{ registerLoading ? '发送中...' : '获取验证码' }}
            </button>
          </div>
        </form>

        <!-- 步骤2: 输入验证码和密码 -->
        <form v-else @submit.prevent="handleRegisterVerify" class="space-y-4">
          <div class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm">
            <i class="fas fa-envelope mr-1"></i>
            验证码已发送至 {{ maskEmail(registerEmail) }}
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">验证码</label>
            <input 
              v-model="registerOTP"
              type="text"
              required
              maxlength="8"
              :disabled="registerLoading"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 text-center text-2xl tracking-widest"
              placeholder="00000000"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input 
              v-model="registerPassword"
              type="password"
              required
              minlength="6"
              :disabled="registerLoading"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              placeholder="至少6位字符"
            />
          </div>

          <div v-if="registerError" class="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
            {{ registerError }}
          </div>

          <div class="flex gap-3 pt-2">
            <button 
              type="button"
              @click="registerStep = 1"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              返回
            </button>
            <button 
              type="submit"
              :disabled="registerLoading || !registerOTP || !registerPassword"
              class="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {{ registerLoading ? '注册中...' : '完成注册' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// 登录表单
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

// 注册弹窗
const showRegister = ref(false)
const registerStep = ref(1) // 1: 输入邮箱, 2: 输入验证码和密码
const registerEmail = ref('')
const registerOTP = ref('')
const registerPassword = ref('')
const registerLoading = ref(false)
const registerError = ref('')

// 邮箱脱敏显示
function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  const maskedLocal = local.substring(0, 2) + '***' + local.substring(local.length - 1)
  return `${maskedLocal}@${domain}`
}

async function handleLogin() {
  loading.value = true
  error.value = ''
  
  try {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    if (signInError) {
      error.value = signInError.message
      return
    }
    
    if (data.session) {
      authStore.setSession(data.session)
      router.replace('/')
    }
  } catch (err: any) {
    error.value = err.message || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

// 注册步骤1: 发送验证码
async function handleRegisterSendOTP() {
  registerLoading.value = true
  registerError.value = ''
  
  try {
    // 使用 OTP 发送验证码，同时创建用户
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: registerEmail.value,
      options: {
        shouldCreateUser: true, // 允许创建新用户
      }
    })
    
    if (otpError) {
      registerError.value = otpError.message
      return
    }
    
    // 切换到步骤 2
    registerStep.value = 2
  } catch (err: any) {
    registerError.value = err.message || '发送验证码失败，请重试'
  } finally {
    registerLoading.value = false
  }
}

// 注册步骤2: 验证验证码并设置密码
async function handleRegisterVerify() {
  registerLoading.value = true
  registerError.value = ''
  
  try {
    // 验证 OTP
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: registerEmail.value,
      token: registerOTP.value,
      type: 'email'
    })
    
    if (verifyError) {
      registerError.value = verifyError.message
      return
    }
    
    if (!data.session) {
      registerError.value = '验证失败，请检查验证码'
      return
    }
    
    // 更新密码
    const { error: updateError } = await supabase.auth.updateUser({
      password: registerPassword.value
    })
    
    if (updateError) {
      registerError.value = updateError.message
      return
    }
    
    // 注册成功，自动登录
    authStore.setSession(data.session)
    showRegister.value = false
    registerStep.value = 1
    registerEmail.value = ''
    registerOTP.value = ''
    registerPassword.value = ''
    router.replace('/')
  } catch (err: any) {
    registerError.value = err.message || '注册失败，请重试'
  } finally {
    registerLoading.value = false
  }
}
</script>
