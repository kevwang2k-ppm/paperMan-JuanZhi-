<template>
  <div class="absolute inset-0 bg-gray-50 flex flex-col pt-[env(safe-area-inset-top)]">
    <!-- 顶部导航 -->
    <header class="bg-white shadow-sm z-10">
      <div class="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 max-w-5xl mx-auto">
        <div class="flex items-center gap-1.5 md:gap-2">
          <button
            @click="$router.back()"
            class="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
          >
            <i class="fas fa-arrow-left text-sm"></i>
          </button>
          <h1 class="text-base md:text-lg font-semibold text-gray-800">系统配置</h1>
        </div>
        <div class="flex items-center gap-1.5 md:gap-2">
          <div class="flex items-center gap-1.5 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-green-50 border border-green-200 rounded-full">
            <div class="w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] md:text-xs font-medium">
              {{ userInitial }}
            </div>
            <span class="text-xs text-gray-700 hidden sm:inline">{{ authStore.userEmail }}</span>
          </div>
          <button
            @click="$router.push('/')"
            class="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
            title="返回主页"
          >
            <i class="fas fa-home text-sm"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- Tab 导航 -->
    <div class="bg-white border-b sticky top-0 z-10">
      <div class="max-w-5xl mx-auto px-3 md:px-4">
        <nav class="flex justify-between gap-3 md:gap-6 overflow-x-auto">
          <button
            @click="activeTab = 'student'"
            class="py-2 md:py-3 text-sm transition flex items-center gap-1 whitespace-nowrap"
            :class="activeTab === 'student' ? 'tab-active' : 'tab-inactive'"
          >
            <i class="fas fa-user-graduate mr-0.5"></i>学生管理
          </button>
          <button
            @click="activeTab = 'correction'"
            class="py-2 md:py-3 text-sm transition flex items-center gap-1 whitespace-nowrap"
            :class="activeTab === 'correction' ? 'tab-active' : 'tab-inactive'"
          >
            <i class="fas fa-tasks mr-0.5"></i>错整管理
          </button>
          <button
            @click="activeTab = 'user'"
            class="py-2 md:py-3 text-sm transition flex items-center gap-1 whitespace-nowrap"
            :class="activeTab === 'user' ? 'tab-active' : 'tab-inactive'"
          >
            <i class="fas fa-id-card mr-0.5"></i>用户管理
          </button>
          <button
            @click="activeTab = 'subscription'"
            class="py-2 md:py-3 text-sm transition flex items-center gap-1 whitespace-nowrap"
            :class="activeTab === 'subscription' ? 'tab-active' : 'tab-inactive'"
          >
            <i class="fas fa-crown mr-0.5"></i>订阅管理
          </button>
        </nav>
      </div>
    </div>

    <!-- 主内容区 -->
    <main class="flex-1 max-w-5xl mx-auto px-4 py-6 w-full overflow-y-auto min-h-0 text-sm">
      <StudentManager v-if="activeTab === 'student'" />
      <CorrectionManager v-if="activeTab === 'correction'" />
      <UserManager v-if="activeTab === 'user'" />
      <SubscriptionManager v-if="activeTab === 'subscription'" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import StudentManager from '@/components/config/StudentManager.vue'
import CorrectionManager from '@/components/config/CorrectionManager.vue'
import UserManager from '@/components/config/UserManager.vue'
import SubscriptionManager from '@/components/config/SubscriptionManager.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const activeTab = ref<'student' | 'correction' | 'user' | 'subscription'>(
  (route.query.tab as 'student' | 'correction' | 'user' | 'subscription') || 'student'
)

// 提供给子组件切换 tab 的能力
function switchTab(tab: string) {
  if (['student', 'correction', 'user', 'subscription'].includes(tab)) {
    activeTab.value = tab as 'student' | 'correction' | 'user' | 'subscription'
    router.replace({ path: '/config', query: { tab } })
  }
}
provide('switchConfigTab', switchTab)

const userInitial = computed(() => {
  return authStore.userEmail?.charAt(0).toUpperCase() || '?'
})
</script>

<style scoped>
.tab-active {
  border-bottom: 2px solid #2563eb;
  color: #2563eb;
  font-weight: 600;
}
.tab-inactive {
  color: #6b7280;
}
.tab-inactive:hover {
  color: #374151;
}
</style>
