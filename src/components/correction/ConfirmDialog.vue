<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      @click.self="cancel"
    >
      <div class="bg-gray-800 rounded-xl w-full max-w-sm overflow-hidden">
        <!-- 标题 -->
        <div class="px-4 py-4 text-center">
          <div v-if="type === 'warning'" class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>
          </div>
          <div v-else-if="type === 'error'" class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-times-circle text-red-500 text-xl"></i>
          </div>
          <div v-else class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-question-circle text-blue-500 text-xl"></i>
          </div>
          
          <h3 class="text-white font-medium text-lg">{{ title }}</h3>
        </div>

        <!-- 消息 -->
        <div class="px-4 pb-4 text-center">
          <p class="text-gray-300 text-sm">{{ message }}</p>
        </div>

        <!-- 按钮 -->
        <div class="flex gap-2 px-4 py-3 border-t border-gray-700">
          <button
            @click="cancel"
            class="flex-1 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600"
          >
            {{ cancelText }}
          </button>
          <button
            @click="confirm"
            class="flex-1 py-2 rounded-lg text-white text-sm"
            :class="buttonClass"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  title?: string
  message: string
  type?: 'info' | 'warning' | 'error'
  confirmText?: string
  cancelText?: string
}>(), {
  title: '提示',
  type: 'info',
  confirmText: '确认',
  cancelText: '取消'
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: []
}>()

const buttonClass = computed(() => {
  switch (props.type) {
    case 'warning':
      return 'bg-yellow-600 hover:bg-yellow-500'
    case 'error':
      return 'bg-red-600 hover:bg-red-500'
    default:
      return 'bg-blue-600 hover:bg-blue-500'
  }
})

function cancel() {
  emit('update:visible', false)
}

function confirm() {
  emit('confirm')
  cancel()
}
</script>
