/**
 * 错整（错题整理）状态管理 (Pinia Store)
 * 功能：
 * 1. 多试卷错题选择
 * 2. 排序和过滤
 * 3. 排除标记
 * 4. 批量导出
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { correctionsApi } from '@/api'
import type { PaperQuestion } from '@/api/paper'

// 选中的题目（基础信息）
export interface SelectedQuestion {
  uuid: string
  paperId: string
  paperName: string
  paperImportedAt: string
  subject: string
}

// 题目详细信息（从API加载）
export interface QuestionDetail {
  uuid: string
  paper_id: string
  paper_name: string
  paper_number: string
  review_date: string | null
  question_type_name: string
  question_type_id: string
  error_type_name: string
  error_type_id: string
  secondary_error_type_name: string
  secondary_error_type_id: string
  slice_image: string
  correction_images: string[]
  correction_count: number
  has_correction: boolean
  position: string
  level_1: string
  level_2: string
  content: string
  created_at: string
  updated_at: string
}

// 排序字段
export type SortField = 'review_date' | 'paper_name' | 'question_type'
export type SortOrder = 'asc' | 'desc'

// 过滤设置
export interface FilterSettings {
  questionTypes: string[]
  errorTypes: string[]
  dateRange: {
    from: string | null
    to: string | null
  }
}

export const useCorrectionReviewStore = defineStore('correctionReview', () => {
  // ============ State ============
  const currentMode = ref<'normal' | 'correction-review'>('normal')
  const selectedQuestions = ref<SelectedQuestion[]>([])
  const questionDetails = ref<Map<string, QuestionDetail>>(new Map())
  const excludedUuids = ref<Set<string>>(new Set())
  const isLoading = ref(false)
  
  // 排序和过滤设置
  const sortField = ref<SortField>('review_date')
  const sortOrder = ref<SortOrder>('desc')
  const filterSettings = ref<FilterSettings>({
    questionTypes: [],
    errorTypes: [],
    dateRange: { from: null, to: null }
  })
  
  // 是否隐藏已过滤（排除）的题目
  const hideFilteredQuestions = ref(false)
  
  // 当前学科（用于筛选题目类型和错题类型）
  const currentSubject = ref<string>('')
  
  // 过滤例外列表（用户手动选择纳入的已过滤题目）
  const filterExceptions = ref<Set<string>>(new Set())

  // ============ Getters ============
  
  /** 是否处于错整模式 */
  const isCorrectionReviewMode = computed(() => 
    currentMode.value === 'correction-review'
  )
  
  /** 已选题目总数 */
  const totalSelected = computed(() => selectedQuestions.value.length)
  
  /** 按试卷分组的已选题目（上拉面板用） */
  const groupedByPaper = computed(() => {
    const groups = new Map<string, {
      paperId: string
      paperName: string
      importedAt: string
      questions: SelectedQuestion[]
    }>()
    
    selectedQuestions.value.forEach(q => {
      if (!groups.has(q.paperId)) {
        groups.set(q.paperId, {
          paperId: q.paperId,
          paperName: q.paperName,
          importedAt: q.paperImportedAt,
          questions: []
        })
      }
      groups.get(q.paperId)!.questions.push(q)
    })
    
    // 按试卷名称排序
    return Array.from(groups.values()).sort((a, b) => 
      a.paperName.localeCompare(b.paperName, 'zh-CN')
    )
  })
  
  /** 获取某试卷的已选题目数 */
  const getSelectedCountByPaper = (paperId: string) => 
    selectedQuestions.value.filter(q => q.paperId === paperId).length
  
  /** 
   * 判断题目是否被过滤（排除）- 根据筛选条件自动排除
   * 注意：例外列表中的题目不会被过滤
   */
  const isFilteredOut = (q: QuestionDetail): boolean => {
    console.log('[isFilteredOut] 检查题目:', q.uuid, '例外列表:', Array.from(filterExceptions.value))
    
    // 如果在例外列表中，不过滤
    if (filterExceptions.value.has(q.uuid)) {
      console.log('[isFilteredOut]', q.uuid, '在例外列表中，返回 false')
      return false
    }
    
    // 检查题目类型是否在排除列表中
    if (filterSettings.value.questionTypes.length > 0) {
      if (filterSettings.value.questionTypes.includes(q.question_type_id)) {
        console.log('[isFilteredOut]', q.uuid, '题目类型匹配，返回 true')
        return true
      }
    }
    
    // 检查错题类型是否在排除列表中
    if (filterSettings.value.errorTypes.length > 0) {
      if (filterSettings.value.errorTypes.includes(q.error_type_id)) {
        console.log('[isFilteredOut]', q.uuid, '错题类型匹配，返回 true')
        return true
      }
    }
    
    // 检查日期范围
    if (filterSettings.value.dateRange.from) {
      if (!q.review_date || q.review_date < filterSettings.value.dateRange.from!) {
        return true
      }
    }
    
    if (filterSettings.value.dateRange.to) {
      if (!q.review_date || q.review_date > filterSettings.value.dateRange.to!) {
        return true
      }
    }
    
    console.log('[isFilteredOut]', q.uuid, '没有匹配，返回 false')
    return false
  }
  
  /** 
   * 获取排序和过滤后的题目详情列表（错整确认页面用）
   * 注意：被排除和过滤的题目仍然显示在列表中，只是有标记
   */
  const sortedAndFilteredQuestions = computed(() => {
    let result = Array.from(questionDetails.value.values())
    
    // 排除已排除的题目（如果设置了隐藏）
    // 包括：手动排除的（通过 checkbox uncheck）和自动过滤的
    if (hideFilteredQuestions.value) {
      result = result.filter(q => {
        // 如果被手动排除，隐藏
        if (excludedUuids.value.has(q.uuid)) {
          return false
        }
        // 如果被自动过滤，隐藏
        return !isFilteredOut(q)
      })
    }
    
    // 应用排序
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortField.value) {
        case 'review_date':
          // 从未错整的排最后
          if (!a.review_date && !b.review_date) comparison = 0
          else if (!a.review_date) comparison = 1
          else if (!b.review_date) comparison = -1
          else comparison = a.review_date.localeCompare(b.review_date)
          break
        case 'paper_name':
          comparison = a.paper_name.localeCompare(b.paper_name, 'zh-CN')
          break
        case 'question_type':
          comparison = a.question_type_name.localeCompare(b.question_type_name, 'zh-CN')
          break
      }
      
      return sortOrder.value === 'asc' ? comparison : -comparison
    })
    
    return result
  })
  
  /** 获取未排除的题目UUID列表（用于导出） */
  const getExportQuestionIds = () => 
    selectedQuestions.value
      .filter(q => !excludedUuids.value.has(q.uuid))
      .map(q => q.uuid)
  
  /** 统计信息 */
  const stats = computed(() => {
    const total = selectedQuestions.value.length
    const excluded = excludedUuids.value.size
    
    // 计算被过滤（自动排除）的题目数量
    let filtered = 0
    for (const q of questionDetails.value.values()) {
      if (isFilteredOut(q) && !excludedUuids.value.has(q.uuid)) {
        filtered++
      }
    }
    
    // willExport 排除手动排除和自动过滤的
    const willExport = total - excluded - filtered
    return { total, excluded, filtered, willExport }
  })

  // ============ Actions ============
  
  /** 进入错整模式 */
  function enterCorrectionMode() {
    currentMode.value = 'correction-review'
    selectedQuestions.value = []
    excludedUuids.value.clear()
    questionDetails.value.clear()
    // 重置排序和过滤
    sortField.value = 'review_date'
    sortOrder.value = 'desc'
    filterSettings.value = {
      questionTypes: [],
      errorTypes: [],
      dateRange: { from: null, to: null }
    }
  }
  
  /** 退出错整模式 */
  function exitCorrectionMode() {
    currentMode.value = 'normal'
    selectedQuestions.value = []
    excludedUuids.value.clear()
    questionDetails.value.clear()
    currentSubject.value = ''  // 清空当前学科
  }
  
  /** 设置/清空当前学科 */
  function setSubject(subject: string) {
    currentSubject.value = subject
  }
  
  /** 清空所有选择（保持错整模式）- 用于切换学科 */
  function clearAllSelections() {
    selectedQuestions.value = []
    excludedUuids.value.clear()
    questionDetails.value.clear()
    currentSubject.value = ''
  }
  
  /** 添加题目（从题目选择器调用）- 全量替换该试卷的题目 */
  function addQuestions(
    paperId: string, 
    paperName: string, 
    importedAt: string,
    subject: string,
    questions: PaperQuestion[]
  ) {
    // 1. 先移除该试卷的所有已有题目
    const paperQuestions = selectedQuestions.value.filter(q => q.paperId === paperId)
    paperQuestions.forEach(q => {
      excludedUuids.value.delete(q.uuid)
      questionDetails.value.delete(q.uuid)
    })
    selectedQuestions.value = selectedQuestions.value.filter(q => q.paperId !== paperId)
    
    // 2. 添加新选择的题目
    questions.forEach(q => {
      selectedQuestions.value.push({
        uuid: q.UUID,
        paperId,
        paperName,
        paperImportedAt: importedAt,
        subject
      })
    })
    
    // 3. 更新当前学科（使用第一个试卷的学科）
    if (subject && !currentSubject.value) {
      currentSubject.value = subject
    }
  }
  
  /** 移除某试卷的所有题目 */
  function removePaperQuestions(paperId: string) {
    const paperQuestions = selectedQuestions.value.filter(q => q.paperId === paperId)
    
    // 从 excludedUuids 中移除
    paperQuestions.forEach(q => excludedUuids.value.delete(q.uuid))
    
    // 从 selectedQuestions 中移除
    selectedQuestions.value = selectedQuestions.value.filter(q => q.paperId !== paperId)
    
    // 从 questionDetails 中移除（重要！否则重新添加试卷时会显示旧的详情）
    paperQuestions.forEach(q => {
      questionDetails.value.delete(q.uuid)
    })
    
    console.log('[correctionReview] 移除试卷:', paperId, '剩余题目:', selectedQuestions.value.length)
  }
  
  /** 切换题目的排除状态（支持手动排除和自动过滤） */
  function toggleExclude(uuid: string) {
    console.log('[toggleExclude] 点击题目:', uuid)
    console.log('[toggleExclude] 当前状态:', {
      isExcluded: excludedUuids.value.has(uuid),
      isFiltered: isFiltered(uuid),
      inExceptions: filterExceptions.value.has(uuid)
    })
    
    // 1. 如果已被手动排除，取消排除
    if (excludedUuids.value.has(uuid)) {
      excludedUuids.value.delete(uuid)
      console.log('[toggleExclude] 已手动排除，取消排除')
      return
    }
    
    // 2. 如果已被自动过滤，切换例外状态
    if (isFiltered(uuid)) {
      if (filterExceptions.value.has(uuid)) {
        filterExceptions.value.delete(uuid)
        console.log('[toggleExclude] 已在例外中，移除例外')
      } else {
        filterExceptions.value.add(uuid)
        console.log('[toggleExclude] 加入例外列表')
      }
      return
    }
    
    // 3. 正常题目，加入排除列表
    excludedUuids.value.add(uuid)
    console.log('[toggleExclude] 正常题目，加入排除列表')
  }
  
  /** 检查题目是否被排除 */
  function isExcluded(uuid: string) {
    return excludedUuids.value.has(uuid)
  }
  
  /** 检查题目是否被过滤（自动排除） */
  function isFiltered(uuid: string): boolean {
    // 如果在例外列表中，不算被过滤
    if (filterExceptions.value.has(uuid)) {
      console.log('[isFiltered]', uuid, '在例外列表中，返回 false')
      return false
    }
    const q = questionDetails.value.get(uuid)
    if (!q) {
      console.log('[isFiltered]', uuid, '题目不存在，返回 false')
      return false
    }
    const result = isFilteredOut(q)
    console.log('[isFiltered]', uuid, 'isFilteredOut 结果:', result)
    return result
  }
  
  /** 添加过滤例外（将已过滤题目纳入导出范围） */
  function addFilterException(uuid: string) {
    filterExceptions.value.add(uuid)
    console.log('[correctionReview] 添加过滤例外:', uuid)
  }
  
  /** 移除过滤例外 */
  function removeFilterException(uuid: string) {
    filterExceptions.value.delete(uuid)
  }
  
  /** 切换是否隐藏已过滤的题目 */
  function toggleHideFiltered() {
    hideFilteredQuestions.value = !hideFilteredQuestions.value
  }
  
  /** 加载题目详情 */
  async function loadQuestionDetails() {
    const uuids = selectedQuestions.value.map(q => q.uuid)
    if (uuids.length === 0) return
    
    isLoading.value = true
    try {
      const response = await correctionsApi.query({
        uuid: uuids.join(','),
        page_size: uuids.length
      })
      
      console.log('[DEBUG] query response:', response)
      
      // 处理 ApiResponse 结构 {code, message, data}
      let items: QuestionDetail[] = []
      if (response && typeof response === 'object') {
        if ('data' in response && response.data) {
          items = (response.data as any).items || []
        } else if ('items' in response) {
          items = (response as any).items || []
        }
      }
      
      console.log('[DEBUG] parsed items:', items)
      console.log('[DEBUG] first item paper_id:', items[0]?.paper_id)
      
      items.forEach((item: QuestionDetail) => {
        questionDetails.value.set(item.uuid, item)
      })
    } finally {
      isLoading.value = false
    }
  }
  
  /** 设置排序 */
  function setSort(field: SortField, order: SortOrder) {
    sortField.value = field
    sortOrder.value = order
  }
  
  /** 设置过滤 */
  function setFilter(settings: Partial<FilterSettings>) {
    Object.assign(filterSettings.value, settings)
    // 应用新过滤条件时，清空例外列表，让过滤重新生效
    filterExceptions.value.clear()
    console.log('[setFilter] 应用新过滤条件，清空例外列表')
  }
  
  /** 重置过滤 */
  function resetFilter() {
    filterSettings.value = {
      questionTypes: [],
      errorTypes: [],
      dateRange: { from: null, to: null }
    }
  }

  return {
    // State
    currentMode,
    selectedQuestions,
    questionDetails,
    excludedUuids,
    filterExceptions,
    isLoading,
    sortField,
    sortOrder,
    filterSettings,
    hideFilteredQuestions,
    currentSubject,
    // Getters
    isCorrectionReviewMode,
    totalSelected,
    groupedByPaper,
    getSelectedCountByPaper,
    sortedAndFilteredQuestions,
    isFilteredOut,
    stats,
    // Actions
    enterCorrectionMode,
    exitCorrectionMode,
    addQuestions,
    removePaperQuestions,
    toggleExclude,
    isExcluded,
    isFiltered,
    addFilterException,
    removeFilterException,
    toggleHideFiltered,
    loadQuestionDetails,
    setSort,
    setFilter,
    resetFilter,
    setSubject,
    clearAllSelections
  }
})
