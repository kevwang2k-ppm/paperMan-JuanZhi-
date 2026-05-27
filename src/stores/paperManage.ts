import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { paperApi } from '@/api/paper'
import type { Paper } from '@/types'

export const usePaperManageStore = defineStore('paperManage', () => {
  // ============ State ============
  const renamingPaper = ref<Paper | null>(null)
  const deletingPaper = ref<Paper | null>(null)
  const restoringPaper = ref<Paper | null>(null)
  const clearingPaper = ref<Paper | null>(null)
  const isLoading = ref(false)

  // ============ Getters ============
  const isRenameDialogVisible = computed(() => !!renamingPaper.value)
  const isDeleteConfirmVisible = computed(() => !!deletingPaper.value)
  const isRestoreConfirmVisible = computed(() => !!restoringPaper.value)
  const isClearConfirmVisible = computed(() => !!clearingPaper.value)

  // ============ Actions ============
  
  // 显示重命名对话框
  function showRenameDialog(paper: Paper) {
    renamingPaper.value = paper
  }

  // 隐藏重命名对话框
  function hideRenameDialog() {
    renamingPaper.value = null
  }

  // 显示删除确认
  function showDeleteConfirm(paper: Paper) {
    deletingPaper.value = paper
  }

  // 隐藏删除确认
  function hideDeleteConfirm() {
    deletingPaper.value = null
  }

  // 显示恢复确认
  function showRestoreConfirm(paper: Paper) {
    restoringPaper.value = paper
  }

  // 隐藏恢复确认
  function hideRestoreConfirm() {
    restoringPaper.value = null
  }

  // 显示清除确认
  function showClearConfirm(paper: Paper) {
    clearingPaper.value = paper
  }

  // 隐藏清除确认
  function hideClearConfirm() {
    clearingPaper.value = null
  }

  // 重命名
  async function renamePaper(newName: string): Promise<boolean> {
    if (!renamingPaper.value) return false
    
    isLoading.value = true
    try {
      await paperApi.renamePaper(renamingPaper.value.id, newName)
      renamingPaper.value = null
      return true
    } finally {
      isLoading.value = false
    }
  }

  // 删除 (软删除或物理删除)
  async function deletePaper(paper?: Paper): Promise<boolean> {
    const targetPaper = paper || deletingPaper.value
    if (!targetPaper) return false
    
    console.log('[DEBUG] store.deletePaper:', targetPaper.id, targetPaper.status)
    isLoading.value = true
    try {
      const response = await paperApi.deletePaper(targetPaper.id)
      console.log('[DEBUG] deletePaper API 响应:', response)
      deletingPaper.value = null
      return true
    } finally {
      isLoading.value = false
    }
  }

  // 恢复
  async function restorePaper(paper?: Paper): Promise<boolean> {
    const targetPaper = paper || restoringPaper.value
    if (!targetPaper) return false
    
    isLoading.value = true
    try {
      await paperApi.restorePaper(targetPaper.id)
      restoringPaper.value = null
      return true
    } finally {
      isLoading.value = false
    }
  }

  // 物理删除
  async function permanentDelete(paper?: Paper): Promise<boolean> {
    const targetPaper = paper || clearingPaper.value
    if (!targetPaper) return false
    
    isLoading.value = true
    try {
      await paperApi.permanentDeletePaper(targetPaper.id)
      clearingPaper.value = null
      return true
    } finally {
      isLoading.value = false
    }
  }

  return {
    // state
    renamingPaper,
    deletingPaper,
    restoringPaper,
    clearingPaper,
    isLoading,
    
    // getters
    isRenameDialogVisible,
    isDeleteConfirmVisible,
    isRestoreConfirmVisible,
    isClearConfirmVisible,
    
    // actions
    showRenameDialog,
    hideRenameDialog,
    showDeleteConfirm,
    hideDeleteConfirm,
    showRestoreConfirm,
    hideRestoreConfirm,
    showClearConfirm,
    hideClearConfirm,
    renamePaper,
    deletePaper,
    restorePaper,
    permanentDelete
  }
})
