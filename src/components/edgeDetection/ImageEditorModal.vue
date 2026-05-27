<template>
  <Teleport to="body">
    <div 
      class="image-editor-modal fixed left-0 right-0 bottom-0 bg-black/90 z-50 flex flex-col"
      :style="{ top: safeAreaTop + 'px' }"
      @click.self="close"
    >
      
      <!-- 顶部导航栏 -->
      <header class="modal-header flex items-center justify-between px-4 py-3 bg-gray-800 text-white flex-shrink-0">
        <!-- 关闭按钮 -->
        <button 
          class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          @click="close"
        >
          <i class="fas fa-times text-lg"></i>
        </button>
        
        <!-- 图片切换控制 -->
        <nav class="image-navigator flex items-center gap-4">
          <button 
            class="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center transition-colors"
            :class="{ 'opacity-30 cursor-not-allowed': currentIndex === 0, 'hover:bg-white/20': currentIndex > 0 }"
            :disabled="currentIndex === 0"
            @click="goToPrev"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          
          <span class="page-indicator text-base font-medium min-w-[80px] text-center">
            {{ currentIndex + 1 }} / {{ totalCount }}
          </span>
          
          <button 
            class="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center transition-colors"
            :class="{ 
              'opacity-30 cursor-not-allowed': currentIndex === totalCount - 1, 
              'hover:bg-white/20': currentIndex < totalCount - 1 
            }"
            :disabled="currentIndex === totalCount - 1"
            @click="goToNext"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </nav>
        
        <!-- 完成按钮 -->
        <button 
          class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          @click="close"
        >
          完成
        </button>
      </header>

      <!-- 图片编辑区域 -->
      <main class="editor-body flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div class="w-full h-full max-w-4xl max-h-[80vh]">
          <CanvasEditor
            v-show="currentImage"
            :key="store.currentEditingIndex"
            :image-url="currentImage?.thumbnailUrl || ''"
            :corners="currentImage?.corners"
            :image-size="currentImage?.image_size || { width: 0, height: 0 }"
            @update:corners="handleCornersUpdate"
          />
        </div>
      </main>

      <!-- 底部状态栏 -->
      <footer 
        class="modal-footer px-4 py-3 bg-gray-800 text-white flex justify-between items-center"
        :style="{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }"
      >
        <div 
          class="status-badge flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
          :class="currentImage?.is_default ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'"
        >
          <i :class="currentImage?.is_default ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle'"></i>
          <span>{{ statusText }}</span>
        </div>
        
        <p class="hint text-sm text-gray-400 flex items-center gap-2">
          <i class="fas fa-hand-pointer"></i>
          <span>拖动蓝色圆点调整试卷边缘</span>
        </p>
      </footer>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useEdgeDetectionStore } from '@/stores/edgeDetection'
import CanvasEditor from './CanvasEditor.vue'

const store = useEdgeDetectionStore()

// iOS 安全区域高度
const safeAreaTop = ref(44) // 默认 44px（iPhone X+ 刘海屏高度）

// 检测安全区域
function detectSafeArea() {
  // 尝试从 CSS 变量获取
  const div = document.createElement('div')
  div.style.cssText = 'padding-top: env(safe-area-inset-top); position: fixed;'
  document.body.appendChild(div)
  const insetTop = parseInt(getComputedStyle(div).paddingTop) || 0
  document.body.removeChild(div)
  
  // 只有在获取到有效值时才使用（刘海屏设备）
  // 非全屏/普通状态下不需要额外间距
  safeAreaTop.value = insetTop > 20 ? insetTop : 0
}

// 当前编辑的图片索引
const currentIndex = computed(() => store.currentEditingIndex ?? 0)

// 当前图片数据
const currentImage = computed(() => store.images[currentIndex.value])
const totalCount = computed(() => store.images.length)

// 状态显示
const statusText = computed(() => 
  currentImage.value?.is_default 
    ? '使用默认四角，建议调整' 
    : '自动检测成功'
)

// 导航方法
function goToPrev() {
  if (currentIndex.value > 0) {
    store.goToPrev()
  }
}

function goToNext() {
  if (currentIndex.value < totalCount.value - 1) {
    store.goToNext()
  }
}

// 键盘导航支持
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') {
    goToPrev()
  } else if (e.key === 'ArrowRight') {
    goToNext()
  } else if (e.key === 'Escape') {
    close()
  }
}

// 四角更新（实时保存到 store）
function handleCornersUpdate(corners: { tl: [number, number]; tr: [number, number]; br: [number, number]; bl: [number, number] }) {
  store.updateCorners(currentIndex.value, corners)
}

function close() {
  store.closeEditor()
}

// 生命周期
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  detectSafeArea()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.image-editor-modal {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.modal-header {
  flex-shrink: 0;
}

.editor-body {
  flex: 1;
  overflow: hidden;
}

.modal-footer {
  flex-shrink: 0;
}

/* 触摸设备优化 */
@media (hover: none) {
  .status-badge {
    font-size: 14px;
  }
}
</style>
