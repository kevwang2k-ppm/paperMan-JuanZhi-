<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-key text-white text-2xl"></i>
        </div>
        <h1 class="text-2xl font-bold text-gray-800">重置密码</h1>
        <p class="text-gray-500 mt-2">{{ step === 1 ? '输入邮箱接收验证码' : '输入验证码并设置新密码' }}</p>
      </div>

      <!-- 步骤 1: 输入邮箱 -->
      <form v-if="step === 1" @submit.prevent="handleSendOTP" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input 
            v-model="email"
            type="email"
            required
            :disabled="loading"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100"
            placeholder="your@email.com"
          />
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {{ error }}
        </div>

        <!-- 提交按钮 -->
        <button 
          type="submit"
          :disabled="loading || !email"
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <span>{{ loading ? '发送中...' : '发送验证码' }}</span>
        </button>

        <!-- 返回登录 / 已有验证码 -->
        <div class="text-center space-y-2">
          <div>
            <button 
              type="button"
              @click="step = 2"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium transition"
            >
              已有验证码？直接输入
            </button>
          </div>
          <router-link to="/login" class="text-sm text-gray-500 hover:text-blue-600 transition">
            <i class="fas fa-arrow-left mr-1"></i> 返回登录
          </router-link>
        </div>
      </form>

      <!-- 步骤 2: 输入验证码和新密码 -->
      <form v-else @submit.prevent="handleResetPassword" class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          <i class="fas fa-envelope mr-1"></i>
          验证码已发送至 {{ maskEmail(email) }}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">验证码</label>
          <input 
            v-model="otp"
            type="text"
            required
            maxlength="8"
            :disabled="loading"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 text-center text-2xl tracking-widest"
            placeholder="00000000"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">新密码</label>
          <input 
            v-model="password"
            type="password"
            required
            minlength="6"
            :disabled="loading"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100"
            placeholder="至少6位字符"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
          <input 
            v-model="confirmPassword"
            type="password"
            required
            minlength="6"
            :disabled="loading"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100"
            placeholder="再次输入新密码"
          />
          <p v-if="passwordMismatch" class="text-red-500 text-xs mt-1">
            两次输入的密码不一致
          </p>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {{ error }}
        </div>

        <!-- 提交按钮 -->
        <button 
          type="submit"
          :disabled="loading || !otp || !password || !confirmPassword || passwordMismatch"
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <span>{{ loading ? '重置中...' : '重置密码' }}</span>
        </button>

        <!-- 重新发送 / 返回 -->
        <div class="flex justify-between text-sm">
          <button 
            type="button"
            @click="step = 1"
            class="text-gray-500 hover:text-blue-600 transition"
          >
            使用其他邮箱
          </button>
          <button 
            type="button"
            @click="handleSendOTP"
            :disabled="resendCooldown > 0"
            class="text-blue-600 hover:text-blue-700 transition disabled:opacity-50"
          >
            {{ resendCooldown > 0 ? `${resendCooldown}秒后重发` : '重新发送' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { createClient } from '@supabase/supabase-js'

const router = useRouter()

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// 表单状态
const step = ref(1) // 1: 输入邮箱, 2: 输入验证码
const email = ref('')
const otp = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const resendCooldown = ref(0)
let cooldownTimer: number | null = null

const passwordMismatch = computed(() => {
  return confirmPassword.value && password.value !== confirmPassword.value
})

// 邮箱脱敏显示
function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  const maskedLocal = local.substring(0, 2) + '***' + local.substring(local.length - 1)
  return `${maskedLocal}@${domain}`
}

// 发送 OTP
async function handleSendOTP() {
  loading.value = true
  error.value = ''
  
  try {
    // 使用 Supabase 的 OTP 功能
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        shouldCreateUser: false, // 不创建新用户，只发送验证码
      }
    })
    
    if (otpError) {
      error.value = otpError.message
      return
    }
    
    // 切换到步骤 2
    step.value = 2
    
    // 启动重发冷却
    startCooldown()
  } catch (err: any) {
    error.value = err.message || '发送失败，请重试'
  } finally {
    loading.value = false
  }
}

// 重置密码
async function handleResetPassword() {
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    // 使用 OTP 验证登录
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.value,
      token: otp.value,
      type: 'email'
    })
    
    if (verifyError) {
      error.value = verifyError.message
      return
    }
    
    if (!data.session) {
      error.value = '验证失败，请检查验证码'
      return
    }
    
    // 更新密码
    const { error: updateError } = await supabase.auth.updateUser({
      password: password.value
    })
    
    if (updateError) {
      error.value = updateError.message
      return
    }
    
    // 成功后登出
    await supabase.auth.signOut()
    
    // 提示成功并跳转
    alert('密码重置成功，请使用新密码登录')
    router.push('/login')
  } catch (err: any) {
    error.value = err.message || '重置失败，请重试'
  } finally {
    loading.value = false
  }
}

// 重发冷却
function startCooldown() {
  resendCooldown.value = 60
  cooldownTimer = window.setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

// 清理定时器
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})
</script>
