/**
 * 边缘检测相关类型定义
 * 
 * 与后端 API 保持一致
 */

// 基础类型
export interface Point {
  x: number
  y: number
}

export interface Corners {
  tl: [number, number]  // Top-Left
  tr: [number, number]  // Top-Right
  br: [number, number]  // Bottom-Right
  bl: [number, number]  // Bottom-Left
}

export interface ImageSize {
  width: number
  height: number
}

// 边缘检测图片
export interface EdgeDetectionImage {
  image_id: string
  image_path: string
  image_size: ImageSize
  corners: Corners | null
  is_default?: boolean  // 是否为默认四角（检测失败时）
  thumbnailUrl?: string
  file?: File  // 原始文件（用于上传）
}

// 检测结果
export interface DetectionResultItem {
  image_id: string
  image_path: string
  image_size: ImageSize
  corners: Corners | null
  success: boolean
  message: string
  is_default?: boolean
}

// 检测响应
export interface DetectResponseData {
  results: DetectionResultItem[]
  success_count: number
  fail_count: number
  total: number
}

// 矫正项
export interface CorrectionItem {
  image_id: string
  input_path: string
  corners: Corners
  output_filename: string
  order: number
}

// 矫正结果
export interface CorrectionResultItem {
  image_id: string
  output_path: string
  output_size?: ImageSize
  success: boolean
  message: string
}

// 矫正响应
export interface CorrectResponseData {
  results: CorrectionResultItem[]
  success_count: number
  fail_count: number
  output_dir: string
}

// 上传响应
export interface UploadTempResponseData {
  image_id: string
  image_path: string
  image_size: ImageSize
}

// 批量上传响应
export interface BatchUploadResponseData {
  batch_id: string
  uploaded_count: number
  images: Array<{
    image_id: string
    image_path: string
    image_size: ImageSize
    filename: string
  }>
}
