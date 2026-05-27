<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
      @click.self="close"
    >
      <div class="bg-gray-800 rounded-xl overflow-hidden min-w-[200px] mx-4">
        <div class="px-4 py-3 border-b border-gray-700">
          <h3 class="text-white text-sm font-medium">订正图片</h3>
        </div>
        
        <div class="py-1">
          <button
            v-for="action in actions"
            :key="action.key"
            class="w-full px-4 py-3 flex items-center text-left hover:bg-gray-700 transition-colors"
            @click="select(action.key)"
          >
            <i :class="[action.icon, 'w-6 text-center mr-3']" :style="{ color: action.color || '#9ca3af' }"></i>
            <span class="text-gray-200 text-sm">{{ action.label }}</span>
          </button>
        </div>
        
        <div class="border-t border-gray-700 p-2">
          <button
            @click="close"
            class="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
export interface ActionItem {
  key: string
  label: string
  icon: string
  color?: string
}

const props = defineProps<{
  visible: boolean
  actions: ActionItem[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [key: string]
}>()

function close() {
  emit('update:visible', false)
}

function select(key: string) {
  emit('select', key)
  close()
}
</script>
