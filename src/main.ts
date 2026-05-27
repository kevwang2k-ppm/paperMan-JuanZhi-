import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// 自动隐藏浏览器导航栏（iOS Safari / Android Chrome）
function hideBrowserChrome() {
  // 方法1: 尝试滚动隐藏地址栏
  const tryHide = () => {
    window.scrollTo(0, 1)
    // 确保内容区域占满视口
    const app = document.getElementById('app')
    if (app) {
      app.style.minHeight = window.innerHeight + 'px'
    }
  }
  
  // 多次尝试隐藏
  setTimeout(tryHide, 50)
  setTimeout(tryHide, 100)
  setTimeout(tryHide, 300)
  setTimeout(tryHide, 500)
  
  // 每次滚动后都尝试隐藏
  let scrollTimeout: number | null = null
  window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = window.setTimeout(() => {
      if (window.scrollY < 50) {
        window.scrollTo(0, 1)
      }
    }, 100)
  })
  
  // 方法2: 对于iOS，需要用户交互后才能全屏
  const handleTouch = () => {
    tryHide()
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
    // 尝试进入全屏模式（iOS Safari专用）
    if ((window.navigator as any).standalone === false) {
      console.log('建议添加到主屏幕以获得全屏体验')
    }
  }
  
  // 每次触摸都尝试隐藏
  document.addEventListener('touchstart', handleTouch, { passive: true })
  
  // 监听屏幕方向变化，重新调整
  window.addEventListener('orientationchange', () => {
    setTimeout(tryHide, 300)
  })
  
  // 定时检查并隐藏
  setInterval(() => {
    if (window.scrollY < 50) {
      window.scrollTo(0, 1)
    }
  }, 2000)
}

// 页面加载完成后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hideBrowserChrome)
} else {
  hideBrowserChrome()
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
