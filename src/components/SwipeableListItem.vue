<template>
  <div 
    class="swipeable-item"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- 背景层：操作按钮 -->
    <div class="actions-bg" :style="{ width: `${actionsWidth}px` }">
      <button 
        v-for="action in availableActions" 
        :key="action.type"
        :class="['action-btn', `btn-${action.type}`]"
        @click.stop="handleAction(action)"
      >
        {{ action.label }}
      </button>
    </div>
    
    <!-- 前景层：内容 -->
    <div 
      class="content-wrapper"
      :class="{ 'is-dragging': isDragging }"
      :style="{ transform: `translateX(${translateX}px)` }"
      @click="handleContentClick"
    >
      <div class="content-main">
        <div class="paper-header">
          <span class="status-tag" :class="paper.status">
            {{ getStatusLabel(paper.status) }}
          </span>
          <span class="page-count">{{ paper.total_pages }}页</span>
        </div>
        
        <h3 class="paper-name" :class="{ 'deleted': paper.status === 'deleted' }">
          {{ displayName }}
        </h3>
        
        <div class="paper-meta">
          <span v-if="paper.grade" class="grade">{{ paper.grade }}</span>
          <span v-if="paper.semester" class="semester">{{ paper.semester }}</span>
          <span v-if="paper.status === 'imported' && paper.error_count > 0" class="error-count">
            {{ paper.error_count }}错题/{{ paper.question_count }}题
          </span>
          <span v-else-if="paper.status === 'imported'" class="question-count">
            {{ paper.question_count }}题
          </span>
        </div>
        
        <div class="paper-time">
          {{ formatDate(paper.created_at) }}
        </div>
      </div>
      
      <!-- 右侧操作区 -->
      <div class="content-actions">
        <!-- 待导入状态：确认导入按钮 -->
        <template v-if="(paper.status === 'analyzing' || paper.status === 'analyzed') && !isCorrectionMode">
          <button 
            class="btn-action btn-import"
            @click.stop="handleContinueImport"
          >
            <i class="fas fa-clipboard-check"></i>
            确认导入
          </button>
        </template>
        
        <!-- 已导入状态：选择错题和错整 -->
        <template v-else-if="paper.status === 'imported'">
          <button 
            class="btn-action btn-review"
            @click.stop="handleReview"
          >
            <i class="fas fa-check-square"></i>
            选择错题
          </button>
          <button 
            class="btn-action btn-correction"
            :class="{ 'selected': isSelected }"
            @click.stop="handleAddToCorrection"
          >
            <i class="fas" :class="isSelected ? 'fa-check' : 'fa-plus'"></i>
            {{ isSelected ? `已选${selectedCount}题` : '选择错整' }}
          </button>
        </template>
        
        <!-- 已删除状态：显示恢复提示 -->
        <template v-else-if="paper.status === 'deleted'">
          <span class="deleted-hint">左滑恢复</span>
        </template>
        
        <!-- 箭头 -->
        <i v-else class="fas fa-chevron-right arrow"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Paper } from '@/types'

const props = defineProps<{
  paper: Paper
  isCorrectionMode?: boolean
  isSelected?: boolean
  selectedCount?: number
}>()

const emit = defineEmits<{
  click: [paper: Paper]
  rename: [paper: Paper]
  delete: [paper: Paper]
  restore: [paper: Paper]
  clear: [paper: Paper]
  'continue-import': [paper: Paper]
  review: [paper: Paper]
  'add-to-correction': [paper: Paper]
}>()

// 显示名称（去除 $.DEL 后缀）
const displayName = computed(() => {
  return props.paper.name.replace(/\$\.DEL$/, '')
})

// 根据状态获取可用操作
const availableActions = computed(() => {
  const actionMap: Record<string, Array<{type: string, label: string}>> = {
    'analyzing': [
      { type: 'delete', label: '删除' }
    ],
    'analyzed': [
      { type: 'delete', label: '删除' }
    ],
    'imported': [
      { type: 'rename', label: '重命名' },
      { type: 'delete', label: '删除' }
    ],
    'deleted': [
      { type: 'restore', label: '恢复' },
      { type: 'clear', label: '清除' }
    ]
  }
  return actionMap[props.paper.status] || []
})

// 计算操作按钮区域宽度
const actionsWidth = computed(() => {
  return availableActions.value.length * 80
})

// 滑动状态
const translateX = ref(0)
const startX = ref(0)
const isDragging = ref(false)

// 滑动阈值
const SWIPE_THRESHOLD = -60

// 获取状态标签
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'analyzing': '分析中',
    'analyzed': '待导入',
    'imported': '已导入',
    'deleted': '已删除'
  }
  return labels[status] || status
}

// 格式化时间
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 触摸事件处理
function handleTouchStart(e: TouchEvent) {
  startX.value = e.touches[0].clientX
  isDragging.value = true
}

function handleTouchMove(e: TouchEvent) {
  if (!isDragging.value) return
  
  const touchX = e.touches[0].clientX
  const diff = touchX - startX.value
  
  // 只允许向左滑动
  if (diff < 0) {
    // 限制最大滑动距离
    translateX.value = Math.max(diff, -actionsWidth.value)
  } else {
    translateX.value = 0
  }
}

function handleTouchEnd() {
  isDragging.value = false
  
  // 根据滑动距离决定是否显示操作按钮
  if (translateX.value < SWIPE_THRESHOLD) {
    translateX.value = -actionsWidth.value // 展开操作按钮
  } else {
    translateX.value = 0 // 复位
  }
}

// 处理操作
function handleAction(action: {type: string, label: string}) {
  resetSwipe()
  
  switch (action.type) {
    case 'rename':
      emit('rename', props.paper)
      break
    case 'delete':
      emit('delete', props.paper)
      break
    case 'restore':
      emit('restore', props.paper)
      break
    case 'clear':
      emit('clear', props.paper)
      break
  }
}

// 内容点击
function handleContentClick() {
  if (translateX.value !== 0) {
    resetSwipe()
  } else {
    emit('click', props.paper)
  }
}

// 确认导入
function handleContinueImport() {
  emit('continue-import', props.paper)
}

// 选择错题
function handleReview() {
  emit('review', props.paper)
}

// 选择错整
function handleAddToCorrection() {
  emit('add-to-correction', props.paper)
}

function resetSwipe() {
  translateX.value = 0
}

// 暴露方法供父组件调用
defineExpose({
  resetSwipe
})
</script>

<style scoped>
.swipeable-item {
  position: relative;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

/* 背景层：操作按钮 */
.actions-bg {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  height: 100%;
}

.action-btn {
  width: 80px;
  height: 100%;
  border: none;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-rename { 
  background: #3b82f6; 
}

.btn-delete { 
  background: #f97316; 
}

.btn-restore { 
  background: #22c55e; 
}

.btn-clear { 
  background: #ef4444; 
}

/* 前景层：内容 */
.content-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.content-wrapper.is-dragging {
  transition: none;
}

.content-wrapper.status-deleted {
  background: #f9fafb;
  opacity: 0.8;
}

.content-main {
  flex: 1;
  min-width: 0;
}

.paper-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.status-tag.analyzing {
  background: #fff7ed;
  color: #f97316;
}

.status-tag.analyzed {
  background: #fff7ed;
  color: #f97316;
}

.status-tag.imported {
  background: #f0fdf4;
  color: #22c55e;
}

.status-tag.deleted {
  background: #fef2f2;
  color: #ef4444;
}

.page-count {
  font-size: 12px;
  color: #6b7280;
}

.paper-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.paper-name.deleted {
  color: #9ca3af;
  text-decoration: line-through;
}

.paper-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
}

.grade, .semester {
  color: #3b82f6;
  background: #eff6ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.error-count {
  color: #ef4444;
  background: #fef2f2;
  padding: 2px 8px;
  border-radius: 4px;
}

.question-count {
  color: #6b7280;
}

.paper-time {
  font-size: 11px;
  color: #9ca3af;
}

.content-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.btn-action {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.btn-import {
  background: #f97316;
  color: white;
}

.btn-review {
  background: #22c55e;
  color: white;
}

.btn-correction {
  background: #a855f7;
  color: white;
}

.btn-correction.selected {
  background: #7c3aed;
}

.deleted-hint {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

.arrow {
  color: #d1d5db;
  font-size: 14px;
}
</style>
