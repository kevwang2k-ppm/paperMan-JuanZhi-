// 错题订正功能类型定义

/** 图片信息 */
export interface CorrectionImage {
  /** 图片唯一标识 */
  id: string
  /** 文件名 */
  filename: string
  /** 访问 URL */
  url: string
  /** 文件大小（字节） */
  size: number
  /** 图片级别: question-题目级, paper-试卷级 */
  level: 'question' | 'paper'
  /** 创建时间 */
  createdAt: string
}

/** 原题切片 */
export interface OriginalSlice {
  /** 文件名 */
  filename: string
  /** 访问 URL */
  url: string
  /** 创建时间 */
  createdAt: string
}

/** 上传配置 */
export interface UploadConfig {
  /** 是否仅限本题（true=题目级，false=试卷级） */
  onlyThisQuestion: boolean
}

/** 订正数据状态 */
export interface CorrectionState {
  /** 当前题目 UUID */
  currentQuestionUuid: string | null
  /** 第一张原题切片 */
  firstOriginalImage: OriginalSlice | null
  /** 第一张订正图片 */
  firstCorrectionImage: CorrectionImage | null
  /** 所有订正图片（用于查看器） */
  allCorrectionImages: CorrectionImage[]
  /** 是否正在加载 */
  isLoading: boolean
  /** 上传配置 */
  uploadConfig: UploadConfig
}

// API 响应类型

export interface SlicesResponse {
  paper_id: string
  question_uuid: string
  total: number
  images: OriginalSlice[]
}

export interface ListResponse {
  paper_id: string
  question_uuid: string
  total: number
  correction_level: 'none' | 'question' | 'paper' | 'mixed'
  files: CorrectionImage[]
}

export interface UploadOptions {
  questionUuid?: string
  namingLevel: 'question' | 'paper'
}

export interface UploadResponse {
  paper_id: string
  naming_level: string
  question_uuid?: string
  uploaded_files: Array<{
    filename: string
    url: string
    size: number
    correction_id: string
  }>
}
