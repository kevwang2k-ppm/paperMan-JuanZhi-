import { ref, computed, onMounted, onUnmounted } from 'vue'
import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'
import client from '@/api/client'

export interface QuotaData {
  plan_code: string
  plan_name: string
  status: string
  current_period_end?: string
  daily_quota: number
  daily_used: number
  daily_remaining: number
  monthly_quota: number
  monthly_used: number
  monthly_remaining: number
  total_quota: number
  total_used: number
  total_remaining: number
  billing_cycle: string
}

export function useQuotaRealtime(userId: string) {
  const quota = ref<QuotaData | null>(null)
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
  const error = ref<string | null>(null)
  let channel: RealtimeChannel | null = null

  // 低配额警告：日剩余 <10 或 总剩余 <50
  const isLowQuota = computed(() => {
    if (!quota.value) return false
    return quota.value.daily_remaining < 10 || quota.value.total_remaining < 50
  })

  // 日配额使用百分比
  const dailyUsagePercent = computed(() => {
    if (!quota.value || !quota.value.daily_quota) return 0
    return Math.round((quota.value.daily_used / quota.value.daily_quota) * 100)
  })

  // 从 Gateway 获取配额（初始化 + Realtime 触发后刷新）
  async function refreshQuota() {
    error.value = null
    try {
      const json = await client.get('/users/me/quota')
      if (json.success && json.data) {
        const d = json.data
        quota.value = {
          plan_code: d.subscription?.plan_code || 'free',
          plan_name: d.subscription?.plan_name || '免费版',
          status: d.subscription?.status || 'active',
          current_period_end: d.subscription?.current_period_end,
          daily_quota: d.daily?.quota || 0,
          daily_used: d.daily?.used || 0,
          daily_remaining: d.daily?.remaining || 0,
          monthly_quota: d.monthly?.quota || 0,
          monthly_used: d.monthly?.used || 0,
          monthly_remaining: d.monthly?.remaining || 0,
          total_quota: d.total?.quota || 0,
          total_used: d.total?.used || 0,
          total_remaining: d.total?.remaining || 0,
          billing_cycle: d.subscription?.billing_cycle || 'monthly',
        }
      }
    } catch (e: any) {
      error.value = e?.message || '刷新配额失败'
      console.error('刷新配额失败:', e)
    }
  }

  // 订阅 Supabase Realtime
  function subscribe() {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) {
      connectionStatus.value = 'disconnected'
      return
    }

    const supabase = createClient(url, key)
    channel = supabase
      .channel(`user_subscriptions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshQuota() // 收到推送立即刷新
        }
      )
      .subscribe((status) => {
        connectionStatus.value = status === 'SUBSCRIBED' ? 'connected' : 'disconnected'
      })
  }

  function unsubscribe() {
    if (channel) {
      channel.unsubscribe()
      channel = null
    }
  }

  onMounted(() => {
    refreshQuota()
    subscribe()
  })

  onUnmounted(() => {
    unsubscribe()
  })

  return {
    quota,
    isLowQuota,
    dailyUsagePercent,
    connectionStatus,
    error,
    refreshQuota,
  }
}
