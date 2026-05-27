<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 用户信息 -->
      <div class="bg-white rounded-xl border p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl">
            <i class="fas fa-user"></i>
          </div>
          <div>
            <h2 class="font-semibold text-gray-800">用户信息</h2>
            <p class="text-sm text-gray-500">{{ authStore.userEmail || '-' }}</p>
          </div>
        </div>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between py-2 border-b">
            <span class="text-gray-500">注册时间</span>
            <span class="text-gray-800">{{ userProfile?.created_at ? formatDate(userProfile.created_at) : '-' }}</span>
          </div>
          <div class="flex justify-between py-2 border-b">
            <span class="text-gray-500">最后登录</span>
            <span class="text-gray-800">{{ lastLoginAt || '-' }}</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-gray-500">用户ID</span>
            <span class="text-gray-800 font-mono text-sm">{{ userProfile?.id || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 订阅套餐 -->
      <div class="bg-white rounded-xl border p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-xl">
            <i class="fas fa-crown"></i>
          </div>
          <div>
            <h2 class="font-semibold text-gray-800">订阅套餐</h2>
            <p class="text-sm text-gray-500">当前使用的服务计划</p>
          </div>
        </div>
        <!-- 加载中 -->
        <div v-if="loadingSubscription" class="flex flex-col items-center justify-center py-8 space-y-3">
          <div class="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
          <p class="text-sm text-gray-500">正在获取订阅信息...</p>
        </div>
        <!-- 有数据 -->
        <div v-else-if="subscription" class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
          <div class="flex items-center justify-between mb-2">
            <span class="text-lg font-bold text-amber-800">{{ subscription.plan_name || '免费版' }}</span>
            <span class="text-sm px-2 py-1 bg-green-100 text-green-700 rounded-full">{{ subscription.status === 'active' ? '生效中' : '已过期' }}</span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">有效期至</span>
              <span class="text-gray-800 font-medium">{{ subscription.current_period_end ? formatDate(subscription.current_period_end) : '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">AI 分析额度（已用/总计）</span>
              <span class="text-gray-800 font-medium">{{ formatNumber(quota?.total_used) }} / {{ formatNumber(quota?.total_quota) }}</span>
            </div>
          </div>
          <div class="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div class="bg-amber-500 h-2 rounded-full" :style="{ width: quotaPercent + '%' }"></div>
          </div>
          <p class="text-sm text-gray-500 mt-1">已使用 {{ quotaPercent }}%</p>

          <!-- 低配额警告 -->
          <div v-if="isLowQuota" class="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600 flex items-center gap-1">
              <i class="fas fa-exclamation-triangle"></i>
              配额即将耗尽，请尽快升级套餐
            </p>
            <button
              @click="goToUpgrade"
              class="mt-1.5 w-full py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
            >
              立即升级
            </button>
          </div>

          <!-- Realtime 连接状态 -->
          <div class="mt-2 flex items-center justify-end gap-1 text-sm">
            <span
              class="w-2 h-2 rounded-full"
              :class="connectionStatus === 'connected' ? 'bg-green-500' : 'bg-gray-300'"
            ></span>
            <span class="text-gray-400">
              {{ connectionStatus === 'connected' ? '实时同步中' : '已断开' }}
            </span>
          </div>
        </div>
        <!-- 请求失败 -->
        <div v-else-if="subscriptionError" class="text-sm text-center py-6 space-y-3">
          <div class="text-red-500 flex items-center justify-center gap-1">
            <i class="fas fa-exclamation-circle"></i>
            <span>{{ subscriptionError }}</span>
          </div>
          <button
            @click="retryLoad"
            class="px-4 py-1.5 bg-amber-50 text-amber-700 text-sm rounded border border-amber-200 hover:bg-amber-100 transition"
          >
            <i class="fas fa-redo mr-1"></i>重试
          </button>
        </div>
        <!-- 无数据 -->
        <div v-else class="text-sm text-gray-500 text-center py-4">
          暂无订阅信息
        </div>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="bg-white rounded-xl border p-6">
      <h3 class="font-semibold text-gray-800 mb-4">账户操作</h3>
      <div class="flex gap-3 flex-wrap">
        <button
          @click="goToUpgrade"
          class="px-6 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 border border-amber-200 flex items-center gap-2"
        >
          <i class="fas fa-crown"></i>
          更改套餐
        </button>
        <button
          @click="toggleLogs"
          class="px-6 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 border border-purple-200 flex items-center gap-2"
        >
          <i class="fas fa-history"></i>
          {{ showLogs ? '收起记录' : '使用记录' }}
        </button>
        <button
          @click="logout"
          class="px-6 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 flex items-center gap-2"
        >
          <i class="fas fa-sign-out-alt"></i>
          退出登录
        </button>
      </div>
    </div>

    <!-- 使用记录 -->
    <div v-if="showLogs" class="bg-white rounded-xl border p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
            <i class="fas fa-history"></i>
          </div>
          <div>
            <h2 class="font-semibold text-gray-800">使用记录</h2>
            <p class="text-sm text-gray-500">AI 服务调用日志</p>
          </div>
        </div>
        <button
          @click="loadLogs"
          class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <i class="fas fa-sync-alt" :class="loadingLogs ? 'fa-spin' : ''"></i>
          刷新
        </button>
      </div>

      <div v-if="loadingLogs" class="py-8 text-center">
        <div class="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-sm text-gray-500">加载日志...</p>
      </div>

      <div v-else-if="logsError" class="text-center py-6">
        <p class="text-red-500 text-sm">{{ logsError }}</p>
      </div>

      <div v-else-if="logs.length === 0" class="text-center py-8 text-gray-400 text-sm">
        <i class="fas fa-inbox text-2xl mb-2 block"></i>
        暂无使用记录
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-gray-500">
              <th class="text-left py-2 px-2 font-medium">服务类型</th>
              <th class="text-left py-2 px-2 font-medium">状态</th>
              <th class="text-left py-2 px-2 font-medium">耗时</th>
              <th class="text-left py-2 px-2 font-medium">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in logs"
              :key="log.id"
              class="border-b border-gray-50 hover:bg-gray-50"
            >
              <td class="py-2.5 px-2">
                <span class="inline-flex items-center gap-1">
                  <i class="fas" :class="serviceTypeIcon(log.service_type)"></i>
                  {{ serviceTypeName(log.service_type) }}
                </span>
              </td>
              <td class="py-2.5 px-2">
                <span
                  class="text-sm px-2 py-0.5 rounded-full font-medium"
                  :class="statusClass(log.status)"
                >
                  {{ log.status }}
                </span>
              </td>
              <td class="py-2.5 px-2 text-gray-600">{{ log.duration_ms }}ms</td>
              <td class="py-2.5 px-2 text-gray-500">{{ formatDateTime(log.created_at) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="flex items-center justify-between mt-4 pt-2 border-t">
          <span class="text-sm text-gray-500">
            共 {{ totalLogs }} 条，第 {{ currentPage }} 页
          </span>
          <div class="flex gap-2">
            <button
              @click="prevPage"
              :disabled="currentPage <= 1"
              class="px-3 py-1 text-sm rounded border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              @click="nextPage"
              :disabled="currentPage * pageSize >= totalLogs"
              class="px-3 py-1 text-sm rounded border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useStudentStore } from '@/stores/student'
import { useCorrectionReviewStore } from '@/stores/correctionReview'
import { userApi } from '@/api'
import { useQuotaRealtime } from '@/composables/useQuotaRealtime'
import type { UserProfile, SubscriptionInfo, SubscriptionLog } from '@/api/user'

const authStore = useAuthStore()
const switchConfigTab = inject<(tab: string) => void>('switchConfigTab')
const studentStore = useStudentStore()
const correctionStore = useCorrectionReviewStore()

const userProfile = ref<UserProfile | null>(null)
const subscription = ref<SubscriptionInfo | null>(null)
const lastLoginAt = ref('')
const loadingSubscription = ref(true)
const subscriptionError = ref<string | null>(null)

// 使用记录
const showLogs = ref(false)
const logs = ref<SubscriptionLog[]>([])
const totalLogs = ref(0)
const loadingLogs = ref(false)
const logsError = ref<string | null>(null)
const currentPage = ref(1)
const pageSize = ref(10)

// Realtime 配额监听（替换静态 quotaInfo）
const { quota, isLowQuota, dailyUsagePercent, connectionStatus, error: quotaError, refreshQuota } =
  useQuotaRealtime(authStore.user?.id || '')

// 总配额使用百分比（用于进度条）
const quotaPercent = computed(() => {
  if (!quota.value || !quota.value.total_quota) return 0
  const used = (quota.value.total_used || 0) / quota.value.total_quota
  return Math.round(used * 100)
})

// 配额数据变化时同步到 subscription 卡片
watch(quota, (q) => {
  if (q) {
    subscription.value = {
      plan_name: q.plan_name,
      status: q.status,
      current_period_end: q.current_period_end,
    }
    subscriptionError.value = null
    loadingSubscription.value = false
  }
}, { immediate: true })

// 监听配额请求失败
watch(quotaError, (err) => {
  if (err) {
    subscriptionError.value = err
    loadingSubscription.value = false
  }
})

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatNumber(n?: number) {
  if (n === undefined || n === null) return '-'
  return n.toLocaleString('zh-CN')
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function serviceTypeIcon(type: string) {
  const map: Record<string, string> = {
    remove_handwriting: 'fa-eraser',
    cut_questions: 'fa-cut',
    ocr: 'fa-eye',
    correction: 'fa-check-double',
  }
  return map[type] || 'fa-robot'
}

function serviceTypeName(type: string) {
  const map: Record<string, string> = {
    remove_handwriting: '去手写',
    cut_questions: '切题',
    ocr: '文字识别',
    correction: '错整',
  }
  return map[type] || type
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    failure: 'bg-red-100 text-red-700',
    timeout: 'bg-orange-100 text-orange-700',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

async function logout() {
  if (!confirm('确定要退出登录吗？')) return
  studentStore.reset()
  correctionStore.clearAllSelections()
  correctionStore.exitCorrectionMode()
  await authStore.signOut()
  router.push('/login')
}

async function loadUserInfo() {
  try {
    const res = await userApi.getCurrentUser()
    const data = (res as any).data || res
    userProfile.value = data
    // 从 Gateway /users/me 的 last_sign_in_at 获取最后登录时间
    lastLoginAt.value = data?.last_sign_in_at || ''
  } catch (err) {
    console.error('加载用户信息失败:', err)
  }
}

async function loadSubscription() {
  try {
    const res = await userApi.getSubscription()
    const data = (res as any).data || res
    // Gateway /v1/ai/subscription 返回 { subscription: {...}, plan: {...}, available_plans: [...] }
    subscription.value = data?.subscription || data
    subscriptionError.value = null
  } catch (err: any) {
    console.error('加载订阅信息失败:', err)
    subscription.value = null
    subscriptionError.value = err?.message || '加载订阅信息失败'
  }
}

async function retryLoad() {
  loadingSubscription.value = true
  subscriptionError.value = null
  await Promise.all([
    loadSubscription(),
    refreshQuota(),
  ])
}

function goToUpgrade() {
  switchConfigTab?.('subscription')
}

function toggleLogs() {
  showLogs.value = !showLogs.value
  if (showLogs.value && logs.value.length === 0) {
    loadLogs()
  }
}

async function loadLogs() {
  loadingLogs.value = true
  logsError.value = null
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    const res = await userApi.getSubscriptionLogs(pageSize.value, offset)
    const data = (res as any).data || res
    logs.value = data?.logs || []
    totalLogs.value = data?.total || 0
  } catch (err: any) {
    logsError.value = err?.message || '加载日志失败'
    console.error('加载日志失败:', err)
  } finally {
    loadingLogs.value = false
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    loadLogs()
  }
}

function nextPage() {
  if (currentPage.value * pageSize.value < totalLogs.value) {
    currentPage.value++
    loadLogs()
  }
}

onMounted(() => {
  loadingSubscription.value = true
  loadUserInfo()
  loadSubscription()
  // loadQuota() 已由 useQuotaRealtime 接管
})
</script>
