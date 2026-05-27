<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- 顶部导航 -->
    <header class="bg-white safe-area-top shadow-sm z-10">
      <div class="flex items-center justify-between px-4 py-3">
        <button @click="$router.back()" class="p-2 -ml-2 text-gray-600">
          <i class="fas fa-chevron-left"></i>
        </button>
        <h1 class="text-lg font-semibold text-gray-800">创建新试卷</h1>
        <button class="p-2 -mr-2 text-blue-600 font-medium">帮助</button>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="flex-1 overflow-y-auto">
      <!-- 步骤指示器 -->
      <StepIndicator :current-step="currentStep" :steps="steps" />

      <!-- 学生选择 -->
      <section class="bg-white mt-3 px-4 py-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-user-graduate mr-2 text-blue-500"></i>选择学生
        </label>
        
        <!-- 无学生提示 -->
        <div v-if="studentStore.studentOptions.length === 0" class="p-4 bg-yellow-50 rounded-xl text-center">
          <i class="fas fa-exclamation-circle text-yellow-500 text-xl mb-2"></i>
          <p class="text-sm text-yellow-700">暂无学生数据</p>
          <p class="text-xs text-yellow-600 mt-1">请先在桌面端添加学生</p>
        </div>
        
        <!-- 学生下拉框 -->
        <select 
          v-else
          v-model="selectedStudent"
          :disabled="showEdgeDetection"
          class="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :class="{ 'opacity-50': showEdgeDetection }"
        >
          <option value="">请选择学生</option>
          <option v-for="student in studentStore.studentOptions" :key="student.value" :value="student.value">
            {{ student.label }} ({{ student.value }})
          </option>
        </select>
        
        <!-- 选中后显示学生ID -->
        <div v-if="selectedStudent" class="mt-2 flex items-center text-sm text-gray-600">
          <i class="fas fa-id-card mr-2 text-gray-400"></i>
          <span>学生ID: <span class="font-medium text-gray-800">{{ selectedStudent }}</span></span>
        </div>
      </section>

      <!-- 合并模式开关 -->
      <section class="bg-white mt-3 px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <label class="text-sm font-medium text-gray-700 flex items-center">
              <i class="fas fa-object-group mr-2 text-blue-500"></i>合并模式
            </label>
            <p class="text-xs text-gray-500 mt-1">
              每2张图片合并处理，减少API调用次数
            </p>
          </div>
          <button 
            @click="toggleMergeMode"
            :disabled="edgeDetectionStore.isDetecting"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :class="mergeMode ? 'bg-blue-600' : 'bg-gray-300'"
          >
            <span 
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="mergeMode ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </section>

      <!-- 图像增强开关 -->
      <section class="bg-white mt-3 px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <label class="text-sm font-medium text-gray-700 flex items-center">
              <i class="fas fa-magic mr-2 text-purple-500"></i>图像增强
            </label>
            <p class="text-xs text-gray-500 mt-1">
              OTSU二值化处理，提升手写去除效果
            </p>
          </div>
          <button 
            @click="toggleImageEnhance"
            :disabled="edgeDetectionStore.isDetecting"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            :class="imageEnhance ? 'bg-purple-600' : 'bg-gray-300'"
          >
            <span 
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="imageEnhance ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </section>

      <!-- ========== 边缘检测状态栏（检测完成后显示） ========== -->
      <section v-if="showEdgeDetection" class="bg-blue-50 mt-3 px-4 py-3 border-l-4 border-blue-500">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <i v-if="edgeDetectionStore.isDetecting" class="fas fa-circle-notch fa-spin text-blue-600 mr-2"></i>
            <i v-else class="fas fa-check-circle text-blue-600 mr-2"></i>
            <span class="text-sm font-medium text-blue-800">
              {{ edgeDetectionStore.isDetecting ? '边缘检测中...' : '边缘检测完成' }}
            </span>
            <span v-if="!edgeDetectionStore.isDetecting" class="text-xs text-blue-600 ml-2">
              ({{ edgeDetectionStore.detectedCount }}/{{ edgeDetectionStore.images.length }} 张)
            </span>
          </div>
          <button class="text-xs text-blue-600 underline" @click="showTips = true">
            如何调整？
          </button>
        </div>
        <p v-if="!edgeDetectionStore.isDetecting" class="text-xs text-blue-600 mt-1">
          点击缩略图可编辑四角位置，已自动识别试卷边缘
          <span v-if="edgeDetectionStore.defaultCornersCount > 0" class="text-orange-600 ml-1">
            ({{ edgeDetectionStore.defaultCornersCount }} 张需要调整)
          </span>
        </p>
      </section>

      <!-- ========== 图片网格 ========== -->
      <section class="bg-white mt-3 px-4 py-4">
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-medium text-gray-700">
            <i class="fas fa-images mr-2 text-blue-500"></i>试卷图片
          </label>
          <span class="text-xs text-gray-500">
            已选择 <span class="font-medium text-blue-600">{{ displayImages.length }}</span>/40 张
          </span>
        </div>

        <!-- 空状态 -->
        <div v-if="displayImages.length === 0" class="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
          <div class="w-20 h-20 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
            <i class="fas fa-cloud-upload-alt text-3xl text-blue-500"></i>
          </div>
          <p class="text-gray-600 mb-2">点击下方按钮添加试卷图片</p>
          <p class="text-xs text-gray-400">支持拍照或从相册选择，最多40张</p>
        </div>

        <!-- 图片网格 - 带边缘检测覆盖层（支持拖拽排序） -->
        <div 
          v-else 
          ref="imageGridRef"
          class="grid grid-cols-3 gap-3"
        >
          <!-- 拖拽提示 -->
          <div v-if="displayImages.length > 1" class="col-span-3 mb-1 text-xs text-gray-500 flex items-center">
            <i class="fas fa-hand-pointer mr-1"></i>
            <span>长按缩略图可调整顺序（快速滑动滚动页面）</span>
          </div>
          <div
            v-for="(image, index) in displayImages"
            :key="`${image.id}-${index}`"
            :data-image-index="index"
            class="relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm bg-white group cursor-move"
            :class="{
              'detecting-pulse border-2 border-blue-500': image.isDetecting,
              'border-2 border-orange-400': image.isDefault,
              'opacity-50 scale-95': dragIndex === index,
              'ring-2 ring-blue-400': dropIndex === index && dragIndex !== index,
              'dragging': dragIndex === index
            }"
            draggable="true"
            @click="handleImageClick(index)"
            @dragstart="handleDragStart($event, index)"
            @dragenter="handleDragEnter($event, index)"
            @dragover.prevent="handleDragOver"
            @dragleave="handleDragLeave"
            @drop.prevent="handleDrop($event, index)"
            @dragend="handleDragEnd"
            @touchstart="handleTouchStart($event, index)"
            @touchmove="handleTouchMove($event, index)"
            @touchend="handleTouchEnd($event, index)"
          >
            <!-- 缩略图 -->
            <img 
              :src="image.preview" 
              class="w-full h-full object-cover pointer-events-none" 
              :class="{ 'opacity-50': image.isDetecting }"
              draggable="false"
            >
            
            <!-- 边缘检测覆盖层（检测完成后显示） -->
            <!-- 使用 xMidYMid slice 保持与 object-cover 一致的裁剪行为 -->
            <svg
              v-if="image.corners && !image.isDetecting"
              class="absolute inset-0 w-full h-full corner-overlay pointer-events-none"
              :viewBox="`0 0 ${image.width} ${image.height}`"
              preserveAspectRatio="xMidYMid slice"
            >
              <!-- 定义滤镜：发光阴影效果 -->
              <defs>
                <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glow-orange" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <!-- 半透明遮罩 - 更深的遮罩使区域更突出 -->
              <polygon
                :points="getMaskPoints(image)"
                fill="rgba(0,0,0,0.5)"
                fill-rule="evenodd"
              />
              
              <!-- 四边形边框 - 更高透明度填充和发光效果 -->
              <polygon
                :points="getCornerPoints(image)"
                :fill="image.isDefault ? 'rgba(249,115,22,0.4)' : 'rgba(59,130,246,0.45)'"
                :stroke="image.isDefault ? '#F97316' : '#3B82F6'"
                stroke-width="4"
                :stroke-dasharray="image.isDefault ? '5,5' : ''"
                :filter="image.isDefault ? 'url(#glow-orange)' : 'url(#glow-blue)'"
                class="corner-polygon"
              />
              
              <!-- 四角控制点 - 更大更醒目 -->
              <circle
                v-for="(corner, idx) in image.cornersArray"
                :key="idx"
                :cx="corner[0]"
                :cy="corner[1]"
                r="4"
                :fill="image.isDefault ? '#F97316' : '#3B82F6'"
                stroke="white"
                stroke-width="2"
                :filter="image.isDefault ? 'url(#glow-orange)' : 'url(#glow-blue)'"
                class="corner-point"
              />
            </svg>

            <!-- 检测中提示 -->
            <div v-if="image.isDetecting" class="absolute inset-0 flex flex-col items-center justify-center">
              <i class="fas fa-circle-notch fa-spin text-blue-600 text-xl mb-1"></i>
              <span class="text-xs text-blue-600 font-medium">检测中...</span>
            </div>
            
            <!-- 页码 -->
            <div class="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
              {{ index + 1 }}
            </div>
            
            <!-- 不支持格式警告（左下角，带文件类型提示） -->
            <div 
              v-if="!showEdgeDetection && image.isSupported === false"
              class="absolute bottom-1 left-1 flex items-center gap-1 z-20"
            >
              <div class="w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-exclamation-triangle text-[10px]"></i>
              </div>
              <span class="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded whitespace-nowrap">
                不支持{{ image.fileExt || image.fileType.split('/')[1] || '' }}文件
              </span>
            </div>

            <!-- 拖拽中指示器 -->
            <div 
              v-if="dragIndex === index" 
              class="absolute inset-0 flex items-center justify-center bg-blue-500/20 z-10"
            >
              <div class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                <i class="fas fa-arrows-alt"></i>
              </div>
            </div>

            <!-- 警告标识（默认四角） -->
            <div
              v-if="image.isDefault && !image.isDetecting"
              class="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center"
            >
              <i class="fas fa-exclamation-triangle mr-1 text-xs"></i>
              需调整
            </div>

            <!-- 编辑提示 -->
            <div
              v-if="image.corners && !image.isDetecting"
              class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5"
            >
              <span class="text-white text-xs">
                <i class="fas fa-edit mr-1"></i>点击编辑
              </span>
            </div>

            <!-- 删除按钮 -->
            <button
              class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              :class="{ 'opacity-100': !image.corners }"
              @click.stop="removeImage(index)"
            >
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>
      </section>

      <!-- 底部留白 -->
      <div class="h-24"></div>
    </main>

    <!-- 底部操作栏 -->
    <footer class="fixed bottom-0 left-0 right-0 bg-white border-t safe-area-bottom z-20">
      <!-- 初始状态：拍照/相册/下一步 -->
      <div v-if="!showEdgeDetection" class="flex items-center justify-around p-3">
        <button @click="takePhoto" class="flex flex-col items-center p-2" :disabled="isUploading">
          <div class="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
            <i class="fas fa-camera text-xl"></i>
          </div>
          <span class="text-xs text-gray-600 mt-1 font-medium">拍照</span>
        </button>

        <button @click="openGallery" class="flex flex-col items-center p-2" :disabled="isUploading">
          <div class="w-14 h-14 rounded-full bg-white border-2 border-blue-600 text-blue-600 flex items-center justify-center shadow">
            <i class="fas fa-images text-xl"></i>
          </div>
          <span class="text-xs text-gray-600 mt-1 font-medium">相册</span>
        </button>

        <button
          @click="startEdgeDetection"
          :disabled="!canStartEdgeDetection"
          class="flex-1 ml-4 py-3 px-6 rounded-xl font-medium text-sm transition-colors"
          :class="canStartEdgeDetection ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'"
        >
          <span v-if="isUploading">
            <i class="fas fa-spinner fa-spin mr-2"></i>上传中...
          </span>
          <span v-else>下一步</span>
        </button>
      </div>

      <!-- 边缘检测后：添加/确认处理 -->
      <div v-else class="flex items-center justify-between p-3">
        <button @click="addMoreImages" class="flex flex-col items-center p-2" :disabled="edgeDetectionStore.isDetecting || edgeDetectionStore.isCorrecting">
          <div class="w-12 h-12 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
            <i class="fas fa-plus text-lg"></i>
          </div>
          <span class="text-xs text-gray-600 mt-1">添加</span>
        </button>

        <button
          @click="startProcessing"
          :disabled="!canStartProcessing"
          class="flex-1 ml-4 py-3 px-6 rounded-xl font-medium text-sm transition-colors"
          :class="canStartProcessing ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'"
        >
          <span v-if="edgeDetectionStore.isCorrecting">
            <i class="fas fa-spinner fa-spin mr-2"></i>处理中...
          </span>
          <span v-else>确认并开始处理</span>
        </button>
      </div>
    </footer>

    <!-- 四角编辑弹窗 -->
    <ImageEditorModal v-if="edgeDetectionStore.currentEditingIndex !== null" />

    <!-- 提示弹窗 -->
    <div v-if="showTips" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="showTips = false">
      <div class="bg-white rounded-2xl w-full max-w-xs p-6 modal-enter">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <i class="fas fa-info-circle text-3xl text-blue-600"></i>
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">如何调整边缘？</h3>
          <div class="text-sm text-gray-600 text-left space-y-2">
            <p>1. 系统自动识别试卷四角，用<span class="text-blue-600 font-medium">蓝色四边形</span>标记</p>
            <p>2. 点击缩略图进入编辑模式</p>
            <p>3. 拖动四个角点调整到试卷实际边缘</p>
            <p>4. 点击"确认"保存调整</p>
            <p class="text-orange-600 mt-3"><i class="fas fa-exclamation-triangle mr-1"></i>橙色标记表示自动检测失败，需要手动调整</p>
          </div>
          <button @click="showTips = false" class="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-medium">
            知道了
          </button>
        </div>
      </div>
    </div>

    <!-- 不支持格式确认弹窗 -->
    <div v-if="showUnsupportedConfirm" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="cancelAndWaitForUser">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 modal-enter">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <i class="fas fa-exclamation-triangle text-3xl text-yellow-600"></i>
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">发现不支持的格式</h3>
          <p class="text-sm text-gray-600 mb-4">
            以下 {{ unsupportedFiles.length }} 个文件格式不支持，无法处理：
          </p>
          <div class="bg-gray-50 rounded-xl p-3 mb-4 max-h-32 overflow-y-auto text-left">
            <div v-for="(file, idx) in unsupportedFiles" :key="idx" class="text-sm text-gray-700 py-1 flex items-center">
              <i class="fas fa-file-image text-gray-400 mr-2"></i>
              {{ file.file.name }}
            </div>
          </div>
          <div class="text-xs text-gray-500 mb-6">
            支持的格式：JPG、PNG、BMP、WebP
          </div>
          <div class="space-y-2">
            <button 
              @click="removeUnsupportedAndContinue" 
              class="w-full py-3 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition-colors"
            >
              移除不支持的文件并继续
            </button>
            <button 
              @click="cancelAndWaitForUser" 
              class="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              返回处理
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入（限制为支持的图片格式） -->
    <input ref="cameraInput" type="file" accept="image/jpeg,image/jpg,image/png,image/bmp,image/webp" capture="environment" class="hidden" @change="handleFileChange">
    <input ref="galleryInput" type="file" accept="image/jpeg,image/jpg,image/png,image/bmp,image/webp" multiple class="hidden" @change="handleFileChange">
    <input ref="addInput" type="file" accept="image/jpeg,image/jpg,image/png,image/bmp,image/webp" multiple class="hidden" @change="handleAddFileChange">
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStudentStore, useEdgeDetectionStore, useBatchStore } from '@/stores'
import StepIndicator from '@/components/common/StepIndicator.vue'
import ImageEditorModal from '@/components/edgeDetection/ImageEditorModal.vue'

const router = useRouter()
const studentStore = useStudentStore()
const edgeDetectionStore = useEdgeDetectionStore()
const batchStore = useBatchStore()

// ========== 状态 ==========
const selectedStudent = ref('')
const mergeMode = ref(false)
const imageEnhance = ref(false)
const showEdgeDetection = ref(false)
const isUploading = ref(false)
const showTips = ref(false)

// 初始上传的图片列表（带格式支持状态）
interface InitialImage {
  file: File
  id: string
  isSupported: boolean
}
const initialImages = ref<InitialImage[]>([])

// 拖拽排序状态
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)
const isDragging = ref(false) // 是否正在拖拽（桌面端+移动端通用）

// 触摸拖拽状态
const touchStartY = ref(0)
const touchStartX = ref(0)
const touchItemHeight = ref(0)
const isTouchDragging = ref(false)
const touchStartTime = ref(0)
const touchCandidateIndex = ref<number | null>(null) // 候选拖拽索引（未确认前不显示）

// 文件输入引用
const cameraInput = ref<HTMLInputElement>()
const galleryInput = ref<HTMLInputElement>()
const addInput = ref<HTMLInputElement>()
const imageGridRef = ref<HTMLDivElement>()

// ========== 计算属性 ==========

// 当前步骤
const currentStep = computed(() => showEdgeDetection.value ? 2 : 1)
const steps = ['上传', '调整边缘', '处理', '审阅']

// 显示的图片列表
const displayImages = computed(() => {
  if (showEdgeDetection.value) {
    // 边缘检测模式：使用 store 中的图片
    return edgeDetectionStore.images.map(img => ({
      id: img.image_id,
      preview: img.thumbnailUrl || '',
      width: img.image_size.width,
      height: img.image_size.height,
      corners: img.corners,
      cornersArray: img.corners ? [
        img.corners.tl,
        img.corners.tr,
        img.corners.br,
        img.corners.bl
      ] : null,
      isDefault: img.is_default,
      isDetecting: false
    }))
  } else {
    // 初始模式：使用本地文件预览
    return initialImages.value.map((item, idx) => ({
      id: item.id,
      preview: URL.createObjectURL(item.file),
      width: 300,
      height: 400,
      corners: null,
      cornersArray: null,
      isDefault: false,
      isDetecting: false,
      isSupported: item.isSupported,  // 传递支持状态
      fileType: item.file.type || '',  // 文件类型
      fileExt: item.file.name.split('.').pop()?.toUpperCase() || ''  // 文件扩展名
    }))
  }
})

// 是否可以开始边缘检测
const canStartEdgeDetection = computed(() =>
  initialImages.value.length > 0 &&
  selectedStudent.value &&
  !isUploading.value
)

// 是否可以开始处理
const canStartProcessing = computed(() =>
  edgeDetectionStore.images.length > 0 &&
  !edgeDetectionStore.isDetecting &&
  !edgeDetectionStore.isCorrecting
)

// ========== 方法 ==========

// 拖拽排序 - 开始拖拽
function handleDragStart(e: DragEvent, index: number) {
  console.log('[DragDrop] dragstart:', index)
  dragIndex.value = index
  isDragging.value = true
  // 设置拖拽效果
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    // 设置拖拽图像
    const target = e.target as HTMLElement
    if (target) {
      e.dataTransfer.setDragImage(target, 50, 50)
    }
  }
}

// 拖拽排序 - 进入目标
function handleDragEnter(e: DragEvent, index: number) {
  e.preventDefault()
  console.log('[DragDrop] dragenter:', index, 'dragIndex:', dragIndex.value)
  if (dragIndex.value === null || dragIndex.value === index) return
  dropIndex.value = index
}

// 拖拽排序 - 拖拽经过
function handleDragOver(e: DragEvent) {
  e.preventDefault()
  // 添加调试日志（每10次输出一次避免刷屏）
  if (Math.random() < 0.05) {
    console.log('[DragDrop] dragover')
  }
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

// 拖拽排序 - 离开目标
function handleDragLeave() {
  // 不立即清除，让 dragenter 控制切换
}

// 拖拽排序 - 放置
function handleDrop(e: DragEvent, index: number) {
  e.preventDefault()
  console.log('[DragDrop] handleDrop called:', { dragIndex: dragIndex.value, dropIndex: index })
  
  if (dragIndex.value === null || dragIndex.value === index) {
    dragIndex.value = null
    dropIndex.value = null
    return
  }
  
  const fromIndex = dragIndex.value
  const toIndex = index
  
  // 执行排序
  if (showEdgeDetection.value) {
    console.log('[DragDrop] Reordering edge detection images:', fromIndex, '->', toIndex)
    edgeDetectionStore.reorderImages(fromIndex, toIndex)
  } else {
    console.log('[DragDrop] Reordering initial images:', fromIndex, '->', toIndex)
    const [moved] = initialImages.value.splice(fromIndex, 1)
    initialImages.value.splice(toIndex, 0, moved)
  }
  
  // 重置状态
  dragIndex.value = null
  dropIndex.value = null
}

// 拖拽排序 - 结束拖拽
function handleDragEnd() {
  console.log('[DragDrop] dragend')
  dragIndex.value = null
  dropIndex.value = null
  isDragging.value = false
}

// ========== 触摸排序（移动端支持）==========
const DRAG_THRESHOLD = 20    // 移动超过20px视为拖拽（增大避免误触发）
const DRAG_DELAY = 350       // 长按350ms后触发拖拽
const SCROLL_THRESHOLD = 10  // 滚动阈值，超过此值视为滚动意图
let touchTimer: number | null = null
let isScrolling = false      // 是否在滚动中

function handleTouchStart(e: TouchEvent, index: number) {
  const touch = e.touches[0]
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
  touchStartTime.value = Date.now()
  isScrolling = false
  touchCandidateIndex.value = index  // 记录候选索引，但不立即设置 dragIndex
  
  // 计算项目高度（用于判断滑动到哪个位置）
  const target = e.currentTarget as HTMLElement
  if (target) {
    const rect = target.getBoundingClientRect()
    touchItemHeight.value = rect.height + 12 // 包含 gap
  }
  
  // 设置定时器，长按后触发拖拽模式
  touchTimer = window.setTimeout(() => {
    if (touchCandidateIndex.value === index && !isScrolling) {
      // 长按超时，确认进入拖拽模式
      dragIndex.value = index
      isTouchDragging.value = true
      isDragging.value = true
      console.log('[TouchDrag] 长按超时，进入拖拽模式，index:', index)
      // 触发震动反馈（如果支持）
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }, DRAG_DELAY)
}

function handleTouchMove(e: TouchEvent, index: number) {
  if (!e.touches || e.touches.length === 0) return
  
  const touch = e.touches[0]
  const deltaX = Math.abs(touch.clientX - touchStartX.value)
  const deltaY = Math.abs(touch.clientY - touchStartY.value)
  
  // 判断用户意图：如果主要在Y轴移动（垂直方向），视为滚动意图
  if (!isTouchDragging.value && !isScrolling) {
    // 垂直移动明显大于水平移动 = 滚动意图
    if (deltaY > SCROLL_THRESHOLD && deltaY > deltaX * 1.5) {
      // 用户想要滚动，取消拖拽定时器
      isScrolling = true
      touchCandidateIndex.value = null
      if (touchTimer) {
        clearTimeout(touchTimer)
        touchTimer = null
      }
      console.log('[TouchDrag] 检测到滚动意图，取消拖拽')
      return  // 不阻止默认行为，允许滚动
    }
    
    // 水平移动超过阈值（且水平 > 垂直）= 拖拽意图
    if (deltaX > DRAG_THRESHOLD && deltaX > deltaY) {
      if (touchTimer) {
        clearTimeout(touchTimer)
        touchTimer = null
      }
      // 确认进入拖拽模式
      dragIndex.value = touchCandidateIndex.value
      isTouchDragging.value = true
      isDragging.value = true
      console.log('[TouchDrag] 水平移动超过阈值，进入拖拽模式')
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }
  
  // 只有在拖拽模式下才处理
  if (!isTouchDragging.value || dragIndex.value === null) return
  
  // 阻止页面滚动（检查 cancelable 避免报错）
  if (e.cancelable) {
    e.preventDefault()
  }
  
  // 使用 elementsFromPoint 精确定位手指下方的元素
  const elements = document.elementsFromPoint(touch.clientX, touch.clientY)
  let targetIndex: number | null = null
  
  // 遍历元素找到图片项
  for (const el of elements) {
    const item = el.closest('[data-image-index]')
    if (item) {
      const idx = parseInt(item.getAttribute('data-image-index') || '-1', 10)
      if (idx >= 0 && idx !== dragIndex.value) {
        targetIndex = idx
        break
      }
    }
  }
  
  // 如果找到目标位置且不是当前拖拽项，更新 dropIndex
  if (targetIndex !== null && targetIndex !== dropIndex.value) {
    dropIndex.value = targetIndex
    console.log('[TouchDrag] New drop index:', targetIndex)
  }
}

function handleTouchEnd(e: TouchEvent, index: number) {
  console.log('[TouchDrag] touchend, dragIndex:', dragIndex.value, 'dropIndex:', dropIndex.value, 'isDragging:', isTouchDragging.value)
  
  // 清除定时器
  if (touchTimer) {
    clearTimeout(touchTimer)
    touchTimer = null
  }
  
  // 执行排序（如果处于拖拽模式且位置改变）
  if (isTouchDragging.value && dragIndex.value !== null && dropIndex.value !== null && dragIndex.value !== dropIndex.value) {
    console.log('[TouchDrag] Reordering:', dragIndex.value, '->', dropIndex.value)
    if (showEdgeDetection.value) {
      edgeDetectionStore.reorderImages(dragIndex.value, dropIndex.value)
    } else {
      const [moved] = initialImages.value.splice(dragIndex.value, 1)
      initialImages.value.splice(dropIndex.value, 0, moved)
    }
  }
  
  // 重置状态
  dragIndex.value = null
  dropIndex.value = null
  touchCandidateIndex.value = null
  isTouchDragging.value = false
  isDragging.value = false
  isScrolling = false
  touchStartX.value = 0
  touchStartY.value = 0
}

function toggleMergeMode() {
  mergeMode.value = !mergeMode.value
}

function toggleImageEnhance() {
  imageEnhance.value = !imageEnhance.value
}

function takePhoto() {
  cameraInput.value?.click()
}

function openGallery() {
  galleryInput.value?.click()
}

function addMoreImages() {
  addInput.value?.click()
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files)
    if (initialImages.value.length + files.length > 40) {
      alert('最多只能选择 40 张图片')
      return
    }
    // 检查文件类型并转换为带状态的对象
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/webp']
    const supportedExts = ['jpg', 'jpeg', 'png', 'bmp', 'webp']
    
    const newImages: InitialImage[] = files.map((file, idx) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const isSupported = supportedTypes.includes(file.type) || supportedExts.includes(ext)
      return {
        file,
        id: `initial_${Date.now()}_${idx}`,
        isSupported
      }
    })
    initialImages.value.push(...newImages)
    target.value = ''
  }
}

function handleAddFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files)
    // 逐个添加到 edge detection store
    files.forEach(async (file) => {
      try {
        await edgeDetectionStore.addImage(file)
      } catch (err) {
        console.error('添加图片失败:', err)
      }
    })
    target.value = ''
  }
}

function removeImage(index: number) {
  if (showEdgeDetection.value) {
    edgeDetectionStore.removeImage(index)
  } else {
    initialImages.value.splice(index, 1)
  }
}

function handleImageClick(index: number) {
  if (showEdgeDetection.value) {
    edgeDetectionStore.openEditor(index)
  }
}

// 开始边缘检测
// 不支持格式确认弹窗状态
const showUnsupportedConfirm = ref(false)
const unsupportedFiles = computed(() => 
  initialImages.value.filter(img => !img.isSupported)
)

async function startEdgeDetection() {
  if (!canStartEdgeDetection.value) return

  // 检查是否有不支持的文件
  const unsupported = unsupportedFiles.value
  if (unsupported.length > 0) {
    // 有不支持的文件，显示确认弹窗
    showUnsupportedConfirm.value = true
    return
  }

  // 没有不支持的文件，直接执行
  await doStartEdgeDetection()
}

async function doStartEdgeDetection() {
  isUploading.value = true

  try {
    // 过滤掉不支持的文件，只上传支持的
    const supportedImages = initialImages.value.filter(img => img.isSupported)
    const filesToUpload = supportedImages.map(img => img.file)
    
    // 初始化 edge detection store
    edgeDetectionStore.initBatch('', mergeMode.value, imageEnhance.value)

    // 上传并检测
    await edgeDetectionStore.uploadAndDetectImages(filesToUpload)

    // 显示边缘检测界面
    showEdgeDetection.value = true

  } catch (err) {
    console.error('上传检测失败:', err)
    alert('上传检测失败: ' + (err instanceof Error ? err.message : '未知错误'))
  } finally {
    isUploading.value = false
  }
}

// 移除不支持的文件并继续
function removeUnsupportedAndContinue() {
  // 移除不支持的文件
  initialImages.value = initialImages.value.filter(img => img.isSupported)
  showUnsupportedConfirm.value = false
  // 继续执行
  doStartEdgeDetection()
}

// 取消，返回等待用户处理
function cancelAndWaitForUser() {
  showUnsupportedConfirm.value = false
}

// 开始处理
async function startProcessing() {
  if (!canStartProcessing.value) return

  try {
    // 提交矫正
    await edgeDetectionStore.submitCorrection(undefined, selectedStudent.value)

    // 跳转到处理页面
    if (edgeDetectionStore.batchId) {
      // 重置 batchStore，确保新批次不受旧数据影响
      batchStore.reset()
      router.push(`/processing/${edgeDetectionStore.batchId}`)
    }
  } catch (err) {
    console.error('处理失败:', err)
    alert('处理失败: ' + (err instanceof Error ? err.message : '未知错误'))
  }
}

// 四角覆盖层坐标计算
function getCornerPoints(image: any): string {
  if (!image.cornersArray) return ''
  return image.cornersArray.map((p: number[]) => `${p[0]},${p[1]}`).join(' ')
}

function getMaskPoints(image: any): string {
  if (!image.cornersArray) return ''
  const corners = getCornerPoints(image)
  return `0,0 ${image.width},0 ${image.width},${image.height} 0,${image.height} 0,0 ${corners}`
}

onMounted(() => {
  studentStore.loadStudents()
  edgeDetectionStore.reset()
})
</script>

<style scoped>
/* 检测中动画 */
.detecting-pulse {
  animation: pulse-border 1.5s infinite;
}
@keyframes pulse-border {
  0%, 100% { border-color: #3B82F6; }
  50% { border-color: #93C5FD; }
}

/* 四边形覆盖层动画 */
.corner-overlay {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 四边形边框脉冲动画 - 吸引注意力 */
.corner-polygon {
  animation: pulse-glow 2s ease-in-out infinite;
  transform-origin: center;
}
@keyframes pulse-glow {
  0%, 100% { 
    opacity: 1;
    stroke-width: 4;
  }
  50% { 
    opacity: 0.8;
    stroke-width: 5;
  }
}

/* 四角控制点脉冲效果 */
.corner-point {
  animation: point-pulse 1.5s ease-in-out infinite;
}
@keyframes point-pulse {
  0%, 100% { 
    r: 4;
    opacity: 1;
  }
  50% { 
    r: 5;
    opacity: 0.9;
  }
}

/* 默认四角的图片 - 更突出的警告效果 */
.detecting-pulse {
  animation: pulse-border 1.5s infinite;
}
@keyframes pulse-border {
  0%, 100% { border-color: #3B82F6; }
  50% { border-color: #93C5FD; }
}

/* 弹窗动画 */
.modal-enter {
  animation: modalIn 0.3s ease-out;
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* 拖拽排序样式 */
.cursor-move {
  touch-action: pan-y; /* 允许垂直滚动，阻止默认水平滚动 */
  user-select: none;
  -webkit-user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.cursor-move:active {
  transform: scale(0.95);
}

/* 拖拽中状态：阻止所有触摸操作 */
.cursor-move.dragging {
  touch-action: none;
}

/* 拖拽中状态 */
.opacity-50.scale-95 {
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  z-index: 10;
}

/* 放置目标状态 */
.ring-2.ring-blue-400 {
  animation: pulse-ring 1s infinite;
}

@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3); }
}
</style>
