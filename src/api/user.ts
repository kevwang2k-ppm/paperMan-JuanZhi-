import client from './client'
import type { ApiResponse } from '@/types'

export interface UserProfile {
  id: string
  email: string
  username?: string
  created_at?: string
  last_sign_in_at?: string
}

export interface SubscriptionInfo {
  plan_name?: string
  status?: string
  current_period_end?: string
  daily_usage?: number
  monthly_usage?: number
}

export interface QuotaInfo {
  plan_name?: string
  status?: string
  daily_limit?: number
  daily_used?: number
  daily_remaining?: number
  monthly_limit?: number
  monthly_used?: number
  monthly_remaining?: number
  total_limit?: number
  total_used?: number
  total_remaining?: number
  current_period_end?: string
  // 新增：Realtime 配额同步需要
  plan_code?: string
  billing_cycle?: string
}

export interface PlanInfo {
  id: number
  name: string
  code: string
  price_monthly: number
  price_yearly?: number
  ai_quota_daily: number
  ai_quota_monthly: number
  max_image_size?: number
  features?: Record<string, boolean>
  sort_order?: number
}

export interface SubscriptionLog {
  id: number
  request_id: string
  service_type: string
  status: string
  duration_ms: number
  created_at: string
  error_code?: string
  error_message?: string
}

export interface SubscriptionLogsResponse {
  logs: SubscriptionLog[]
  total: number
  limit: number
  offset: number
}

export const userApi = {
  // 获取当前用户资料
  getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return client.get('/users/me')
  },

  // 获取当前用户订阅套餐
  getSubscription(): Promise<ApiResponse<{
    subscription: SubscriptionInfo
    plan: PlanInfo
    available_plans: PlanInfo[]
  }>> {
    return client.get('/users/me/subscription')
  },

  // 获取当前用户 AI 配额
  getQuota(): Promise<ApiResponse<{
    subscription: SubscriptionInfo
    daily: { quota: number; used: number; remaining: number }
    monthly: { quota: number; used: number; remaining: number }
    total: { quota: number; used: number; remaining: number }
  }>> {
    return client.get('/users/me/quota')
  },

  // 获取所有可用套餐列表
  getSubscriptionPlans(): Promise<ApiResponse<PlanInfo[]>> {
    return client.get('/users/me/subscription/plans')
  },

  // 预览升级/续期结果
  previewUpgrade(planCode: string, billingCycle: string = 'monthly'): Promise<ApiResponse<{
    allowed: boolean
    current_plan_code: string
    target_plan_code: string
    billing_cycle: string
    new_period_end?: string
    max_period_end?: string
    reason?: string
    price: number
    action?: string
  }>> {
    return client.post('/users/me/subscription/upgrade/preview', {
      plan_code: planCode,
      billing_cycle: billingCycle,
    })
  },

  // 升级订阅套餐
  upgradeSubscription(planCode: string, billingCycle: string = 'monthly'): Promise<ApiResponse<{
    success: boolean
    message: string
    new_plan?: PlanInfo
  }>> {
    return client.post('/users/me/subscription/upgrade', {
      plan_code: planCode,
      billing_cycle: billingCycle,
    })
  },

  // ========== 支付相关 API ==========

  // 创建支付宝当面付订单
  createAlipayOrder(planCode: string, billingCycle: string = 'monthly'): Promise<ApiResponse<{
    success: boolean
    order_id: string
    out_trade_no: string
    qr_code: string
    amount_cents: number
  }>> {
    return client.post('/users/me/payments/alipay/create', {
      plan_code: planCode,
      billing_cycle: billingCycle,
    })
  },

  // 查询支付宝订单状态
  fetchPaymentStatus(orderId: string): Promise<ApiResponse<{
    order_id: string
    out_trade_no: string
    status: 'pending' | 'paid' | 'failed' | 'refunded'
    plan_code: string
    billing_cycle: string
    amount_cents: number
    paid_at?: string
  }>> {
    return client.get(`/users/me/payments/alipay/status?order_id=${orderId}`)
  },

  // 获取 AI 请求日志
  getSubscriptionLogs(limit: number = 20, offset: number = 0): Promise<ApiResponse<SubscriptionLogsResponse>> {
    return client.get(`/users/me/subscription/logs?limit=${limit}&offset=${offset}`)
  }
}
