<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      @click.self="close"
    >
      <div class="bg-gray-800 rounded-xl w-full max-w-sm overflow-hidden">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 class="text-white font-medium">添加订正图片</h3>
          <button @click="close" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- 内容 -->
        <div class="p-4 space-y-4">
          <!-- 文件选择区域 -->
          <div
            v-if="!selectedFile"
            class="space-y-3"
          >
            <!-- 拍照按钮 -->
            <button
              class="w-full border-2 border-dashed border-blue-600 rounded-lg p-4 text-center hover:bg-blue-600/10 transition-colors"
              @click="triggerCamera"
            >
              <i class="fas fa-camera text-2xl text-blue-500 mb-1"></i>
              <p class="text-blue-400 text-sm">拍照</p>
              <p class="text-blue-600/60 text-xs mt-0.5">调用摄像头拍摄</p>
            </button>
            
            <!-- 从相册选择按钮 -->
            <button
              class="w-full border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 hover:bg-gray-700/30 transition-colors"
              @click="triggerFileSelect"
            >
              <i class="fas fa-images text-2xl text-gray-500 mb-1"></i>
              <p class="text-gray-400 text-sm">从相册选择</p>
              <p class="text-gray-600 text-xs mt-0.5">支持 JPG、PNG 格式</p>
            </button>
          </div>

          <!-- 图片预览 -->
          <div v-else class="relative">
            <img
              :src="previewUrl"
              class="w-full h-48 object-contain rounded-lg bg-gray-900"
              alt="预览"
            />
            <button
              @click="clearFile"
              class="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full text-white flex items-center justify-center hover:bg-black/70"
            >
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>

          <!-- 隐藏的文件输入 -->
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
          />
          <!-- 摄像头输入 -->
          <input
            ref="cameraInput"
            type="file"
            accept="image/*"
            capture="environment"
            class="hidden"
            @change="handleFileChange"
          />

          <!-- "仅限本题"选项 -->
          <div class="bg-gray-700/50 rounded-lg p-3">
            <label class="flex items-start cursor-pointer">
              <input
                type="checkbox"
                :checked="onlyThisQuestion"
                @change="$emit('update:onlyThisQuestion', ($event.target as HTMLInputElement).checked)"
                class="mt-0.5 mr-2 w-4 h-4 rounded border-gray-500 text-blue-600 focus:ring-blue-500 bg-gray-600"
              />
              <div class="text-sm">
                <span class="text-gray-200">仅限本题</span>
                <p class="text-gray-500 text-xs mt-0.5">
                  {{ onlyThisQuestion ? '上传为题目级订正' : '上传为试卷级订正' }}
                </p>
              </div>
            </label>
          </div>

          <!-- 重复提示 -->
          <div v-if="existingCount > 0" class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
            <p class="text-yellow-400 text-xs flex items-center">
              <i class="fas fa-exclamation-triangle mr-2"></i>
              已存在 {{ existingCount }} 张订正图片
            </p>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 px-4 py-3 border-t border-gray-700">
          <button
            @click="close"
            class="flex-1 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600"
          >
            取消
          </button>
          <button
            @click="confirm"
            :disabled="!selectedFile"
            class="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认上传
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  onlyThisQuestion: boolean
  existingCount: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:onlyThisQuestion': [value: boolean]
  confirm: [file: File]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')

// 监听 visible 变化，关闭时清空
watch(() => props.visible, (val) => {
  if (!val) {
    clearFile()
  }
})

function triggerFileSelect() {
  fileInput.value?.click()
}

function triggerCamera() {
  cameraInput.value?.click()
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (file) {
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

function clearFile() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  selectedFile.value = null
  previewUrl.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function close() {
  emit('update:visible', false)
}

function confirm() {
  if (selectedFile.value) {
    emit('confirm', selectedFile.value)
    close()
  }
}
</script>
