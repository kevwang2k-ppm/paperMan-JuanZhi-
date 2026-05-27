/**
 * 错题订正面板显示条件控制
 * 核心逻辑：仅当当前题目被标记为错题时才显示面板
 */

import { computed, type Ref, type ComputedRef } from 'vue'
import { useCorrectionStore } from '@/stores/correction'
import type { Question } from '@/types'

export interface UseCorrectionPanelReturn {
  /** 是否显示错题订正面板 */
  showCorrectionPanel: ComputedRef<boolean>
  /** 当前 focus 的题目 UUID（原始 UUID，不含 _extended） */
  currentQuestionUuid: ComputedRef<string | null>
  /** Correction Store 实例 */
  correctionStore: ReturnType<typeof useCorrectionStore>
}

/**
 * 错题订正面板显示条件控制
 * @param focusUuid 当前 focus 的题目 UUID
 * @param allQuestions 所有题目列表
 */
export function useCorrectionPanel(
  focusUuid: Ref<string | null>,
  allQuestions: Ref<Question[]>
): UseCorrectionPanelReturn {
  const correctionStore = useCorrectionStore()

  /**
   * 是否显示错题订正面板
   * 条件：
   * 1. 有 focus 的题目
   * 2. 该题目被标记为错题 (is_error === true)
   */
  const showCorrectionPanel = computed<boolean>(() => {
    if (!focusUuid.value) return false

    const currentQuestion = allQuestions.value.find(
      q => q.uuid === focusUuid.value || q.uuid.startsWith(focusUuid.value + '_')
    )

    return currentQuestion?.is_error === true
  })

  /**
   * 当前 focus 的题目 UUID（原始 UUID，不含 _extended）
   */
  const currentQuestionUuid = computed<string | null>(() => {
    return focusUuid.value?.replace(/_extended$/, '') || null
  })

  return {
    showCorrectionPanel,
    currentQuestionUuid,
    correctionStore
  }
}
