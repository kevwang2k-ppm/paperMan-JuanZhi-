<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-dialog-overlay" @click="handleCancel">
      <div class="confirm-dialog" @click.stop>
        <div class="dialog-header">{{ title }}</div>
        <div class="dialog-body">
          <p class="message">{{ message }}</p>
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="handleCancel">取消</button>
          <button 
            class="btn-confirm" 
            :class="confirmType"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  title: string
  message: string
  confirmText?: string
  confirmType?: 'primary' | 'danger' | 'warning'
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped>
.confirm-dialog-overlay {
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

.confirm-dialog {
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
  padding: 20px 16px;
}

.message {
  font-size: 14px;
  color: #374151;
  text-align: center;
  line-height: 1.5;
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
  font-weight: 500;
}

.btn-confirm.primary {
  color: #3b82f6;
}

.btn-confirm.danger {
  color: #ef4444;
}

.btn-confirm.warning {
  color: #f59e0b;
}
</style>
