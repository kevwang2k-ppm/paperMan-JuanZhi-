<template>
  <div 
    class="review-correction-panel flex flex-col overflow-hidden bg-gray-800 transition-all duration-300 h-full"
  >
    <!-- 标题栏 + 分页指示器 -->
    <div class="flex items-center justify-between px-2 py-0.5 bg-gray-700/50 flex-shrink-0 h-6">
      <div class="flex items-center space-x-2">
        <!-- 页面指示器 -->
        <div class="flex items-center space-x-1">
          <button 
            v-if="!isCollapsed"
            @click="currentPage = 0"
            class="px-2 py-0.5 text-[10px] rounded transition-colors flex items-center"
            :class="currentPage === 0 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'"
          >
            <i class="fas fa-edit mr-1"></i>订正
            <span v-if="allCorrectionImages.length > 0" class="ml-0.5">({{ allCorrectionImages.length }})</span>
          </button>
          <button 
            v-if="!isCollapsed"
            @click="currentPage = 1"
            class="px-2 py-0.5 text-[10px] rounded transition-colors flex items-center"
            :class="currentPage === 1 ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'"
          >
            <i class="fas fa-camera mr-1"></i>原题
          </button>
          <span v-if="isCollapsed" class="text-gray-400 text-[10px]">
            <i class="fas fa-edit mr-1"></i>订正 ({{ allCorrectionImages.length }})
          </span>
        </div>
      </div>
      
      <!-- 右侧操作按钮 -->
      <div class="flex items-center space-x-1">
        <!-- 收起/展开按钮 -->
        <button
          @click="toggleCollapse"
          class="text-gray-400 hover:text-white text-xs px-1.5 py-0.5"
        >
          <i :class="isCollapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
        </button>
        
        <!-- 展开状态下的操作按钮 -->
        <template v-if="!isCollapsed">
          <template v-if="currentPage === 0">
            <button
              v-if="!hasAnyCorrection"
              @click="showUploadDialog"
              class="text-blue-400 hover:text-blue-300 text-xs px-1.5 py-0.5"
            >
              <i class="fas fa-plus"></i>
            </button>
            <button
              v-else
              @click="showActionMenu"
              class="text-gray-400 hover:text-white text-xs px-1.5 py-0.5"
            >
              <i class="fas fa-ellipsis-v"></i>
            </button>
          </template>
          
          <!-- 原题页面操作 -->
          <template v-else>
            <button
              v-if="firstOriginalImage"
              @click="openOriginalViewer"
              class="text-gray-400 hover:text-white text-xs px-1.5 py-0.5"
            >
              <i class="fas fa-expand"></i>
            </button>
          </template>
        </template>
      </div>
    </div>

    <!-- 页面内容区域 - 只在展开时显示 -->
    <div 
      v-if="!isCollapsed"
      ref="pageContainer"
      class="flex-1 relative overflow-hidden"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div 
        class="absolute inset-0 transition-transform duration-300 ease-out"
        :style="{ transform: `translateY(${-currentPage * 100}%)` }"
      >
        <!-- 第一页：订正图片 -->
        <div class="h-full w-full flex flex-col">
          <div class="flex-1 p-2 min-h-0">
            <CorrectionPage
              :images="allCorrectionImages"
              :is-loading="isLoading"
              @upload="showUploadDialog"
              @view="openCorrectionViewer"
              @delete="deleteCurrentImage"
            />
          </div>
        </div>
        
        <!-- 第二页：原题截图 -->
        <div class="h-full w-full flex flex-col">
          <div class="flex-1 p-2 min-h-0">
            <OriginalPage
              :image="firstOriginalImage"
              :is-loading="isLoading"
              @view="openOriginalViewer"
            />
          </div>
        </div>
      </div>
      
      <!-- 滑动提示 -->
      <div class="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col space-y-1">
        <div 
          class="w-1.5 h-6 rounded-full transition-colors"
          :class="currentPage === 0 ? 'bg-blue-500' : 'bg-gray-600'"
        />
        <div 
          class="w-1.5 h-6 rounded-full transition-colors"
          :class="currentPage === 1 ? 'bg-green-500' : 'bg-gray-600'"
        />
      </div>
    </div>

    <!-- 原题全屏查看器 -->
    <ImageViewer
      v-model:visible="originalViewerVisible"
      :images="originalImagesForViewer"
      :title="'原题截图'"
      :show-thumbnails="false"
    />

    <!-- 订正全屏查看器 -->
    <ImageViewer
      v-model:visible="correctionViewerVisible"
      :images="correctionImagesForViewer"
      :title="'订正图片'"
      :show-thumbnails="true"
    />

    <!-- 长按菜单 -->
    <ActionMenu
      v-model:visible="menuVisible"
      :actions="menuActions"
      @select="handleMenuSelect"
    />

    <!-- 上传弹窗 -->
    <UploadDialog
      v-model:visible="uploadVisible"
      v-model:onlyThisQuestion="uploadConfig.onlyThisQuestion"
      :existing-count="allCorrectionImages.length"
      @confirm="handleUpload"
    />

    <!-- 重复提示弹窗 -->
    <ConfirmDialog
      v-model:visible="confirmVisible"
      :title="'提示'"
      :message="confirmMessage"
      :type="'warning'"
      :confirm-text="'继续添加'"
      @confirm="proceedUpload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCorrectionStore } from '@/stores/correction'
import CorrectionPage from './CorrectionPage.vue'
import OriginalPage from './OriginalPage.vue'
import ImageViewer from './ImageViewer.vue'
import ActionMenu from './ActionMenu.vue'
import UploadDialog from './UploadDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import type { ActionItem } from './ActionMenu.vue'

const props = defineProps<{
  paperId: string
  questionUuid: string
  collapsed?: boolean
}>()

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

const router = useRouter()
const correctionStore = useCorrectionStore()

// 收起/展开状态
const isCollapsed = computed({
  get: () => props.collapsed ?? false,
  set: (val) => emit('update:collapsed', val)
})

// 当前页面（0=订正，1=原题）
const currentPage = ref(0)

// 切换收起/展开
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// 触摸滑动相关
const pageContainer = ref<HTMLElement | null>(null)
let touchStartY = 0
let touchEndY = 0
const minSwipeDistance = 50

// 其他状态
const originalViewerVisible = ref(false)
const correctionViewerVisible = ref(false)
const menuVisible = ref(false)
const uploadVisible = ref(false)
const confirmVisible = ref(false)
const pendingUploadFile = ref<File | null>(null)

// Getters
const firstOriginalImage = computed(() => correctionStore.firstOriginalImage)
const allCorrectionImages = computed(() => correctionStore.allCorrectionImages)
const hasAnyCorrection = computed(() => correctionStore.hasAnyCorrection)
const isLoading = computed(() => correctionStore.isLoading)
const uploadConfig = computed(() => correctionStore.uploadConfig)

// 查看器图片数据
const originalImagesForViewer = computed(() => {
  const img = firstOriginalImage.value
  return img ? [{ id: img.filename, url: img.url }] : []
})

const correctionImagesForViewer = computed(() => {
  return allCorrectionImages.value.map(img => ({
    id: img.id,
    url: img.url,
    filename: img.filename
  }))
})

// 菜单配置
const menuActions = computed<ActionItem[]>(() => {
  const actions: ActionItem[] = [
    { key: 'view', label: '全屏查看', icon: 'fas fa-expand', color: '#3b82f6' },
    { key: 'import', label: '导入图片', icon: 'fas fa-image', color: '#10b981' },
  ]
  
  if (allCorrectionImages.value.length > 0) {
    actions.push({ key: 'delete', label: '删除当前', icon: 'fas fa-trash', color: '#ef4444' })
  }
  
  return actions
})

// 确认消息
const confirmMessage = computed(() => {
  const hasQuestion = correctionStore.questionLevelCorrections.length > 0
  const hasPaper = correctionStore.paperLevelCorrections.length > 0
  
  if (hasQuestion && hasPaper) {
    return '已存在订正，确认继续添加？'
  } else if (hasQuestion) {
    return '已存在题目级订正，确认继续添加？'
  } else {
    return '已存在试卷级订正，确认继续添加？'
  }
})

// 监听题目变化
watch(() => props.questionUuid, async (newUuid) => {
  if (newUuid && props.paperId) {
    await correctionStore.loadImages(props.paperId, newUuid)
    currentPage.value = 0 // 重置到订正页
  }
}, { immediate: true })

// 触摸处理 - 优化版，防止图片拖拽时误触页面切换
let touchStartTime = 0
let isMultiTouch = false

function handleTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0].clientY
  touchStartTime = Date.now()
  // 检测是否多指触摸（2个及以上手指，用于缩放/旋转）
  isMultiTouch = e.touches.length > 1
}

function handleTouchMove(e: TouchEvent) {
  // 如果是多指触摸，不阻止默认行为（让子组件处理缩放）
  if (isMultiTouch) return
  
  // 阻止默认滚动
  if (e.cancelable) {
    e.preventDefault()
  }
}

function handleTouchEnd(e: TouchEvent) {
  // 如果是多指触摸，不执行页面切换
  if (isMultiTouch) {
    isMultiTouch = false
    return
  }
  
  touchEndY = e.changedTouches[0].clientY
  const diff = touchStartY - touchEndY
  const duration = Date.now() - touchStartTime
  
  // 只有快速滑动（小于300ms）才触发页面切换，慢速拖拽不切换
  if (Math.abs(diff) > minSwipeDistance && duration < 300) {
    if (diff > 0) {
      // 向上滑，切换到原题页
      currentPage.value = 1
    } else {
      // 向下滑，切换到订正页
      currentPage.value = 0
    }
  }
}

// 方法
function openOriginalViewer() {
  if (!firstOriginalImage.value) return
  originalViewerVisible.value = true
}

function openCorrectionViewer() {
  if (!hasAnyCorrection.value) return
  correctionViewerVisible.value = true
}

function showActionMenu() {
  menuVisible.value = true
}

function showUploadDialog() {
  uploadVisible.value = true
}

async function handleMenuSelect(key: string) {
  switch (key) {
    case 'view':
      openCorrectionViewer()
      break
    case 'import':
      showUploadDialog()
      break
    case 'delete':
      await deleteCurrentImage()
      break
  }
}

async function deleteCurrentImage() {
  const images = allCorrectionImages.value
  if (images.length === 0) return
  
  try {
    await correctionStore.deleteCorrection(props.paperId, images[0].filename)
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败，请重试')
  }
}

async function handleUpload(file: File) {
  if (hasAnyCorrection.value) {
    pendingUploadFile.value = file
    confirmVisible.value = true
    return
  }
  
  await doUpload(file)
}

async function proceedUpload() {
  if (pendingUploadFile.value) {
    await doUpload(pendingUploadFile.value)
    pendingUploadFile.value = null
  }
}

async function doUpload(file: File) {
  try {
    const success = await correctionStore.uploadCorrection(
      props.paperId,
      [file],
      props.questionUuid
    )
    
    if (success) {
      uploadVisible.value = false
    } else {
      alert('上传失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    alert('上传失败，请重试')
  }
}
</script>
