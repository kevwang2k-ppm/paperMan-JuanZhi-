<template>
  <Teleport to="body">
    <div v-if="visible" class="rename-dialog-overlay" @click="handleCancel">
      <div class="rename-dialog" @click.stop>
        <div class="dialog-header">重命名试卷</div>
        <div class="dialog-body">
          <input 
            ref="inputRef"
            v-model="newName" 
            type="text" 
            class="name-input"
            placeholder="请输入新名称"
            @keyup.enter="handleConfirm"
          />
          <div v-if="error" class="error-message">{{ error }}</div>
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="handleCancel">取消</button>
          <button 
            class="btn-confirm" 
            :disabled="!newName.trim() || newName.trim() === currentName"
            @click="handleConfirm"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  visible: boolean
  currentName: string
}>()

const emit = defineEmits<{
  confirm: [name: string]
  cancel: []
}>()

const newName = ref('')
const error = ref('')
const inputRef = ref<HTMLInputElement>()

watch(() => props.visible, (val) => {
  if (val) {
    newName.value = props.currentName.replace(/\$\.DEL$/, '')
    error.value = ''
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  }
})

function handleConfirm() {
  const name = newName.value.trim()
  
  // 调试：打印每个字符的编码
  console.log('[RenameDialog] 输入内容:', name)
  console.log('[RenameDialog] 字符详情:')
  for (let i = 0; i < name.length; i++) {
    const char = name[i]
    const code = char.charCodeAt(0).toString(16).toUpperCase()
    console.log(`  [${i}] '${char}' = U+${code.padStart(4, '0')}`)
  }
  
  // 验证
  if (!name) {
    error.value = '名称不能为空'
    return
  }
  
  // 检查 URL 不安全字符（与后端保持一致）
  // 注意：包括半角 ? (U+003F) 和全角 ？ (U+FF1F)
  const invalidChars = '?#&'  // 半角
  const invalidCharsFull = '？＃＆'  // 全角
  const found: string[] = []
  
  for (const char of invalidChars) {
    if (name.includes(char)) {
      found.push(char)
      console.log(`[RenameDialog] 发现半角非法字符: '${char}' (U+003F)`)
    }
  }
  for (const char of invalidCharsFull) {
    if (name.includes(char)) {
      found.push(char)
      console.log(`[RenameDialog] 发现全角非法字符: '${char}'`)
    }
  }
  
  if (found.length > 0) {
    error.value = `名称不能包含以下字符: ${found.join(', ')}`
    console.log('[RenameDialog] 校验失败，发现非法字符:', found)
    return
  }
  
  if (name === props.currentName.replace(/\$\.DEL$/, '')) {
    handleCancel()
    return
  }
  
  emit('confirm', name)
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped>
.rename-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.rename-dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 320px;
  overflow: hidden;
}

.dialog-header {
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-body {
  padding: 16px;
}

.name-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.name-input:focus {
  border-color: #3b82f6;
}

.error-message {
  margin-top: 8px;
  color: #ef4444;
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  border-top: 1px solid #e5e7eb;
}

.dialog-footer button {
  flex: 1;
  padding: 14px;
  border: none;
  background: none;
  font-size: 16px;
  cursor: pointer;
}

.btn-cancel {
  color: #6b7280;
  border-right: 1px solid #e5e7eb;
}

.btn-confirm {
  color: #3b82f6;
  font-weight: 500;
}

.btn-confirm:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}
</style>
