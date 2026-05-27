<template>
  <div class="space-y-6">
    <!-- 当前套餐卡片 -->
    <section class="bg-white rounded-xl border p-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
          <i class="fas fa-crown"></i>
        </div>
        <div>
          <h2 class="font-semibold text-gray-800">当前套餐</h2>
          <p class="text-sm text-gray-500">您正在使用的服务计划</p>
        </div>
      </div>

      <div v-if="loadingCurrent" class="py-8 text-center">
        <div class="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-sm text-gray-500">加载中...</p>
      </div>

      <div v-else-if="currentPlan" class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xl font-bold text-amber-800">{{ currentPlan.plan_name || '免费版' }}</span>
          <span
            class="text-sm px-2.5 py-1 rounded-full font-medium"
            :class="currentPlan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
          >
            {{ currentPlan.status === 'active' ? '生效中' : '已过期' }}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-500">订阅起始日</span>
            <p class="font-medium text-gray-800">{{ currentPlan.current_period_start ? formatDate(currentPlan.current_period_start) : '-' }}</p>
          </div>
          <div>
            <span class="text-gray-500">有效期至</span>
            <p class="font-medium text-gray-800">{{ currentPlan.current_period_end ? formatDate(currentPlan.current_period_end) : '永久' }}</p>
          </div>
          <div>
            <span class="text-gray-500">计费周期</span>
            <p class="font-medium text-gray-800">{{ billingCycleText }}</p>
          </div>
          <div>
            <span class="text-gray-500">订阅周期内总配额</span>
            <p class="font-medium text-gray-800">{{ formatNumber(currentPlan.total_limit) }} 次</p>
            <p v-if="currentPlan.total_limit" class="text-sm text-gray-400 mt-0.5">
              大约至少可处理 {{ estimateSheets(currentPlan.total_limit).min }} 张试卷
            </p>
            <p v-if="currentPlan.total_limit" class="text-sm text-gray-400">
              最多可处理 {{ estimateSheets(currentPlan.total_limit).max }} 张试卷（合并模式下）
            </p>
          </div>
        </div>
      </div>

      <div v-else class="text-sm text-gray-500 text-center py-6">暂无订阅信息</div>
    </section>

    <!-- 付费套餐组合 -->
    <section class="bg-white rounded-xl border p-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <i class="fas fa-layer-group"></i>
        </div>
        <div>
          <h2 class="font-semibold text-gray-800">选择付费套餐</h2>
          <p class="text-sm text-gray-500">免费体验结束后，请选择适合您的方案</p>
        </div>
      </div>

      <div v-if="loadingPlans" class="py-8 text-center">
        <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-sm text-gray-500">加载套餐列表...</p>
      </div>

      <div v-else-if="plansError" class="text-center py-6">
        <p class="text-red-500 text-sm mb-3">{{ plansError }}</p>
        <button
          @click="loadPlans"
          class="px-4 py-1.5 bg-blue-50 text-blue-700 text-sm rounded border border-blue-200 hover:bg-blue-100 transition"
        >
          <i class="fas fa-redo mr-1"></i>重试
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <div
          v-for="combo in combos"
          :key="combo.key"
          class="rounded-lg border p-5 transition relative flex flex-col h-full"
          :class="comboCardClass(combo)"
        >
          <!-- 推荐标记 -->
          <div
            v-if="combo.badge"
            class="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-red-500 text-white text-sm rounded-full font-medium"
          >
            {{ combo.badge }}
          </div>

          <div class="flex-1 flex flex-col justify-end mb-4">
            <div class="text-center">
              <h3 class="font-bold text-gray-800 text-lg">{{ combo.name }}</h3>
              <p class="text-3xl font-bold text-gray-900 mt-2">
                ¥{{ getComboPrice(combo) }}
              </p>
              <p class="text-sm text-gray-500">{{ combo.periodLabel }}</p>
            </div>
          </div>

          <div class="bg-gray-50 rounded-lg p-3 text-sm space-y-2 mb-4">
            <div class="flex justify-between">
              <span class="text-gray-500">订阅周期内总配额</span>
              <span class="font-medium">{{ formatNumber(getComboTotalQuota(combo)) }} 次</span>
            </div>
            <div class="flex justify-between text-sm text-gray-400">
              <span>大约至少可处理</span>
              <span>{{ estimateSheets(getComboTotalQuota(combo)).min }} 张试卷</span>
            </div>
            <div class="flex justify-between text-sm text-gray-400">
              <span>最多可处理（合并模式下）</span>
              <span>{{ estimateSheets(getComboTotalQuota(combo)).max }} 张试卷</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">最大图片</span>
              <span class="font-medium">{{ formatSize(getComboQuota(combo).maxImageSize) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">批量处理</span>
              <span class="font-medium" :class="getComboQuota(combo).features.batch_processing ? 'text-green-600' : 'text-gray-300'">
                {{ getComboQuota(combo).features.batch_processing ? '支持' : '不支持' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">优先队列</span>
              <span class="font-medium" :class="getComboQuota(combo).features.priority_queue ? 'text-green-600' : 'text-gray-300'">
                {{ getComboQuota(combo).features.priority_queue ? '支持' : '不支持' }}
              </span>
            </div>
          </div>

          <button
            @click="selectCombo(combo)"
            class="w-full py-2.5 rounded-lg text-sm font-medium transition mt-auto"
            :class="canSelectCombo(combo)
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
            :disabled="!canSelectCombo(combo)"
          >
            {{ comboButtonText(combo) }}
          </button>
        </div>
      </div>
    </section>
  </div>

  <!-- 确认弹窗 -->
  <Teleport to="body">
    <div
      v-if="showUpgradeModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showUpgradeModal = false"
    >
      <div class="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
        <div class="text-center">
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-3">
            <i class="fas fa-shopping-cart"></i>
          </div>
          <h3 class="font-semibold text-gray-800">确认订阅</h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ previewResult?.action === 'renew' ? '续期' : previewResult?.action === 'upgrade' ? '升级' : '购买' }}
            {{ selectedCombo?.name }} {{ selectedCombo?.periodLabel }}
          </p>
        </div>

        <div class="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-500">套餐</span>
            <span class="font-medium">{{ selectedCombo?.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">周期</span>
            <span class="font-medium">{{ selectedCombo?.periodLabel }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">价格</span>
            <span class="font-medium text-amber-700">¥{{ getComboPrice(selectedCombo!) }}</span>
          </div>
          <div v-if="previewResult?.new_period_end" class="flex justify-between">
            <span class="text-gray-500">新到期日</span>
            <span class="font-medium text-green-700">{{ formatDate(previewResult.new_period_end) }}</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="showUpgradeModal = false"
            class="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition"
          >
            取消
          </button>
          <button
            @click="confirmUpgrade"
            :disabled="upgrading"
            class="flex-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition disabled:opacity-60"
          >
            <i v-if="upgrading" class="fas fa-circle-notch fa-spin mr-1"></i>
            {{ upgrading ? '处理中...' : '确认订阅' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 成功提示 -->
  <Teleport to="body">
    <div
      v-if="upgradeSuccess"
      class="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2"
    >
      <i class="fas fa-check-circle"></i>
      <span class="text-sm font-medium">支付成功，套餐已升级！</span>
    </div>
  </Teleport>

  <!-- 支付宝二维码支付弹窗 -->
  <Teleport to="body">
    <div
      v-if="showPayModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showPayModal = false; stopPolling()"
    >
      <div class="bg-white rounded-xl p-6 w-80 text-center shadow-xl">
        <h3 class="text-lg font-semibold mb-2">支付宝扫码支付</h3>
        <p class="text-sm text-gray-500 mb-4">
          {{ payAction === 'renew' ? '续期' : payAction === 'upgrade' ? '升级' : '购买' }}至 {{ payOrder?.plan_code === 'standard' ? '标准版' : '专业版' }}
          （¥{{ (payOrder?.amount_cents || 0) / 100 }}）
        </p>

        <!-- 二维码 -->
        <div class="flex justify-center mb-4">
          <canvas ref="qrCanvas" width="200" height="200"></canvas>
        </div>

        <p v-if="payStatus === 'pending'" class="text-sm text-blue-600">
          <i class="fas fa-spinner fa-spin mr-1"></i>等待支付...
        </p>
        <p v-else-if="payStatus === 'paid'" class="text-sm text-green-600">
          <i class="fas fa-check mr-1"></i>支付成功
        </p>
        <p v-else-if="payStatus === 'failed'" class="text-sm text-red-600">
          支付失败
        </p>

        <button
          @click="showPayModal = false; stopPolling()"
          class="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          取消
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { userApi } from '@/api/user'
import type { PlanInfo, SubscriptionInfo } from '@/api/user'
import QRCode from 'qrcode'

const authStore = useAuthStore()

// ========== 固定组合定义 ==========
interface PlanCombo {
  key: string
  name: string
  planCode: string
  billingCycle: string
  periodLabel: string
  badge?: string
}

const combos: PlanCombo[] = [
  { key: 'standard-monthly', name: '标准版', planCode: 'standard', billingCycle: 'monthly', periodLabel: '1个月' },
  { key: 'standard-quarterly', name: '标准版', planCode: 'standard', billingCycle: 'quarterly', periodLabel: '3个月', badge: '推荐' },
  { key: 'pro-yearly', name: '专业版', planCode: 'pro', billingCycle: 'yearly', periodLabel: '1年' },
]

// ========== 状态 ==========
const currentPlan = ref<SubscriptionInfo & { ai_quota_daily?: number; ai_quota_monthly?: number; billing_cycle?: string; total_limit?: number; current_period_start?: string } | null>(null)
const loadingCurrent = ref(true)

const plans = ref<PlanInfo[]>([])
const loadingPlans = ref(false)
const plansError = ref<string | null>(null)

const showUpgradeModal = ref(false)
const selectedCombo = ref<PlanCombo | null>(null)
const previewResult = ref<any>(null)
const previewLoading = ref(false)
const upgrading = ref(false)
const upgradeSuccess = ref(false)

// ========== 支付宝支付相关状态 ==========
const showPayModal = ref(false)
const payOrder = ref<any>(null)
const payAction = ref<'purchase' | 'upgrade' | 'renew'>('purchase')
const qrCodeUrl = ref('')
const payStatus = ref<'pending' | 'paid' | 'failed'>('pending')
const pollTimer = ref<number | null>(null)
const qrCanvas = ref<HTMLCanvasElement | null>(null)

// ========== Computed ==========
const billingCycleText = computed(() => {
  const map: Record<string, string> = { monthly: '月付', quarterly: '季付', half_yearly: '半年付', yearly: '年付' }
  return map[currentPlan.value?.billing_cycle || 'monthly'] || '月付'
})

const isExpired = computed(() => currentPlan.value?.status !== 'active')

// ========== 组合价格/配额 ==========
function getPlan(code: string) {
  return plans.value.find(p => p.code === code)
}

function getComboPrice(combo: PlanCombo) {
  const plan = getPlan(combo.planCode)
  if (!plan) return 0
  const pm = Number(plan.price_monthly) || 0
  switch (combo.billingCycle) {
    case 'monthly': return pm
    case 'quarterly': {
      const pq = Number(plan.price_quarterly)
      return pq > 0 ? pq : Math.round(pm * 3 * 0.9)
    }
    case 'yearly': {
      const py = Number(plan.price_yearly)
      return py > 0 ? py : Math.round(pm * 12 * 0.83)
    }
  }
  return 0
}

function getComboQuota(combo: PlanCombo) {
  const plan = getPlan(combo.planCode)
  return {
    daily: plan?.ai_quota_daily || 0,
    monthly: plan?.ai_quota_monthly || 0,
    maxImageSize: plan?.max_image_size || 4194304,
    features: plan?.features || {},
  }
}

function getComboTotalQuota(combo: PlanCombo): number {
  return getComboQuota(combo).monthly * getCycleMonths(combo.billingCycle)
}

function estimateSheets(totalQuota: number): { min: number; max: number } {
  const min = Math.floor(totalQuota / 8)
  const max = Math.floor(totalQuota / 4)
  return { min, max }
}

// ========== 按钮逻辑 ==========
function getCycleMonths(cycle: string): number {
  const map: Record<string, number> = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12 }
  return map[cycle] || 1
}

function isRenewalAllowed(combo: PlanCombo): boolean {
  // 仅对生效中同套餐续期做上限检查
  if (currentPlan.value?.status !== 'active') return true
  const currentSort = getPlan(currentPlan.value?.plan_code || '')?.sort_order ?? 0
  const comboSort = getPlan(combo.planCode)?.sort_order ?? 0
  if (comboSort !== currentSort) return true

  const currentEnd = currentPlan.value?.current_period_end
  if (!currentEnd) return true

  const currentMonths = getCycleMonths(currentPlan.value?.billing_cycle || 'monthly')
  const newMonths = getCycleMonths(combo.billingCycle)

  const endDate = new Date(currentEnd)
  const maxDate = new Date(endDate)
  maxDate.setMonth(maxDate.getMonth() + currentMonths * 4)

  const newDate = new Date(endDate)
  newDate.setMonth(newDate.getMonth() + newMonths)

  return newDate <= maxDate
}

function canSelectCombo(combo: PlanCombo) {
  const currentCode = currentPlan.value?.plan_code
  const currentStatus = currentPlan.value?.status

  // 不允许选择 free
  if (combo.planCode === 'free') return false

  // free -> 任何付费套餐都允许
  if (currentCode === 'free') return true

  // 已过期：除 free 外任何套餐都允许
  if (currentStatus !== 'active') return true

  // 生效中：只允许 sort_order >= 当前（同套餐购买 或 升级）
  const currentSort = getPlan(currentCode || '')?.sort_order ?? 0
  const comboSort = getPlan(combo.planCode)?.sort_order ?? 0
  if (comboSort < currentSort) return false

  // 同套餐续期上限检查
  return isRenewalAllowed(combo)
}

function comboButtonText(combo: PlanCombo) {
  if (!canSelectCombo(combo)) {
    // 判断是否因续期上限被禁用
    if (currentPlan.value?.status === 'active') {
      const currentSort = getPlan(currentPlan.value?.plan_code || '')?.sort_order ?? 0
      const comboSort = getPlan(combo.planCode)?.sort_order ?? 0
      if (comboSort === currentSort && !isRenewalAllowed(combo)) return '续期超限'
    }
    return '当前套餐生效中，不可降级'
  }

  const currentStatus = currentPlan.value?.status
  if (currentStatus !== 'active') return '购买'

  const currentSort = getPlan(currentPlan.value?.plan_code || '')?.sort_order ?? 0
  const comboSort = getPlan(combo.planCode)?.sort_order ?? 0

  if (comboSort === currentSort) return '购买'
  if (comboSort > currentSort) return '升级'
  return '不可降级'
}

function comboCardClass(combo: PlanCombo) {
  if (!canSelectCombo(combo)) return 'border-gray-100 bg-gray-50/50 opacity-70'
  return 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
}

// ========== 工具函数 ==========
function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + 'MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + 'KB'
  return bytes + 'B'
}

function formatNumber(n?: number) {
  if (n === undefined || n === null || isNaN(n)) return '-'
  return n.toLocaleString('zh-CN')
}

// ========== 数据加载 ==========
async function loadCurrentPlan() {
  loadingCurrent.value = true
  try {
    const res = await userApi.getSubscription()
    const data = (res as any).data || res
    const subscription = data?.subscription || data
    const plan = data?.plan || {}
    currentPlan.value = {
      ...subscription,
      ai_quota_daily: plan.ai_quota_daily,
      ai_quota_monthly: plan.ai_quota_monthly,
      billing_cycle: subscription.billing_cycle || 'monthly',
    }
  } catch (err: any) {
    console.error('加载当前套餐失败:', err)
  } finally {
    loadingCurrent.value = false
  }
}

async function loadPlans() {
  loadingPlans.value = true
  plansError.value = null
  try {
    const res = await userApi.getSubscriptionPlans()
    const data = (res as any).data || res
    plans.value = Array.isArray(data) ? data : (data?.plans || [])
  } catch (err: any) {
    plansError.value = err?.message || '加载套餐列表失败'
    console.error('加载套餐列表失败:', err)
  } finally {
    loadingPlans.value = false
  }
}

// ========== 订阅操作 ==========
async function selectCombo(combo: PlanCombo) {
  if (!canSelectCombo(combo)) return
  selectedCombo.value = combo
  previewLoading.value = true
  previewResult.value = null
  try {
    const res = await userApi.previewUpgrade(combo.planCode, combo.billingCycle)
    const data = (res as any).data || res
    previewResult.value = data
    if (data?.allowed) {
      showUpgradeModal.value = true
    } else {
      alert(data?.reason || '操作不允许')
    }
  } catch (err: any) {
    const msg = err?.message || '预览失败，请重试'
    alert(msg)
  } finally {
    previewLoading.value = false
  }
}

async function confirmUpgrade() {
  if (!selectedCombo.value) return
  upgrading.value = true
  try {
    // 1. 创建支付宝订单
    const res = await userApi.createAlipayOrder(selectedCombo.value.planCode, selectedCombo.value.billingCycle)
    const data = (res as any).data || res
    if (data?.success || (res as any).success) {
      payOrder.value = data
      payAction.value = previewResult.value?.action || 'purchase'
      qrCodeUrl.value = data.qr_code || ''
      payStatus.value = 'pending'
      showUpgradeModal.value = false
      showPayModal.value = true
      // 2. 开始轮询支付状态
      startPolling(data.order_id)
    } else {
      const msg = data?.message || data?.reason || '创建订单失败'
      alert(msg)
    }
  } catch (err: any) {
    const detail = err?.response?.data?.detail
    const msg = detail?.error?.message || detail?.message || detail?.reason || err?.message || '创建订单失败'
    alert(msg)
  } finally {
    upgrading.value = false
  }
}

// ========== 支付轮询 ==========
function startPolling(orderId: string) {
  if (pollTimer.value) window.clearInterval(pollTimer.value)
  pollTimer.value = window.setInterval(async () => {
    if (payStatus.value !== 'pending') return
    try {
      const res = await userApi.fetchPaymentStatus(orderId)
      const status = (res as any).data || res
      payStatus.value = status.status
      if (status.status === 'paid') {
        stopPolling()
        showPayModal.value = false
        upgradeSuccess.value = true
        setTimeout(() => { upgradeSuccess.value = false }, 3000)
        await loadCurrentPlan()
      } else if (status.status === 'failed') {
        stopPolling()
        alert('支付失败或已超时，请重试')
      }
    } catch (e) {
      console.error('Polling error', e)
    }
  }, 2000)
}

function stopPolling() {
  if (pollTimer.value) {
    window.clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

// 二维码渲染
watch(() => qrCodeUrl.value, async (url) => {
  if (!url) return
  await nextTick()
  if (qrCanvas.value) {
    QRCode.toCanvas(qrCanvas.value, url, { width: 180, margin: 2 })
  }
}, { immediate: true })

onMounted(() => {
  loadCurrentPlan()
  loadPlans()
})

onUnmounted(() => {
  stopPolling()
})
</script>
