<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- 顶部导航 -->
    <header class="bg-white safe-area-top shadow-sm z-10">
      <div class="flex items-center justify-between px-4 py-3">
        <button @click="$router.back()" class="p-2 -ml-2 text-gray-600">
          <i class="fas fa-chevron-left"></i>
        </button>
        <h1 class="text-lg font-semibold text-gray-800">导出错题</h1>
        <button @click="$router.push('/')" class="p-2 -mr-2 text-gray-600 hover:text-blue-600" title="返回主页">
          <i class="fas fa-home text-lg"></i>
        </button>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="flex-1 overflow-y-auto p-4">
      <!-- 错题列表预览 -->
      <section class="bg-white rounded-2xl p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-medium text-gray-800">已选错题</h3>
          <span class="text-sm text-blue-600 font-medium">{{ selectedCount }} 题</span>
        </div>
        
        <!-- 错题缩略列表 -->
        <div class="space-y-2 max-h-48 overflow-y-auto">
          <div 
            v-for="q in selectedQuestions.slice(0, 5)" 
            :key="q.uuid"
            class="flex items-center p-2 bg-gray-50 rounded-lg"
          >
            <div class="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-xs text-blue-600 mr-3">
              {{ q.page_number }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-800 truncate">
                第{{ q.page_number }}页 - {{ getQuestionLabel(q) }}
              </p>
            </div>
            <button 
              @click="removeQuestion(q.uuid)"
              class="p-1 text-red-400 hover:text-red-600"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div v-if="selectedCount > 5" class="text-center text-sm text-gray-500 py-2">
            还有 {{ selectedCount - 5 }} 道...
          </div>
          
          <div v-if="selectedCount === 0" class="text-center text-gray-400 py-4">
            未选择错题
          </div>
        </div>
      </section>

      <!-- 导出配置 -->
      <section class="bg-white rounded-2xl p-4 mb-4">
        <h3 class="font-medium text-gray-800 mb-4">导出配置</h3>
        
        <div class="space-y-4">
          <!-- 导出配置方案 -->
          <div>
            <label class="block text-sm text-gray-600 mb-2">配置方案</label>
            <div class="relative">
              <select
                v-model="config.profile_id"
                class="w-full py-2 px-3 bg-gray-100 rounded-lg text-sm text-gray-800 appearance-none cursor-pointer"
              >
                <option value="">默认配置</option>
                <option 
                  v-for="profile in availableProfiles" 
                  :key="profile.profile_name" 
                  :value="profile.profile_name"
                >
                  {{ profile.profile_name }}
                  {{ profile.description ? ` - ${profile.description}` : '' }}
                </option>
              </select>
              <i class="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
            </div>
            <p v-if="profileLoading" class="text-xs text-gray-500 mt-1">
              <i class="fas fa-spinner fa-spin mr-1"></i>加载中...
            </p>
          </div>

          <!-- 纸张大小 -->
          <div>
            <label class="block text-sm text-gray-600 mb-2">纸张大小</label>
            <div class="flex space-x-2">
              <button 
                v-for="size in paperSizes" 
                :key="size.value"
                @click="config.paper_size = size.value"
                class="flex-1 py-2 rounded-lg font-medium text-sm transition-colors"
                :class="config.paper_size === size.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'"
              >
                {{ size.label }}
              </button>
            </div>
          </div>

          <!-- 背景模板 -->
          <div>
            <label class="block text-sm text-gray-600 mb-2">背景模板</label>
            <div class="grid grid-cols-4 gap-2 mb-3">
              <button
                v-for="bg in backgrounds"
                :key="bg.value"
                @click="selectBackground(bg.value)"
                class="py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                :class="config.background === bg.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'"
              >
                <i :class="bg.icon" class="mr-2"></i>
                {{ bg.label }}
              </button>
            </div>
            
            <!-- 自定义背景上传（仅当选择自定义时显示） -->
            <div v-if="config.background === 'custom'" 
                 class="border-2 border-dashed rounded-xl p-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                 :class="!hasCustomBackground && !customBackgroundName ? 'border-red-400 bg-red-50' : 'border-gray-300'"
                 @click="$refs.bgInput.click()">
              <input
                ref="bgInput"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                class="hidden"
                @change="handleBackgroundUpload"
                @click.stop
              />
              <div v-if="uploadingBackground" class="text-sm text-gray-600">
                <i class="fas fa-spinner fa-spin mr-2"></i>上传中...
              </div>
              <div v-else-if="customBackgroundName || hasCustomBackground" class="px-2">
                <span class="text-sm text-green-600">
                  <i class="fas fa-check-circle mr-1"></i>{{ customBackgroundName || '自定义背景' }}
                </span>
                <span class="text-xs text-gray-400 ml-2">(点击重新上传)</span>
              </div>
              <span 
                v-else
                class="text-sm font-medium"
                :class="!hasCustomBackground ? 'text-red-600 animate-pulse' : 'text-blue-600'"
              >
                <i class="fas fa-upload mr-1"></i>请上传自定义背景
              </span>
            </div>
            <!-- 提示信息 -->
            <p v-if="config.background === 'custom' && !hasCustomBackground && !customBackgroundName" 
               class="text-xs text-red-500 mt-1">
              <i class="fas fa-exclamation-circle mr-1"></i>未找到自定义背景，请先上传
            </p>
            <p v-else-if="config.background === 'custom'" class="text-xs text-gray-500 mt-1">
              支持 PNG/JPG，建议尺寸 A4/B5
            </p>
            
            <!-- 背景开关 -->
            <div class="mt-3 flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span class="text-sm text-gray-700">
                <i class="fas fa-image mr-2 text-gray-400"></i>导出时包含背景
              </span>
              <button 
                @click="config.include_background = !config.include_background"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                :class="config.include_background ? 'bg-blue-600' : 'bg-gray-300'"
              >
                <span 
                  class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
                  :class="config.include_background ? 'translate-x-5' : 'translate-x-1'"
                ></span>
              </button>
            </div>
          </div>





          <!-- QR Code 设置 -->
          <div class="border-t pt-4">
            <label class="block text-sm text-gray-800 font-medium mb-3">
              <i class="fas fa-qrcode mr-2 text-blue-600"></i>QR Code
            </label>
            
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm text-gray-600">
                显示 QR 码
                <span class="text-xs text-gray-400 ml-1">（将同时生成批次短编码）</span>
              </span>
              <button 
                @click="toggleQRCode"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                :class="showQRCode ? 'bg-blue-600' : 'bg-gray-300'"
              >
                <span 
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="showQRCode ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
            
            <div v-if="showQRCode" class="space-y-4">
              <!-- QR码打印位置选项 -->
              <div>
                <label class="block text-sm text-gray-600 mb-2">打印位置</label>
                <div class="flex flex-col space-y-2">
                  <label class="flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      v-model="config.qr_print_mode" 
                      value="footer"
                      class="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-sm text-gray-700">打印在页脚（每页显示）</span>
                  </label>
                  <label class="flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      v-model="config.qr_print_mode" 
                      value="separate"
                      class="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-sm text-gray-700">单独打印（汇总页）</span>
                  </label>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  {{ config.qr_print_mode === 'footer' ? '每页底部显示QR码' : '所有QR码集中在最后一页显示' }}
                </p>
              </div>
              
              <!-- QR码尺寸 -->
              <div>
                <label class="block text-sm text-gray-600 mb-2">尺寸</label>
                <div class="flex items-center space-x-3">
                  <input
                    v-model.number="config.qr_code_size"
                    type="range"
                    min="1.0"
                    max="1.5"
                    step="0.1"
                    class="flex-1"
                  />
                  <span class="text-sm text-gray-700 w-16">{{ config.qr_code_size }}cm</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">范围: 1.0 - 1.5 cm</p>
              </div>
            </div>
          </div>

          <!-- 高级设置 (v4.0) -->
          <div class="border-t pt-4">
            <!-- 高级设置标题（可点击展开/折叠） -->
            <button 
              @click="showAdvancedSettings = !showAdvancedSettings"
              class="w-full flex items-center justify-between text-left mb-3"
            >
              <label class="block text-sm text-gray-800 font-medium cursor-pointer">
                <i class="fas fa-cogs mr-2 text-gray-600"></i>高级设置
              </label>
              <i 
                class="fas fa-chevron-down text-gray-400 transition-transform"
                :class="showAdvancedSettings ? 'rotate-180' : ''"
              ></i>
            </button>
            
            <!-- 高级设置内容（可折叠） -->
            <div v-show="showAdvancedSettings" class="space-y-4">
              <!-- 增强版处理流程 -->
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-sm text-gray-700 font-medium">增强版处理流程</span>
                  <p class="text-xs text-gray-500 mt-0.5">预处理阶段完成切片和缩放，提升布局准确性</p>
                </div>
                <button 
                  @click="config.use_enhanced_processing = !config.use_enhanced_processing"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                  :class="config.use_enhanced_processing ? 'bg-green-600' : 'bg-gray-300'"
                >
                  <span 
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    :class="config.use_enhanced_processing ? 'translate-x-6' : 'translate-x-1'"
                  />
                </button>
              </div>
              
              <p v-if="!config.use_enhanced_processing" class="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                关闭后将使用旧版处理流程，布局准确性可能降低
              </p>

              <!-- 页面尺寸设置 -->
              <div class="border-t border-gray-200 pt-4">
                <label class="block text-sm text-gray-800 font-medium mb-3">
                  <i class="fas fa-ruler-combined mr-2 text-blue-600"></i>页面尺寸
                </label>
                
                <!-- 线宽设置 -->
                <div class="mb-4">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-sm text-gray-600">线宽</label>
                    <div class="flex items-center space-x-2">
                      <button 
                        @click="setLineWidthMode('default')"
                        class="text-xs px-2 py-1 rounded"
                        :class="lineWidthMode === 'default' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'"
                      >默认</button>
                      <button 
                        @click="setLineWidthMode('custom')"
                        class="text-xs px-2 py-1 rounded"
                        :class="lineWidthMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'"
                      >自定义</button>
                    </div>
                  </div>
                  <div v-if="lineWidthMode === 'custom'" class="flex items-center space-x-2">
                    <input
                      v-model.number="config.line_width"
                      type="number"
                      placeholder="输入线宽像素值"
                      class="flex-1 py-2 px-3 bg-gray-100 rounded-lg text-sm"
                      @focus="ensureLineWidthValue"
                    />
                    <span class="text-sm text-gray-500">px</span>
                  </div>
                  <p v-else class="text-xs text-gray-500">使用纸张默认值 (B5:1758, A4:1890)</p>
                </div>
                
                <!-- 行高设置 -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-sm text-gray-600">行高</label>
                    <div class="flex items-center space-x-2">
                      <button 
                        @click="setLineHeightMode('auto')"
                        class="text-xs px-2 py-1 rounded"
                        :class="lineHeightMode === 'auto' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'"
                      >自动检测</button>
                      <button 
                        @click="setLineHeightMode('custom')"
                        class="text-xs px-2 py-1 rounded"
                        :class="lineHeightMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'"
                      >自定义</button>
                    </div>
                  </div>
                  <div v-if="lineHeightMode === 'custom'" class="flex items-center space-x-2">
                    <input
                      v-model.number="config.line_height"
                      type="number"
                      placeholder="输入行高像素值"
                      class="flex-1 py-2 px-3 bg-gray-100 rounded-lg text-sm"
                      @focus="ensureLineHeightValue"
                    />
                    <span class="text-sm text-gray-500">px</span>
                  </div>
                  <p v-else class="text-xs text-gray-500">从模板横线自动计算</p>
                </div>
                
                <!-- 最小缩放比例设置 -->
                <div class="mt-4">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-sm text-gray-600">最小缩放比例</label>
                    <span class="text-xs text-gray-500">默认 0.3</span>
                  </div>
                  <div class="flex items-center space-x-3">
                    <input
                      :value="minScaleSliderValue"
                      @input="config.min_scale = ($event.target as HTMLInputElement).valueAsNumber"
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      class="flex-1"
                    />
                    <span class="text-sm text-gray-700 w-16">{{ config.min_scale ?? 0.3 }}</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">防止切片过度缩小，范围 0.1-1.0</p>
                </div>
              </div>

              <!-- 视觉一致性算法设置 -->
              <div class="border-t border-gray-200 pt-4">
                <label class="block text-sm text-gray-800 font-medium mb-3">
                  <i class="fas fa-magic mr-2 text-purple-600"></i>视觉一致性算法
                </label>
                
                <!-- 启用智能缩放 -->
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <span class="text-sm text-gray-700 font-medium">启用智能缩放</span>
                    <p class="text-xs text-gray-500 mt-0.5">基于原卷面比例保持视觉一致性</p>
                  </div>
                  <button 
                    @click="config.use_smart_scaling = !config.use_smart_scaling"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                    :class="config.use_smart_scaling ? 'bg-purple-600' : 'bg-gray-300'"
                  >
                    <span 
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      :class="config.use_smart_scaling ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>
                </div>
                
                <!-- 比例差异阈值（仅在启用智能缩放时显示） -->
                <div v-if="config.use_smart_scaling" class="mb-4">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-sm text-gray-600">比例差异阈值</label>
                    <span class="text-xs text-gray-500">默认 0%</span>
                  </div>
                  <div class="flex items-center space-x-3">
                    <input
                      v-model.number="config.ratio_diff_threshold"
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.05"
                      class="flex-1"
                    />
                    <span class="text-sm text-gray-700 w-16">{{ Math.round(config.ratio_diff_threshold * 100) }}%</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">超过此差异时启用智能方案，范围 0%-50%</p>
                </div>
                
                <!-- 页边距占比（仅在启用智能缩放时显示） -->
                <div v-if="config.use_smart_scaling">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-sm text-gray-600">页边距占比</label>
                    <span class="text-xs text-gray-500">默认 15%</span>
                  </div>
                  <div class="flex items-center space-x-3">
                    <input
                      v-model.number="config.page_margin_ratio"
                      type="range"
                      min="0.0"
                      max="0.5"
                      step="0.05"
                      class="flex-1"
                    />
                    <span class="text-sm text-gray-700 w-16">{{ Math.round(config.page_margin_ratio * 100) }}%</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">原卷面左右页边距占比，范围 0%-50%</p>
                </div>
                
                <!-- 补白阈值设置 -->
                <div v-if="config.use_smart_scaling" class="mt-4 pt-4 border-t border-gray-100">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-sm text-gray-600">补白阈值</label>
                    <span class="text-xs text-gray-500">默认 0%</span>
                  </div>
                  <div class="flex items-center space-x-3">
                    <input
                      v-model.number="config.padding_threshold_ratio"
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      class="flex-1"
                    />
                    <span class="text-sm text-gray-700 w-16">{{ Math.round(config.padding_threshold_ratio * 100) }}%</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">切片高度超过行高的此比例时才补白</p>
                </div>
              </div>

              <!-- 超大题页尾保留阈值 -->
              <div class="border-t border-gray-200 pt-4">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <span class="text-sm text-gray-700 font-medium">超大题放置策略</span>
                    <p class="text-xs text-gray-500 mt-0.5">
                      {{ config.oversized_threshold_pct === 0 ? '紧凑模式：总是立即放置' : 
                         config.oversized_threshold_pct === 100 ? '清晰模式：必须在页首' : 
                         '平衡模式：剩余空间充足时放置' }}
                    </p>
                  </div>
                  <span class="text-sm font-medium text-green-600">{{ config.oversized_threshold_pct }}%</span>
                </div>
                <input 
                  v-model.number="config.oversized_threshold_pct"
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                >
                <div class="flex justify-between text-xs text-gray-400 mt-1">
                  <span>紧凑(0%)</span>
                  <span>平衡(50%)</span>
                  <span>清晰(100%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        

      </section>

    </main>

    <!-- 底部操作 -->
    <footer class="bg-white border-t safe-area-bottom p-4">
      <button 
        @click="startExport"
        :disabled="isExporting || selectedCount === 0"
        class="w-full py-3 rounded-xl font-medium flex items-center justify-center transition-colors"
        :class="isExporting || selectedCount === 0 ? 'bg-gray-300 text-white' : 'bg-green-600 text-white'"
      >
        <i v-if="isExporting" class="fas fa-circle-notch fa-spin mr-2"></i>
        <i v-else class="fas fa-file-export mr-2"></i>
        <span>{{ isExporting ? '导出中...' : `导出错题 (${selectedCount})` }}</span>
      </button>
    </footer>

    <!-- 导出进度弹窗 -->
    <div v-if="showProgress" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i v-if="exportStatus === 'failed'" class="fas fa-exclamation-circle text-3xl text-red-500"></i>
            <i v-else-if="exportStatus === 'completed'" class="fas fa-check-circle text-3xl text-green-500"></i>
            <i v-else class="fas fa-file-export text-3xl text-blue-600 fa-spin-pulse"></i>
          </div>
          
          <h3 class="font-medium text-gray-800">
            {{ exportStatus === 'failed' ? '导出失败' : exportStatus === 'completed' ? '导出成功' : '正在导出错题...' }}
          </h3>
          
          <p class="text-sm text-gray-500 mt-1">
            {{ currentStage }}
          </p>
        </div>
        
        <!-- 进度条 -->
        <div class="mb-4">
          <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              class="h-2 rounded-full transition-all duration-300"
              :class="exportStatus === 'failed' ? 'bg-red-500' : exportStatus === 'completed' ? 'bg-green-500' : 'bg-blue-600'"
              :style="{ width: exportProgress + '%' }"
            ></div>
          </div>
          <p class="text-center text-sm text-gray-500">{{ exportProgress }}%</p>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex space-x-3">
          <button 
            v-if="exportStatus === 'failed'"
            @click="retryExport"
            class="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium"
          >
            重试
          </button>
          <button 
            v-if="exportStatus === 'completed'"
            @click="downloadFile"
            :disabled="isDownloading"
            class="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium disabled:bg-green-400"
          >
            {{ isDownloading ? '下载中...' : '下载文件' }}
          </button>
          <button 
            @click="closeProgress"
            class="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium"
            :class="{ 'w-full': exportStatus === 'processing' }"
          >
            {{ exportStatus === 'processing' ? '后台运行' : '关闭' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import client from '@/api/client'
import { exportApi, type ExportTask, type ExportProfile } from '@/api/export'
import type { ExportConfig, Question } from '@/types'

const route = useRoute()
const router = useRouter()

// 从路由参数获取 paper_id
const paperId = route.params.paperId as string

// 导出数据（从 sessionStorage 获取）
const exportData = ref<{
  mode?: 'single' | 'multi'
  paperId?: string
  studentId?: string
  subject?: string
  questions?: Question[]
}>({})

// 从 sessionStorage 加载导出数据
function loadExportData() {
  try {
    const saved = sessionStorage.getItem('exportData')
    if (saved) {
      exportData.value = JSON.parse(saved)
      if (exportData.value.questions) {
        selectedQuestions.value = exportData.value.questions
      }
    }
  } catch (e) {
    console.error('加载导出数据失败:', e)
  }
}

// student_id 从 exportData 获取
const studentId = computed(() => {
  return exportData.value.studentId || (route.query.student_id as string) || ''
})

// 配置选项
const paperSizes = [
  { label: 'A4', value: 'A4' },
  { label: 'B5', value: 'B5' },
  { label: 'A3', value: 'A3' }
]

const backgrounds = [
  { label: '基于配置', value: 'from_profile', icon: 'fas fa-cog' },
  { label: '横线', value: 'lined', icon: 'fas fa-grip-lines' },
  { label: '网格', value: 'grid', icon: 'fas fa-border-all' },
  { label: '自定义', value: 'custom', icon: 'fas fa-th-large' }
]

// 状态
const config = ref<ExportConfig>({
  paper_size: 'B5',
  background: 'from_profile',  // 默认使用配置中的背景
  profile_id: '',  // 默认空，表示不使用 profile
  background_template: '',
  include_background: false,  // 默认不包含背景
  line_width: null,      // null 表示使用纸张默认值
  line_height: null,     // null 表示自动检测
  qr_code_size: 1.5,     // 默认 1.5cm
  qr_print_mode: 'footer', // 默认页脚打印模式
  min_scale: null,       // null 表示使用默认值 0.3
  // 视觉一致性算法参数（智能缩放）
  use_smart_scaling: true,       // 默认启用智能缩放
  ratio_diff_threshold: 0,       // 默认 0%
  page_margin_ratio: 0.15,       // 默认 15%
  // 补白阈值参数
  padding_threshold_ratio: 0,    // 默认 0%
  // 增强版处理流程参数 (v4.0)
  use_enhanced_processing: true,  // 默认启用增强版处理流程
  // 超大题页尾保留阈值参数
  oversized_threshold_pct: 100   // 默认100%（清晰模式，超大题必须在页首）
})

// 最小缩放比例滑块值（null 时显示默认值 0.3）
const minScaleSliderValue = computed(() => config.value.min_scale ?? 0.3)

// 页面尺寸设置模式
const lineWidthMode = ref<'default' | 'custom'>('default')
const lineHeightMode = ref<'auto' | 'custom'>('auto')
const showQRCode = ref(false)
const showAdvancedSettings = ref(false)  // 高级设置折叠状态

// 当切换行高模式时，自动填充默认值
watch(lineHeightMode, (newMode) => {
  if (newMode === 'custom') {
    // 如果当前没有值或值为null，填充默认值
    if (!config.value.line_height || config.value.line_height <= 0) {
      const defaultHeights: Record<string, number> = {
        'B5': 90,
        'A4': 90,
        'A3': 100
      }
      config.value.line_height = defaultHeights[config.value.paper_size] || 90
      console.log(`[Export] 自动填充默认行高: ${config.value.line_height}px`)
    }
  }
})

// 设置行高模式
function setLineHeightMode(mode: 'auto' | 'custom') {
  lineHeightMode.value = mode
  if (mode === 'custom') {
    // 总是根据当前纸张大小填充对应的默认行高
    const defaultHeights: Record<string, number> = {
      'B5': 90,
      'A4': 90,
      'A3': 100
    }
    config.value.line_height = defaultHeights[config.value.paper_size] || 90
    console.log(`[Export] 自动填充默认行高: ${config.value.line_height}px (纸张: ${config.value.paper_size})`)
  }
}

// 确保行高有值（当用户聚焦输入框时）
function ensureLineHeightValue() {
  if (!config.value.line_height || config.value.line_height <= 0) {
    const defaultHeights: Record<string, number> = {
      'B5': 90,
      'A4': 90,
      'A3': 100
    }
    config.value.line_height = defaultHeights[config.value.paper_size] || 90
  }
}

// 当切换线宽模式时，自动填充默认值
watch(lineWidthMode, (newMode) => {
  if (newMode === 'custom') {
    if (!config.value.line_width || config.value.line_width <= 0) {
      const defaultWidths: Record<string, number> = {
        'B5': 1758,
        'A4': 1890,
        'A3': 2835
      }
      config.value.line_width = defaultWidths[config.value.paper_size] || 1758
      console.log(`[Export] 自动填充默认线宽: ${config.value.line_width}px`)
    }
  }
})

// 设置线宽模式
function setLineWidthMode(mode: 'default' | 'custom') {
  lineWidthMode.value = mode
  if (mode === 'custom') {
    // 总是根据当前纸张大小填充对应的默认线宽
    const defaultWidths: Record<string, number> = {
      'B5': 1758,
      'A4': 1890,
      'A3': 2835
    }
    config.value.line_width = defaultWidths[config.value.paper_size] || 1758
    console.log(`[Export] 自动填充默认线宽: ${config.value.line_width}px (纸张: ${config.value.paper_size})`)
  }
}

// 确保线宽有值（当用户聚焦输入框时）
function ensureLineWidthValue() {
  if (!config.value.line_width || config.value.line_width <= 0) {
    const defaultWidths: Record<string, number> = {
      'B5': 1758,
      'A4': 1890,
      'A3': 2835
    }
    config.value.line_width = defaultWidths[config.value.paper_size] || 1758
  }
}

// 可用的配置方案列表
const availableProfiles = ref<ExportProfile[]>([])
const profileLoading = ref(false)

const isExporting = ref(false)
const isDownloading = ref(false)
const showProgress = ref(false)
const exportProgress = ref(0)
const exportStatus = ref<'processing' | 'completed' | 'failed'>('processing')
const currentStage = ref('准备中...')
const currentTaskId = ref('')
const currentResult = ref<ExportTask['result']>(null)

// 自定义背景上传状态
const uploadingBackground = ref(false)
const customBackgroundName = ref('')
const bgInput = ref<HTMLInputElement | null>(null)
const hasCustomBackground = ref(false)  // 是否有自定义背景文件
const customBackgroundPath = ref('')    // 自定义背景路径

// 从父组件或 query 获取已选错题
const selectedQuestions = ref<Question[]>([])
const selectedCount = computed(() => selectedQuestions.value.length)

// 获取题目标签（层级信息）
function getQuestionLabel(q: Question): string {
  const levels = [q.level_1, q.level_2, q.level_3, q.level_4]
    .filter(l => l && l !== '0' && l !== '')
  return levels.length > 0 ? levels.join('-') : '第1题'
}

// 从本地存储加载已选错题
function loadSelectedQuestions() {
  // 从 exportData 加载
  if (exportData.value.questions && exportData.value.questions.length > 0) {
    selectedQuestions.value = exportData.value.questions
  }
}

// 移除错题（仅从当前列表移除，不影响 ReviewView）
function removeQuestion(uuid: string) {
  selectedQuestions.value = selectedQuestions.value.filter(q => q.uuid !== uuid)
}

// 选择背景（预设或自定义）
async function selectBackground(value: string) {
  // 如果选择自定义，先检查是否有自定义背景
  if (value === 'custom') {
    await checkCustomBackground()
    
    if (!hasCustomBackground.value) {
      // 没有自定义背景，显示提示，但不阻止选择
      // 上传按钮会红色高亮提示用户
      console.log('[Background] 选择自定义，但没有自定义背景文件')
    } else {
      // 有自定义背景，使用它
      config.value.background_template = customBackgroundPath.value
      customBackgroundName.value = '自定义背景'
    }
  }
  
  config.value.background = value
  
  // 选择非自定义背景时，清除自定义背景模板（但不删除文件）
  if (value !== 'custom') {
    config.value.background_template = ''
    customBackgroundName.value = ''
  }
}

// 检查学生是否有自定义背景
async function checkCustomBackground() {
  if (!studentId.value) {
    hasCustomBackground.value = false
    return
  }
  
  try {
    const result = await client.get(`/web-fastlane/custom-background/${studentId.value}`)
    
    if (result.code === 200 && result.data.exists) {
      hasCustomBackground.value = true
      customBackgroundPath.value = result.data.background_url
      console.log('[Background] 找到自定义背景:', result.data.background_url)
    } else {
      hasCustomBackground.value = false
      customBackgroundPath.value = ''
      console.log('[Background] 无自定义背景')
    }
  } catch (e) {
    console.error('检查自定义背景失败:', e)
    hasCustomBackground.value = false
  }
}

// 切换 QR Code 显示
function toggleQRCode() {
  showQRCode.value = !showQRCode.value
  config.value.qr_code_size = showQRCode.value ? 1.5 : null
}

// 处理背景图片上传
async function handleBackgroundUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  // 验证文件类型
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    alert('仅支持 PNG/JPG 格式的图片')
    return
  }
  
  // 验证文件大小（10MB）
  if (file.size > 10 * 1024 * 1024) {
    alert('文件大小不能超过 10MB')
    return
  }
  
  uploadingBackground.value = true
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('student_id', studentId.value)
    
    // 调用后端 API 上传背景
    const result = await client.post('/web-fastlane/upload-background', formData)
    
    if (result.code === 200) {
      config.value.background = 'custom'
      config.value.background_template = result.data.background_url
      customBackgroundName.value = file.name
      // 更新自定义背景状态
      hasCustomBackground.value = true
      customBackgroundPath.value = result.data.background_url
      console.log('[Background] 上传成功，路径:', result.data.background_url)
    } else {
      alert('上传失败：' + result.message)
    }
  } catch (e) {
    console.error('上传背景失败:', e)
    alert('上传失败，请重试')
  } finally {
    uploadingBackground.value = false
    // 清空 input，允许重复选择同一文件
    input.value = ''
  }
}



// 加载学生的配置方案列表
async function loadExportProfiles() {
  console.log('loadExportProfiles 被调用，studentId:', studentId.value)
  
  if (!studentId.value) {
    console.warn('studentId 为空，跳过加载配置方案')
    return
  }
  
  profileLoading.value = true
  try {
    console.log('正在调用 API 获取配置方案，studentId:', studentId.value)
    const response = await exportApi.getExportProfiles(studentId.value)
    console.log('API 响应:', response)
    
    if (response.code === 200) {
      availableProfiles.value = response.data.profiles
      console.log('配置方案加载成功:', availableProfiles.value)
    } else {
      console.error('API 返回错误:', response.message)
    }
  } catch (err: any) {
    console.error('加载配置方案失败:', err)
    console.error('错误详情:', err.response?.data || err.message)
  } finally {
    profileLoading.value = false
  }
}

// 轮询定时器
let pollInterval: number | null = null
// 超时定时器
let timeoutTimer: number | null = null

// 开始导出
async function startExport() {
  if (selectedCount.value === 0) {
    alert('请至少选择一道错题')
    return
  }
  
  if (!studentId.value) {
    alert('未找到学生信息，请重新进入页面')
    return
  }
  
  isExporting.value = true
  showProgress.value = true
  exportProgress.value = 0
  exportStatus.value = 'processing'
  currentStage.value = '准备中...'
  
  try {
    // 统一使用 createExport API，根据 paperId 判断模式
    const isMultiMode = paperId === 'multi'
    
    // 根据模式设置参数值
    const exportConfig: ExportConfig = {
      ...config.value,
      // 线宽：default 模式传 null，custom 模式传值
      line_width: lineWidthMode.value === 'default' ? null : config.value.line_width,
      // 行高：auto 模式传 null，custom 模式传值
      line_height: lineHeightMode.value === 'auto' ? null : config.value.line_height,
      // QR Code：不显示时传 null，显示时传配置值
      qr_code_size: showQRCode.value ? config.value.qr_code_size : null,
      // QR打印模式：不显示QR码时不传
      qr_print_mode: showQRCode.value ? config.value.qr_print_mode : undefined
    }
    
    // 调试日志
    console.log('[Export] 页面尺寸设置:', {
      lineWidthMode: lineWidthMode.value,
      lineHeightMode: lineHeightMode.value,
      line_width: exportConfig.line_width,
      line_height: exportConfig.line_height,
      qr_code_size: exportConfig.qr_code_size,
      qr_print_mode: exportConfig.qr_print_mode,
      min_scale: exportConfig.min_scale,
      use_smart_scaling: exportConfig.use_smart_scaling,
      ratio_diff_threshold: exportConfig.ratio_diff_threshold,
      page_margin_ratio: exportConfig.page_margin_ratio,
      use_enhanced_processing: exportConfig.use_enhanced_processing,  // v4.0
      oversized_threshold_pct: exportConfig.oversized_threshold_pct
    })
    
    const response = await exportApi.createExport({
      mode: isMultiMode ? 'multi' : 'single',
      
      // Single 模式参数
      paper_id: isMultiMode ? undefined : paperId,
      question_uuids: isMultiMode ? undefined : selectedQuestions.value.map(q => q.uuid),
      
      // Multi 模式参数
      question_ids: isMultiMode ? selectedQuestions.value.map(q => q.uuid) : undefined,
      
      // 通用参数
      student_id: studentId.value,
      config: exportConfig
    })
    
    const taskId = response.data.task_id
    currentTaskId.value = taskId
    
    // 如果有警告信息，显示提示
    if (response.data.warning) {
      console.warn('[Export] 警告:', response.data.warning)
      // 使用 setTimeout 延迟显示，让用户先看到进度面板
      setTimeout(() => {
        alert('⚠️ 提示: ' + response.data.warning)
      }, 500)
    }
    
    // 开始轮询进度
    startPolling(taskId)
    
  } catch (err: any) {
    console.error('创建导出任务失败:', err)
    exportStatus.value = 'failed'
    const errorMsg = err.response?.data?.detail || '创建任务失败'
    currentStage.value = errorMsg
    isExporting.value = false
    // 显示错误弹窗
    alert('导出失败: ' + errorMsg)
  }
}

// 轮询进度
function startPolling(taskId: string) {
  stopPolling()
  
  // 设置1分钟超时（60000毫秒）
  timeoutTimer = window.setTimeout(() => {
    console.log('导出任务超时（1分钟）')
    stopPolling()
    exportStatus.value = 'failed'
    currentStage.value = '导出超时，请重试'
    isExporting.value = false
    alert('导出任务超时（1分钟），请重试')
  }, 60000)
  
  pollInterval = window.setInterval(async () => {
    try {
      const response = await exportApi.getStatus(taskId)
      const task = response.data
      
      exportProgress.value = task.progress
      exportStatus.value = task.status as any
      currentStage.value = task.stage_name || task.message
      
      if (task.status === 'completed') {
        stopPolling()
        isExporting.value = false
        currentResult.value = task.result
        
        // 自动下载
        if (task.result?.download_url) {
          setTimeout(() => {
            exportApi.triggerDownload(taskId, task.result?.filename)
          }, 500)
        }
      } else if (task.status === 'failed') {
        stopPolling()
        isExporting.value = false
        currentStage.value = `导出失败: ${task.error || '未知错误'}`
      }
    } catch (err) {
      console.error('轮询失败:', err)
    }
  }, 2000) // 每2秒轮询一次
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  // 清除超时定时器
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
    timeoutTimer = null
  }
}

// 关闭进度弹窗
function closeProgress() {
  if (exportStatus.value === 'processing') {
    // 后台运行，只关闭弹窗
    showProgress.value = false
  } else {
    // 完成或失败，重置状态
    showProgress.value = false
    if (exportStatus.value === 'completed') {
      // 可以选择返回首页或留在当前页
      // router.push('/')
    }
  }
}

// 重试导出
function retryExport() {
  startExport()
}

// 下载文件
async function downloadFile() {
  if (isDownloading.value || !currentTaskId.value || !currentResult.value) return
  isDownloading.value = true
  try {
    await exportApi.triggerDownload(currentTaskId.value, currentResult.value.filename)
  } catch (e: any) {
    alert('下载失败，请重试')
  } finally {
    isDownloading.value = false
  }
}

// 监听 studentId 变化，加载配置方案
watch(() => studentId.value, (newStudentId, oldStudentId) => {
  console.log(`StudentId 变化: ${oldStudentId} -> ${newStudentId}`)
  if (newStudentId && newStudentId !== oldStudentId) {
    console.log('加载配置方案:', newStudentId)
    loadExportProfiles()
    localStorage.setItem('currentStudentId', newStudentId)
  }
}, { immediate: true })

// 生命周期
onMounted(() => {
  // 加载导出数据
  loadExportData()
  loadSelectedQuestions()
  
  // 确保加载配置方案（watch immediate 可能时机不对）
  setTimeout(() => {
    if (studentId.value && availableProfiles.value.length === 0) {
      console.log('onMounted 中手动加载配置方案')
      loadExportProfiles()
    }
    // 检查是否有自定义背景
    if (studentId.value) {
      checkCustomBackground()
    }
  }, 100)
  
  // 如果没有数据，可能是直接访问页面，给出提示
  if (selectedCount.value === 0) {
    console.warn('未找到已选错题，请从审阅页重新进入')
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.fa-spin-pulse {
  animation: fa-spin 1s infinite linear;
}

@keyframes fa-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
