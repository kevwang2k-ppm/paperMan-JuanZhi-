import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '试卷管理', requiresAuth: true }
  },
  {
    path: '/upload',
    name: 'Upload',
    component: () => import('@/views/UploadView.vue'),
    meta: { title: '创建新试卷', requiresAuth: true }
  },
  {
    path: '/processing/:batchId',
    name: 'Processing',
    component: () => import('@/views/ProcessingView.vue'),
    meta: { title: 'AI 处理中', requiresAuth: true }
  },
  {
    path: '/import-confirm/:batchId',
    name: 'ImportConfirm',
    component: () => import('@/views/ImportConfirmView.vue'),
    meta: { title: '导入确认', requiresAuth: true }
  },
  {
    path: '/review/:paperId',
    name: 'Review',
    component: () => import('@/views/ReviewView.vue'),
    meta: { title: '审阅试卷', requiresAuth: true }
  },
  {
    path: '/export/:paperId',
    name: 'Export',
    component: () => import('@/views/ExportView.vue'),
    meta: { title: '导出 PDF', requiresAuth: true }
  },
  {
    path: '/correction-confirm',
    name: 'CorrectionConfirm',
    component: () => import('@/views/CorrectionConfirmView.vue'),
    meta: { title: '错整确认', requiresAuth: true }
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('@/views/ConfigView.vue'),
    meta: { title: '系统配置', requiresAuth: true }
  },
  {
    path: '/subscription',
    name: 'Subscription',
    component: () => import('@/views/SubscriptionView.vue'),
    meta: { title: '订阅管理', requiresAuth: true }
  },
  // Auth 路由
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', guestOnly: true }
  },
  {
    path: '/callback',
    name: 'Callback',
    component: () => import('@/views/CallbackView.vue'),
    meta: { title: '登录中...', public: true }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { title: '忘记密码', public: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 认证检查
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  document.title = (to.meta.title as string) || 'Web Fastlane'
  
  const authStore = useAuthStore()
  const isAuthenticated = await authStore.checkAuth()
  
  // 公开路由，直接放行
  if (to.meta.public) {
    next()
    return
  }
  
  // 需要登录但未登录
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }
  
  // 仅游客可访问，但已登录
  if (to.meta.guestOnly && isAuthenticated) {
    next('/')
    return
  }
  
  next()
})

// 每次路由切换后隐藏浏览器导航栏
router.afterEach(() => {
  // 延迟执行，等待页面渲染完成
  setTimeout(() => {
    // 滚动到 (0,1) 尝试隐藏地址栏
    window.scrollTo(0, 1)
    
    // 对于 iOS Safari，尝试更激进的方式
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      // 强制页面占据整个视口
      const app = document.getElementById('app')
      if (app) {
        app.style.height = window.innerHeight + 'px'
      }
    }
  }, 100)
})

export default router
