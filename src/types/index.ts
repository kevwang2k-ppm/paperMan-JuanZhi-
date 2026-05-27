// 全局类型定义

// 批次相关
export interface Batch {
  id: string
  exam_name: string
  student_id: string
  student_name?: string
  total_pages: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'analyzing' | 'analyzed'
  created_at: string
  updated_at: string
}

export interface BatchProgress {
  batch_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'analyzed'
  total_pages: number
  completed_pages: number
  question_count?: number  // 已识别的题目总数（从进度API获取）
  current_page?: number
  message?: string
}

// 题目相关
export interface Question {
  uuid: string
  batch_id: string
  paper_id?: string  // 关联的试卷ID（batch模式下通过BatchPage关联）
  page_number: number
  question_number: string
  bbox_relative: [number, number, number, number]  // [y0, x0, y1, x1]
  bbox_absolute: [number, number, number, number]
  is_error: boolean
  snapshot_path?: string
  created_at: string
  // 层级信息
  level_1?: string
  level_2?: string
  level_3?: string
  level_4?: string
  // 题目类型和错误类型
  question_type?: string
  question_type_desc?: string
  primary_error_type_id?: string
  secondary_error_type_id?: string
  // 位置信息
  position?: string  // 主位置
  position_1?: string  // 扩展框/副位置
}

// 学生相关
export interface Student {
  id: string
  nickname: string
  grade?: string
  created_at?: string
}

// 试卷相关
export interface Paper {
  id: string
  name: string
  subject?: string
  grade?: string
  semester?: string
  status: 'analyzing' | 'analyzed' | 'imported' | 'deleted'
  total_pages: number
  question_count: number
  error_count?: number
  created_at: string
  updated_at?: string
  batch_id?: string | null
  student_id?: string
}

// 导出相关
export interface ExportConfig {
  paper_size: 'A4' | 'B5' | 'A3'
  background: 'lined' | 'grid' | 'custom'
  background_template?: string  // 自定义背景模板文件路径
  profile_id?: string
  include_background: boolean     // 导出时是否包含背景
  // 页面尺寸设置
  line_width?: number | null      // 线宽（像素），null表示使用纸张默认值
  line_height?: number | null     // 行高（像素），null表示自动检测
  // QR Code 设置
  qr_code_size?: number | null    // QR码尺寸（cm），范围1.0-1.5，null表示不显示
  qr_print_mode?: 'footer' | 'separate'  // QR码打印位置：footer=页脚打印(默认), separate=单独打印
  // 切片缩放设置
  min_scale?: number | null       // 最小缩放比例，范围0.1-1.0，null表示使用默认值0.3
  
  // 视觉一致性算法参数（智能缩放）
  use_smart_scaling?: boolean     // 启用智能缩放，默认true
  ratio_diff_threshold?: number   // 比例差异阈值（0.01-0.5），默认0.2
  page_margin_ratio?: number      // 页边距占比（0.0-0.5），默认0.20
  
  // 补白阈值参数
  padding_threshold_ratio?: number // 补白阈值（0.0-1.0），默认0.5，切片高度超过行高的此比例时才补白
  
  // 增强版处理流程参数 (v4.0)
  use_enhanced_processing?: boolean // 使用增强版处理流程（切片和缩放前移到预处理阶段），默认true
  
  // 超大题页尾保留阈值参数
  oversized_threshold_pct?: number  // 超大题页尾保留阈值百分比（0-100），默认100%
}

export interface ExportTask {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  result?: {
    pdf_url: string
    pdf_path: string
  }
  error?: string
}

// 图片上传
export interface UploadImage {
  id: string
  file: File
  preview: string
  pageNumber: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress?: number
}

// API 响应
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 路由参数
export interface RouteParams {
  batchId: string
}

// 边缘检测类型
export * from './edgeDetection'
