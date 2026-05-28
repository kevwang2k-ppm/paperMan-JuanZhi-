# PaperMan 卷帙

这是一个六年级学生的父亲，在人生中难得的16+个月全职陪伴孩子的时间里，为孩子写的一个试卷管理和错整应用。
起因是觉得常用的类似app某某宝并不符合孩子学校关于试题复习和和错题整理的习惯。同时，也担心孩子的个人信息在app上可能的泄露，于是手搓了这个app
PaperMan 移动端 Web 前端 - 使用 Vue 3 + TypeScript + Vite 构建。后端会调用AI接口完成试卷擦除和试题识别等功能。
整套app部署在本地电脑上，确保所有的试卷副本都只保存在本地。
目前公布前端所有代码并提供包含后端的preRelease版本。

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 📁 项目结构

```
src/
├── api/           # API 客户端和接口
├── components/    # Vue 组件
├── composables/   # 组合式函数
├── stores/        # Pinia 状态管理
├── utils/         # 工具函数
├── views/         # 页面视图
├── types/         # TypeScript 类型
└── router/        # 路由配置
```

## 🛠 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建**: Vite
- **样式**: Tailwind CSS
- **状态**: Pinia
- **路由**: Vue Router
- **HTTP**: Axios

## 📱 开发指南

### 添加新页面

1. 在 `src/views/` 创建 `.vue` 文件
2. 在 `src/router/index.ts` 添加路由
3. 可选：在 `src/components/` 创建专用组件

### 调用 API

```typescript
import { batchApi } from '@/api'

// 使用
const batch = await batchApi.createBatch({
  exam_name: '数学测验',
  student_id: 'S001',
  total_pages: 5
})
```

### 使用状态管理

```typescript
import { useBatchStore } from '@/stores'

const batchStore = useBatchStore()

// 读取状态
const progress = computed(() => batchStore.progressPercent)

// 调用 action
await batchStore.createBatch('测验', 'S001')
```

## 🔧 配置

### 开发服务器代理

在 `vite.config.ts` 中配置：

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  }
}
```

### 环境变量

创建 `.env` 文件：

```
VITE_API_BASE_URL=/api/v1
```

在代码中使用：

```typescript
const baseUrl = import.meta.env.VITE_API_BASE_URL
```

## 📄 代码规范

- 使用 Composition API (`<script setup>`)
- 组件名使用 PascalCase
- 组合式函数使用 `use` 前缀
- 类型定义放在 `src/types/`

## 🐛 调试

### Vue DevTools

浏览器安装 Vue.js devtools 扩展。

### 网络请求

打开浏览器开发者工具 → Network 面板查看 API 请求。

### 状态调试

安装 Pinia 浏览器扩展查看状态变化。

## 📚 参考

- [Vue 3 文档](https://vuejs.org/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [项目设计文档](../Doc_reArch/web-fastlane/)

## 联系方式
- 如果你对这个项目感兴趣，请联系 @ kevwang2k@outlook.com
