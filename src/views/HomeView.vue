<template>
  <div class="h-full bg-gray-50 flex flex-col">
    <!-- 顶部导航 -->
    <header class="bg-white shadow-sm z-10 safe-area-top">
      <div class="flex items-center justify-between px-4 py-3">
        <!-- 左侧：Logo + 标题 -->
        <div class="flex items-center">
          <i class="fas fa-graduation-cap text-blue-600 text-xl mr-2"></i>
          <h1 class="text-lg font-semibold text-gray-800">试卷管理</h1>
        </div>
        
        <!-- 右侧：用户信息 -->
        <div class="flex items-center gap-2">
          <template v-if="authStore.isAuthenticated">
            <!-- 用户信息（点击进入配置页） -->
            <div
              class="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full cursor-pointer hover:bg-green-100 transition"
              @click="$router.push('/config')"
              title="点击打开配置"
            >
              <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-medium">
                {{ userInitial }}
              </div>
              <span class="text-xs text-gray-700 hidden sm:inline">{{ authStore.userEmail }}</span>
              <span class="text-xs text-gray-700 sm:hidden">{{ truncatedEmail }}</span>
            </div>
            <!-- 配置入口按钮 -->
            <button 
              @click="$router.push('/config')"
              class="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
              title="配置"
            >
              <i class="fas fa-cog"></i>
            </button>
          </template>
          <template v-else>
            <!-- 未登录：显示登录按钮 -->
            <button 
              @click="$router.push('/login')"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              登录
            </button>
          </template>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- 筛选摘要栏 -->
      <div class="shrink-0 bg-white px-4 py-2 border-b flex items-center gap-2 z-10">
        <button
          @click="showFilterPanel = !showFilterPanel"
          class="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition shrink-0"
          :class="showFilterPanel ? 'bg-blue-50 text-blue-600' : ''"
        >
          <i class="fas fa-sliders-h text-sm"></i>
        </button>
        <div class="text-xs text-gray-500 truncate flex-1 min-w-0">
          <span v-if="currentStudent" class="font-medium text-gray-700">{{ currentStudent.nickname }}</span>
          <span v-else class="text-gray-400">未选择学生</span>
          <span class="mx-1 text-gray-300">|</span>
          <span>{{ activeSubject }}</span>
          <span class="mx-1 text-gray-300">|</span>
          <span>{{ activeStatusLabel }}</span>
          <span class="mx-1 text-gray-300">|</span>
          <span class="text-gray-400">{{ filterSummary }}</span>
        </div>
        <button
          @click="startNewPaper"
          class="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center shrink-0 whitespace-nowrap"
        >
          <i class="fas fa-plus mr-1 text-xs"></i>
          新建
        </button>
      </div>

      <!-- 筛选展开面板 -->
      <div v-if="showFilterPanel" class="shrink-0 bg-white border-b shadow-sm px-4 py-3 space-y-3">
        <!-- 学生选择 -->
        <div class="flex items-center gap-2">
          <i
            class="fas fa-user shrink-0 cursor-pointer transition-colors text-sm"
            :class="currentStudent?.is_default ? 'text-green-500' : 'text-gray-400'"
            @click="showSetDefaultConfirm = true"
            title="点击设为默认学生"
          ></i>
          <select
            v-model="selectedStudentId"
            class="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm"
            @change="onStudentChange"
          >
            <option value="">请选择学生</option>
            <option v-for="s in students" :key="s.id" :value="s.id">
              {{ s.nickname }} {{ s.grade ? `(${s.grade})` : '' }} ({{ s.id }})
            </option>
          </select>
        </div>

        <!-- 学科选择 -->
        <div ref="subjectTabsRef" class="flex flex-wrap gap-1.5">
          <button
            v-for="subject in subjects"
            :key="subject"
            :ref="(el) => { if (el) subjectButtonRefs[subject] = el }"
            @click="handleSubjectChange(subject)"
            class="px-2 py-0.5 rounded-full whitespace-nowrap text-xs font-medium transition-colors"
            :class="[
              activeSubject === subject ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200',
              isCorrectionMode && subject === '全部' ? 'opacity-50 cursor-not-allowed' : ''
            ]"
            :disabled="isCorrectionMode && subject === '全部'"
            :title="isCorrectionMode && subject === '全部' ? '错整模式下不能选择全部学科' : ''"
          >
            {{ subject }}
            <span v-if="getPaperCount(subject) > 0"
                  class="ml-0.5 text-[10px] px-1 py-0 rounded-full"
                  :class="activeSubject === subject ? 'bg-blue-500' : 'bg-gray-300'">
              {{ getPaperCount(subject) }}
            </span>
          </button>
        </div>

        <!-- 状态筛选 -->
        <div class="flex items-center gap-1 flex-wrap">
          <template v-if="!isCorrectionMode">
            <button
              v-for="status in statusFilters"
              :key="status.value"
              @click="activeStatus = status.value"
              class="px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
              :class="activeStatus === status.value ? status.activeClass : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            >
              {{ status.label }}
            </button>
          </template>
          <template v-else>
            <span class="px-2 py-0.5 rounded-md text-xs font-medium bg-green-600 text-white">已导入</span>
            <span class="text-xs text-gray-500">仅显示可选择的试卷</span>
          </template>
        </div>

        <!-- 筛选类型 -->
        <div class="flex items-center gap-1 flex-wrap">
          <button
            v-for="type in filterTypes"
            :key="type.value"
            @click="activeFilterType = type.value"
            class="px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
            :class="activeFilterType === type.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            {{ type.label }}
          </button>
        </div>

        <!-- 筛选输入 -->
        <div>
          <div v-if="activeFilterType === 'date'" class="flex items-center gap-2">
            <input
              v-model="filterDateStart"
              type="date"
              class="flex-1 min-w-[100px] text-xs border rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
            <span class="text-xs text-gray-400">至</span>
            <input
              v-model="filterDateEnd"
              type="date"
              class="flex-1 min-w-[100px] text-xs border rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
            <button
              v-if="filterDateStart || filterDateEnd"
              @click="filterDateStart = ''; filterDateEnd = ''"
              class="p-1 text-gray-400 hover:text-gray-600"
            >
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
          <div v-if="activeFilterType === 'grade'" class="flex items-center gap-2">
            <select
              v-model="filterGrade"
              class="flex-1 min-w-[80px] text-xs border rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">全部年级</option>
              <option v-for="g in gradeOptions" :key="g" :value="g">{{ g }}</option>
            </select>
            <select
              v-model="filterSemester"
              class="flex-1 min-w-[80px] text-xs border rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">全部学期</option>
              <option v-for="s in semesterOptions" :key="s" :value="s">{{ s }}</option>
            </select>
            <button
              v-if="filterGrade || filterSemester"
              @click="filterGrade = ''; filterSemester = ''"
              class="p-1 text-gray-400 hover:text-gray-600"
            >
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
          <div v-if="activeFilterType === 'name'" class="flex items-center gap-2">
            <input
              v-model="filterName"
              type="text"
              placeholder="搜索试卷名称"
              class="flex-1 min-w-[120px] text-xs border rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
            <button
              v-if="filterName"
              @click="filterName = ''"
              class="p-1 text-gray-400 hover:text-gray-600"
            >
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 可滚动内容区 -->
      <div class="flex-1 overflow-y-auto">
        <section v-if="selectedStudentId" class="p-4" :class="{ 'pb-32': isCorrectionMode }">
        <div v-if="filteredPapers.length > 0" class="space-y-3">
          <SwipeableListItem 
            v-for="paper in filteredPapers" 
            :key="paper.id"
            :paper="paper"
            :is-correction-mode="isCorrectionMode"
            :is-selected="isPaperSelected(paper.id)"
            :selected-count="getSelectedCount(paper.id)"
            @click="handlePaperClick(paper)"
            @rename="onRenamePaper"
            @delete="onDeletePaper"
            @restore="onRestorePaper"
            @clear="onClearPaper"
            @continue-import="continueImport"
            @review="reviewPaper"
            @add-to-correction="addPaperToCorrection"
          />
        </div>

        <!-- 空状态 -->
        <div v-else class="text-center py-12">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-inbox text-gray-400 text-2xl"></i>
          </div>
          <p class="text-gray-500 mb-2">暂无{{ activeStatusLabel }}的试卷</p>
          <button 
            @click="startNewPaper"
            class="text-blue-600 font-medium"
          >
            点击新建试卷
          </button>
        </div>
      </section>

        <!-- 未选择学生 -->
        <section v-else class="h-full flex flex-col items-center justify-center p-8">
        <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <i class="fas fa-user-graduate text-blue-500 text-3xl"></i>
        </div>
        <h2 class="text-lg font-medium text-gray-800 mb-2">请选择学生</h2>
        <p class="text-gray-500 text-center mb-6">选择学生后查看和管理试卷</p>
        <select 
          v-model="selectedStudentId" 
          class="px-4 py-3 border border-gray-200 rounded-xl bg-white w-64"
          @change="onStudentChange"
        >
          <option value="">请选择学生</option>
          <option v-for="s in students" :key="s.id" :value="s.id">
            {{ s.nickname }}
          </option>
        </select>
        </section>
      </div>
    </main>

    <!-- 底部上拉面板（错整模式） -->
    <CorrectionSelectionPanel 
      v-if="isCorrectionMode && selectedStudentId" 
      @editPaper="onEditPaper"
    />

    <!-- 题目选择对话框 -->
    <QuestionSelector 
      v-if="showQuestionSelector && selectedPaper"
      :paper="selectedPaper"
      @close="showQuestionSelector = false"
      @confirm="onQuestionsSelected"
    />

    <!-- 重命名对话框 -->
    <RenameDialog
      :visible="paperManageStore.isRenameDialogVisible"
      :current-name="paperManageStore.renamingPaper?.name || ''"
      @confirm="handleRenameConfirm"
      @cancel="paperManageStore.hideRenameDialog"
    />

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      :visible="paperManageStore.isDeleteConfirmVisible"
      title="确认删除"
      :message="deleteConfirmMessage"
      confirm-text="删除"
      confirm-type="danger"
      @confirm="handleDeleteConfirm"
      @cancel="paperManageStore.hideDeleteConfirm"
    />

    <!-- 清除确认对话框 -->
    <ConfirmDialog
      :visible="paperManageStore.isClearConfirmVisible"
      title="确认清除"
      :message="clearConfirmMessage"
      confirm-text="清除"
      confirm-type="danger"
      @confirm="handleClearConfirm"
      @cancel="paperManageStore.hideClearConfirm"
    />

    <!-- 设为默认学生确认对话框 -->
    <ConfirmDialog
      :visible="showSetDefaultConfirm"
      title="设为默认学生"
      :message="setDefaultConfirmMessage"
      confirm-text="确认"
      confirm-type="primary"
      @confirm="handleSetDefaultConfirm"
      @cancel="showSetDefaultConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Home' })

import { ref, computed, onMounted, onActivated, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useStudentStore, useBatchStore } from '@/stores'
import { useCorrectionReviewStore } from '@/stores/correctionReview'
import { useAuthStore } from '@/stores/auth'
import { studentApi, paperApi, configApi } from '@/api'
import CorrectionSelectionPanel from '@/components/correctionReview/CorrectionSelectionPanel.vue'
import QuestionSelector from '@/components/correctionReview/QuestionSelector.vue'
import SwipeableListItem from '@/components/SwipeableListItem.vue'
import RenameDialog from '@/components/RenameDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { PaperQuestion } from '@/api/paper'
import { usePaperManageStore } from '@/stores/paperManage'
import type { Paper } from '@/types'

const router = useRouter()
const studentStore = useStudentStore()
const batchStore = useBatchStore()
const correctionStore = useCorrectionReviewStore()
const paperManageStore = usePaperManageStore()
const authStore = useAuthStore()

// 用户信息计算属性
const userInitial = computed(() => {
  return authStore.userEmail?.charAt(0).toUpperCase() || '?'
})

const truncatedEmail = computed(() => {
  const email = authStore.userEmail || ''
  if (email.length > 8) {
    return email.substring(0, 8) + '...'
  }
  return email
})

// 错整模式相关
const isCorrectionMode = computed(() => correctionStore.isCorrectionReviewMode)
const showQuestionSelector = ref(false)
const showFilterPanel = ref(false)
const selectedPaper = ref<{ id: string; name: string; created_at: string; subject: string } | null>(null)

// 确认对话框消息
const deleteConfirmMessage = computed(() => {
  const name = paperManageStore.deletingPaper?.name || ''
  return `确定要永久删除试卷"${name}"吗？此操作不可恢复。`
})

const clearConfirmMessage = computed(() => {
  const name = paperManageStore.clearingPaper?.name || ''
  return `确定要永久清除试卷"${name}"吗？此操作不可恢复。`
})

// 进入错整模式
function enterCorrectionMode() {
  correctionStore.enterCorrectionMode()
  console.log('[HomeView] 进入错整模式')
}

// 退出错整模式
function exitCorrectionMode() {
  correctionStore.exitCorrectionMode()
}

// 判断是否已选
function isPaperSelected(paperId: string) {
  return correctionStore.getSelectedCountByPaper(paperId) > 0
}

// 获取已选数量
function getSelectedCount(paperId: string) {
  return correctionStore.getSelectedCountByPaper(paperId)
}

// 监听错整列表变化，当列表为空时自动退出错整模式
watch(() => correctionStore.totalSelected, (newCount) => {
  if (newCount === 0 && isCorrectionMode.value) {
    console.log('[HomeView] 错整列表已清空，自动退出错整模式')
    exitCorrectionMode()
  }
})

// 添加试卷到错整列表（点击"选择错整"按钮）
async function addPaperToCorrection(paper: any) {
  console.log('[HomeView] 添加试卷到错整:', paper)
  if (!paper || !paper.id) {
    console.error('[HomeView] paper 无效:', paper)
    return
  }
  
  // 如果还没进入错整模式，自动进入
  if (!isCorrectionMode.value) {
    enterCorrectionMode()
    console.log('[HomeView] 自动进入错整模式')
  }
  
  // 如果已经添加过，先移除旧的再重新添加（实现更新功能）
  const wasAlreadySelected = isPaperSelected(paper.id)
  
  try {
    const response = await paperApi.getTreeDetail(paper.id)
    let qs: PaperQuestion[] = []
    
    if (response && typeof response === 'object') {
      if ('data' in response && response.data && typeof response.data === 'object') {
        qs = (response.data as any).questions || []
      } else if ('questions' in response) {
        qs = (response as any).questions || []
      }
    }
    
    // 只选择错题（对错标签为 'F'）
    const errorQuestions = qs.filter(q => q.对错标签 === 'F')
    
    if (errorQuestions.length > 0) {
      // 检查是否是第一张试卷（当前没有其他选择）
      const isFirstPaper = correctionStore.totalSelected === 0
      
      correctionStore.addQuestions(
        paper.id,
        paper.name,
        paper.created_at,
        paper.subject || '未分类',
        errorQuestions
      )
      
      // 如果是第一张试卷，自动切换到该试卷的学科
      if (isFirstPaper && paper.subject) {
        console.log('[HomeView] 第一张试卷，自动切换学科:', paper.subject)
        activeSubject.value = paper.subject
        // 自动滚动到该学科标签
        nextTick(() => {
          scrollToSubject(paper.subject)
        })
      }
      
      if (wasAlreadySelected) {
        console.log(`[HomeView] 已更新试卷 ${paper.id} 的错题: ${errorQuestions.length} 道`)
      } else {
        console.log(`[HomeView] 已添加 ${errorQuestions.length} 道错题到错整列表`)
      }
    } else {
      console.log('[HomeView] 该试卷没有错题')
      // 如果之前已选择但现在没有错题了，移除该试卷
      if (wasAlreadySelected) {
        correctionStore.removePaperQuestions(paper.id)
        console.log(`[HomeView] 试卷 ${paper.id} 已无错题，从列表中移除`)
      }
    }
  } catch (error) {
    console.error('[HomeView] 加载试卷题目失败:', error)
  }
}

// 刷新已加入错整列表的试卷题目（从试卷详情返回后调用）
async function refreshCorrectionPapers() {
  if (!isCorrectionMode.value || correctionStore.totalSelected === 0) return
  
  console.log('[HomeView] 刷新错整列表中的试卷题目')
  
  // 获取已选试卷的ID列表
  const paperIds = correctionStore.groupedByPaper.map(g => g.paperId)
  
  for (const paperId of paperIds) {
    try {
      // 找到试卷信息
      const paper = papers.value.find(p => p.id === paperId)
      if (!paper) continue
      
      // 重新加载试卷题目
      const response = await paperApi.getTreeDetail(paperId)
      let qs: PaperQuestion[] = []
      
      if (response && typeof response === 'object') {
        if ('data' in response && response.data && typeof response.data === 'object') {
          qs = (response.data as any).questions || []
        } else if ('questions' in response) {
          qs = (response as any).questions || []
        }
      }
      
      // 只选择错题
      const errorQuestions = qs.filter(q => q.对错标签 === 'F')
      
      if (errorQuestions.length > 0) {
        // 更新该试卷的题目（全量替换）
        correctionStore.addQuestions(
          paperId,
          paper.name,
          paper.created_at,
          paper.subject || '未分类',
          errorQuestions
        )
        console.log(`[HomeView] 已刷新试卷 ${paperId} 的题目: ${errorQuestions.length} 道`)
      }
    } catch (error) {
      console.error(`[HomeView] 刷新试卷 ${paperId} 失败:`, error)
    }
  }
  
  // 刷新题目详情
  await correctionStore.loadQuestionDetails()
  console.log('[HomeView] 错整列表刷新完成')
}

// 打开题目选择器（用于编辑已添加的试卷）
function openQuestionSelector(paper: any) {
  console.log('[DEBUG] 打开题目选择器:', paper)
  if (!paper || !paper.id) {
    console.error('[DEBUG] paper 无效:', paper)
    return
  }
  selectedPaper.value = {
    id: paper.id,
    name: paper.name || '未命名试卷',
    created_at: paper.created_at || new Date().toISOString(),
    subject: paper.subject || '未分类'
  }
  showQuestionSelector.value = true
  console.log('[DEBUG] showQuestionSelector:', showQuestionSelector.value)
  console.log('[DEBUG] selectedPaper:', selectedPaper.value)
}

// 编辑试卷题目（从底部上拉列表点击"n题"触发）
function onEditPaper(paperId: string, paperName: string, importedAt: string) {
  console.log('[HomeView] 编辑试卷题目:', { paperId, paperName, importedAt })
  
  // 查找试卷信息
  const paper = papers.value.find(p => p.id === paperId)
  if (!paper) {
    console.error('[HomeView] 未找到试卷:', paperId)
    return
  }
  
  selectedPaper.value = {
    id: paperId,
    name: paperName,
    created_at: importedAt,
    subject: paper?.subject || '未分类'
  }
  showQuestionSelector.value = true
}

// 题目选择确认
function onQuestionsSelected(questions: PaperQuestion[], paperInfo: { id: string; name: string; created_at: string; subject: string }) {
  correctionStore.addQuestions(
    paperInfo.id,
    paperInfo.name,
    paperInfo.created_at,
    paperInfo.subject,
    questions
  )
  showQuestionSelector.value = false
}

// 状态
const selectedStudentId = ref('')
const students = computed(() => studentStore.students)
const currentStudent = computed(() => students.value.find(s => s.id === selectedStudentId.value))
const papers = ref<any[]>([])
const activeSubject = ref('全部')
const activeStatus = ref('all')

// 学生级试卷缓存：student_id -> { papers, stats }
const paperCache = new Map<string, { papers: any[]; stats: typeof paperStats.value }>()

// 学科标签滚动容器和按钮 ref
const subjectTabsRef = ref<HTMLDivElement | null>(null)
const subjectButtonRefs = ref<Record<string, HTMLButtonElement>>({})

// 筛选设置
const activeFilterType = ref<'date' | 'grade' | 'name'>('date')
const filterDateStart = ref('')
const filterDateEnd = ref('')
const filterGrade = ref('')
const filterSemester = ref('')
const filterName = ref('')

// 筛选类型
const filterTypes = [
  { value: 'date', label: '按时间' },
  { value: 'grade', label: '按年级学期' },
  { value: 'name', label: '按试卷名称' },
]

// 年级和学期选项（从系统配置获取）
const gradeOptions = ref<string[]>([])
const semesterOptions = ref<string[]>([])

// 试卷统计数据（不分页的真实数量）
const paperStats = ref<{
  status_counts: { all: number; imported: number; analyzing: number; analyzed: number; deleted: number }
  subject_counts: Record<string, number>
  deleted_subject_counts: Record<string, number>
}>({
  status_counts: { all: 0, imported: 0, analyzing: 0, analyzed: 0, deleted: 0 },
  subject_counts: {},
  deleted_subject_counts: {}
})

// 学科列表
const subjects = ['全部', '数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '未分类']

// 状态筛选
const statusFilters = [
  { value: 'all', label: '全部', activeClass: 'bg-blue-600 text-white' },
  { value: 'analyzed', label: '待导入', activeClass: 'bg-orange-500 text-white' },
  { value: 'imported', label: '已导入', activeClass: 'bg-green-600 text-white' },
  { value: 'deleted', label: '已删除', activeClass: 'bg-red-600 text-white' },
]

const activeStatusLabel = computed(() => {
  const filter = statusFilters.find(f => f.value === activeStatus.value)
  return filter?.label || ''
})

const filterSummary = computed(() => {
  if (activeFilterType.value === 'date') {
    if (filterDateStart.value && filterDateEnd.value) return `${filterDateStart.value} 至 ${filterDateEnd.value}`
    if (filterDateStart.value) return `${filterDateStart.value} 起`
    if (filterDateEnd.value) return `至 ${filterDateEnd.value}`
    return '按时间'
  }
  if (activeFilterType.value === 'grade') {
    if (filterGrade.value && filterSemester.value) return `${filterGrade.value}/${filterSemester.value}`
    if (filterGrade.value) return filterGrade.value
    if (filterSemester.value) return filterSemester.value
    return '按年级学期'
  }
  if (activeFilterType.value === 'name') {
    if (filterName.value) return `名称:${filterName.value}`
    return '按试卷名称'
  }
  return ''
})

// 经过筛选条件（不含学科筛选）过滤后的试卷
const subjectFilteredPapers = computed(() => {
  console.log('[DEBUG] subjectFilteredPapers 计算开始:')
  console.log('[DEBUG]   papers.value.length:', papers.value.length)
  console.log('[DEBUG]   activeStatus.value:', activeStatus.value)
  console.log('[DEBUG]   各status数量:', {
    all: papers.value.length,
    imported: papers.value.filter(p => p.status === 'imported').length,
    analyzing: papers.value.filter(p => p.status === 'analyzing').length,
    analyzed: papers.value.filter(p => p.status === 'analyzed').length,
    deleted: papers.value.filter(p => p.status === 'deleted').length,
    other: papers.value.filter(p => !['imported', 'analyzing', 'analyzed', 'deleted'].includes(p.status)).length
  })
  
  let result = papers.value
  
  // 按状态筛选
  if (activeStatus.value === 'analyzed') {
    result = result.filter(p => p.status === 'analyzing' || p.status === 'analyzed')
  } else if (activeStatus.value === 'imported') {
    result = result.filter(p => p.status === 'imported')
  } else if (activeStatus.value === 'deleted') {
    result = result.filter(p => p.status === 'deleted')
  } else {
    // 'all' 状态：排除已删除的试卷
    const before = result.length
    result = result.filter(p => p.status !== 'deleted')
    console.log('[DEBUG]   all状态下过滤deleted:', before, '->', result.length)
  }
  
  console.log('[DEBUG] subjectFilteredPapers 计算结果:', result.length)
  return result
})

// 获取试卷数量（使用统计数据，更准确）
function getPaperCount(subject: string) {
  // 根据当前状态筛选决定使用哪个统计数据
  const status = activeStatus.value
  
  if (subject === '全部') {
    // 返回当前状态下的总数
    if (status === 'deleted') {
      return paperStats.value.status_counts.deleted || 0
    } else if (status === 'imported') {
      return paperStats.value.status_counts.imported || 0
    } else if (status === 'analyzed') {
      return (paperStats.value.status_counts.analyzing + paperStats.value.status_counts.analyzed) || 0
    } else {
      // all 状态：排除 deleted
      return paperStats.value.status_counts.all || 0
    }
  } else {
    // 特定学科的数量
    if (status === 'deleted') {
      // 已删除状态下，使用 deleted_subject_counts
      return paperStats.value.deleted_subject_counts[subject] || 0
    } else if (status === 'imported') {
      // 已导入状态下，只能估算（统计数据是所有非删除状态的）
      // 这里简化处理，使用分页数据计算比例
      const totalInList = subjectFilteredPapers.value.length
      const subjectInList = subjectFilteredPapers.value.filter(p => p.subject === subject).length
      if (totalInList === 0) return 0
      
      // 估算：按列表中比例估算总数
      const estimatedTotal = paperStats.value.status_counts.imported || 0
      return Math.round((subjectInList / totalInList) * estimatedTotal)
    } else if (status === 'analyzed') {
      const totalInList = subjectFilteredPapers.value.length
      const subjectInList = subjectFilteredPapers.value.filter(p => p.subject === subject).length
      if (totalInList === 0) return 0
      
      const estimatedTotal = (paperStats.value.status_counts.analyzing + paperStats.value.status_counts.analyzed) || 0
      return Math.round((subjectInList / totalInList) * estimatedTotal)
    } else {
      // all 状态：使用 subject_counts
      return paperStats.value.subject_counts[subject] || 0
    }
  }
}

// 筛选后的试卷
const filteredPapers = computed(() => {
  let result = papers.value
  
  // 按学科筛选
  if (activeSubject.value !== '全部') {
    result = result.filter(p => p.subject === activeSubject.value)
  }
  
  // 按状态筛选（注：paper 和 batch 已在后端按 status 过滤，这里主要是处理 'all' 视图）
  // 错整模式下，只显示已导入的试卷
  if (isCorrectionMode.value) {
    result = result.filter(p => p.status === 'imported')
  } else if (activeStatus.value === 'analyzed') {
    result = result.filter(p => p.status === 'analyzing' || p.status === 'analyzed')
  } else if (activeStatus.value === 'imported') {
    result = result.filter(p => p.status === 'imported')
  } else if (activeStatus.value === 'deleted') {
    result = result.filter(p => p.status === 'deleted')
  } else {
    // 'all' 状态：排除已删除的试卷
    result = result.filter(p => p.status !== 'deleted')
  }
  
  // 按筛选条件过滤
  if (activeFilterType.value === 'date') {
    // 按时间筛选
    if (filterDateStart.value) {
      const startDate = new Date(filterDateStart.value + 'T00:00:00')
      result = result.filter(p => new Date(p.created_at) >= startDate)
    }
    if (filterDateEnd.value) {
      const endDate = new Date(filterDateEnd.value + 'T23:59:59')
      result = result.filter(p => new Date(p.created_at) <= endDate)
    }
  } else if (activeFilterType.value === 'grade') {
    // 按年级学期筛选
    if (filterGrade.value) {
      result = result.filter(p => p.grade === filterGrade.value)
    }
    if (filterSemester.value) {
      result = result.filter(p => p.semester === filterSemester.value)
    }
  } else if (activeFilterType.value === 'name') {
    // 按试卷名称模糊查询
    if (filterName.value.trim()) {
      const keyword = filterName.value.toLowerCase().trim()
      result = result.filter(p => p.name.toLowerCase().includes(keyword))
    }
  }
  
  // 默认按时间倒序排序（最新的在前面）
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  return result
})

// 获取状态样式
function getStatusClass(status: string) {
  const map: Record<string, string> = {
    'analyzing': 'bg-orange-100 text-orange-700',
    'analyzed': 'bg-orange-100 text-orange-700',
    'imported': 'bg-green-100 text-green-700',
    'completed': 'bg-green-100 text-green-700',
    'processing': 'bg-blue-100 text-blue-700',
    'pending': 'bg-gray-100 text-gray-600',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

// 获取状态标签
function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    'analyzing': '已分析',
    'analyzed': '已分析',
    'imported': '已导入',
    'completed': '已完成',
    'processing': '处理中',
    'pending': '待处理',
  }
  return map[status] || status
}

// 格式化日期
function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 设为默认学生确认对话框
const showSetDefaultConfirm = ref(false)
const setDefaultConfirmMessage = computed(() => {
  const name = currentStudent.value?.nickname || ''
  return name ? `确定将 "${name}" 设为默认学生吗？` : '确定设为默认学生吗？'
})

async function handleSetDefaultConfirm() {
  showSetDefaultConfirm.value = false
  if (!currentStudent.value) return
  try {
    await studentApi.updateStudent(currentStudent.value.id, {
      is_default: true
    })
    await studentStore.loadStudents()
  } catch (err) {
    console.error('设置默认学生失败:', err)
    alert('设置默认学生失败')
  }
}

const previousStudentId = ref('')  // 用于检测学生切换

// 滚动到指定学科标签
function scrollToSubject(subject: string) {
  const container = subjectTabsRef.value
  const button = subjectButtonRefs.value[subject]
  
  if (container && button) {
    // 计算滚动位置：按钮左边距减去容器左边距，再减去一些偏移量以保持视觉安全
    const scrollLeft = button.offsetLeft - container.offsetLeft - 20
    container.scrollTo({
      left: Math.max(0, scrollLeft),
      behavior: 'smooth'
    })
  }
}

// 处理学科切换（错整模式下）
function handleSubjectChange(subject: string) {
  // 错整模式下不能选全部
  if (isCorrectionMode.value && subject === '全部') {
    return
  }
  
  // 如果学科改变了，清空之前的选择
  if (isCorrectionMode.value && subject !== activeSubject.value) {
    console.log('[HomeView] 学科切换:', activeSubject.value, '->', subject, '清空之前选择')
    correctionStore.clearAllSelections()  // 清空所有选择，保持错整模式
  }
  
  // 设置新学科
  activeSubject.value = subject
  
  // 滚动到当前学科
  nextTick(() => {
    scrollToSubject(subject)
  })
}

async function onStudentChange() {
  console.log('[HomeView] onStudentChange:', { 
    from: previousStudentId.value, 
    to: selectedStudentId.value 
  })
  
  if (!selectedStudentId.value) {
    papers.value = []
    studentStore.selectStudent('')  // 清空选择
    previousStudentId.value = ''
    return
  }
  
  // 如果学生切换了，退出错整模式并清空选择
  if (previousStudentId.value && previousStudentId.value !== selectedStudentId.value) {
    console.log('[HomeView] 学生切换，退出错整模式')
    correctionStore.exitCorrectionMode()
  }
  
  // 同步到 studentStore，这样其他组件可以获取当前学生
  studentStore.selectStudent(selectedStudentId.value)
  console.log('[HomeView] 已同步学生选择到 store:', selectedStudentId.value)
  
  previousStudentId.value = selectedStudentId.value
  
  // 先检查缓存，有缓存则立即显示，后台刷新
  await loadPapers()
}

// 从 pdf_path 提取 batch_id
// 格式: uploads\batches\{batch_id}\output\P1.jpg
function extractBatchIdFromPdfPath(pdfPath: string): string | null {
  if (!pdfPath) return null
  
  // 支持正向斜杠和反向斜杠
  const normalizedPath = pdfPath.replace(/\\/g, '/')
  
  // 匹配 batches/{batch_id}/
  const match = normalizedPath.match(/batches\/([^/]+)/i)
  if (match) {
    return match[1]
  }
  
  return null
}

// 加载试卷统计数据（不分页）
async function loadPaperStatistics() {
  try {
    if (!selectedStudentId.value) return
    
    const statsResponse = await paperApi.getPaperStatistics(selectedStudentId.value, true)
    const statsData = (statsResponse as any).data
    
    if (statsData) {
      paperStats.value = {
        status_counts: statsData.status_counts || { all: 0, imported: 0, analyzing: 0, analyzed: 0, deleted: 0 },
        subject_counts: statsData.subject_counts || {},
        deleted_subject_counts: statsData.deleted_subject_counts || {}
      }
      console.log('[DEBUG] 试卷统计数据:', paperStats.value)
    }
  } catch (err) {
    console.error('加载统计数据失败:', err)
  }
}

// 加载试卷列表
async function loadPapers(forceRefresh = false) {
  const studentId = selectedStudentId.value
  if (!studentId) return
  
  // 检查缓存：非强制刷新时，先使用缓存数据立即显示
  const cached = paperCache.get(studentId)
  if (!forceRefresh && cached) {
    console.log('[DEBUG] 使用缓存数据，学生:', studentId)
    papers.value = cached.papers
    paperStats.value = cached.stats
    // 后台静默刷新（不阻塞 UI）
    refreshPapersInBackground(studentId)
    return
  }
  
  await fetchAndCachePapers(studentId)
}

// 实际请求 API 并更新缓存
async function fetchAndCachePapers(studentId: string) {
  try {
    console.log('[DEBUG] 开始加载试卷列表...')
    
    // 并行加载统计数据和三类试卷列表（初始加载 200 条，避免默认 20 条限制）
    const [_, papersResponse, analyzedResponse, deletedResponse] = await Promise.all([
      loadPaperStatistics(),
      paperApi.getStudentPapers(studentId, { status: 'imported', page_size: 200 }),
      paperApi.getStudentPapers(studentId, { status: 'analyzed', check_batch_status: true, page_size: 200 }),
      paperApi.getStudentPapers(studentId, { status: 'deleted', include_deleted: true, page_size: 200 })
    ])
    
    const papersData = (papersResponse as any).data || papersResponse || []
    console.log('[DEBUG] imported papers (分页):', papersData.length)
    
    const analyzedData = (analyzedResponse as any).data || analyzedResponse || []
    console.log('[DEBUG] analyzed papers:', analyzedData.length)
    
    const deletedData = (deletedResponse as any).data || deletedResponse || []
    console.log('[DEBUG] deleted papers:', deletedData.length)
    
    // 转换试卷数据
    const importedPapers = (Array.isArray(papersData) ? papersData : []).map((p: any) => ({
      id: p.id,
      name: p.name,
      subject: p.subject || '未分类',
      grade: p.grade || '',
      semester: p.semester || '',
      status: p.status || 'imported',
      total_pages: p.total_pages || 1,
      question_count: p.question_count || 0,
      error_count: p.error_count || 0,
      created_at: p.created_at,
      batch_id: null
    }))
    
    const analyzedPapers = (Array.isArray(analyzedData) ? analyzedData : []).map((p: any) => ({
      id: p.id,
      name: p.name || '未命名试卷',
      subject: p.subject || '未分类',
      grade: p.grade || '',
      semester: p.semester || '',
      status: 'analyzed',
      total_pages: p.total_pages || 1,
      question_count: p.question_count || 0,
      error_count: p.error_count || 0,
      created_at: p.created_at,
      batch_id: extractBatchIdFromPdfPath(p.pdf_path),
      student_id: p.student_id
    }))
    
    const deletedPapers = (Array.isArray(deletedData) ? deletedData : []).map((p: any) => ({
      id: p.id,
      name: p.name || '未命名试卷',
      subject: p.subject || '未分类',
      grade: p.grade || '',
      semester: p.semester || '',
      status: 'deleted',
      total_pages: p.total_pages || 1,
      question_count: p.question_count || 0,
      error_count: p.error_count || 0,
      created_at: p.created_at,
      batch_id: null
    }))
    
    // 合并
    const mergedPapers = [...analyzedPapers, ...importedPapers, ...deletedPapers]
    papers.value = mergedPapers
    console.log('[DEBUG] 总试卷数(分页):', papers.value.length)
    
    // 写入缓存
    paperCache.set(studentId, {
      papers: mergedPapers,
      stats: { ...paperStats.value }
    })
    console.log('[DEBUG] 已缓存学生试卷:', studentId)
    
  } catch (err) {
    console.error('加载试卷失败:', err)
    papers.value = []
  }
}

// 后台静默刷新（不阻塞 UI，不切换 loading 状态）
async function refreshPapersInBackground(studentId: string) {
  console.log('[DEBUG] 后台静默刷新试卷:', studentId)
  await fetchAndCachePapers(studentId)
}

// 新建试卷
function startNewPaper() {
  router.push('/upload')
}

// 点击试卷卡片
function handlePaperClick(paper: any) {
  // 错整模式下，点击试卷不再打开题目选择器
  // 题目选择器改为通过底部上拉列表的"n题"按钮打开
  if (isCorrectionMode.value) {
    // 错整模式下点击试卷不做任何事
    return
  }
  
  // 正常模式下的原有逻辑
  if (paper.status === 'analyzing' || paper.status === 'analyzed') {
    continueImport(paper)
  } else if (paper.status === 'imported') {
    reviewPaper(paper)
  }
}

// 继续导入（已分析试卷）
async function continueImport(paper: any) {
  if (!paper.batch_id) {
    alert('无法找到批次信息')
    return
  }
  // 设置 batch 信息并跳转到导入确认页
  await batchStore.loadBatchFromMeta(paper.batch_id, paper.student_id)
  router.push(`/import-confirm/${paper.batch_id}`)
}

// 审阅试卷（已导入试卷）
function reviewPaper(paper: any) {
  router.push(`/review/${paper.id}`)
}

// ============ 删除/恢复/重命名相关 ============

// 重命名试卷
function onRenamePaper(paper: Paper) {
  paperManageStore.showRenameDialog(paper)
}

// 删除试卷
async function onDeletePaper(paper: Paper) {
  console.log('[DEBUG] 删除试卷:', paper.id, paper.name, paper.status, paper.subject)
  // analyzing/analyzed 状态需要确认（物理删除）
  if (paper.status === 'analyzing' || paper.status === 'analyzed') {
    paperManageStore.showDeleteConfirm(paper)
  } else {
    // imported 状态直接删除（软删除）
    const success = await paperManageStore.deletePaper(paper)
    console.log('[DEBUG] 删除结果:', success)
    if (success) {
      await loadPapers()
    }
  }
}

// 恢复试卷
async function onRestorePaper(paper: Paper) {
  const success = await paperManageStore.restorePaper(paper)
  if (success) {
    paperCache.delete(selectedStudentId.value) // 清除缓存，强制重新加载
    await loadPapers(true)
  }
}

// 清除（永久删除）试卷
function onClearPaper(paper: Paper) {
  paperManageStore.showClearConfirm(paper)
}

// 确认重命名
async function handleRenameConfirm(newName: string) {
  const success = await paperManageStore.renamePaper(newName)
  if (success) {
    paperCache.delete(selectedStudentId.value) // 清除缓存，强制重新加载
    await loadPapers(true)
  }
}

// 确认删除（物理删除）
async function handleDeleteConfirm() {
  const success = await paperManageStore.deletePaper()
  if (success) {
    paperCache.delete(selectedStudentId.value) // 清除缓存，强制重新加载
    await loadPapers(true)
  }
}

// 确认清除（永久删除）
async function handleClearConfirm() {
  const success = await paperManageStore.permanentDelete()
  if (success) {
    paperCache.delete(selectedStudentId.value) // 清除缓存，强制重新加载
    await loadPapers(true)
  }
}

// 加载系统配置（年级、学期列表）
async function loadSystemConfig() {
  try {
    const response = await configApi.getSystemConfig()
    const data = (response as any).data || response
    if (data) {
      gradeOptions.value = data.grades || []
      semesterOptions.value = data.semesters || []
    }
  } catch (err) {
    console.error('加载系统配置失败:', err)
    // 使用默认值
    gradeOptions.value = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']
    semesterOptions.value = ['上半学期', '下半学期']
  }
}

// 生命周期
onMounted(async () => {
  // 并行加载系统配置和学生列表（无依赖关系）
  await Promise.all([
    loadSystemConfig(),
    studentStore.loadStudents()
  ])
  
  // 恢复学生选择：从 localStorage 恢复，但必须存在于当前用户的学生列表中；否则使用默认学生
  const savedStudentId = localStorage.getItem('selected_student_id')

  if (savedStudentId && studentStore.students.find(s => s.id === savedStudentId)) {
    // 恢复之前选择的学生
    selectedStudentId.value = savedStudentId
    previousStudentId.value = savedStudentId
    // 确保同步到 store
    studentStore.selectStudent(savedStudentId)
    console.log('[HomeView] 初始化恢复已选择学生:', savedStudentId)
  } else if (studentStore.defaultStudentId) {
    // 使用默认学生
    selectedStudentId.value = studentStore.defaultStudentId
    previousStudentId.value = studentStore.defaultStudentId
    // 同步到 store
    studentStore.selectStudent(selectedStudentId.value)
    console.log('[HomeView] 初始化选中默认学生:', selectedStudentId.value)
  } else {
    selectedStudentId.value = ''
    previousStudentId.value = ''
    studentStore.selectStudent('')
    console.log('[HomeView] 无可用学生，清空选择')
  }
  
  // 如果处于错整模式，恢复之前的学科选择
  if (isCorrectionMode.value && correctionStore.currentSubject) {
    activeSubject.value = correctionStore.currentSubject
    console.log('[HomeView] 恢复错整模式学科:', activeSubject.value)
  }
  
  // 加载试卷列表
  if (selectedStudentId.value) {
    await loadPapers()
  }
})

// 当从其他页面返回时（如试卷详情页），刷新错整列表中的试卷题目
onActivated(async () => {
  console.log('[HomeView] 页面重新激活，检查是否需要刷新数据')

  const savedStudentId = localStorage.getItem('selected_student_id')
  const isStudentInCache = studentStore.students.some(s => s.id === savedStudentId)

  // 如果缓存的学生列表为空，或者保存的学生ID不在缓存中，说明是用户切换或首次进入
  if (studentStore.students.length === 0 || !isStudentInCache) {
    console.log('[HomeView] 检测到用户切换或缓存失效，清空旧数据并重新加载')

    // 先清空旧数据，避免旧用户试卷闪现
    papers.value = []
    selectedStudentId.value = ''
    previousStudentId.value = ''
    correctionStore.exitCorrectionMode()

    // 重新加载学生列表
    await studentStore.loadStudents()

    // 重新恢复学生选择
    if (savedStudentId && studentStore.students.find(s => s.id === savedStudentId)) {
      selectedStudentId.value = savedStudentId
      previousStudentId.value = savedStudentId
      studentStore.selectStudent(savedStudentId)
      console.log('[HomeView] 用户切换后恢复已选择学生:', savedStudentId)
    } else if (studentStore.defaultStudentId) {
      selectedStudentId.value = studentStore.defaultStudentId
      previousStudentId.value = studentStore.defaultStudentId
      studentStore.selectStudent(selectedStudentId.value)
      console.log('[HomeView] 用户切换后选中默认学生:', selectedStudentId.value)
    } else {
      selectedStudentId.value = ''
      previousStudentId.value = ''
      studentStore.selectStudent('')
      console.log('[HomeView] 用户切换后无可用学生，清空选择')
      return
    }

    // 加载新用户的试卷
    await loadPapers()
  } else {
    // 同一用户从其他页面返回，只需刷新试卷列表
    console.log('[HomeView] 同一用户返回，刷新试卷列表')
    const promises = []
    if (selectedStudentId.value) {
      promises.push(loadPapers())
    }
    if (isCorrectionMode.value && correctionStore.totalSelected > 0) {
      promises.push(refreshCorrectionPapers())
    }
    if (promises.length > 0) {
      await Promise.all(promises)
    }
  }
})
</script>

<style scoped>
/* 隐藏滚动条但保留功能 */
.overflow-x-auto {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.overflow-x-auto::-webkit-scrollbar {
  display: none;
}
</style>
