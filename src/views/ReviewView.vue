<template>
  <div class="h-screen bg-gray-900 flex flex-col overflow-hidden select-none touch-manipulation">
    <!-- 顶部导航 -->
    <header class="bg-gray-800 safe-area-top shadow-lg z-20 flex-shrink-0">
      <div class="flex items-center justify-between px-4 py-3">
        <!-- 左侧：返回按钮 -->
        <button @click="goBack" class="p-2 -ml-2 text-gray-400 hover:text-white">
          <i class="fas fa-chevron-left"></i>
        </button>
        
        <!-- 中间：页面信息、缩放控制、原图切换、筛选器 -->
        <div class="flex flex-col items-center">
          <span class="text-white text-xs opacity-70 truncate max-w-[200px]" :title="paperName">{{ paperName }}</span>
          <div class="flex items-center space-x-2">
            <!-- 缩放控制按钮组 -->
            <div class="flex items-center space-x-1">
              <!-- 展开状态：显示缩放控制（直接点击，无长按） -->
              <template v-if="isZoomExpanded">
                <button @click="zoomOut" class="px-2 py-0.5 bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 text-xs rounded-full transition-colors">
                  <i class="fas fa-minus text-xs"></i>
                </button>
                <button 
                  @click="resetView(); isZoomExpanded = false"
                  class="px-2 py-0.5 bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 text-xs font-medium min-w-[36px] rounded-full transition-colors">
                  {{ Math.round(scale * 100) }}%
                </button>
                <button @click="zoomIn" class="px-2 py-0.5 bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 text-xs rounded-full transition-colors">
                  <i class="fas fa-plus text-xs"></i>
                </button>
              </template>
              <!-- 默认状态：只显示百分比（点击重置，长按展开） -->
              <div 
                v-else
                class="flex items-center"
                @mousedown="startZoomLongPress"
                @mouseup="endZoomLongPress"
                @mouseleave="cancelZoomLongPress"
                @touchstart="startZoomLongPress"
                @touchend="endZoomLongPress"
                @touchmove="cancelZoomLongPress">
                <button 
                  @click="resetView()"
                  class="px-2 py-0.5 bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 text-xs font-medium min-w-[36px] rounded-full transition-colors">
                  {{ Math.round(scale * 100) }}%
                </button>
              </div>
            </div>
            
            <!-- 页码 - 圆角按钮风格 -->
            <span class="px-2 py-0.5 bg-gray-700 text-white text-xs rounded-full font-medium">
              {{ currentPage }} / {{ totalPages }}
            </span>
            
            <!-- 原图/去手写切换 -->
            <span 
              class="px-2 py-0.5 text-white text-xs rounded-full cursor-pointer"
              :class="isCleanMode ? 'bg-green-600' : 'bg-blue-600'" 
              @click="toggleMode">
              {{ isCleanMode ? '去手写' : '原图' }}
            </span>
            
            <!-- 矩形框筛选器 -->
            <div class="flex items-center bg-gray-700 rounded-full p-0.5">
              <button 
                @click="boxFilter = 'all'"
                :class="boxFilter === 'all' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'"
                class="px-2 py-0.5 text-[10px] rounded-full transition-colors">
                全部
              </button>
              <button 
                @click="boxFilter = 'error'"
                :class="boxFilter === 'error' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'"
                class="px-2 py-0.5 text-[10px] rounded-full transition-colors">
                错题
              </button>
              <button 
                @click="boxFilter = 'none'"
                :class="boxFilter === 'none' ? 'bg-gray-500 text-white' : 'text-gray-400 hover:text-white'"
                class="px-2 py-0.5 text-[10px] rounded-full transition-colors">
                无
              </button>
            </div>
            
            <!-- 列表模式下显示单页/所有切换 -->
            <span 
              v-if="isDeleteMode"
              @click="listMode = listMode === 'single' ? 'all' : 'single'"
              class="px-2 py-0.5 text-white text-xs rounded-full cursor-pointer bg-purple-600 hover:bg-purple-500 transition-colors">
              {{ listMode === 'single' ? '单' : '多' }}
            </span>
            
            <!-- 详/简显示切换 - 仅在面板展开时显示 -->
            <span 
              v-if="showPanel"
              class="px-2 py-0.5 text-white text-xs rounded-full cursor-pointer bg-purple-600 hover:bg-purple-500 transition-colors" 
              @click="isSimpleMode = !isSimpleMode">
              {{ isSimpleMode ? '简' : '详' }}
            </span>
          </div>
        </div>
        
        <!-- 右侧占位，保持顶部导航对称 -->
        <div class="w-8"></div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main 
      ref="mainContainer"
      class="flex-1 relative overflow-hidden select-none touch-manipulation"
      :class="selectedBox ? 'cursor-default' : 'cursor-grab'"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @wheel.prevent="handleWheel"
    >
      <!-- 加载提示 -->
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
        <div class="text-center text-white">
          <i class="fas fa-circle-notch fa-spin text-3xl mb-4"></i>
          <p>加载试卷图片...</p>
        </div>
      </div>

      <!-- 视图容器 (支持平移和缩放) -->
      <div 
        class="absolute will-change-transform"
        :style="viewTransform"
      >
        <!-- 图片和框容器 - 使用实际像素尺寸 -->
        <div 
          class="relative bg-gray-800"
          :style="{ width: imageWidth + 'px', height: imageHeight + 'px' }"
        >
          <!-- 加载占位 -->
          <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
            <div class="text-gray-500 text-sm">加载中...</div>
          </div>
          
          <!-- 试卷图片 - 使用实际像素尺寸，确保矩形框对齐 -->
          <img 
            v-show="!isLoading && currentImageUrl" 
            ref="pageImage"
            :src="currentImageUrl" 
            class="block select-none pointer-events-none"
            :style="{ width: imageWidth + 'px', height: imageHeight + 'px' }"
            draggable="false" 
            @load="onImageLoad"
            @error="console.error('[ReviewView] 图片加载失败:', currentImageUrl)"
          />

          <!-- 矩形框层 -->
          <div v-if="!isLoading && imageLoaded" class="absolute inset-0" @mousedown="onBackgroundClick" @touchstart="onBackgroundClick">
            <!-- Focus 模式下的外部遮罩层（深灰色） - 使用绝对像素坐标确保精确 -->
            <svg 
              v-if="focusUuid"
              class="absolute inset-0 pointer-events-none z-0"
              :width="imageWidth"
              :height="imageHeight"
            >
              <defs>
                <mask id="focus-mask">
                  <!-- 白色背景 = 显示遮罩 -->
                  <rect x="0" y="0" :width="imageWidth" :height="imageHeight" fill="white" />
                  <!-- 黑色矩形 = 挖洞（不显示遮罩） - 使用像素坐标 -->
                  <rect 
                    v-for="q in currentQuestions.filter(isFocusedBox)" 
                    :key="q.uuid"
                    :x="q.bbox_relative[1] * imageWidth"
                    :y="q.bbox_relative[0] * imageHeight"
                    :width="(q.bbox_relative[3] - q.bbox_relative[1]) * imageWidth"
                    :height="(q.bbox_relative[2] - q.bbox_relative[0]) * imageHeight"
                    fill="black"
                  />
                </mask>
              </defs>
              <!-- 遮罩层，应用 mask -->
              <rect 
                x="0" y="0" :width="imageWidth" :height="imageHeight" 
                fill="rgba(17, 24, 39, 0.7)" 
                mask="url(#focus-mask)"
              />
            </svg>
            
            <!-- 视图模式：显示所有框（编辑模式下只显示选中框，focus 模式下只显示 focus 框） -->
            <template v-for="(q, i) in currentQuestions" :key="q.uuid || i">
              <div 
                v-if="(!selectedBox || selectedBox?.uuid === q.uuid) && isQuestionVisible(q)"
                class="absolute question-box z-10 touch-manipulation"
                :class="{ 
                  'z-10': selectedBox?.uuid === q.uuid && !isFocusedBox(q),
                  'z-20': isFocusedBox(q) // focus 的框显示在最上层
                }"
                :style="getBoxStyle(q)"
                :data-uuid="q.uuid"
                @mousedown="onBoxClick($event, q)"
                @touchstart="onBoxClick($event, q)"
                @touchmove="onTouchMove"
                @touchend="onTouchEnd"
              >
                <!-- 矩形框主体 -->
                <div 
                  class="w-full h-full transition-colors duration-200 relative"
                  :class="[
                    // Focus 模式：无边框，仅使用高亮样式
                    isFocusedBox(q)
                      ? 'focus-highlight'
                      // 扩展框：虚线边框
                      : isExtendedBox(q) 
                        ? 'border-2 border-dashed border-green-400 bg-green-400/20'
                        // 编辑模式：显示边框，无填充（激活时边框加粗）
                        : selectedBox?.uuid === q.uuid 
                          ? (q.is_error ? 'border-[3px] border-red-500' : 'border-[3px] border-blue-400')
                          // 视图模式：无边框，浅灰色填充
                          : 'bg-gray-400/30'
                  ]"
                >
                  <!-- 题号标签 - 显示层级信息（移到矩形框内部左上角） -->
                  <span 
                    class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-medium text-white pointer-events-none whitespace-nowrap z-10"
                    :class="isExtendedBox(q) ? 'bg-green-500' : (q.is_error ? 'bg-red-500' : 'bg-blue-500')">
                    {{ getQuestionLabel(q) }}
                  </span>

                  <!-- 选中/取消标记 - 原题显示，扩展框不显示，focus 模式下隐藏 -->
                  <!-- 同时绑定 click 和 touchstart，确保在触摸设备上也能正常触发 -->
                  <div 
                    v-if="!isExtendedBox(q) && !focusUuid"
                    class="center-button absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-base shadow-lg z-20 cursor-pointer hover:scale-110 transition-transform select-none touch-manipulation"
                    :class="q.is_error ? 'bg-red-500 text-white' : 'bg-white text-gray-600 border-2 border-gray-300'"
                    @click.stop.prevent="onCenterButtonClick($event, q)"
                    @touchstart.stop.prevent="onCenterButtonClick($event, q)">
                    <i v-if="q.is_error" class="fas fa-check text-base select-none"></i>
                    <span v-else class="text-lg select-none">☐</span>
                  </div>
                </div>

                <!-- 调整大小手柄（仅在编辑模式选中时显示） -->
                <template v-if="selectedBox?.uuid === q.uuid">
                  <!-- 角落 L 形手柄（位于矩形框外部，紧贴框角） -->
                  <div 
                    v-for="h in resizeHandles" 
                    :key="h.position"
                    class="absolute z-30"
                    :style="getHandleWrapperStyle(h)"
                    @mousedown.stop="startResize($event, h.position)"
                    @touchstart.stop="startResize($event, h.position)"
                  >
                    <div 
                      class="absolute w-3 h-3"
                      :class="[
                        h.position === 'nw' ? 'right-1/2 bottom-1/2 border-l-[3px] border-t-[3px]' : '',
                        h.position === 'ne' ? 'left-1/2 bottom-1/2 border-r-[3px] border-t-[3px]' : '',
                        h.position === 'sw' ? 'right-1/2 top-1/2 border-l-[3px] border-b-[3px]' : '',
                        h.position === 'se' ? 'left-1/2 top-1/2 border-r-[3px] border-b-[3px]' : '',
                        q.is_error ? 'border-red-500' : 'border-blue-500'
                      ]"
                    />
                  </div>
                  
                  <!-- 边缘拖拽区域（仅在框足够大时显示，避免占据小框全部空间） -->
                  <template v-if="(q.bbox_relative[2] - q.bbox_relative[0]) * imageHeight > 80 && (q.bbox_relative[3] - q.bbox_relative[1]) * imageWidth > 80">
                    <!-- 上下边缘（高度减小到 h-2 = 8px） -->
                    <div class="absolute inset-x-0 top-0 h-2 cursor-n-resize z-30" @mousedown.stop="startResize($event, 'n')" @touchstart.stop="startResize($event, 'n')" />
                    <div class="absolute inset-x-0 bottom-0 h-2 cursor-s-resize z-30" @mousedown.stop="startResize($event, 's')" @touchstart.stop="startResize($event, 's')" />
                    <!-- 左右边缘（宽度减小到 w-2 = 8px） -->
                    <div class="absolute inset-y-0 left-0 w-2 cursor-w-resize z-30" @mousedown.stop="startResize($event, 'w')" @touchstart.stop="startResize($event, 'w')" />
                    <div class="absolute inset-y-0 right-0 w-2 cursor-e-resize z-30" @mousedown.stop="startResize($event, 'e')" @touchstart.stop="startResize($event, 'e')" />
                  </template>
                </template>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 缩放控制（已移至底部栏） -->
      <!-- 页面导航（已移至底部栏） -->
    </main>

    <!-- 底部工具栏 -->
    <footer class="bg-gray-800 safe-area-bottom z-20 flex-shrink-0">
      <!-- 面板标题栏 -->
      <div class="bg-gray-700 px-4 py-1 flex items-center justify-between cursor-pointer" @click="showPanel = !showPanel">
        <div class="flex items-center text-white">
          <template v-if="isDeleteMode">
            <i class="fas fa-list text-red-400 mr-2"></i>
            <span>列表模式 - {{ listMode === 'single' ? '当前页' : '全部' }} {{ listModeQuestions.length }} 题</span>
          </template>
          <template v-else>
            <i class="fas fa-check-square text-green-400 mr-2"></i>
            <span>已选 {{ selectedCount }} 题 (共 {{ allQuestions.length }} 题)</span>
          </template>
        </div>
        <div class="flex items-center text-gray-400">
          <span class="text-xs mr-2">{{ showPanel ? '收起' : '展开' }}</span>
          <i class="fas fa-chevron-up transition-transform" :class="{ 'rotate-180': showPanel }"></i>
        </div>
      </div>

      <!-- 面板内容 -->
      <div v-if="showPanel" :class="correctionPanelCollapsed ? 'max-h-60' : 'max-h-[120px]'" class="overflow-y-auto bg-gray-50 p-2 transition-all duration-300">
        <!-- 删除模式：显示当前页所有题目 -->
        <template v-if="isDeleteMode">
          <div v-if="listModeQuestions.length === 0" class="text-center text-gray-400 py-4 text-sm">
            {{ listMode === 'single' ? '当前页面没有题目' : '试卷中没有题目' }}
          </div>
          <div 
            v-for="q in listModeQuestions" 
            :key="q.uuid" 
            :data-uuid="getOriginalUuid(q.uuid)"
            class="p-2 rounded-lg mb-2 shadow-sm cursor-pointer transition-colors"
            :class="{ 
              'bg-red-50 border-red-300 border': questionsToDelete.has(q.uuid),
              'bg-blue-500 text-white border-blue-600': selectedListItemUuid === getOriginalUuid(q.uuid) && !questionsToDelete.has(q.uuid),
              'bg-white': !questionsToDelete.has(q.uuid) && selectedListItemUuid !== getOriginalUuid(q.uuid)
            }"
            @click="onListItemClick(q)">
            <!-- 题目基本信息行 -->
            <div class="flex items-center">
              <div 
                class="w-8 h-8 rounded flex items-center justify-center text-xs mr-2"
                :class="q.is_error ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'">
                {{ q.page_number }}
              </div>
              <div class="flex-1 text-sm font-medium">
                第{{ q.page_number }}页 - {{ getQuestionLabel(q) }}
                <span v-if="q.is_error" class="ml-1 text-xs text-red-500">(错题)</span>
              </div>
              <!-- 扩/收按钮 -->
              <template v-if="!hasExtendedBox(q)">
                <button 
                  @click.stop="onExpandClick(q, true)" 
                  class="px-2 py-1 text-xs bg-green-100 text-green-600 rounded mr-1 hover:bg-green-200"
                  :disabled="isExpanding || pendingExpandQuestion?.uuid === q.uuid">
                  {{ pendingExpandQuestion?.uuid === q.uuid ? '等' : '扩' }}
                </button>
              </template>
              <template v-else>
                <button 
                  @click.stop="shrinkQuestion(q)" 
                  class="px-2 py-1 text-xs bg-orange-100 text-orange-600 rounded mr-1 hover:bg-orange-200"
                  :disabled="isShrinking">
                  收
                </button>
                <span 
                  class="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded mr-1 cursor-pointer hover:bg-purple-200"
                  @click.stop="jumpToExtendedPageAndHighlight(q)">
                  第{{ getExtendedBoxPage(q) }}页
                </span>
              </template>
              <!-- 删除标记按钮 -->
              <button 
                @click.stop="toggleDeleteMark(q.uuid)" 
                :class="questionsToDelete.has(q.uuid) 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'"
                class="px-3 py-1 text-xs rounded transition-colors">
                标记
              </button>
              <!-- 移动按钮：移动该题目框到当前页 -->
              <button 
                @click.stop="moveBoxToCurrentPage(q)" 
                class="px-2 py-1 text-xs bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors ml-1">
                移
              </button>
            </div>
          </div>
        </template>
        
        <!-- 正常模式：显示错题列表 -->
        <template v-else>
          <div v-if="selectedQuestions.length === 0" class="text-center text-gray-400 py-4 text-sm">点击方框标记为错题</div>
          <div 
            v-for="q in selectedQuestions" 
            :key="q.uuid"
            :data-uuid="getOriginalUuid(q.uuid)"
            class="p-2 rounded-lg mb-2 shadow-sm border-2 transition-colors"
            :class="{
              'bg-blue-50 border-blue-400': selectedListItemUuid === getOriginalUuid(q.uuid),
              'bg-white border-transparent': selectedListItemUuid !== getOriginalUuid(q.uuid)
            }">
            <!-- 题目基本信息行 -->
            <div class="flex items-center" :class="isSimpleMode ? '' : 'mb-2'">
              <div class="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-xs text-blue-600 mr-2 cursor-pointer" @click="jumpToQuestionAndHighlight(q, false)">{{ q.page_number }}</div>
              <div class="flex-1 text-sm font-medium cursor-pointer" @click="jumpToQuestionAndHighlight(q, false)">第{{ q.page_number }}页 - 题{{ q.question_number }}</div>
              <!-- 扩/收按钮和扩展页码 -->
              <template v-if="!hasExtendedBox(q)">
                <button 
                  @click.stop="onExpandClick(q, false)" 
                  class="px-2 py-1 text-xs bg-green-100 text-green-600 rounded mr-1 hover:bg-green-200"
                  :disabled="isExpanding || pendingExpandQuestion?.uuid === q.uuid"
                >
                  {{ pendingExpandQuestion?.uuid === q.uuid ? '等' : '扩' }}
                </button>
              </template>
              <template v-else>
                <button 
                  @click.stop="shrinkQuestion(q)" 
                  class="px-2 py-1 text-xs bg-orange-100 text-orange-600 rounded mr-1 hover:bg-orange-200"
                  :disabled="isShrinking"
                >
                  收
                </button>
                <span 
                  class="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded mr-1 cursor-pointer hover:bg-purple-200"
                  @click.stop="jumpToExtendedPageAndHighlight(q)"
                >
                  第{{ getExtendedBoxPage(q) }}页
                </span>
              </template>
              <button @click.stop="toggleQuestionStatus(q)" class="p-1 text-red-400"><i class="fas fa-times"></i></button>
            </div>
            <!-- 题目类型和错误类型选择（非简洁模式时显示） -->
            <div v-if="!isSimpleMode" class="grid grid-cols-2 gap-2 mt-2">
              <div class="flex flex-col">
                <label class="text-xs text-gray-500 mb-1">题目类型</label>
                <select 
                  :value="q.question_type || ''"
                  @change="(e) => saveQuestionType(q, (e.target as HTMLSelectElement).value)"
                  @click.stop
                  class="text-xs border rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500">
                  <option value="">请选择</option>
                  <option v-for="type in questionTypes" :key="type.code" :value="type.code">
                    {{ type.description }}
                  </option>
                </select>
              </div>
              <div class="flex flex-col">
                <label class="text-xs text-gray-500 mb-1">错误类型</label>
                <select 
                  :value="q.primary_error_type_id || ''"
                  @change="(e) => saveErrorType(q, (e.target as HTMLSelectElement).value)"
                  @click.stop
                  class="text-xs border rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500">
                  <option value="">请选择</option>
                  <option v-for="type in errorTypes" :key="type.code" :value="type.code">
                    {{ type.description }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 可滑动切换的工具栏 -->
      <div class="relative overflow-hidden border-t border-gray-700" style="width: 100%;"
        @touchstart="onToolbarTouchStart"
        @touchend="onToolbarTouchEnd">
        <div class="flex transition-transform duration-300" :style="{ transform: toolbarMode === 'view' ? 'translateX(0)' : 'translateX(-100%)' }">
          <!-- 第一组：视图模式（已移除缩放按钮，移至顶部导航栏） -->
          <div class="flex-shrink-0 w-full flex items-start justify-center" style="min-width: 100%;">
            <!-- 错题订正面板 - 仅当当前题目为错题时显示 -->
            <ReviewCorrectionPanel
              v-if="showCorrectionPanel && paperId && currentQuestionUuid"
              v-model:collapsed="correctionPanelCollapsed"
              :paper-id="paperId"
              :question-uuid="currentQuestionUuid"
              :class="correctionPanelCollapsed ? 'w-full h-6' : 'w-full min-h-[360px] h-[45vh]'"
            />
            
            <!-- 试卷详细信息（非错题时显示） -->
            <div v-else class="w-full max-w-md bg-gray-800/80 rounded-lg p-1.5 text-xs space-y-0.5">
              <div class="flex items-center justify-between">
                <span class="text-white font-medium truncate" :title="paperInfo?.name">{{ paperInfo?.name || '未命名试卷' }}</span>
                <div class="flex items-center gap-2">
                  <button @click="openPaperPdf" class="text-green-400 hover:text-green-300" title="查看试卷PDF">
                    <i class="fas fa-cloud-arrow-down"></i>
                  </button>
                  <span v-if="paperInfo?.student_id" class="text-gray-400" :title="paperInfo.student_id">{{ paperInfo.student_id }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between text-gray-400 text-[10px]">
                <span>{{ paperInfo?.subject || '-' }} · {{ paperInfo?.grade || '-' }} · {{ paperInfo?.semester || '-' }}</span>
                <span class="text-gray-500">{{ formatDateTime(paperInfo?.created_at) }} / {{ formatDateTime(paperInfo?.updated_at) }}</span>
              </div>
              <div class="flex items-center text-gray-500 text-[10px] border-t border-gray-700 font-mono leading-tight">
                <span>ID: {{ paperInfo?.id }}{{ paperInfo?.paper_number ? ' / ' + paperInfo.paper_number : '' }}</span>
              </div>
            </div>
          </div>
          
          <!-- 第二组：编辑模式（列表模式、取消、添加题目） -->
          <div class="flex-shrink-0 w-full flex items-center justify-around px-1 py-1" style="min-width: 100%;">
            <!-- 列表模式按钮 -->
            <button 
              @click="isDeleteMode ? exitListMode() : enterDeleteMode()"
              :class="isDeleteMode ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'"
              class="flex flex-col items-center py-1 px-2 rounded-lg min-w-[56px]">
              <i class="fas fa-list text-base mb-1"></i>
              <span class="text-xs">{{ isDeleteMode ? '退出' : '列表' }}</span>
            </button>
            
            <!-- 取消删除标记按钮 -->
            <button 
              @click="clearAllDeleteMarks()"
              :disabled="questionsToDelete.size === 0"
              class="flex flex-col items-center py-1 px-2 rounded-lg min-w-[52px] disabled:opacity-30 disabled:cursor-not-allowed"
              :class="questionsToDelete.size > 0 ? 'bg-orange-600 text-white' : 'bg-gray-600 text-gray-400'">
              <i class="fas fa-undo text-base mb-1"></i>
              <span class="text-xs">取消</span>
            </button>
            
            <!-- 添加题目按钮 -->
            <button 
              @click="showAddQuestionDialog"
              class="flex flex-col items-center py-1 px-2 bg-blue-600 text-white rounded-lg min-w-[52px]">
              <i class="fas fa-plus text-base mb-1"></i>
              <span class="text-xs">添加</span>
            </button>
          </div>
        </div>
        
        <!-- 分页指示器（订正面板展开时隐藏） -->
        <div v-if="correctionPanelCollapsed" class="flex justify-center items-center py-2 space-x-2">
          <div class="w-1.5 h-1.5 rounded-full transition-colors" 
            :class="toolbarMode === 'view' ? 'bg-blue-500' : 'bg-gray-500'"></div>
          <div class="w-1.5 h-1.5 rounded-full transition-colors"
            :class="toolbarMode === 'edit' ? 'bg-blue-500' : 'bg-gray-500'"></div>
        </div>
      </div>

      <div class="p-3 border-t border-gray-700">
        <!-- 待确认扩展状态提示 -->
        <div v-if="pendingExpandQuestion" class="text-yellow-300 text-xs text-center mb-2">
          请翻页到题目扩展信息所在页，并点击「确认扩展」按钮
        </div>
        
        <!-- 底部按钮行 -->
        <div class="flex items-center gap-2">
          <!-- 左侧：上页 + 上题 -->
          <div class="flex items-center gap-1">
            <button 
              :disabled="currentPage <= 1"
              @click="prevPage" 
              class="w-10 h-10 bg-gray-600 text-white rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-gray-500">
              <i class="fas fa-chevron-left text-lg"></i>
            </button>
            <button 
              @click="navigateToPrevQuestion" 
              :disabled="pendingExpandQuestion"
              class="w-10 h-10 bg-gray-700 text-white rounded-xl flex items-center justify-center hover:bg-gray-600 disabled:opacity-40">
              <i class="fas fa-step-backward text-lg"></i>
            </button>
          </div>
          
          <!-- 中间：主按钮 -->
          <div class="flex-1">
            <!-- 扩展确认状态 -->
            <template v-if="pendingExpandQuestion">
              <div class="flex gap-2">
                <button @click="cancelExpand" class="flex-1 bg-gray-600 text-white py-3 rounded-xl font-medium flex items-center justify-center">
                  <i class="fas fa-times mr-2"></i>取消
                </button>
                <button @click="confirmExpand" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center">
                  <i class="fas fa-check mr-2"></i>确认扩展
                </button>
              </div>
            </template>
            <!-- 正常状态 -->
            <template v-else>
              <button v-if="!isDeleteMode" @click="showExport" class="w-full bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center">
                <i class="fas fa-file-export mr-2"></i>导出 PDF ({{ selectedCount }} 题)
              </button>
              <button v-else-if="questionsToDelete.size > 0" @click="confirmDelete" class="w-full bg-red-600 text-white py-3 rounded-xl font-medium flex items-center justify-center">
                <i class="fas fa-check mr-2"></i>确认删除 ({{ questionsToDelete.size }} 题)
              </button>
              <div v-else class="w-full bg-gray-700 text-gray-400 py-3 rounded-xl font-medium flex items-center justify-center cursor-default">
                <i class="fas fa-info-circle mr-2"></i>请先标记要删除的题目
              </div>
            </template>
          </div>
          
          <!-- 右侧：下题 + 下页 -->
          <div class="flex items-center gap-1">
            <button 
              @click="navigateToNextQuestion" 
              :disabled="pendingExpandQuestion"
              class="w-10 h-10 bg-gray-700 text-white rounded-xl flex items-center justify-center hover:bg-gray-600 disabled:opacity-40">
              <i class="fas fa-step-forward text-lg"></i>
            </button>
            <button 
              :disabled="currentPage >= totalPages"
              @click="nextPage" 
              class="w-10 h-10 bg-gray-600 text-white rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-gray-500">
              <i class="fas fa-chevron-right text-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </footer>
    
    <!-- 长按菜单已移除 -->
    
    <!-- 添加题目弹窗 -->
    <div v-if="showAddDialog" class="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" @click.self="closeAddDialog">
      <div class="bg-gray-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <!-- 弹窗头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 class="text-white font-medium">添加新题目</h3>
          <button @click="closeAddDialog" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- 弹窗内容 -->
        <div class="p-4 space-y-4">
          <!-- Level 1 -->
          <div class="bg-gray-700/50 rounded-lg p-3">
            <label class="text-blue-400 text-sm font-medium block mb-2">Level 1 <span class="text-red-400">*</span></label>
            
            <!-- 前缀组 -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-gray-400 text-xs">前缀:</span>
              <button 
                @click="setLevelPrefix(1, '第')"
                :class="level1Config.prefix === '第' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                第
              </button>
              <button 
                @click="setLevelPrefix(1, 'Part')"
                :class="level1Config.prefix === 'Part' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                Part
              </button>
              <button 
                @click="setLevelPrefix(1, '')"
                :class="level1Config.prefix === '' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                无
              </button>
            </div>
            
            <!-- 序号组 -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-gray-400 text-xs">序号:</span>
              <button 
                @click="setLevelNumType(1, '罗')"
                :class="level1Config.numType === '罗' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                罗
              </button>
              <button 
                @click="setLevelNumType(1, '数')"
                :class="level1Config.numType === '数' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                数
              </button>
              <button 
                @click="setLevelNumType(1, '中')"
                :class="level1Config.numType === '中' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                中
              </button>
              <button 
                @click="setLevelNumType(1, '编')"
                :class="level1Config.numType === '编' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                编
              </button>
              <button 
                @click="setLevelNumType(1, '英')"
                :class="level1Config.numType === '英' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                英
              </button>
              <input 
                v-model="level1Config.numValue"
                :type="level1Config.numType === '英' ? 'text' : 'number'"
                :maxlength="level1Config.numType === '英' ? 1 : undefined"
                min="1"
                max="100"
                class="w-16 px-2 py-1 rounded bg-gray-600 text-white text-xs border border-gray-500 focus:border-blue-500 outline-none"
                placeholder="数值">
            </div>
            
            <!-- 后缀组 -->
            <div class="flex items-center gap-2">
              <span class="text-gray-400 text-xs">后缀:</span>
              <button 
                @click="setLevelSuffix(1, '题')"
                :class="level1Config.suffix === '题' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                题
              </button>
              <button 
                @click="setLevelSuffix(1, '')"
                :class="level1Config.suffix === '' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                无
              </button>
            </div>
            
            <!-- 预览 -->
            <div class="mt-2 text-center">
              <span class="text-gray-400 text-xs">预览: </span>
              <span class="text-white font-medium">{{ level1Preview }}</span>
            </div>
          </div>
          
          <!-- Level 2 -->
          <div class="bg-gray-700/50 rounded-lg p-3">
            <label class="text-green-400 text-sm font-medium block mb-2">Level 2</label>
            
            <!-- 前缀组 -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-gray-400 text-xs">前缀:</span>
              <button 
                @click="setLevelPrefix(2, '')"
                :class="level2Config.prefix === '' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                无
              </button>
              <button 
                @click="setLevelPrefix(2, '第')"
                :class="level2Config.prefix === '第' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                第
              </button>
              <button 
                @click="setLevelPrefix(2, 'Part')"
                :class="level2Config.prefix === 'Part' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                Part
              </button>
            </div>
            
            <!-- 序号组 -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-gray-400 text-xs">序号:</span>
              <button 
                @click="setLevelNumType(2, '罗')"
                :class="level2Config.numType === '罗' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                罗
              </button>
              <button 
                @click="setLevelNumType(2, '数')"
                :class="level2Config.numType === '数' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                数
              </button>
              <button 
                @click="setLevelNumType(2, '中')"
                :class="level2Config.numType === '中' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                中
              </button>
              <button 
                @click="setLevelNumType(2, '编')"
                :class="level2Config.numType === '编' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                编
              </button>
              <button 
                @click="setLevelNumType(2, '英')"
                :class="level2Config.numType === '英' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                英
              </button>
              <input 
                v-model="level2Config.numValue"
                :type="level2Config.numType === '英' ? 'text' : 'number'"
                :maxlength="level2Config.numType === '英' ? 1 : undefined"
                min="0"
                max="100"
                class="w-16 px-2 py-1 rounded bg-gray-600 text-white text-xs border border-gray-500 focus:border-green-500 outline-none"
                placeholder="数值">
            </div>
            
            <!-- 后缀组 -->
            <div class="flex items-center gap-2">
              <span class="text-gray-400 text-xs">后缀:</span>
              <button 
                @click="setLevelSuffix(2, '')"
                :class="level2Config.suffix === '' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                无
              </button>
              <button 
                @click="setLevelSuffix(2, '题')"
                :class="level2Config.suffix === '题' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                题
              </button>
            </div>
            
            <!-- 预览 -->
            <div v-if="level2Preview" class="mt-2 text-center">
              <span class="text-gray-400 text-xs">预览: </span>
              <span class="text-white font-medium">{{ level2Preview }}</span>
            </div>
          </div>
          
          <!-- Level 3 -->
          <div class="bg-gray-700/50 rounded-lg p-3">
            <label class="text-yellow-400 text-sm font-medium block mb-2">Level 3</label>
            
            <!-- 前缀组 -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-gray-400 text-xs">前缀:</span>
              <button 
                @click="setLevelPrefix(3, '')"
                :class="level3Config.prefix === '' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                无
              </button>
              <button 
                @click="setLevelPrefix(3, '第')"
                :class="level3Config.prefix === '第' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                第
              </button>
              <button 
                @click="setLevelPrefix(3, 'Part')"
                :class="level3Config.prefix === 'Part' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                Part
              </button>
            </div>
            
            <!-- 序号组 -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-gray-400 text-xs">序号:</span>
              <button 
                @click="setLevelNumType(3, '罗')"
                :class="level3Config.numType === '罗' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                罗
              </button>
              <button 
                @click="setLevelNumType(3, '数')"
                :class="level3Config.numType === '数' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                数
              </button>
              <button 
                @click="setLevelNumType(3, '中')"
                :class="level3Config.numType === '中' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                中
              </button>
              <button 
                @click="setLevelNumType(3, '编')"
                :class="level3Config.numType === '编' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                编
              </button>
              <button 
                @click="setLevelNumType(3, '英')"
                :class="level3Config.numType === '英' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                英
              </button>
              <input 
                v-model="level3Config.numValue"
                :type="level3Config.numType === '英' ? 'text' : 'number'"
                :maxlength="level3Config.numType === '英' ? 1 : undefined"
                min="0"
                max="100"
                class="w-16 px-2 py-1 rounded bg-gray-600 text-white text-xs border border-gray-500 focus:border-yellow-500 outline-none"
                placeholder="数值">
            </div>
            
            <!-- 后缀组 -->
            <div class="flex items-center gap-2">
              <span class="text-gray-400 text-xs">后缀:</span>
              <button 
                @click="setLevelSuffix(3, '')"
                :class="level3Config.suffix === '' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                无
              </button>
              <button 
                @click="setLevelSuffix(3, '题')"
                :class="level3Config.suffix === '题' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                题
              </button>
            </div>
            
            <!-- 预览 -->
            <div v-if="level3Preview" class="mt-2 text-center">
              <span class="text-gray-400 text-xs">预览: </span>
              <span class="text-white font-medium">{{ level3Preview }}</span>
            </div>
          </div>
          
          <!-- Level 4 -->
          <div class="bg-gray-700/50 rounded-lg p-3">
            <label class="text-purple-400 text-sm font-medium block mb-2">Level 4</label>
            
            <!-- 前缀组 -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-gray-400 text-xs">前缀:</span>
              <button 
                @click="setLevelPrefix(4, '')"
                :class="level4Config.prefix === '' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                无
              </button>
              <button 
                @click="setLevelPrefix(4, '第')"
                :class="level4Config.prefix === '第' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                第
              </button>
              <button 
                @click="setLevelPrefix(4, 'Part')"
                :class="level4Config.prefix === 'Part' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                Part
              </button>
            </div>
            
            <!-- 序号组 -->
            <div class="flex items-center gap-2 mb-2">
              <span class="text-gray-400 text-xs">序号:</span>
              <button 
                @click="setLevelNumType(4, '罗')"
                :class="level4Config.numType === '罗' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                罗
              </button>
              <button 
                @click="setLevelNumType(4, '数')"
                :class="level4Config.numType === '数' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                数
              </button>
              <button 
                @click="setLevelNumType(4, '中')"
                :class="level4Config.numType === '中' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                中
              </button>
              <button 
                @click="setLevelNumType(4, '编')"
                :class="level4Config.numType === '编' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                编
              </button>
              <button 
                @click="setLevelNumType(4, '英')"
                :class="level4Config.numType === '英' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                英
              </button>
              <input 
                v-model="level4Config.numValue"
                :type="level4Config.numType === '英' ? 'text' : 'number'"
                :maxlength="level4Config.numType === '英' ? 1 : undefined"
                min="0"
                max="100"
                class="w-16 px-2 py-1 rounded bg-gray-600 text-white text-xs border border-gray-500 focus:border-purple-500 outline-none"
                placeholder="数值">
            </div>
            
            <!-- 后缀组 -->
            <div class="flex items-center gap-2">
              <span class="text-gray-400 text-xs">后缀:</span>
              <button 
                @click="setLevelSuffix(4, '')"
                :class="level4Config.suffix === '' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                无
              </button>
              <button 
                @click="setLevelSuffix(4, '题')"
                :class="level4Config.suffix === '题' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'"
                class="px-2 py-1 rounded text-xs">
                题
              </button>
            </div>
            
            <!-- 预览 -->
            <div v-if="level4Preview" class="mt-2 text-center">
              <span class="text-gray-400 text-xs">预览: </span>
              <span class="text-white font-medium">{{ level4Preview }}</span>
            </div>
          </div>
          
          <!-- 完整题号预览 -->
          <div class="bg-gray-600 rounded-lg p-3 text-center">
            <span class="text-gray-400 text-sm">完整题号: </span>
            <span class="text-white font-bold text-lg">{{ fullQuestionNumber }}</span>
          </div>
          
          <!-- 错误提示 -->
          <div v-if="addDialogError" class="bg-red-900/50 border border-red-500 rounded-lg p-2 text-center">
            <span class="text-red-400 text-sm">{{ addDialogError }}</span>
          </div>
        </div>
        
        <!-- 弹窗底部 -->
        <div class="flex gap-2 px-4 py-3 border-t border-gray-700">
          <button 
            @click="closeAddDialog"
            class="flex-1 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600">
            取消
          </button>
          <button 
            @click="confirmAddQuestion"
            :disabled="!isLevel1Valid"
            :class="!isLevel1Valid ? 'opacity-50 cursor-not-allowed' : ''"
            class="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500">
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, triggerRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { paperApi, questionApi, configApi, client } from '@/api'
import type { Question } from '@/types'
import { useCorrectionPanel } from '@/composables/useCorrectionPanel'
import ReviewCorrectionPanel from '@/components/correction/ReviewCorrectionPanel.vue'

const route = useRoute()
const router = useRouter()
// 审阅页只处理已入库的 paper
const paperId = computed(() => route.params.paperId as string | undefined)

// 返回按钮处理：从导入页面进入时返回首页，其他情况返回上一页
function goBack() {
  if (route.query.from === 'import') {
    router.push('/')
  } else {
    router.back()
  }
}

// 数据存储
const paperQuestions = ref<Question[]>([])
const paperInfo = ref<any>(null)

// 试卷名称
const paperName = computed(() => paperInfo.value?.name || '未命名试卷')

// 图片状态
const isLoading = ref(true)
const imageLoaded = ref(false)
const currentImageUrl = ref('')
const imageWidth = ref(800)
const imageHeight = ref(1130)
const pageImage = ref<HTMLImageElement | null>(null)
const mainContainer = ref<HTMLElement | null>(null)

// 页面状态
const currentPage = ref(1)
const isCleanMode = ref(false)
const showPanel = ref(false)
const selectedBox = ref<Question | null>(null) // 当前选中的框
const focusUuid = ref<string | null>(null) // 当前聚焦的题目标识（用于 fit frame 时只显示该题）

// 错题订正面板显示控制
const { showCorrectionPanel, currentQuestionUuid } = useCorrectionPanel(
  focusUuid,
  computed(() => paperQuestions.value)
)

// 错题订正面板收起状态
const correctionPanelCollapsed = ref(true)  // 默认折叠，点击列表项不自动展开，由用户手动控制

// 监听订正面板状态，展开时自动切换为简洁模式
watch(correctionPanelCollapsed, (collapsed) => {
  if (!collapsed) {
    // 订正面板展开时，切换为简洁模式
    isSimpleMode.value = true
  }
})

// 简洁模式（隐藏题目类型和错误类型）
const isSimpleMode = ref(false)

// 缩放控制展开状态
const isZoomExpanded = ref(false)
const zoomPressTimer = ref<number | null>(null)
const isLongPressZoom = ref(false)
const ZOOM_PRESS_DURATION = 400 // 长按触发时间（毫秒）

// 添加题目弹窗状态
const showAddDialog = ref(false)

// Level 配置接口
interface LevelConfig {
  prefix: string
  numType: string
  numValue: string
  suffix: string
}

// Level 1 配置（必须填写）
const level1Config = ref<LevelConfig>({
  prefix: '',
  numType: '数',
  numValue: '1',
  suffix: ''
})

// Level 2-4 配置（可选）
const level2Config = ref<LevelConfig>({
  prefix: '',
  numType: '数',
  numValue: '',
  suffix: ''
})

const level3Config = ref<LevelConfig>({
  prefix: '',
  numType: '数',
  numValue: '',
  suffix: ''
})

const level4Config = ref<LevelConfig>({
  prefix: '',
  numType: '数',
  numValue: '',
  suffix: ''
})

// 底部工具栏模式：'view' | 'edit'
const toolbarMode = ref<'view' | 'edit'>('view')

// 工具栏滑动切换
const toolbarSwipeStartX = ref(0)
const toolbarSwipeThreshold = 50 // 滑动阈值

function onToolbarTouchStart(e: TouchEvent) {
  toolbarSwipeStartX.value = e.touches[0].clientX
}

function onToolbarTouchEnd(e: TouchEvent) {
  // 订正面板展开时，禁止滑动切换
  if (!correctionPanelCollapsed.value) return
  
  const endX = e.changedTouches[0].clientX
  const diff = toolbarSwipeStartX.value - endX
  
  // 向左滑动超过阈值：切换到编辑模式
  if (diff > toolbarSwipeThreshold && toolbarMode.value === 'view') {
    switchToolbarMode('edit')
  }
  // 向右滑动超过阈值：切换到视图模式
  else if (diff < -toolbarSwipeThreshold && toolbarMode.value === 'edit') {
    switchToolbarMode('view')
  }
}

// 删除模式状态
const isDeleteMode = ref(false)
const questionsToDelete = ref<Set<string>>(new Set())

// 纯编辑进入列表模式标志（由编辑矩形框自动进入列表模式）
const isEditEntryListMode = ref(false)

// 导航状态标志（用于区分导航操作和手动编辑）
const isNavigating = ref(false)

// 矩形框筛选状态: 'all'=全部, 'error'=错题, 'none'=不显示
const boxFilter = ref<'all' | 'error' | 'none'>('all')
// 进入列表模式前保存的筛选状态
const savedBoxFilterBeforeListMode = ref<'all' | 'error' | 'none'>('all')
const selectedListItemUuid = ref<string | null>(null) // 列表中当前选中的题目
const listMode = ref<'single' | 'all'>('single') // 列表模式：单页或所有页

// 切换工具栏模式
function switchToolbarMode(mode: 'view' | 'edit') {
  // 订正面板展开时，禁止切换到编辑模式
  if (!correctionPanelCollapsed.value && mode === 'edit') return
  toolbarMode.value = mode
}

// 进入删除模式
function enterDeleteMode() {
  console.log('[ReviewView] 进入删除模式')
  
  // 保存当前筛选状态，并将筛选改为“全部”
  savedBoxFilterBeforeListMode.value = boxFilter.value
  boxFilter.value = 'all'
  
  // 如果当前有正在编辑的框，记录其 UUID 以便在列表中高亮
  let editingUuid: string | null = null
  if (selectedBox.value) {
    editingUuid = getOriginalUuid(selectedBox.value.uuid)
  }
  
  isDeleteMode.value = true
  questionsToDelete.value.clear()
  // 如果有正在编辑的框，选中对应的列表项
  selectedListItemUuid.value = editingUuid
  // 纯编辑方式进入列表模式时面板保持收起，否则展开
  showPanel.value = !isEditEntryListMode.value
  // 注意：不清除 selectedBox，保持编辑模式状态
  
  // 如果有编辑中的框，滚动到对应列表项
  if (editingUuid) {
    nextTick(() => {
      scrollToListItem(editingUuid)
    })
  }
  
  console.log('[ReviewView] isDeleteMode:', isDeleteMode.value, 'selectedListItemUuid:', selectedListItemUuid.value, 'selectedBox:', selectedBox.value?.uuid)
}

// 滚动列表到指定 UUID 的列表项
function scrollToListItem(uuid: string) {
  const listContainer = document.querySelector('.max-h-60.overflow-y-auto')
  if (!listContainer) return
  
  // 查找对应的列表项元素
  const listItem = listContainer.querySelector(`[data-uuid="${uuid}"]`)
  if (listItem) {
    listItem.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// 退出删除模式
function exitDeleteMode() {
  isDeleteMode.value = false
  questionsToDelete.value.clear()
  // 清除纯编辑进入标志
  isEditEntryListMode.value = false
}

// 切换题目删除标记
function toggleDeleteMark(uuid: string) {
  if (questionsToDelete.value.has(uuid)) {
    questionsToDelete.value.delete(uuid)
  } else {
    questionsToDelete.value.add(uuid)
  }
}

// 取消所有删除标记（不清空标记时调用）
function clearAllDeleteMarks() {
  questionsToDelete.value.clear()
}

// 完全退出列表模式
async function exitListMode() {
  questionsToDelete.value.clear()
  selectedListItemUuid.value = null
  pendingExpandQuestion.value = null // 清空待扩展状态
  exitDeleteMode()
  // 退出删除模式时收起面板
  showPanel.value = false
  // 恢复进入列表模式之前的筛选状态
  boxFilter.value = savedBoxFilterBeforeListMode.value
  // 刷新试卷数据
  await loadPaperData()
}

// 点击列表项：高亮列表项并跳转到题目位置
async function onListItemClick(q: Question) {
  // 获取原始 UUID（统一格式）
  const originalUuid = getOriginalUuid(q.uuid)
  
  console.log('[DEBUG onListItemClick] 点击题目:', q.question_number, '原始UUID:', originalUuid, '当前focusUuid:', focusUuid.value)
  
  // 高亮列表项
  selectedListItemUuid.value = originalUuid
  
  // 同步设置焦点 UUID（确保导航能从当前选中项开始）
  focusUuid.value = originalUuid
  
  console.log('[DEBUG onListItemClick] 设置focusUuid为:', focusUuid.value)
  
  // 如果是纯编辑进入列表模式，直接让该矩形框进入编辑模式
  if (isEditEntryListMode.value) {
    // 如果题目不在当前页，先切换页面并等待图片加载
    if (q.page_number !== currentPage.value) {
      currentPage.value = q.page_number
      loadPageImage()
      await waitForImageLoad()
    }
    // 直接设置为编辑模式
    selectedBox.value = q
    return
  }
  
  // 非纯编辑模式：如果当前有编辑中的框，先退出编辑模式
  if (selectedBox.value) {
    selectedBox.value = null
  }
  
  // 正常列表模式逻辑：如果题目不在当前页，先切换页面并等待图片加载
  if (q.page_number !== currentPage.value) {
    currentPage.value = q.page_number
    loadPageImage()
    await waitForImageLoad()
  }
  
  // 使用 fit frame 跳转到题目位置（完整缩放+高亮）
  fitBoxToFrame(q)
}

// 确认删除
async function confirmDelete() {
  if (questionsToDelete.value.size === 0) {
    return
  }
  
  try {
    // 逐个删除标记的题目
    for (const uuid of questionsToDelete.value) {
      await questionApi.deleteQuestion(uuid)
    }
    
    // 本地移除已删除的题目（替代全量刷新）
    for (const uuid of questionsToDelete.value) {
      const idx = paperQuestions.value.findIndex(q => q.uuid === uuid)
      if (idx !== -1) paperQuestions.value.splice(idx, 1)
    }
    
    // 清空标记，但保持在列表模式
    questionsToDelete.value.clear()
    // 保持 isDeleteMode.value = true，不退出列表模式
    // 保持 showPanel.value = true，不收起面板
    
    console.log('[ReviewView] 删除成功')
  } catch (error) {
    console.error('[ReviewView] 删除失败:', error)
    alert('删除失败，请重试')
  }
}

// 等待图片加载完成
function waitForImageLoad(): Promise<void> {
  return new Promise((resolve) => {
    if (imageLoaded.value) {
      resolve()
      return
    }
    const unwatch = watch(imageLoaded, (loaded) => {
      if (loaded) {
        unwatch()
        resolve()
      }
    })
    // 超时保护（3秒）
    setTimeout(() => {
      unwatch()
      resolve()
    }, 3000)
  })
}

const addDialogError = ref('') // 弹窗错误信息

// 题目类型和错误类型配置
const questionTypes = ref<Array<{ code: string; description: string }>>([])
const errorTypes = ref<Array<{ code: string; description: string }>>([])
const paperSubject = ref('公用') // 从试卷信息获取学科

// 长按计时器
const longPressTimer = ref<number | null>(null)
const LONG_PRESS_DURATION = 500 // 毫秒
const isCenterButtonClicked = ref(false) // 标记是否点击了中心方块（防止重复触发）

// 扩/收操作状态
const isExpanding = ref(false)
const isShrinking = ref(false)
const EXTENDED_BOX_OFFSET = 0.05 // 扩展框的偏移量（相对坐标）

// 待确认扩展的题目
const pendingExpandQuestion = ref<Question | null>(null)
// 保存扩展前的列表模式（单页/所有）
const previousListMode = ref<'single' | 'all'>('single')

// 获取原框 UUID（处理扩展框的情况）
function getOriginalUuid(uuid: string): string {
  return uuid.replace(/_extended$/, '')
}

// 判断是否为扩展框
function isExtendedBox(q: Question): boolean {
  return q.uuid.endsWith('_extended')
}

// 判断是否显示该题目框（focus 模式下只显示 focus 的框及其扩展框）
function isQuestionVisible(q: Question): boolean {
  // focus 模式优先
  if (focusUuid.value) {
    return getOriginalUuid(q.uuid) === focusUuid.value
  }
  // 筛选器逻辑
  if (boxFilter.value === 'none') return false
  if (boxFilter.value === 'error') return q.is_error
  return true
}

// 判断是否为当前 focus 的框
function isFocusedBox(q: Question): boolean {
  if (!focusUuid.value) return false
  return getOriginalUuid(q.uuid) === focusUuid.value
}

// 视图变换状态（平移 + 缩放）
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)

// 操作状态
const isViewPanning = ref(false) // 是否正在平移视图
const isBoxDragging = ref(false) // 是否正在拖拽框
const isBoxResizing = ref(false) // 是否正在调整框大小
const isPinching = ref(false) // 是否正在双指缩放（用于禁用框的长按）

// 拖拽/缩放的起点记录
const dragStartPos = ref({ x: 0, y: 0 })
const dragStartTranslate = ref({ x: 0, y: 0 })
const boxStartBbox = ref({ y0: 0, x0: 0, y1: 0, x1: 0 })
const pinchStartScale = ref(1)
const initialPinchDistance = ref(0)

// 边缘自动翻页相关
const EDGE_THRESHOLD = 60 // 屏幕边缘触发翻页的阈值（像素）
const edgeScrollTimer = ref<number | null>(null) // 边缘滚动计时器
const isEdgeScrolling = ref(false) // 是否正在边缘滚动
const needResetDragStart = ref(false) // 翻页后需要重置拖拽起点

// 调整手柄 - 包含位置信息和触摸区域样式
const resizeHandles = [
  { position: 'nw', style: { top: '-10px', left: '-10px' }, wrapperStyle: { top: '-22px', left: '-22px', width: '44px', height: '44px' } },
  { position: 'ne', style: { top: '-10px', right: '-10px' }, wrapperStyle: { top: '-22px', right: '-22px', width: '44px', height: '44px' } },
  { position: 'sw', style: { bottom: '-10px', left: '-10px' }, wrapperStyle: { bottom: '-22px', left: '-22px', width: '44px', height: '44px' } },
  { position: 'se', style: { bottom: '-10px', right: '-10px' }, wrapperStyle: { bottom: '-22px', right: '-22px', width: '44px', height: '44px' } },
]

// 计算属性
const totalPages = computed(() => paperInfo.value?.total_pages || 1)
const allQuestions = paperQuestions  // 直接引用 ref，避免 computed 缓存导致数组 push/splice 不触发更新
// 当前页显示的所有题目（包括扩展框）
const currentQuestions = computed(() => {
  const baseQuestions = allQuestions.value.filter(q => q.page_number === currentPage.value)
  const extendedQuestions: Question[] = []
  
  // 检查是否有在当前页显示扩展框的题目
  allQuestions.value.forEach(q => {
    if (q.position_1) {
      const extendedPage = parsePageFromPosition(q.position_1)
      if (extendedPage === currentPage.value) {
        // 扩展框在当前页（无论原框是否在同页）
        const extendedBbox = parseBboxFromPosition(q.position_1)
        extendedQuestions.push({
          ...q,
          bbox_relative: extendedBbox,
          page_number: extendedPage, // 关键修复：使用扩展框实际所在页码
          uuid: `${q.uuid}_extended`, // 虚拟 UUID
          _isExtended: true // 标记为扩展框
        } as Question)
      }
    }
  })
  
  return [...baseQuestions, ...extendedQuestions]
})

// 检查一个题目是否在当前页有显示（原框或扩展框）
function isQuestionVisibleOnPage(q: Question, page: number): boolean {
  if (q.page_number === page) return true
  if (q.position_1) {
    const extendedPage = parsePageFromPosition(q.position_1)
    return extendedPage === page
  }
  return false
}

const selectedQuestions = computed(() => {
  return allQuestions.value
    .filter(q => q.is_error)
    .sort((a, b) => {
      if (a.page_number !== b.page_number) {
        return a.page_number - b.page_number
      }
      return (parseInt(a.question_number) || 0) - (parseInt(b.question_number) || 0)
    })
})
const selectedCount = computed(() => selectedQuestions.value.length)

// 当前页的题目列表（用于删除模式）
const currentPageQuestions = computed(() => {
  return allQuestions.value.filter(q => q.page_number === currentPage.value)
})

// 列表模式显示的题目列表
const listModeQuestions = computed(() => {
  if (listMode.value === 'single') {
    // 列出单页：显示当前页的题目，包括原框在当前页的，以及扩展框在当前页的
    const questionsOnPage = new Set<string>() // 使用 Set 去重
    const result: Question[] = []
    
    allQuestions.value.forEach(q => {
      // 原框在当前页
      if (q.page_number === currentPage.value) {
        if (!questionsOnPage.has(q.uuid)) {
          questionsOnPage.add(q.uuid)
          result.push(q)
        }
      }
      // 扩展框在当前页
      if (q.position_1) {
        const extendedPage = parsePageFromPosition(q.position_1)
        if (extendedPage === currentPage.value && !questionsOnPage.has(q.uuid)) {
          questionsOnPage.add(q.uuid)
          result.push(q)
        }
      }
    })
    
    // 按题号排序
    return result.sort((a, b) => {
      return (parseInt(a.question_number) || 0) - (parseInt(b.question_number) || 0)
    })
  } else {
    // 列出所有：显示所有题目，按题号升序排列
    return [...allQuestions.value].sort((a, b) => {
      const numA = parseInt(a.question_number) || 0
      const numB = parseInt(b.question_number) || 0
      return numA - numB
    })
  }
})

// 监听 selectedListItemUuid 变化，单页模式下自动滚动到对应列表项
watch(selectedListItemUuid, (newUuid) => {
  if (newUuid && listMode.value === 'single' && isDeleteMode.value) {
    // 检查该列表项是否在单页模式下列出（即是否在 listModeQuestions 中）
    const isInList = listModeQuestions.value.some(q => q.uuid === newUuid)
    if (isInList) {
      nextTick(() => {
        scrollToListItem(newUuid)
      })
    }
  }
})

// 监听 listModeQuestions 变化（翻页后），如果当前选中的项在新列表中，滚动到该项
watch(listModeQuestions, () => {
  if (selectedListItemUuid.value && listMode.value === 'single' && isDeleteMode.value) {
    const isInList = listModeQuestions.value.some(q => q.uuid === selectedListItemUuid.value)
    if (isInList) {
      nextTick(() => {
        scrollToListItem(selectedListItemUuid.value!)
      })
    }
  }
})

// 监听 selectedBox 变化：如果进入编辑模式且不在列表模式，自动进入列表模式
watch(selectedBox, (newBox, oldBox) => {
  // 导航操作不触发自动进入列表模式
  if (isNavigating.value) return
  
  if (newBox && !oldBox && !isDeleteMode.value) {
    // 进入编辑模式，且之前不在列表模式，标记为纯编辑进入
    isEditEntryListMode.value = true
    // 设置为单页模式
    listMode.value = 'single'
    // 进入列表模式
    enterDeleteMode()
    console.log('[ReviewView] 纯编辑进入列表模式')
  }
})

// 监听 showPanel 变化：当面板展开时自动滚动到导航所在的题目
// 当面板收起时自动触发 fit 整个页面
watch(showPanel, (newVal) => {
  if (newVal) {
    // 展开时：同步选中并滚动到导航所在的题目（支持错题列表和列表模式）
    if (focusUuid.value) {
      // 同步设置列表选中项为当前导航位置
      selectedListItemUuid.value = focusUuid.value
      nextTick(() => {
        scrollToListItem(focusUuid.value!)
      })
    } else if (selectedListItemUuid.value) {
      nextTick(() => {
        scrollToListItem(selectedListItemUuid.value!)
      })
    }
  } else {
    // 收起时：等待 DOM 更新后再计算尺寸（面板收起后容器变大了）
    // 但如果订正面板展开时不执行 fit page
    if (!correctionPanelCollapsed.value) return
    nextTick(() => {
      fitPageToFrame()
    })
  }
})

// 是否显示题号标签
const shouldShowQuestionLabel = computed(() => {
  return !selectedBox.value || isDeleteMode.value
})

// 计算视图变换 - translateX/Y 是相对于屏幕左上角的绝对位置
const viewTransform = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0'
}))

// 计算最小缩放比例：让图片至少 fit 窗口
const minScale = computed(() => {
  if (!imageWidth.value || !imageHeight.value) return 0.05
  const containerWidth = mainContainer.value?.clientWidth || window.innerWidth
  const containerHeight = mainContainer.value?.clientHeight || window.innerHeight
  const padding = 16
  const scaleX = (containerWidth - padding) / imageWidth.value
  const scaleY = (containerHeight - padding) / imageHeight.value
  return Math.min(scaleX, scaleY)
})

// 获取框样式 - bbox_relative 格式: [y0, x0, y1, x1] (相对坐标 0-1)
function getBoxStyle(q: Question) {
  // 确保 bbox_relative 存在，否则使用默认值
  const bbox = q.bbox_relative || [0.4, 0.4, 0.6, 0.6]
  const [y0, x0, y1, x1] = bbox
  // 调试输出
  console.log(`Box ${q.question_number} bbox:`, bbox, 'image size:', imageWidth.value, 'x', imageHeight.value)
  return { 
    left: `${x0 * 100}%`,     // x0 是水平起始位置
    top: `${y0 * 100}%`,      // y0 是垂直起始位置
    width: `${(x1 - x0) * 100}%`, 
    height: `${(y1 - y0) * 100}%` 
  }
}

// 获取层级题号标签（如：1-2-3，跳过0或空）
function getQuestionLabel(q: Question): string {
  const levels = [q.level_1, q.level_2, q.level_3, q.level_4]
    .filter(l => l && l !== '0' && l !== '')
  return levels.length > 0 ? levels.join('-') : (q.question_number || '1')
}

// ============ 添加题目弹窗相关计算属性和函数 ============

// 数字转换函数：阿拉伯数字 -> 罗马数字
function toRoman(num: number): string {
  const romanMap: { [key: number]: string } = {
    1: 'I', 4: 'IV', 5: 'V', 9: 'IX', 10: 'X', 40: 'XL', 50: 'L',
    90: 'XC', 100: 'C', 400: 'CD', 500: 'D', 900: 'CM', 1000: 'M'
  }
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  let result = ''
  let n = num
  for (const val of values) {
    while (n >= val) {
      result += romanMap[val]
      n -= val
    }
  }
  return result
}

// 数字转换函数：阿拉伯数字 -> 中文数字
function toChinese(num: number): string {
  const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  const chineseUnits = ['', '十', '百', '千']
  if (num === 0) return '零'
  if (num <= 10) return chineseNums[num]
  let result = ''
  const str = num.toString()
  const len = str.length
  for (let i = 0; i < len; i++) {
    const digit = parseInt(str[i])
    const unit = chineseUnits[len - 1 - i]
    if (digit !== 0) {
      result += chineseNums[digit] + unit
    } else if (result[result.length - 1] !== '零') {
      result += '零'
    }
  }
  result = result.replace(/零+$/, '')
  // 简化：11-19 的 "一十" 改为 "十"
  if (num >= 11 && num <= 19) {
    result = result.replace('一十', '十')
  }
  return result
}

// 数字转换函数：阿拉伯数字 -> 项目编号 (1), (2), (3)...
function toBracketNumber(num: number): string {
  return `(${num})`
}

// 数字转换函数：阿拉伯数字 -> 英文字母 (a), (b), (c)...
function toLetter(num: number): string {
  if (num < 1 || num > 26) return `(${num})`
  return `(${String.fromCharCode(96 + num)})` // 97 is 'a', so 96 + 1 = 'a'
}

// 根据类型转换数字
function convertNumber(num: number, type: string): string {
  switch (type) {
    case '罗': return toRoman(num)
    case '数': return num.toString()
    case '中': return toChinese(num)
    case '编': return toBracketNumber(num)
    case '英': return toLetter(num)
    default: return num.toString()
  }
}

// 生成 Level 预览文本
function getLevelPreview(config: LevelConfig): string {
  // 英类型直接显示输入的字母
  if (config.numType === '英') {
    const letter = config.numValue.trim().toLowerCase()
    if (!letter || letter < 'a' || letter > 'z') return ''
    return `${config.prefix}(${letter})${config.suffix}`
  }
  
  const num = parseInt(config.numValue) || 0
  if (num <= 0) return ''
  const numStr = convertNumber(num, config.numType)
  return `${config.prefix}${numStr}${config.suffix}`
}

// Level 1 预览
const level1Preview = computed(() => getLevelPreview(level1Config.value))

// Level 1 是否有效
const isLevel1Valid = computed(() => {
  // 英类型：检查是否输入了有效字母
  if (level1Config.value.numType === '英') {
    const letter = level1Config.value.numValue.trim().toLowerCase()
    return letter >= 'a' && letter <= 'z'
  }
  // 其他类型：检查是否输入了有效数字
  const num = parseInt(level1Config.value.numValue) || 0
  return num > 0
})

// Level 2 预览
const level2Preview = computed(() => getLevelPreview(level2Config.value))

// Level 3 预览
const level3Preview = computed(() => getLevelPreview(level3Config.value))

// Level 4 预览
const level4Preview = computed(() => getLevelPreview(level4Config.value))

// 完整题号（用于弹窗显示）
const fullQuestionNumber = computed(() => {
  const parts = []
  if (level1Preview.value) parts.push(level1Preview.value)
  if (level2Preview.value) parts.push(level2Preview.value)
  if (level3Preview.value) parts.push(level3Preview.value)
  if (level4Preview.value) parts.push(level4Preview.value)
  return parts.join('-') || '请输入题号'
})

// 显示添加题目弹窗
function showAddQuestionDialog() {
  console.log('[ReviewView] 点击添加按钮，打开弹窗')
  // 重置状态
  level1Config.value = { prefix: '', numType: '数', numValue: '1', suffix: '' }
  level2Config.value = { prefix: '', numType: '数', numValue: '', suffix: '' }
  level3Config.value = { prefix: '', numType: '数', numValue: '', suffix: '' }
  level4Config.value = { prefix: '', numType: '数', numValue: '', suffix: '' }
  addDialogError.value = ''
  showAddDialog.value = true
  console.log('[ReviewView] 弹窗状态:', showAddDialog.value)
}

// 关闭添加题目弹窗
function closeAddDialog() {
  showAddDialog.value = false
}

// Level 配置操作函数
function setLevelPrefix(level: 1|2|3|4, prefix: string) {
  const config = level === 1 ? level1Config : level === 2 ? level2Config : level === 3 ? level3Config : level4Config
  config.value.prefix = prefix
}

function setLevelNumType(level: 1|2|3|4, type: string) {
  const config = level === 1 ? level1Config : level === 2 ? level2Config : level === 3 ? level3Config : level4Config
  config.value.numType = type
}

function setLevelSuffix(level: 1|2|3|4, suffix: string) {
  const config = level === 1 ? level1Config : level === 2 ? level2Config : level === 3 ? level3Config : level4Config
  config.value.suffix = suffix
}

// 兼容旧代码的别名
function toggleLevel1Prefix(prefix: string) { setLevelPrefix(1, prefix) }
function setLevel1NumType(type: string) { setLevelNumType(1, type) }
function toggleLevel1Suffix(suffix: string) { setLevelSuffix(1, suffix) }

// 检查题号是否重复
function isQuestionNumberDuplicate(): boolean {
  const newLevel1 = level1Preview.value.trim()
  const newLevel2 = (level2Preview.value || '').trim() || '0'
  const newLevel3 = (level3Preview.value || '').trim() || '0'
  const newLevel4 = (level4Preview.value || '').trim() || '0'
  
  console.log('[ReviewView] 检查重复:', { newLevel1, newLevel2, newLevel3, newLevel4 })
  console.log('[ReviewView] 现有题目:', paperQuestions.value.map(q => ({ 
    l1: q.level_1, l2: q.level_2, l3: q.level_3, l4: q.level_4 
  })))
  
  const duplicate = paperQuestions.value.some(q => {
    const qLevel1 = (q.level_1 || '').trim()
    const qLevel2 = (q.level_2 || '0').trim() || '0'
    const qLevel3 = (q.level_3 || '0').trim() || '0'
    const qLevel4 = (q.level_4 || '0').trim() || '0'
    
    const match = qLevel1 === newLevel1 && 
           qLevel2 === newLevel2 && 
           qLevel3 === newLevel3 && 
           qLevel4 === newLevel4
    
    if (match) {
      console.log('[ReviewView] 发现重复:', { qLevel1, qLevel2, qLevel3, qLevel4 })
    }
    return match
  })
  
  return duplicate
}

// 确认添加题目
async function confirmAddQuestion() {
  console.log('[ReviewView] 点击确定按钮')
  
  if (!isLevel1Valid.value) {
    console.log('[ReviewView] Level 1 无效')
    addDialogError.value = 'Level 1 必须填写'
    return
  }
  
  if (isQuestionNumberDuplicate()) {
    console.log('[ReviewView] 题号重复')
    addDialogError.value = '该题号已存在，请检查'
    return
  }
  
  if (!paperId.value) {
    console.log('[ReviewView] 试卷ID不存在')
    addDialogError.value = '试卷ID不存在'
    return
  }
  
  console.log('[ReviewView] 开始创建题目...')
  
  try {
    // 默认框位置：图片中心的一个小框
    const defaultBbox = [0.4, 0.4, 0.6, 0.6] // [y0, x0, y1, x1]
    
    // 创建新题目数据 - 只传 position，bbox 从中解析
    const newQuestionData = {
      level_1: level1Preview.value,
      level_2: level2Preview.value || '0',
      level_3: level3Preview.value || '0',
      level_4: level4Preview.value || '0',
      position: formatPosition(currentPage.value, defaultBbox as [number, number, number, number]),
      is_error: false,
      question_type: '',
      primary_error_type_id: ''
    }
    
    console.log('[ReviewView] 发送数据:', newQuestionData)
    
    // 调用 API 创建题目
    const response = await questionApi.createQuestion(paperId.value!, newQuestionData)
    
    console.log('[ReviewView] API 响应:', JSON.stringify(response, null, 2))
    console.log('[ReviewView] 响应 uuid:', response?.uuid)
    console.log('[ReviewView] 响应类型:', typeof response)
    
    // 后端直接返回 Question 对象（通过 response_model 序列化）
    if (response && response.uuid) {
      console.log('[ReviewView] 进入成功逻辑')
      // 关闭弹窗
      console.log('[ReviewView] 调用 closeAddDialog 前，showAddDialog=', showAddDialog.value)
      addDialogError.value = ''
      showAddDialog.value = false
      console.log('[ReviewView] 关闭弹窗后，showAddDialog=', showAddDialog.value)
      // 本地添加新题目（替代全量刷新）
      const newQuestion: Question = {
        uuid: response.uuid,
        batch_id: '',
        page_number: currentPage.value,
        question_number: response.question_number || level1Preview.value || '1',
        bbox_relative: defaultBbox as [number, number, number, number],
        bbox_absolute: [0, 0, 100, 100],
        is_error: false,
        question_type: '',
        question_type_desc: '',
        primary_error_type_id: '',
        secondary_error_type_id: '',
        created_at: new Date().toISOString(),
        level_1: response.level_1 || level1Config.value.prefix + level1Config.value.numValue + level1Config.value.suffix,
        level_2: response.level_2 || '0',
        level_3: response.level_3 || '0',
        level_4: response.level_4 || '0',
        position: response.position || formatPosition(currentPage.value, defaultBbox as [number, number, number, number]),
        position_1: response.position_1 || ''
      }
      paperQuestions.value.push(newQuestion)
    } else {
      console.log('[ReviewView] 响应异常，无 uuid:', response)
      addDialogError.value = '添加失败，无数据返回'
    }
  } catch (error: any) {
    console.error('[ReviewView] 添加题目失败:', error)
    addDialogError.value = '添加失败: ' + (error.message || '请重试')
  }
}

// 获取手柄容器样式（增大触摸区域）
function getHandleWrapperStyle(h: any) {
  return h.wrapperStyle
}

// 图片加载 - 关键：使用实际图片尺寸计算坐标
function onImageLoad() {
  // 从 ref 获取图片实际尺寸
  if (pageImage.value) {
    const nw = pageImage.value.naturalWidth
    const nh = pageImage.value.naturalHeight
    console.log('[ReviewView] 图片自然尺寸:', nw, 'x', nh, '比例:', (nw/nh).toFixed(3))
    
    if (nw > 0 && nh > 0) {
      imageWidth.value = nw
      imageHeight.value = nh
    }
  }
  
  imageLoaded.value = true
  isLoading.value = false
  
  // 获取容器尺寸（main 容器，不包括 header/footer）
  const containerWidth = mainContainer.value?.clientWidth || window.innerWidth
  const containerHeight = mainContainer.value?.clientHeight || window.innerHeight
  
  // 计算适合的缩放比例：让图片完整显示在容器内
  const padding = 16
  const scaleX = (containerWidth - padding) / imageWidth.value
  const scaleY = (containerHeight - padding) / imageHeight.value
  const initialScale = Math.max(minScale.value, Math.min(2, Math.min(scaleX, scaleY)))
  
  scale.value = initialScale
  
  // 计算居中位置（相对于 main 容器左上角）
  const scaledWidth = imageWidth.value * initialScale
  const scaledHeight = imageHeight.value * initialScale
  translateX.value = (containerWidth - scaledWidth) / 2
  translateY.value = (containerHeight - scaledHeight) / 2
  
  console.log('[ReviewView] 图片加载完成:', imageWidth.value, 'x', imageHeight.value, 
              '容器:', containerWidth, 'x', containerHeight,
              '缩放:', initialScale.toFixed(3),
              '位置:', Math.round(translateX.value), Math.round(translateY.value))
  
  // 打印前几个框的坐标供调试
  if (currentQuestions.value.length > 0) {
    console.log('[ReviewView] 前3个框的坐标:')
    currentQuestions.value.slice(0, 3).forEach(q => {
      console.log(`  题${q.question_number}:`, q.bbox_relative)
    })
  }
}

function loadPageImage() {
  isLoading.value = true
  imageLoaded.value = false
  
  // 重置图片尺寸为默认值（会在 onImageLoad 中更新为实际值）
  imageWidth.value = 800
  imageHeight.value = 1130
  
  // 先清空 URL，强制 Vue 重新加载图片
  currentImageUrl.value = ''
  
  // 使用 nextTick 确保 DOM 更新后再设置新 URL
  setTimeout(() => {
    if (paperId.value) {
      currentImageUrl.value = paperApi.getPageImageUrl(paperId.value, currentPage.value, 72, isCleanMode.value)
    }
    console.log('[ReviewView] 加载图片:', currentImageUrl.value)
  }, 0)
}

// ========== 核心交互逻辑 ==========

// 获取事件坐标
function getEventPos(e: MouseEvent | TouchEvent) {
  if ('touches' in e && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
}

// 获取双指中心点（相对于视口）
function getPinchCenter(touches: TouchList) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  }
}

// 获取双指距离
function getPinchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// 点击矩形框（实际上是 touch/mouse down）
// 长按矩形框且不拖动才能选中进入编辑模式
function onBoxClick(e: MouseEvent | TouchEvent, q: Question) {
  // 检测双指/多指操作，避免误触发编辑模式（必须在阻止冒泡前检测）
  // 如果是双指操作，不阻止事件冒泡，让背景层处理缩放
  if ('touches' in e && e.touches.length > 1) {
    console.log('[ReviewView] 双指触摸框，忽略并冒泡到背景')
    return
  }
  // 检查全局双指缩放标志
  if (isPinching.value) {
    console.log('[ReviewView] 双指缩放中，忽略框点击')
    return
  }
  
  // 关键修复：检测是否点击的是中心按钮或其子元素
  // 必须最先检查，确保在编辑模式下点击中心按钮也能正常工作
  const target = e.target as HTMLElement
  const isCenterButton = target.closest('.center-button') !== null
  if (isCenterButton) {
    console.log('[ReviewView] 检测到点击中心按钮，不阻止事件传播')
    // 不阻止事件传播，让 onCenterButtonClick 能正常接收 click 事件
    return
  }
  
  // 记录触摸起始位置、时间和题目（用于后续拖拽和长按检测）
  const pos = getEventPos(e)
  boxTapStart.value = { x: pos.x, y: pos.y, time: Date.now(), question: q }
  
  // 如果已经在编辑模式且点击的是当前选中的框，只记录位置用于拖拽框
  if (selectedBox.value?.uuid === q.uuid) {
    console.log('[ReviewView] 编辑模式点击框，记录位置用于拖拽')
    e.stopPropagation()
    e.preventDefault()
    return
  }
  
  // 视图模式下（未选中框），启动长按计时器（用于进入编辑模式）
  // 但不阻止冒泡，让背景也能记录位置用于拖动
  if (!selectedBox.value) {
    console.log('[ReviewView] 视图模式点击框，启动长按计时器并冒泡')
    // 清除之前的长按计时器
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value)
      longPressTimer.value = null
    }
    // 启动长按计时器
    longPressTimer.value = window.setTimeout(() => {
      console.log('[ReviewView] 长按选中进入编辑模式:', q.uuid)
      selectedBox.value = q
      const originalUuid = getOriginalUuid(q.uuid)
      selectedListItemUuid.value = originalUuid
      prepareBoxDrag(e, q)
      longPressTimer.value = null
      // 如果处于列表模式，滚动到对应列表项
      if (isDeleteMode.value) {
        nextTick(() => {
          scrollToListItem(originalUuid)
        })
      }
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, LONG_PRESS_DURATION)
    // 同时设置拖动起始位置（用于视图模式下的背景平移）
    const pos = getEventPos(e)
    dragStartPos.value = pos
    dragStartTranslate.value = { x: translateX.value, y: translateY.value }
    // 不阻止冒泡，让背景的 onTouchStart 也能记录位置用于拖动
    return
  }
  
  // 编辑模式下点击其他框，阻止冒泡并启动长按计时器
  e.stopPropagation()
  e.preventDefault()
  
  // 清除之前的长按计时器
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  // 启动长按计时器 - 长按后切换到该框的编辑模式
  longPressTimer.value = window.setTimeout(() => {
    console.log('[ReviewView] 长按选中切换到新框:', q.uuid)
    selectedBox.value = q
    const originalUuid = getOriginalUuid(q.uuid)
    selectedListItemUuid.value = originalUuid
    prepareBoxDrag(e, q)
    longPressTimer.value = null
    // 如果处于列表模式，滚动到对应列表项
    if (isDeleteMode.value) {
      nextTick(() => {
        scrollToListItem(originalUuid)
      })
    }
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }, LONG_PRESS_DURATION)
  
  // 准备拖拽（但不立即开始，等待长按触发）
  prepareBoxDrag(e, q)
}

// 中心方块点击处理 - 阻止框的长按检测，直接切换状态
let lastCenterButtonClickTime = 0
function onCenterButtonClick(e: MouseEvent | TouchEvent, q: Question) {
  // 立即停止事件传播（阻止冒泡到父元素矩形框）
  e.stopPropagation()
  e.stopImmediatePropagation?.()
  // 如果是触摸事件，阻止后续鼠标事件（防止触发 mousedown）
  if ('touches' in e) {
    e.preventDefault()
  }
  
  // 如果是扩展框，不处理点击（扩展框没有选中/取消功能）
  if (isExtendedBox(q)) {
    console.log('[ReviewView] 扩展框不处理选中/取消')
    return
  }
  
  // 防重复点击（300ms内只允许一次）
  const now = Date.now()
  if (now - lastCenterButtonClickTime < 300) {
    console.log('[ReviewView] 中心方块点击防重复')
    return
  }
  lastCenterButtonClickTime = now
  
  // 关键：清除框的长按计时器，防止触发框的短按检测
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  // 标记为已处理，防止 onMouseUp/onTouchEnd 再次触发
  isCenterButtonClicked.value = true
  // 同时更新 boxTapStart，确保 onTouchEnd 知道是点击了当前框
  boxTapStart.value = { x: 0, y: 0, time: Date.now(), question: q }
  
  // 立即切换错题状态（不等待 async 完成）
  console.log('[ReviewView] 点击中心方块切换状态:', q.uuid, 'is_error:', q.is_error)
  toggleQuestionStatus(q)
  
  // 500ms 后重置标志位（确保 touchend/touchstart 不会再次触发）
  setTimeout(() => {
    isCenterButtonClicked.value = false
    console.log('[ReviewView] 中心方块点击标志重置')
  }, 500)
}

// 点击背景退出编辑模式
function onBackgroundClick(e: MouseEvent | TouchEvent) {
  // 如果点击的是矩形框本身，不处理（由 onBoxClick 处理）
  const target = e.target as HTMLElement
  if (target.closest('.question-box')) {
    return
  }
  
  // 点击背景时收起缩放展开状态
  if (isZoomExpanded.value) {
    isZoomExpanded.value = false
  }
  
  // 点击背景时清除 focusUuid，显示所有框
  if (focusUuid.value) {
    console.log('[DEBUG onBackgroundClick] 清除focusUuid:', focusUuid.value)
    focusUuid.value = null
    console.log('[ReviewView] 点击背景，清除 focusUuid，显示所有框')
  }
  
  // 编辑模式下，只有明确的单击才退出（不是双指，不是拖拽）
  if (selectedBox.value) {
    // 触摸事件：检查是否是双指
    if ('touches' in e) {
      // 双指或更多手指，不退出（可能是缩放）
      if (e.touches.length >= 2) {
        console.log('[ReviewView] 编辑模式双指触摸，不退出')
        return
      }
      // 单指触摸开始时不立即退出，等待确认是点击还是拖拽
      // 在 touchstart 时无法区分，所以都不退出，由 touchend 处理
      console.log('[ReviewView] 编辑模式触摸开始，暂不退出')
      return
    }
    
    // 鼠标事件：只有左键单击才退出
    if (e instanceof MouseEvent) {
      // 检查是否是拖拽视图（在 onMouseDown 中会设置 isViewPanning）
      // 这里不处理，由 onMouseUp 判断
      console.log('[ReviewView] 编辑模式鼠标按下，暂不退出')
      return
    }
  }
}

// 准备拖拽（不立即开始，等待移动）
function prepareBoxDrag(e: MouseEvent | TouchEvent, q: Question) {
  const pos = getEventPos(e)
  dragStartPos.value = pos
  boxStartBbox.value = { 
    y0: q.bbox_relative[0], 
    x0: q.bbox_relative[1], 
    y1: q.bbox_relative[2], 
    x1: q.bbox_relative[3] 
  }
}

// 检查是否为点击（非拖动）
function isBoxTap(e: MouseEvent | TouchEvent): boolean {
  const pos = getEventPos(e)
  const dx = pos.x - boxTapStart.value.x
  const dy = pos.y - boxTapStart.value.y
  const dt = Date.now() - boxTapStart.value.time
  
  return Math.abs(dx) < BOX_TAP_THRESHOLD && Math.abs(dy) < BOX_TAP_THRESHOLD && dt < BOX_TAP_TIME
}

// 当前调整的手柄位置（用于边缘调整）
const currentResizeHandle = ref('')

// 用于区分点击和拖动
const boxTapStart = ref({ x: 0, y: 0, time: 0, question: null as Question | null })
const BOX_TAP_THRESHOLD = 10 // 像素
const BOX_TAP_TIME = 300 // 毫秒

// 开始调整框大小
function startResize(e: MouseEvent | TouchEvent, handlePos: string) {
  e.stopPropagation()
  e.preventDefault()
  if (!selectedBox.value) return
  
  isBoxResizing.value = true
  currentResizeHandle.value = handlePos
  const pos = getEventPos(e)
  dragStartPos.value = pos
  boxStartBbox.value = { 
    y0: selectedBox.value.bbox_relative[0], 
    x0: selectedBox.value.bbox_relative[1], 
    y1: selectedBox.value.bbox_relative[2], 
    x1: selectedBox.value.bbox_relative[3] 
  }
  // 设置 boxTapStart，确保 onTouchEnd 知道是操作了当前框
  boxTapStart.value = { x: pos.x, y: pos.y, time: Date.now(), question: selectedBox.value }
}

// 鼠标/触摸按下
function onMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement
  // 点击空白处（main元素本身或图片容器）
  if (target.tagName === 'MAIN' || target.tagName === 'IMG') {
    // 记录背景点击的起始位置和时间（用于 onMouseUp 判断是否是单击）
    const pos = getEventPos(e)
    boxTapStart.value = { x: pos.x, y: pos.y, time: Date.now(), question: null }
    // 不立即设置 isViewPanning，等移动超过阈值时再设置
    dragStartPos.value = pos
    dragStartTranslate.value = { x: translateX.value, y: translateY.value }
  }
}

// 触摸开始 - 关键修复
let touchStartTime = 0
let touchStartTarget: EventTarget | null = null

function onTouchStart(e: TouchEvent) {
  touchStartTime = Date.now()
  touchStartTarget = e.target
  
  // 双指开始 - 缩放
  if (e.touches.length === 2) {
    e.preventDefault()
    isPinching.value = true
    // 双指开始时清除任何长按计时器，防止误触发编辑模式
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value)
      longPressTimer.value = null
      console.log('[ReviewView] 双指开始，清除长按计时器')
    }
    initialPinchDistance.value = getPinchDistance(e.touches)
    pinchStartScale.value = scale.value
    // 记录双指中心（用于以中心为基准缩放）
    const center = getPinchCenter(e.touches)
    lastPinchCenter.value = center
    return
  }
  
  // 单指
  if (e.touches.length === 1) {
    const target = e.target as HTMLElement
    const isBox = target.closest('.question-box')
    // 视图模式下（未选中框），任何位置都能平移（包括框上）
    // 编辑模式下，只有在非框区域才能平移
    if (!selectedBox.value || !isBox) {
      // 只有未记录点击位置时才记录（避免覆盖 onBoxClick 设置的值）
      if (!boxTapStart.value.time || Date.now() - boxTapStart.value.time > 100) {
        const pos = getEventPos(e)
        boxTapStart.value = { x: pos.x, y: pos.y, time: Date.now(), question: null }
        dragStartPos.value = pos
        dragStartTranslate.value = { x: translateX.value, y: translateY.value }
        console.log('[ReviewView] touchstart: 记录平移起始位置', selectedBox.value ? '编辑模式背景' : '视图模式')
      } else {
        console.log('[ReviewView] touchstart: 跳过，位置已由 onBoxClick 记录')
      }
    }
  }
}

// 用于记录双指中心
const lastPinchCenter = ref({ x: 0, y: 0 })

// 直接操作 DOM 更新框位置/大小，绕过 Vue 响应式调度，解决拖拽不实时渲染问题
function updateBoxDom(q: Question) {
  const el = document.querySelector(`[data-uuid="${q.uuid}"]`) as HTMLElement
  if (!el) return
  const [y0, x0, y1, x1] = q.bbox_relative
  el.style.left = `${x0 * 100}%`
  el.style.top = `${y0 * 100}%`
  el.style.width = `${(x1 - x0) * 100}%`
  el.style.height = `${(y1 - y0) * 100}%`
}

// 开始视图平移
function startViewPan(e: MouseEvent | TouchEvent) {
  isViewPanning.value = true
  const pos = getEventPos(e)
  dragStartPos.value = pos
  dragStartTranslate.value = { x: translateX.value, y: translateY.value }
}

// 鼠标/触摸移动
function onMouseMove(e: MouseEvent) {
  handleMove(e)
}

function onTouchMove(e: TouchEvent) {
  // 双指缩放 - 以双指中心为基准
  if (e.touches.length === 2 && initialPinchDistance.value > 0) {
    e.preventDefault()
    
    const newDistance = getPinchDistance(e.touches)
    const scaleRatio = newDistance / initialPinchDistance.value
    const newScale = Math.max(minScale.value, Math.min(5, pinchStartScale.value * scaleRatio))
    
    // 获取新的双指中心
    const newCenter = getPinchCenter(e.touches)
    
    // 以双指中心为基准缩放：保持中心点在屏幕上的位置不变
    // 公式: newTranslate = center - (center - oldTranslate) * (newScale / oldScale)
    const scaleChange = newScale / scale.value
    translateX.value = newCenter.x - (newCenter.x - translateX.value) * scaleChange
    translateY.value = newCenter.y - (newCenter.y - translateY.value) * scaleChange
    scale.value = newScale
    
    lastPinchCenter.value = newCenter
    return
  }
  
  handleMove(e)
}

// 统一移动处理
function handleMove(e: MouseEvent | TouchEvent) {
  // 双指时不处理单指移动
  if ('touches' in e && e.touches.length === 2) return
  
  const pos = getEventPos(e)
  
  // 检查是否移动超过阈值 - 在视图模式下取消长按计时器
  if (!selectedBox.value && !isViewPanning.value && boxTapStart.value.question && longPressTimer.value) {
    const dx = pos.x - boxTapStart.value.x
    const dy = pos.y - boxTapStart.value.y
    if (Math.abs(dx) > BOX_TAP_THRESHOLD || Math.abs(dy) > BOX_TAP_THRESHOLD) {
      // 移动超过阈值，取消长按计时器（阻止进入编辑模式）
      clearTimeout(longPressTimer.value)
      longPressTimer.value = null
      console.log('[ReviewView] 视图模式移动超过阈值，取消进入编辑模式')
    }
  }
  
  // 检查是否开始拖拽框（移动超过阈值）- 仅在编辑模式下且点击了框内
  if (selectedBox.value && boxTapStart.value.question && !isBoxDragging.value && !isBoxResizing.value && !isViewPanning.value) {
    const dx = pos.x - boxTapStart.value.x
    const dy = pos.y - boxTapStart.value.y
    if (Math.abs(dx) > BOX_TAP_THRESHOLD || Math.abs(dy) > BOX_TAP_THRESHOLD) {
      // 移动超过阈值，取消长按计时器（阻止进入编辑模式）
      if (longPressTimer.value) {
        clearTimeout(longPressTimer.value)
        longPressTimer.value = null
        console.log('[ReviewView] 移动超过阈值，取消进入编辑模式')
      }
      // 点击框内，开始拖拽框
      isBoxDragging.value = true
      // 关键修复：在开始拖拽的那一刻重新记录起始位置和当前框位置
      dragStartPos.value = pos
      boxStartBbox.value = { 
        y0: selectedBox.value.bbox_relative[0], 
        x0: selectedBox.value.bbox_relative[1], 
        y1: selectedBox.value.bbox_relative[2], 
        x1: selectedBox.value.bbox_relative[3] 
      }
      console.log('[ReviewView] 开始拖拽框:', boxStartBbox.value)
    }
  }
  
  if (isBoxDragging.value && selectedBox.value) {
    // 关键修复：翻页后第一次移动，重新设置拖拽起点
    if (needResetDragStart.value) {
      dragStartPos.value = { x: pos.x, y: pos.y }
      boxStartBbox.value = {
        y0: selectedBox.value.bbox_relative[0],
        x0: selectedBox.value.bbox_relative[1],
        y1: selectedBox.value.bbox_relative[2],
        x1: selectedBox.value.bbox_relative[3]
      }
      needResetDragStart.value = false
      console.log('[ReviewView] 翻页后重置拖拽起点')
      return // 不更新位置，只是重置起点
    }
    
    // 拖拽框（考虑视图缩放）
    const deltaX = (pos.x - dragStartPos.value.x) / (imageWidth.value * scale.value)
    const deltaY = (pos.y - dragStartPos.value.y) / (imageHeight.value * scale.value)
    
    const box = selectedBox.value.bbox_relative
    let nx0 = boxStartBbox.value.x0 + deltaX
    let ny0 = boxStartBbox.value.y0 + deltaY
    let nx1 = boxStartBbox.value.x1 + deltaX
    let ny1 = boxStartBbox.value.y1 + deltaY
    
    // 边界限制（在0-1范围内）
    const w = nx1 - nx0, h = ny1 - ny0
    nx0 = Math.max(0, Math.min(1 - w, nx0))
    ny0 = Math.max(0, Math.min(1 - h, ny0))
    
    // 创建新数组触发响应式更新
    selectedBox.value.bbox_relative = [ny0, nx0, ny0 + h, nx0 + w]
    // 拖拽过程中直接操作 DOM，绕过 Vue 响应式调度，确保实时跟随鼠标
    updateBoxDom(selectedBox.value)
    
    // 如果是扩展框，同步更新原框的 position_1
    if (isExtendedBox(selectedBox.value)) {
      syncExtendedBoxPosition(selectedBox.value)
    }
    
    // 边缘检测：自动翻页
    checkEdgeAndAutoScroll(pos)
  } else if (isBoxResizing.value && selectedBox.value) {
    // 调整框大小
    const deltaX = (pos.x - dragStartPos.value.x) / (imageWidth.value * scale.value)
    const deltaY = (pos.y - dragStartPos.value.y) / (imageHeight.value * scale.value)
    
    const box = selectedBox.value.bbox_relative
    const minSize = 0.02
    const handle = currentResizeHandle.value
    
    // 根据手柄方向调整 - 使用新数组触发响应式更新
    let [y0, x0, y1, x1] = selectedBox.value.bbox_relative
    
    if (handle.includes('e')) {
      x1 = Math.min(1, Math.max(x0 + minSize, boxStartBbox.value.x1 + deltaX))
    }
    if (handle.includes('w')) {
      x0 = Math.max(0, Math.min(x1 - minSize, boxStartBbox.value.x0 + deltaX))
    }
    if (handle.includes('s')) {
      y1 = Math.min(1, Math.max(y0 + minSize, boxStartBbox.value.y1 + deltaY))
    }
    if (handle.includes('n')) {
      y0 = Math.max(0, Math.min(y1 - minSize, boxStartBbox.value.y0 + deltaY))
    }
    
    selectedBox.value.bbox_relative = [y0, x0, y1, x1]
    // 调整大小过程中直接操作 DOM，绕过 Vue 响应式调度，确保实时更新
    updateBoxDom(selectedBox.value)
    
    // 如果是扩展框，同步更新原框的 position_1
    if (isExtendedBox(selectedBox.value)) {
      syncExtendedBoxPosition(selectedBox.value)
    }
    
  } else if (isViewPanning.value) {
    // 平移视图（带边界限制）
    const containerWidth = mainContainer.value?.clientWidth || window.innerWidth
    const containerHeight = mainContainer.value?.clientHeight || window.innerHeight
    const scaledWidth = imageWidth.value * scale.value
    const scaledHeight = imageHeight.value * scale.value
    
    // 计算新的位置
    let newX = dragStartTranslate.value.x + (pos.x - dragStartPos.value.x)
    let newY = dragStartTranslate.value.y + (pos.y - dragStartPos.value.y)
    
    // 边界限制：试卷四条边不能超出视口
    // 左边 <= 0, 右边 >= 容器宽度
    if (scaledWidth <= containerWidth) {
      // 试卷比容器小，居中显示
      newX = (containerWidth - scaledWidth) / 2
    } else {
      // 试卷比容器大，限制拖动范围
      newX = Math.min(0, Math.max(containerWidth - scaledWidth, newX))
    }
    // 上边 <= 0, 下边 >= 容器高度
    if (scaledHeight <= containerHeight) {
      // 试卷比容器小，居中显示
      newY = (containerHeight - scaledHeight) / 2
    } else {
      // 试卷比容器大，限制拖动范围
      newY = Math.min(0, Math.max(containerHeight - scaledHeight, newY))
    }
    
    translateX.value = newX
    translateY.value = newY
  } else if (!isViewPanning.value && !isBoxDragging.value && !isBoxResizing.value) {
    // 背景点击且移动超过阈值，开始平移视图（视图模式或编辑模式都支持）
    // 注意：视图模式下点击框上也可以平移，所以移除 !boxTapStart.value.question 条件
    const dx = pos.x - boxTapStart.value.x
    const dy = pos.y - boxTapStart.value.y
    if (Math.abs(dx) > BOX_TAP_THRESHOLD || Math.abs(dy) > BOX_TAP_THRESHOLD) {
      // 视图模式下，取消长按计时器并启动平移
      if (!selectedBox.value && longPressTimer.value) {
        clearTimeout(longPressTimer.value)
        longPressTimer.value = null
        console.log('[ReviewView] 视图模式移动超过阈值，取消长按并启动平移')
      }
      isViewPanning.value = true
      console.log('[ReviewView] 移动超过阈值，开始平移视图')
    }
  }
}

// 鼠标/触摸释放
async function onMouseUp(e?: MouseEvent) {
  // 注意：状态切换只通过点击中心方块触发（onCenterButtonClick）
  // 短按框（非中心方块）不再触发状态切换，避免误触
  
  // 清除长按计时器
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  // 重置中心方块点击标志
  isCenterButtonClicked.value = false
  
  // 清除边缘滚动计时器
  if (edgeScrollTimer.value) {
    clearTimeout(edgeScrollTimer.value)
    edgeScrollTimer.value = null
  }
  
  // 重置状态
  const wasDragging = isBoxDragging.value || isBoxResizing.value
  const wasPanning = isViewPanning.value
  
  isBoxDragging.value = false
  isBoxResizing.value = false
  isViewPanning.value = false
  // 注意：isPinching 不在 onMouseUp 中清除，它在 onTouchEnd 中处理
  currentResizeHandle.value = ''
  
  // 如果有拖拽或调整大小，保存 bbox 到后端
  if (wasDragging && selectedBox.value) {
    await saveBoxPosition(selectedBox.value)
  }
  
  // 编辑模式下，鼠标单击背景退出编辑模式
  const isClickOnBackground = !boxTapStart.value.question
  const isClickOnSelectedBox = boxTapStart.value.question?.uuid === selectedBox.value?.uuid
  
  // 如果点击的是当前选中的框，保持编辑模式
  if (selectedBox.value && isClickOnSelectedBox) {
    console.log('[ReviewView] 鼠标单击当前选中框，保持编辑模式')
  } else if (selectedBox.value && !wasDragging && !wasPanning) {
    if (isClickOnBackground) {
      // 点击背景，退出编辑模式
      console.log('[ReviewView] 鼠标单击背景，退出编辑模式')
      selectedBox.value = null
      selectedListItemUuid.value = null
      // 如果是纯编辑进入列表模式，同时退出列表模式
      if (isEditEntryListMode.value) {
        exitListMode()
      }
    } else {
      // 点击其他框，保持编辑模式
      console.log('[ReviewView] 鼠标单击其他框，保持编辑模式')
    }
  }
}

// 边缘检测并自动翻页
function checkEdgeAndAutoScroll(pos: { x: number, y: number }) {
  if (!selectedBox.value || isEdgeScrolling.value) return
  
  const containerWidth = mainContainer.value?.clientWidth || window.innerWidth
  const isNearLeftEdge = pos.x < EDGE_THRESHOLD
  const isNearRightEdge = pos.x > containerWidth - EDGE_THRESHOLD
  
  // 清除之前的计时器
  if (edgeScrollTimer.value) {
    clearTimeout(edgeScrollTimer.value)
    edgeScrollTimer.value = null
  }
  
  // 检测左边缘（翻到上一页）
  if (isNearLeftEdge && currentPage.value > 1) {
    edgeScrollTimer.value = window.setTimeout(() => {
      moveBoxToAdjacentPage('prev')
    }, 300) // 300ms 延迟，给用户反应时间
  }
  // 检测右边缘（翻到下一页）
  else if (isNearRightEdge && currentPage.value < totalPages.value) {
    edgeScrollTimer.value = window.setTimeout(() => {
      moveBoxToAdjacentPage('next')
    }, 300)
  }
}

// 将框移动到相邻页面
async function moveBoxToAdjacentPage(direction: 'prev' | 'next') {
  if (!selectedBox.value) return
  
  isEdgeScrolling.value = true
  const originalUuid = getOriginalUuid(selectedBox.value.uuid)
  const isExt = isExtendedBox(selectedBox.value)
  const oldBbox = [...selectedBox.value.bbox_relative] // 复制当前位置
  
  try {
    // 计算新页码
    const newPage = direction === 'prev' ? currentPage.value - 1 : currentPage.value + 1
    
    // 先更新后端数据
    if (isExt) {
      // 移动扩展框
      await questionApi.updateQuestion(originalUuid, {
        position_1: formatPosition(newPage, oldBbox)
      })
    } else {
      // 移动原框
      await questionApi.updateQuestion(originalUuid, {
        position: formatPosition(newPage, oldBbox)
      })
    }
    
    // 切换页面
    currentPage.value = newPage
    await loadPageImage()
    await loadPaperData()
    
    // 重新选中该框 - 对于扩展框，需要查找虚拟UUID的框
    let newTargetBox: Question | undefined
    if (isExt) {
      // 扩展框：查找虚拟UUID的框（在currentQuestions中是扩展框形式）
      newTargetBox = currentQuestions.value.find(cq => cq.uuid === `${originalUuid}_extended`)
    } else {
      // 原框：按原UUID查找
      newTargetBox = currentQuestions.value.find(cq => cq.uuid === originalUuid)
    }
    
    if (newTargetBox) {
      selectedBox.value = newTargetBox
      selectedListItemUuid.value = originalUuid
      // 关键修复：重置拖拽起点标志，下次handleMove时会重新设置
      boxStartBbox.value = {
        y0: newTargetBox.bbox_relative[0],
        x0: newTargetBox.bbox_relative[1],
        y1: newTargetBox.bbox_relative[2],
        x1: newTargetBox.bbox_relative[3]
      }
      // 设置标志表示需要重置拖拽起点
      needResetDragStart.value = true
      console.log('[ReviewView] 重新选中框:', newTargetBox.uuid, 'isExt:', isExtendedBox(newTargetBox), 'page:', newTargetBox.page_number)
    } else {
      console.warn('[ReviewView] 未找到要重新选中的框:', originalUuid, 'isExt:', isExt)
    }
    
    console.log('[ReviewView] 自动翻页成功:', direction, '到第', newPage, '页')
  } catch (err) {
    console.error('[ReviewView] 自动翻页失败:', err)
  } finally {
    isEdgeScrolling.value = false
  }
}

async function onTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) {
    initialPinchDistance.value = 0
  }
  if (e.touches.length === 0) {
    console.log('[ReviewView] onTouchEnd:', 'isCenterButtonClicked:', isCenterButtonClicked.value, 'longPressTimer:', longPressTimer.value, 'boxTapStart:', boxTapStart.value)
    
    // 如果是点击中心方块后直接抬起，跳过所有处理
    if (isCenterButtonClicked.value) {
      console.log('[ReviewView] 中心方块点击已处理，跳过')
      // 清除长按计时器
      if (longPressTimer.value) {
        clearTimeout(longPressTimer.value)
        longPressTimer.value = null
      }
      isCenterButtonClicked.value = false
      return
    }
    
    // 注意：状态切换只通过点击中心方块触发（onCenterButtonClick）
    // 短按框（非中心方块）不再触发状态切换，避免误触
    
    // 清除长按计时器
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value)
      longPressTimer.value = null
    }
    
    // 重置中心方块点击标志
    isCenterButtonClicked.value = false
    
    // 清除边缘滚动计时器
    if (edgeScrollTimer.value) {
      clearTimeout(edgeScrollTimer.value)
      edgeScrollTimer.value = null
    }
    
    // 重置状态
    const wasDragging = isBoxDragging.value || isBoxResizing.value
    const wasPanning = isViewPanning.value
    const wasPinching = isPinching.value
    
    isBoxDragging.value = false
    isBoxResizing.value = false
    isViewPanning.value = false
    isPinching.value = false // 双指缩放结束
    currentResizeHandle.value = ''
    
    // 保存修改后的 bbox
    if (wasDragging && selectedBox.value) {
      await saveBoxPosition(selectedBox.value)
    }
    
    // 编辑模式下，触摸单击背景退出编辑模式
    // 条件：不是拖拽框、不是平移视图、不是双指缩放，且点击的是背景（不是框）
    const isClickOnBackground = !boxTapStart.value.question
    const isClickOnSelectedBox = boxTapStart.value.question?.uuid === selectedBox.value?.uuid
    
    // 如果点击的是当前选中的框（包括中心方块），保持编辑模式
    if (selectedBox.value && isClickOnSelectedBox) {
      console.log('[ReviewView] 触摸单击当前选中框，保持编辑模式')
    } else if (selectedBox.value && !wasDragging && !wasPanning && !wasPinching) {
      if (isClickOnBackground) {
        // 点击背景，退出编辑模式
        console.log('[ReviewView] 触摸单击背景，退出编辑模式')
        selectedBox.value = null
        selectedListItemUuid.value = null
        // 如果是纯编辑进入列表模式，同时退出列表模式
        if (isEditEntryListMode.value) {
          exitListMode()
        }
      } else {
        // 点击其他框，保持编辑模式（或可以切换到其他框）
        console.log('[ReviewView] 触摸单击其他框，保持编辑模式')
      }
    }
  }
}

// 加载题目类型和错误类型配置
async function loadConfigTypes() {
  try {
    const subject = paperSubject.value || '公用'
    const studentId = paperInfo.value?.student_id
    
    console.log('[ReviewView] loadConfigTypes 开始:', { subject, studentId })
    
    // 并行加载题目类型和错误类型
    const [qtRes, etRes] = await Promise.all([
      configApi.getQuestionTypes({
        subject,
        studentId,
        includeDefault: true,
        includeCommon: true
      }),
      configApi.getErrorTypes({
        subject,
        studentId,
        includeDefault: true,
        includeCommon: true
      })
    ])
    
    const qtData = (qtRes as any).data || qtRes
    if (qtData?.items) {
      questionTypes.value = qtData.items.map((item: any) => ({
        code: item.code,
        description: item.description
      }))
    }
    
    const etData = (etRes as any).data || etRes
    if (etData?.items) {
      errorTypes.value = etData.items.map((item: any) => ({
        code: item.code,
        description: item.description
      }))
    }
    
    console.log('[ReviewView] 配置类型加载完成:', 
                '题目类型:', questionTypes.value.length, 
                '错误类型:', errorTypes.value.length)
  } catch (err) {
    console.error('[ReviewView] 加载配置类型失败:', err)
  }
}

// 保存题目类型和错误类型到后端
async function saveQuestionType(q: Question, typeCode: string) {
  try {
    console.log('[ReviewView] 保存题目类型:', q.uuid, typeCode)
    await questionApi.updateQuestion(q.uuid, {
      question_type: typeCode
    })
    // 更新本地数据
    const question = paperQuestions.value.find(pq => pq.uuid === q.uuid)
    if (question) {
      question.question_type = typeCode
      const typeInfo = questionTypes.value.find(t => t.code === typeCode)
      if (typeInfo) question.question_type_desc = typeInfo.description
    }
    console.log('[ReviewView] 题目类型保存成功')
  } catch (err) {
    console.error('[ReviewView] 保存题目类型失败:', err)
  }
}

async function saveErrorType(q: Question, errorCode: string) {
  try {
    console.log('[ReviewView] 保存错误类型:', q.uuid, errorCode)
    
    await questionApi.updateQuestion(q.uuid, {
      primary_error_type_id: errorCode
    })
    // 更新本地数据
    const question = paperQuestions.value.find(pq => pq.uuid === q.uuid)
    if (question) {
      question.primary_error_type_id = errorCode
    }
    console.log('[ReviewView] 错误类型保存成功')
  } catch (err) {
    console.error('[ReviewView] 保存错误类型失败:', err)
  }
}

// 保存框位置到后端
async function saveBoxPosition(q: Question) {
  try {
    const [y0, x0, y1, x1] = q.bbox_relative
    const pageNum = q.page_number
    
    // 判断是否为扩展框
    const isExt = isExtendedBox(q)
    const originalUuid = isExt ? getOriginalUuid(q.uuid) : q.uuid
    
    console.log('[ReviewView] 保存框位置:', originalUuid, { page: pageNum, bbox: [y0, x0, y1, x1], isExtended: isExt })
    
    // 格式: [P{n}: y0,x0,y1,x1] - 与后端 legacy 格式兼容
    const positionStr = `[P${pageNum}: ${y0.toFixed(4)},${x0.toFixed(4)},${y1.toFixed(4)},${x1.toFixed(4)}]`
    
    // 扩展框保存到 position_1，原框保存到 position
    await questionApi.updateQuestion(originalUuid, {
      [isExt ? 'position_1' : 'position']: positionStr
    })
    
    console.log('[ReviewView] 框位置已保存到 Question 表')
  } catch (err) {
    console.error('[ReviewView] 保存框位置失败:', err)
    // 不阻断用户操作，仅记录错误
  }
}

// 滚轮缩放
function handleWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  scale.value = Math.max(minScale.value, Math.min(5, scale.value * delta))
}

// 缩放控制
function zoomIn() {
  scale.value = Math.min(scale.value * 1.2, 5)
}

function zoomOut() {
  scale.value = Math.max(scale.value * 0.8, minScale.value)
}

// 开始长按缩放按钮
function startZoomLongPress(e: MouseEvent | TouchEvent) {
  // 不阻止默认行为，允许正常触发点击事件
  isLongPressZoom.value = false
  zoomPressTimer.value = window.setTimeout(() => {
    isLongPressZoom.value = true
    isZoomExpanded.value = true
  }, ZOOM_PRESS_DURATION)
}

// 结束长按（触发点击或长按）
function endZoomLongPress() {
  if (zoomPressTimer.value) {
    clearTimeout(zoomPressTimer.value)
    zoomPressTimer.value = null
  }
}

// 取消长按（移出区域）
function cancelZoomLongPress() {
  if (zoomPressTimer.value) {
    clearTimeout(zoomPressTimer.value)
    zoomPressTimer.value = null
  }
}

function resetView() {
  // 获取容器尺寸
  const containerWidth = mainContainer.value?.clientWidth || window.innerWidth
  const containerHeight = mainContainer.value?.clientHeight || window.innerHeight
  
  // 计算适合的缩放比例：让图片完整显示在容器内
  const padding = 16
  const scaleX = (containerWidth - padding) / imageWidth.value
  const scaleY = (containerHeight - padding) / imageHeight.value
  const fitScale = Math.max(minScale.value, Math.min(2, Math.min(scaleX, scaleY)))
  
  scale.value = fitScale
  
  // 重新计算居中位置（相对于 main 容器）
  const scaledWidth = imageWidth.value * fitScale
  const scaledHeight = imageHeight.value * fitScale
  translateX.value = (containerWidth - scaledWidth) / 2
  translateY.value = (containerHeight - scaledHeight) / 2
  
  console.log('[ReviewView] 重置视图:', '缩放:', fitScale.toFixed(3), '位置:', Math.round(translateX.value), Math.round(translateY.value))
  selectedBox.value = null
}

// 保持当前状态，只将页面缩放到适应容器（用于面板收起时）
function fitPageToFrame() {
  if (!imageLoaded.value || !mainContainer.value) return
  
  const containerWidth = mainContainer.value.clientWidth
  const containerHeight = mainContainer.value.clientHeight
  
  // 计算适合的缩放比例：让图片完整显示在容器内
  const padding = 16
  const scaleX = (containerWidth - padding) / imageWidth.value
  const scaleY = (containerHeight - padding) / imageHeight.value
  const fitScale = Math.max(minScale.value, Math.min(2, Math.min(scaleX, scaleY)))
  
  // 应用新的缩放比例
  scale.value = fitScale
  
  // 重新计算居中位置（相对于 main 容器）
  const scaledWidth = imageWidth.value * fitScale
  const scaledHeight = imageHeight.value * fitScale
  translateX.value = (containerWidth - scaledWidth) / 2
  translateY.value = (containerHeight - scaledHeight) / 2
  
  // 不清除 focus 状态，保持导航位置
  // focusUuid.value = null
  
  console.log('[ReviewView] 页面 fit frame:', '缩放:', fitScale.toFixed(3), '位置:', Math.round(translateX.value), Math.round(translateY.value))
}

// 其他功能
async function toggleQuestionStatus(q: Question) {
  // 切换状态
  const newStatus = !q.is_error
  
  // 先更新本地
  const question = paperQuestions.value.find(pq => pq.uuid === q.uuid)
  if (question) {
    question.is_error = newStatus
  }
  
  // 立即保存到后端
  try {
    await questionApi.updateQuestion(q.uuid, {
      is_error: newStatus
    })
    console.log('[ReviewView] 错题状态已保存', q.uuid, newStatus)
  } catch (err) {
    console.error('[ReviewView] 保存错题状态失败', err)
    // 保存失败时回滚本地状态
    if (question) {
      question.is_error = !newStatus
    }
  }
}

function toggleMode() {
  isCleanMode.value = !isCleanMode.value
  loadPageImage()
}

function prevPage() {
  if (currentPage.value > 1) {
    console.log('[DEBUG prevPage] 翻页之前focusUuid:', focusUuid.value)
    currentPage.value--
    selectedBox.value = null
    focusUuid.value = null // 清除 focus，显示所有框
    console.log('[DEBUG prevPage] 翻页后清除focusUuid')
    loadPageImage()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    console.log('[DEBUG nextPage] 翻页之前focusUuid:', focusUuid.value)
    currentPage.value++
    selectedBox.value = null
    focusUuid.value = null // 清除 focus，显示所有框
    console.log('[DEBUG nextPage] 翻页后清除focusUuid')
    loadPageImage()
  }
}

function jumpToQuestion(q: Question) {
  // 如果题目有扩展框且扩展框在当前页，优先跳转到当前页
  if (q.position_1) {
    const extendedPage = parsePageFromPosition(q.position_1)
    if (extendedPage === currentPage.value) {
      // 已经在扩展框页面，不需要跳转
      selectedBox.value = null
      return
    }
  }
  // 否则跳转到原框页面
  currentPage.value = q.page_number
  selectedBox.value = null
  loadPageImage()
}

// 导航到上一题
// 错题列表模式：在错题间导航
// 列表模式：在当前页题目间导航，到达边界时翻页
async function navigateToPrevQuestion() {
  // 设置导航标志，防止触发自动进入列表模式
  isNavigating.value = true
  
  // 导航时收起仪表盘
  showPanel.value = false
  
  // 导航时退出编辑模式（不显示 resize handles）
  selectedBox.value = null
  
  console.log('[DEBUG navigateToPrevQuestion] 开始导航, isDeleteMode:', isDeleteMode.value, 'focusUuid:', focusUuid.value)
  
  try {
  // 错题列表模式：在所有错题间导航
  if (!isDeleteMode.value) {
    const errorQuestions = [...selectedQuestions.value].sort((a, b) => {
      // 先按页码排序，再按题号排序
      if (a.page_number !== b.page_number) {
        return a.page_number - b.page_number
      }
      return (parseInt(a.question_number) || 0) - (parseInt(b.question_number) || 0)
    })
    
    if (errorQuestions.length === 0) return
    
    // 使用 focusUuid 来跟踪当前导航位置
    let currentIndex = focusUuid.value 
      ? errorQuestions.findIndex(q => getOriginalUuid(q.uuid) === focusUuid.value)
      : -1
    
    console.log('[DEBUG navigateToPrevQuestion] 错题模式, 错题数:', errorQuestions.length, 'currentIndex:', currentIndex)
    console.log('[DEBUG navigateToPrevQuestion] 错题列表:', errorQuestions.map((q, i) => `${i}:题${q.question_number}(原${getOriginalUuid(q.uuid).slice(0,8)})`).join(', '))
    
    // 如果没有焦点或找不到，从第一题开始（显示第一题，不跳过）
    if (currentIndex === -1) {
      currentIndex = 0
      const firstQuestion = errorQuestions[0]
      console.log('[DEBUG navigateToPrevQuestion] 无焦点，显示第一题:', firstQuestion.question_number)
      if (firstQuestion.page_number !== currentPage.value) {
        currentPage.value = firstQuestion.page_number
        loadPageImage()
        await waitForImageLoad()
      }
      fitBoxToFrame(firstQuestion, { onlyHighlight: true })
      return
    }
    
    if (currentIndex > 0) {
      // 有上一个错题
      const prevQuestion = errorQuestions[currentIndex - 1]
      // 如果页码不同，需要切换页面
      if (prevQuestion.page_number !== currentPage.value) {
        currentPage.value = prevQuestion.page_number
        loadPageImage()
        await waitForImageLoad()
      }
      // 只高亮显示，不进入编辑模式
      fitBoxToFrame(prevQuestion, { onlyHighlight: true })
    } else {
      // 已经是第一个，循环到最后一个
      const lastQuestion = errorQuestions[errorQuestions.length - 1]
      if (lastQuestion.page_number !== currentPage.value) {
        currentPage.value = lastQuestion.page_number
        loadPageImage()
        await waitForImageLoad()
      }
      // 只高亮显示，不进入编辑模式
      fitBoxToFrame(lastQuestion, { onlyHighlight: true })
    }
    return
  }
  
  // 列表模式：在所有题目间导航（跨页）
  const allQs = [...allQuestions.value].sort((a, b) => {
    // 先按页码排序，再按题号排序
    if (a.page_number !== b.page_number) {
      return a.page_number - b.page_number
    }
    return (parseInt(a.question_number) || 0) - (parseInt(b.question_number) || 0)
  })
  
  if (allQs.length === 0) return
  
  console.log('[DEBUG navigateToPrevQuestion] 列表模式, 总题数:', allQs.length, 'focusUuid:', focusUuid.value)
  console.log('[DEBUG navigateToPrevQuestion] 题目列表:', allQs.map((q, i) => `${i}:题${q.question_number}(原${getOriginalUuid(q.uuid).slice(0,8)})`).join(', '))
  
  // 使用 focusUuid 来跟踪当前导航位置
  let currentIndex = focusUuid.value 
    ? allQs.findIndex(q => getOriginalUuid(q.uuid) === focusUuid.value)
    : -1
  
  console.log('[DEBUG navigateToPrevQuestion] 找到的currentIndex:', currentIndex)
  
  // 如果没有焦点或找不到，从第一题开始（显示第一题，不跳过）
  if (currentIndex === -1) {
    currentIndex = 0
    const firstQuestion = allQs[0]
    console.log('[DEBUG navigateToPrevQuestion] 无焦点，显示第一题:', firstQuestion.question_number)
    if (firstQuestion.page_number !== currentPage.value) {
      currentPage.value = firstQuestion.page_number
      loadPageImage()
      await waitForImageLoad()
    }
    fitBoxToFrame(firstQuestion, { onlyHighlight: true })
    return
  }
  
  if (currentIndex > 0) {
    // 有上一题
    const prevQuestion = allQs[currentIndex - 1]
    console.log('[DEBUG navigateToPrevQuestion] 有上一题, 从题', allQs[currentIndex].question_number, '到题', prevQuestion.question_number)
    // 如果页码不同，需要切换页面
    if (prevQuestion.page_number !== currentPage.value) {
      currentPage.value = prevQuestion.page_number
      loadPageImage()
      await waitForImageLoad()
    }
    // 只高亮显示，不进入编辑模式
    fitBoxToFrame(prevQuestion, { onlyHighlight: true })
  } else {
    // 已经是第一个，循环到最后一个
    const lastQuestion = allQs[allQs.length - 1]
    if (lastQuestion.page_number !== currentPage.value) {
      currentPage.value = lastQuestion.page_number
      loadPageImage()
      await waitForImageLoad()
    }
    // 只高亮显示，不进入编辑模式
    fitBoxToFrame(lastQuestion, { onlyHighlight: true })
  }
} finally {
  // 清除导航标志
  isNavigating.value = false
}
}

// 导航到下一题
// 错题列表模式：在错题间导航
// 列表模式：在当前页题目间导航，到达边界时翻页
async function navigateToNextQuestion() {
  // 设置导航标志，防止触发自动进入列表模式
  isNavigating.value = true
  
  // 导航时收起仪表盘
  showPanel.value = false
  
  // 导航时退出编辑模式（不显示 resize handles）
  selectedBox.value = null
  
  console.log('[DEBUG navigateToNextQuestion] 开始导航, isDeleteMode:', isDeleteMode.value, 'focusUuid:', focusUuid.value)
  
  try {
  // 错题列表模式：在所有错题间导航
  if (!isDeleteMode.value) {
    const errorQuestions = [...selectedQuestions.value].sort((a, b) => {
      // 先按页码排序，再按题号排序
      if (a.page_number !== b.page_number) {
        return a.page_number - b.page_number
      }
      return (parseInt(a.question_number) || 0) - (parseInt(b.question_number) || 0)
    })
    
    if (errorQuestions.length === 0) return
    
    // 使用 focusUuid 来跟踪当前导航位置
    let currentIndex = focusUuid.value 
      ? errorQuestions.findIndex(q => getOriginalUuid(q.uuid) === focusUuid.value)
      : -1
    
    // 如果没有焦点或找不到，从第一题开始（显示第一题，不跳过）
    if (currentIndex === -1) {
      currentIndex = 0
      const firstQuestion = errorQuestions[0]
      if (firstQuestion.page_number !== currentPage.value) {
        currentPage.value = firstQuestion.page_number
        loadPageImage()
        await waitForImageLoad()
      }
      fitBoxToFrame(firstQuestion, { onlyHighlight: true })
      return
    }
    
    if (currentIndex >= 0 && currentIndex < errorQuestions.length - 1) {
      // 有下一个错题
      const nextQuestion = errorQuestions[currentIndex + 1]
      // 如果页码不同，需要切换页面
      if (nextQuestion.page_number !== currentPage.value) {
        currentPage.value = nextQuestion.page_number
        loadPageImage()
        await waitForImageLoad()
      }
      // 只高亮显示，不进入编辑模式
      fitBoxToFrame(nextQuestion, { onlyHighlight: true })
    } else {
      // 已经是最后一个，循环到第一个
      const firstQuestion = errorQuestions[0]
      if (firstQuestion.page_number !== currentPage.value) {
        currentPage.value = firstQuestion.page_number
        loadPageImage()
        await waitForImageLoad()
      }
      // 只高亮显示，不进入编辑模式
      fitBoxToFrame(firstQuestion, { onlyHighlight: true })
    }
    return
  }
  
  // 列表模式：在所有题目间导航（跨页）
  const allQs = [...allQuestions.value].sort((a, b) => {
    // 先按页码排序，再按题号排序
    if (a.page_number !== b.page_number) {
      return a.page_number - b.page_number
    }
    return (parseInt(a.question_number) || 0) - (parseInt(b.question_number) || 0)
  })
  
  if (allQs.length === 0) return
  
  console.log('[DEBUG navigateToNextQuestion] 列表模式, 总题数:', allQs.length, 'focusUuid:', focusUuid.value)
  console.log('[DEBUG navigateToNextQuestion] 题目列表:', allQs.map((q, i) => `${i}:题${q.question_number}(原${getOriginalUuid(q.uuid).slice(0,8)})`).join(', '))
  
  // 使用 focusUuid 来跟踪当前导航位置
  let currentIndex = focusUuid.value 
    ? allQs.findIndex(q => getOriginalUuid(q.uuid) === focusUuid.value)
    : -1
  
  console.log('[DEBUG navigateToNextQuestion] 找到的currentIndex:', currentIndex)
  
  // 如果没有焦点或找不到，从第一题开始（显示第一题，不跳过）
  if (currentIndex === -1) {
    currentIndex = 0
    const firstQuestion = allQs[0]
    console.log('[DEBUG navigateToNextQuestion] 无焦点，显示第一题:', firstQuestion.question_number)
    if (firstQuestion.page_number !== currentPage.value) {
      currentPage.value = firstQuestion.page_number
      loadPageImage()
      await waitForImageLoad()
    }
    fitBoxToFrame(firstQuestion, { onlyHighlight: true })
    return
  }
  
  if (currentIndex >= 0 && currentIndex < allQs.length - 1) {
    // 有下一题
    const nextQuestion = allQs[currentIndex + 1]
    console.log('[DEBUG navigateToNextQuestion] 有下一题, 从题', allQs[currentIndex].question_number, '到题', nextQuestion.question_number)
    // 如果页码不同，需要切换页面
    if (nextQuestion.page_number !== currentPage.value) {
      currentPage.value = nextQuestion.page_number
      loadPageImage()
      await waitForImageLoad()
    }
    // 只高亮显示，不进入编辑模式
    fitBoxToFrame(nextQuestion, { onlyHighlight: true })
  } else {
    // 已经是最后一个，循环到第一个
    const firstQuestion = allQs[0]
    if (firstQuestion.page_number !== currentPage.value) {
      currentPage.value = firstQuestion.page_number
      loadPageImage()
      await waitForImageLoad()
    }
    // 只高亮显示，不进入编辑模式
    fitBoxToFrame(firstQuestion, { onlyHighlight: true })
  }
} finally {
  // 清除导航标志
  isNavigating.value = false
}
}

// Fit frame 显示指定矩形框（矩形框撑满视图）
// 如果该题有多个框（原框+扩展框）在同一页，则以所有框的并集边界进行 fit
// options.onlyHighlight: true 表示只高亮而不缩放
function fitBoxToFrame(q: Question, options?: { onlyHighlight?: boolean }) {
  // 确保图片已加载
  if (!imageLoaded.value || !mainContainer.value) {
    console.log('[DEBUG fitBoxToFrame] 图片未加载或容器不存在, 返回')
    return
  }
  
  // 设置聚焦的题目标识（原始 uuid，不包括 _extended）
  const originalUuid = getOriginalUuid(q.uuid)
  console.log('[DEBUG fitBoxToFrame] 设置focusUuid为:', originalUuid, '题号:', q.question_number, 'onlyHighlight:', options?.onlyHighlight)
  focusUuid.value = originalUuid
  
  // 如果只需要高亮，不执行缩放变换
  if (options?.onlyHighlight) return
  
  const containerWidth = mainContainer.value.clientWidth
  const containerHeight = mainContainer.value.clientHeight
  const padding = 0 // 边距，fit frame 时无外边距，框完全撑满视图
  
  // 找到所有当前 focus 的框（原框+扩展框）
  const focusedQuestions = currentQuestions.value.filter(q => getOriginalUuid(q.uuid) === originalUuid)
  
  // 计算所有框的并集边界
  let minX = 1, minY = 1, maxX = 0, maxY = 0
  focusedQuestions.forEach(q => {
    const [y0, x0, y1, x1] = q.bbox_relative
    minX = Math.min(minX, x0)
    minY = Math.min(minY, y0)
    maxX = Math.max(maxX, x1)
    maxY = Math.max(maxY, y1)
  })
  
  // 计算并集区域的宽度和高度
  const unionWidth = (maxX - minX) * imageWidth.value
  const unionHeight = (maxY - minY) * imageHeight.value
  const unionCenterX = (minX + maxX) / 2 * imageWidth.value
  const unionCenterY = (minY + maxY) / 2 * imageHeight.value
  
  // 计算 fit frame 缩放比例（让并集区域撑满视图）
  const availableWidth = containerWidth - padding * 2
  const availableHeight = containerHeight - padding * 2
  const targetScaleX = availableWidth / unionWidth
  const targetScaleY = availableHeight / unionHeight
  const targetScale = Math.min(targetScaleX, targetScaleY, 5) // 最大缩放 5x
  
  // fit frame 模式下不使用 minScale 限制，确保框能正确 fit
  const finalScale = Math.max(targetScale, 0.1) // 只限制绝对最小值 0.1x 防止过度缩小
  
  // 计算 translate 让并集区域居中
  const scaledCenterX = unionCenterX * finalScale
  const scaledCenterY = unionCenterY * finalScale
  
  const newTranslateX = containerWidth / 2 - scaledCenterX
  const newTranslateY = containerHeight / 2 - scaledCenterY
  
  // 应用变换
  scale.value = finalScale
  translateX.value = newTranslateX
  translateY.value = newTranslateY
  
  console.log('[ReviewView] Fit frame:', { 
    container: { w: containerWidth, h: containerHeight },
    unionBox: { x0: minX, y0: minY, x1: maxX, y1: maxY, w: Math.round(unionWidth), h: Math.round(unionHeight) },
    boxCount: focusedQuestions.length,
    scale: finalScale.toFixed(3), 
    translate: { x: Math.round(newTranslateX), y: Math.round(newTranslateY) },
    focusUuid: focusUuid.value
  })
}

// 跳转到题目原框位置并 fit frame 显示
async function jumpToQuestionAndHighlight(q: Question, highlightExtended: boolean) {
  selectedBox.value = null
  
  // 设置焦点 UUID 和列表选中项（用于导航和面板同步）
  const originalUuid = getOriginalUuid(q.uuid)
  focusUuid.value = originalUuid
  selectedListItemUuid.value = originalUuid
  
  if (highlightExtended && q.position_1) {
    // 跳转到扩展框页面
    const extendedPage = parsePageFromPosition(q.position_1)
    if (extendedPage) {
      currentPage.value = extendedPage
    }
  } else {
    // 跳转到原框页面
    currentPage.value = q.page_number
  }
  
  // 等待图片加载完成后 fit frame
  loadPageImage()
  
  // 修复：使用 waitForImageLoad 确保图片加载完成，而不是固定延迟
  await waitForImageLoad()
  
  if (highlightExtended && q.position_1) {
    // 找到扩展框并 fit frame
    const extendedBox: Question = {
      ...q,
      bbox_relative: parseBboxFromPosition(q.position_1),
      uuid: `${q.uuid}_extended`
    }
    fitBoxToFrame(extendedBox)
  } else {
    // fit frame 原框
    fitBoxToFrame(q)
  }
}

// 跳转到扩展框页面并 fit frame 显示
async function jumpToExtendedPageAndHighlight(q: Question) {
  if (!q.position_1) return
  
  // 设置焦点 UUID 和列表选中项（用于导航和面板同步）
  const originalUuid = getOriginalUuid(q.uuid)
  focusUuid.value = originalUuid
  selectedListItemUuid.value = originalUuid
  
  const extendedPage = parsePageFromPosition(q.position_1)
  if (extendedPage) {
    // 如果是纯编辑进入列表模式，直接进入编辑模式，不执行 fit frame
    if (isEditEntryListMode.value) {
      if (currentPage.value !== extendedPage) {
        currentPage.value = extendedPage
        loadPageImage()
        await waitForImageLoad()
      }
      // 直接设置扩展框为编辑模式
      const extendedBox: Question = {
        ...q,
        bbox_relative: parseBboxFromPosition(q.position_1) || q.bbox_relative,
        uuid: `${q.uuid}_extended`
      }
      selectedBox.value = extendedBox
      return
    }
    
    // 正常模式：切换页面并执行 fit frame
    selectedBox.value = null
    currentPage.value = extendedPage
    loadPageImage()
    
    // 等待图片加载完成后执行 fit frame
    await waitForImageLoad()
    
    const extendedBox: Question = {
      ...q,
      bbox_relative: parseBboxFromPosition(q.position_1) || q.bbox_relative,
      uuid: `${q.uuid}_extended`
    }
    fitBoxToFrame(extendedBox)
  }
}

// 判断题目是否有扩展框（position_1）
function hasExtendedBox(q: Question): boolean {
  return !!q.position_1 && q.position_1.trim() !== '' && q.position_1 !== '0'
}

// 获取题目在当前页的扩展框位置（如果存在）
function getExtendedBoxPage(q: Question): number | null {
  if (!q.position_1 || q.position_1 === '0') return null
  const page = parsePageFromPosition(q.position_1)
  return page
}

// 从 position 字符串解析页码
function parsePageFromPosition(position: string): number | null {
  if (!position) return null
  
  try {
    // 尝试解析 JSON 格式
    if (position.startsWith('{')) {
      const data = JSON.parse(position)
      if (data.page) return data.page
    }
    
    // 尝试解析字符串格式: "[P{n}: y0,x0,y1,x1]"
    const match = position.match(/\[P(\d+):/)
    if (match) {
      return parseInt(match[1], 10)
    }
  } catch (e) {
    console.warn('解析页码失败:', position, e)
  }
  
  return null
}

// 生成 bbox 字符串
function formatPosition(page: number, bbox: [number, number, number, number]): string {
  return `[P${page}: ${bbox[0].toFixed(4)},${bbox[1].toFixed(4)},${bbox[2].toFixed(4)},${bbox[3].toFixed(4)}]`
}

// 同步扩展框位置到原框的 position_1
function syncExtendedBoxPosition(extendedQ: Question) {
  const originalUuid = getOriginalUuid(extendedQ.uuid)
  const originalQ = allQuestions.value.find(q => q.uuid === originalUuid)
  if (originalQ) {
    const [y0, x0, y1, x1] = extendedQ.bbox_relative
    const pageNum = extendedQ.page_number
    originalQ.position_1 = formatPosition(pageNum, [y0, x0, y1, x1])
  }
}

// 扩展题目：在当前页添加一个扩展矩形框
// 点击"扩"按钮：进入待确认扩展状态
function onExpandClick(q: Question, fromListMode: boolean = false) {
  // 保存当前列表模式
  previousListMode.value = listMode.value
  
  // 设置待扩展题目
  pendingExpandQuestion.value = q
  
  // 只有在列表模式下才切换到"所有"模式
  if (fromListMode && isDeleteMode.value) {
    listMode.value = 'all'
  }
  
  console.log('[ReviewView] 等待确认扩展:', q.uuid, '之前模式:', previousListMode.value)
}

// 确认扩展：执行实际扩展操作
async function confirmExpand() {
  if (!pendingExpandQuestion.value) return
  
  const q = pendingExpandQuestion.value
  isExpanding.value = true
  
  try {
    // 计算扩展框的位置（基于原框向右下方偏移）
    const offset = EXTENDED_BOX_OFFSET
    const newBbox: [number, number, number, number] = [
      Math.min(q.bbox_relative[0] + offset, 0.9),
      Math.min(q.bbox_relative[1] + offset, 0.9),
      Math.min(q.bbox_relative[2] + offset, 0.95),
      Math.min(q.bbox_relative[3] + offset, 0.95)
    ]
    
    // 生成 position_1 字符串（使用当前页作为扩展框所在页）
    const position1 = formatPosition(currentPage.value, newBbox)
    
    // 保存到后端
    await questionApi.updateQuestion(q.uuid, {
      position_1: position1
    })
    
    // 更新本地数据
    q.position_1 = position1
    
    console.log('[ReviewView] 扩展题目成功:', q.uuid, position1)
    
    // 清空待扩展状态
    pendingExpandQuestion.value = null
    
    // 恢复之前的列表模式
    listMode.value = previousListMode.value
    
    // 本地更新已生效，currentQuestions computed 会自动生成扩展框
    // 直接进入编辑模式（无需全量刷新）
    const extendedBox: Question = {
      ...q,
      bbox_relative: newBbox,
      page_number: currentPage.value,  // 扩展框实际所在页
      uuid: `${q.uuid}_extended`
    }
    selectedBox.value = extendedBox
    console.log('[ReviewView] 扩展框已进入编辑模式，页码:', currentPage.value)
  } catch (err) {
    console.error('[ReviewView] 扩展题目失败:', err)
    alert('扩展失败，请重试')
  } finally {
    isExpanding.value = false
  }
}

// 取消待扩展状态
function cancelExpand() {
  pendingExpandQuestion.value = null
  // 恢复之前的列表模式
  listMode.value = previousListMode.value
  console.log('[ReviewView] 取消扩展，恢复模式:', previousListMode.value)
}

// 保留原函数以兼容（实际上不会被直接调用）
async function expandQuestion(q: Question) {
  // 这个函数现在通过 onExpandClick + confirmExpand 方式调用
  onExpandClick(q)
}

// 收缩题目：删除扩展矩形框
async function shrinkQuestion(q: Question) {
  if (isShrinking.value) return
  isShrinking.value = true
  
  try {
    // 直接删除 position_1，无论扩展框在哪个页面
    await questionApi.updateQuestion(q.uuid, {
      position_1: ''
    })
    q.position_1 = ''
    console.log('[ReviewView] 收缩题目成功:', q.uuid)
  } catch (err) {
    console.error('[ReviewView] 收缩题目失败:', err)
    alert('收缩失败，请重试')
  } finally {
    isShrinking.value = false
  }
}

// 移动题目框到当前页
async function moveBoxToCurrentPage(q: Question) {
  // 从所有题目中查找对应的框（可能不在当前页）
  const targetBox = allQuestions.value.find(aq => aq.uuid === q.uuid)
  if (!targetBox) {
    alert('未找到对应的矩形框')
    return
  }
  
  // 检查框的页码是否与当前页相同
  const boxPage = targetBox.page_number
  if (boxPage === currentPage.value) {
    alert('不可再同页变换页码')
    return
  }
  
  // 确认是否移动
  if (!confirm(`确定要将该矩形框从第${boxPage}页移动到第${currentPage.value}页吗？`)) {
    return
  }
  
  try {
    const originalUuid = getOriginalUuid(targetBox.uuid)
    const isExt = isExtendedBox(targetBox)
    
    if (isExt) {
      // 移动扩展框：更新 position_1 的页码
      const bbox = parseBboxFromPosition(targetBox.position || '') || targetBox.bbox_relative
      const newPosition = formatPosition(currentPage.value, bbox)
      await questionApi.updateQuestion(originalUuid, {
        position_1: newPosition
      })
    } else {
      // 移动原框：更新 position 的页码
      const bbox = targetBox.bbox_relative
      const newPosition = formatPosition(currentPage.value, bbox)
      await questionApi.updateQuestion(originalUuid, {
        position: newPosition
      })
    }
    
    // 本地更新框位置（替代全量刷新）
    if (isExt) {
      targetBox.position_1 = newPosition
      targetBox.page_number = currentPage.value
    } else {
      targetBox.position = newPosition
      targetBox.page_number = currentPage.value
    }
    
    // 重新选中该框（currentQuestions 已自动更新）
    const newTargetBox = currentQuestions.value.find(cq => getOriginalUuid(cq.uuid) === originalUuid)
    if (newTargetBox) {
      selectedBox.value = newTargetBox
      selectedListItemUuid.value = originalUuid
    }
    
    console.log('[ReviewView] 移动框成功:', originalUuid, '到第', currentPage.value, '页')
  } catch (err) {
    console.error('[ReviewView] 移动框失败:', err)
    alert('移动失败，请重试')
  }
}

function undoSelection() {
  const last = selectedQuestions.value[selectedQuestions.value.length - 1]
  if (last) toggleQuestionStatus(last)
}

async function openPaperPdf() {
  const pid = paperId.value
  if (!pid) {
    alert('未找到试卷信息')
    return
  }
  const pdfType = isCleanMode.value ? 'clean' : 'original'
  const filename = `${paperName.value || '试卷'}_${pdfType}.pdf`

  try {
    const response = await client.get(`/papers/${pid}/export/pdf?pdf_type=${pdfType}`, {
      responseType: 'blob'
    })
    const blob = response as unknown as Blob
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
  } catch (e: any) {
    console.error('下载失败:', e)
    alert('下载失败，请重试')
  }
}

async function showExport() {
  if (selectedCount.value === 0) {
    alert('请至少选择一道错题')
    return
  }
  
  const currentStudentId = paperInfo.value?.student_id
  
  if (!currentStudentId) {
    alert('未找到学生信息')
    return
  }
  
  const targetPaperId = paperId.value
  
  if (!targetPaperId) {
    alert('未找到试卷信息，请稍后重试')
    return
  }
  
  // 保存已选错题到 sessionStorage，供 ExportView 读取
  const exportData = {
    paperId: targetPaperId,
    studentId: currentStudentId,
    subject: paperSubject.value,
    questions: selectedQuestions.value
  }
  sessionStorage.setItem('exportData', JSON.stringify(exportData))
  
  // 跳转到导出页面
  router.push({
    path: `/export/${targetPaperId}`,
    query: {
      student_id: currentStudentId,
      subject: paperSubject.value
    }
  })
}

// 生命周期
// 加载试卷数据
async function loadPaperData() {
  if (!paperId.value) return
  
  console.log('[ReviewView] 加载试卷数据，paperId:', paperId.value)
  try {
    const res = await paperApi.getTreeDetail(paperId.value)
    const data = (res as any).data || res
    
    console.log('[ReviewView] 试卷详情:', data?.paper_name, '总页数:', data?.total_pages, '题目数:', data?.questions?.length)
    console.log('[ReviewView] 日期字段:', { created_at: data?.created_at, updated_at: data?.updated_at })
    
    if (data && data.questions) {
      paperInfo.value = {
        id: data.paper_id,
        name: data.paper_name,
        total_pages: data.total_pages,
        student_id: data.student_id,
        paper_number: data.paper_number,
        subject: data.subject,
        grade: data.grade,
        semester: data.semester,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
      
      // 设置学科用于获取配置
      paperSubject.value = data.subject || '公用'
      
      // 并行加载配置和转换题目数据（无依赖关系）
      const configPromise = loadConfigTypes()
      
      // 转换题目数据格式
      paperQuestions.value = data.questions.map((q: any) => {
        const bbox = parseBboxFromPosition(q.所在位置)
        return {
          uuid: q.UUID,
          batch_id: '',
          page_number: q.所在页码 || 1,
          question_number: q.题号 || q.level_2 || '1',
          bbox_relative: bbox,
          bbox_absolute: [0, 0, 100, 100],
          is_error: q.对错标签 === 'F',
          question_type: q.question_type_id || '',
          question_type_desc: q.题目类型 || '',
          primary_error_type_id: q.主要错误类型 || '',
          secondary_error_type_id: q.次要错误类型 || '',
          created_at: new Date().toISOString(),
          level_1: q.level_1 || '0',
          level_2: q.level_2 || '0',
          level_3: q.level_3 || '0',
          level_4: q.level_4 || '0',
          position: q.所在位置 || '',
          position_1: (q.所在位置1 && q.所在位置1 !== '0') ? q.所在位置1 : ''
        }
      })
      
      // 等待配置加载完成
      await configPromise
      
      console.log('[ReviewView] 题目加载完成:', paperQuestions.value.length, '题')
      console.log('[ReviewView] 第1页题目数:', paperQuestions.value.filter((q: Question) => q.page_number === 1).length)
      
      // 清除 focus 状态，显示所有矩形框
      focusUuid.value = null
      
      loadPageImage()
    } else {
      alert('试卷信息不可用')
      router.push('/')
    }
  } catch (e) {
    console.error('加载试卷失败:', e)
    alert('加载试卷失败')
    router.push('/')
  }
}

// 格式化日期（年月日）
function formatDateTime(isoString: string | undefined): string {
  if (!isoString) return '-'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-')
}

onMounted(async () => {
  if (paperId.value) {
    // Paper 模式：从已导入试卷加载数据
    await loadPaperData()
  } else {
    alert('无效的试卷ID')
    router.push('/')
  }
  
  // 监听窗口大小变化，重新居中
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 窗口大小变化处理
function handleResize() {
  // 获取容器尺寸
  const containerWidth = mainContainer.value?.clientWidth || window.innerWidth
  const containerHeight = mainContainer.value?.clientHeight || window.innerHeight
  
  // 重新计算适合的缩放比例和居中位置
  const padding = 16
  const scaleX = (containerWidth - padding) / imageWidth.value
  const scaleY = (containerHeight - padding) / imageHeight.value
  const fitScale = Math.max(0.05, Math.min(2, Math.min(scaleX, scaleY)))
  
  scale.value = fitScale
  
  const scaledWidth = imageWidth.value * fitScale
  const scaledHeight = imageHeight.value * fitScale
  translateX.value = (containerWidth - scaledWidth) / 2
  translateY.value = (containerHeight - scaledHeight) / 2
}

// 从位置字符串解析 bbox [y0, x0, y1, x1]
// 支持两种格式:
// 1. JSON: {"page": 1, "bbox": [y0, x0, y1, x1]} (后端 Question 表存储格式)
// 2. 字符串: "[P1: y0,x0,y1,x1]" (meta.json 格式)
function parseBboxFromPosition(position: string): [number, number, number, number] {
  if (!position) return [0, 0, 0.1, 0.1]
  
  try {
    // 尝试解析 JSON 格式 (后端存储格式)
    if (position.startsWith('{')) {
      const data = JSON.parse(position)
      if (data.bbox && Array.isArray(data.bbox) && data.bbox.length === 4) {
        console.log('[ReviewView] 解析 JSON bbox:', data.bbox)
        return data.bbox as [number, number, number, number]
      }
    }
    
    // 尝试解析字符串格式: "[P{n}: y0,x0,y1,x1]"
    const match = position.match(/\[P\d+:\s*([\d.]+),([\d.]+),([\d.]+),([\d.]+)\]/)
    if (match) {
      return [
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3]),
        parseFloat(match[4])
      ]
    }
  } catch (e) {
    console.warn('解析位置失败:', position, e)
  }
  
  return [0, 0, 0.1, 0.1]
}
</script>

<style scoped>
main { touch-action: none; }
img { 
  -webkit-user-drag: none; 
  user-select: none; 
  pointer-events: none;
  /* 确保图片以原始尺寸显示，与矩形框坐标系统一致 */
  object-fit: none;
}
.will-change-transform { will-change: transform; }

/* 确保矩形框可以正确接收触摸事件 */
.question-box {
  touch-action: none;
}

/* Focus 高亮样式：使用轻微白色半透明背景 + 内阴影增强对比度 */
.focus-highlight {
  /* 轻微白色半透明背景，增强内容可见性 */
  background-color: rgba(255, 255, 255, 0.15);
  /* 添加内阴影增强视觉效果 */
  box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.4), 0 0 20px rgba(255, 255, 255, 0.2);
}
</style>
