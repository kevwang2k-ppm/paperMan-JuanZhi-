<template>
  <div class="space-y-2 md:space-y-3">
    <!-- 子 Tab -->
    <div class="bg-white rounded-xl border p-1">
      <div class="flex gap-1">
        <button
          @click="activeSubTab = 'errorTypes'"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
          :class="activeSubTab === 'errorTypes' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
        >
          错题类型
        </button>
        <button
          @click="activeSubTab = 'questionTypes'"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
          :class="activeSubTab === 'questionTypes' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
        >
          试题类型
        </button>
        <button
          @click="activeSubTab = 'groups'"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
          :class="activeSubTab === 'groups' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
        >
          错整分组
        </button>
        <button
          @click="activeSubTab = 'printFormats'"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
          :class="activeSubTab === 'printFormats' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
        >
          打印格式
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <!-- 左侧：学生选择 + 学科选择 + 表单 -->
      <div class="md:col-span-1 space-y-2 md:space-y-3">
        <!-- 学生选择器 -->
        <div class="bg-white rounded-xl border p-3 md:p-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-user-graduate mr-1 text-blue-500"></i>学生
          </label>
          <select
            v-model="selectedStudentId"
            class="w-full px-2 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
          >
            <option value="">不指定学生（默认配置）</option>
            <option v-for="s in studentOptions" :key="s.value" :value="s.value">
              {{ s.label }}
            </option>
          </select>
          <p class="text-sm text-gray-500 mt-2">
            <i class="fas fa-info-circle mr-1"></i>
            选择学生后可查看/编辑该学生的个性化错整配置
          </p>
        </div>

        <!-- 学科选择器 -->
        <div v-if="activeSubTab !== 'printFormats'" class="bg-white rounded-xl border p-5">
          <label class="block text-sm font-medium text-gray-700 mb-2">学科</label>
          <select
            v-model="selectedSubject"
            class="w-full px-2 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
          >
            <option value="公用">公用</option>
            <option v-for="sub in subjectOptions" :key="sub" :value="sub">{{ sub }}</option>
          </select>
        </div>

        <!-- 表单 -->
        <div class="bg-white rounded-xl border p-3 md:p-4 space-y-2 md:space-y-3">
          <h2 class="font-semibold text-gray-800">{{ formTitle }}</h2>
          <div v-if="selectedItem">
            <label class="block text-sm font-medium text-gray-700 mb-1">编号</label>
            <input
              :value="selectedItem.code"
              type="text"
              readonly
              class="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
            />
          </div>
          <div v-if="selectedItem">
            <label class="block text-sm font-medium text-gray-700 mb-1">来源</label>
            <div class="flex items-center gap-2">
              <span
                class="text-sm px-2 py-0.5 rounded"
                :class="selectedItem.source === 'default' ? 'bg-gray-100 text-gray-600' : selectedItem.source === 'override' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'"
              >
                {{ sourceLabel(selectedItem.source) }}
              </span>
            </div>
          </div>
          <div v-if="selectedItem && activeSubTab !== 'printFormats'">
            <label class="block text-sm font-medium text-gray-700 mb-1">所属学科</label>
            <input
              :value="selectedItem.subject"
              type="text"
              readonly
              class="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <input
              v-model="form.description"
              type="text"
              placeholder="请输入描述"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
          <div v-if="activeSubTab === 'questionTypes'">
            <label class="block text-sm font-medium text-gray-700 mb-1">打印格式</label>
            <select
              v-model="form.print_format_id"
              @change="onPrintFormatChange"
              class="w-full px-2 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
            >
              <option value="">不指定</option>
              <option v-for="pf in printFormatOptions" :key="pf.code" :value="pf.code">
                {{ pf.description }} (前{{ pf.front_lines }}/后{{ pf.back_lines }})
              </option>
              <option value="__new__">+ 新建打印格式...</option>
            </select>
          </div>
          <template v-if="activeSubTab === 'printFormats'">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">前空行数</label>
              <input
                v-model.number="form.front_lines"
                type="number"
                min="0"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">后空行数</label>
              <input
                v-model.number="form.back_lines"
                type="number"
                min="0"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="form.allow_dual_column" type="checkbox" class="rounded text-blue-600" />
                <span class="text-sm text-gray-700">允许双栏</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="form.allow_page_break" type="checkbox" class="rounded text-blue-600" />
                <span class="text-sm text-gray-700">允许跨页</span>
              </label>
            </div>
          </template>
          <div v-if="activeSubTab === 'groups' && selectedItem">
            <label class="block text-sm font-medium text-gray-700 mb-1">已分配错题类型</label>
            <div class="text-sm text-gray-500 mb-2">
              {{ (selectedItem as any).error_type_codes?.length || 0 }} 个错题类型
            </div>
            <button
              @click="openAssignDialog"
              class="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
            >
              <i class="fas fa-edit mr-1"></i>编辑分配
            </button>
          </div>
          <div class="flex gap-2 pt-2">
            <button
              @click="handleAdd"
              :disabled="!canEdit"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              添加
            </button>
            <button
              @click="handleUpdate"
              :disabled="!selectedItem || !canEdit"
              class="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              更新
            </button>
            <button
              @click="handleDelete"
              :disabled="!selectedItem || !canEdit"
              class="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              删除
            </button>
          </div>
          <p v-if="!canEdit" class="text-sm text-amber-600">
            <i class="fas fa-exclamation-triangle mr-1"></i>
            默认配置不可直接修改，请先选择学生
          </p>
        </div>
      </div>

      <!-- 右侧：列表 -->
      <div class="md:col-span-2 bg-white rounded-xl border p-3 md:p-4 space-y-2 md:space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-gray-800">{{ listTitle }}</h2>
          <span v-if="activeSubTab !== 'printFormats'" class="text-sm px-2 py-1 bg-blue-50 text-blue-700 rounded-full">{{ selectedSubject }}</span>
        </div>
        <div class="border rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-600">
              <tr>
                <th class="px-4 py-2 text-left">编号</th>
                <th class="px-4 py-2 text-left">描述</th>
                <th v-if="activeSubTab === 'printFormats'" class="px-4 py-2 text-left">前/后空行</th>
                <th v-if="activeSubTab === 'printFormats'" class="px-4 py-2 text-left">格式</th>
                <th v-else class="px-4 py-2 text-left">学科</th>
                <th v-if="activeSubTab === 'questionTypes'" class="px-4 py-2 text-left">打印格式</th>
                <th class="px-4 py-2 text-left">来源</th>
                <th v-if="activeSubTab === 'groups'" class="px-4 py-2 text-left">已分配</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr
                v-for="item in items"
                :key="item.code"
                class="hover:bg-blue-50 cursor-pointer"
                :class="{ 'bg-blue-50': selectedItem?.code === item.code }"
                @click="selectItem(item)"
              >
                <td class="px-3 py-1.5 font-mono text-sm text-gray-500">{{ item.code }}</td>
                <td class="px-3 py-1.5 font-medium">{{ item.description }}</td>
                <template v-if="activeSubTab === 'printFormats'">
                  <td class="px-3 py-1.5">{{ (item as any).front_lines }} / {{ (item as any).back_lines }}</td>
                  <td class="px-3 py-1.5">
                    <span v-if="(item as any).allow_dual_column" class="text-sm px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">双栏</span>
                    <span v-if="(item as any).allow_page_break" class="text-sm px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">跨页</span>
                  </td>
                </template>
                <td v-else class="px-3 py-1.5">{{ item.subject }}</td>
                <td v-if="activeSubTab === 'questionTypes'" class="px-3 py-1.5 text-sm text-gray-500">
                  {{ getPrintFormatName((item as any).print_format_id) }}
                </td>
                <td class="px-3 py-1.5">
                  <span
                    class="text-sm px-2 py-0.5 rounded"
                    :class="item.source === 'default' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'"
                  >
                    {{ item.source }}
                  </span>
                </td>
                <td v-if="activeSubTab === 'groups'" class="px-3 py-1.5">
                  {{ (item as any).error_type_codes?.length || 0 }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-sm text-gray-500">
          <i class="fas fa-info-circle mr-1"></i>
          默认配置（default）不可直接修改或删除。选择具体学生后可添加/编辑该学生的个性化配置。
        </p>
      </div>
    </div>

    <!-- 分配错题类型对话框 -->
    <div v-if="showAssignDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div class="p-4 border-b flex items-center justify-between">
          <h3 class="font-semibold text-gray-800">分配错题类型到分组</h3>
          <button @click="showAssignDialog = false" class="p-1 text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-4 overflow-y-auto flex-1">
          <p class="text-sm text-gray-600 mb-3">选择要分配到 "{{ selectedItem?.description }}" 的错题类型：</p>
          <div class="space-y-2">
            <label
              v-for="et in availableErrorTypes"
              :key="et.code"
              class="flex items-center gap-2 p-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
              :class="{ 'bg-blue-50 border-blue-300': assignedCodes.includes(et.code) }"
            >
              <input
                type="checkbox"
                :value="et.code"
                v-model="assignedCodes"
                class="rounded text-blue-600"
              />
              <span class="text-sm font-mono text-gray-500">{{ et.code }}</span>
              <span class="text-sm">{{ et.description }}</span>
            </label>
          </div>
        </div>
        <div class="p-4 border-t flex justify-end gap-2">
          <button
            @click="showAssignDialog = false"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
          >
            取消
          </button>
          <button
            @click="submitAssign"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            确认分配
          </button>
        </div>
      </div>
    </div>

    <!-- 新建打印格式弹窗 -->
    <div v-if="showPrintFormatDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-md flex flex-col">
        <div class="p-4 border-b flex items-center justify-between">
          <h3 class="font-semibold text-gray-800">新建打印格式</h3>
          <button @click="closePrintFormatDialog" class="p-1 text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <input
              v-model="newPrintFormatForm.description"
              type="text"
              placeholder="请输入描述"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">前空行数</label>
            <input
              v-model.number="newPrintFormatForm.front_lines"
              type="number"
              min="0"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">后空行数</label>
            <input
              v-model.number="newPrintFormatForm.back_lines"
              type="number"
              min="0"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="newPrintFormatForm.allow_dual_column" type="checkbox" class="rounded text-blue-600" />
              <span class="text-sm text-gray-700">允许双栏</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="newPrintFormatForm.allow_page_break" type="checkbox" class="rounded text-blue-600" />
              <span class="text-sm text-gray-700">允许跨页</span>
            </label>
          </div>
        </div>
        <div class="p-4 border-t flex justify-end gap-2">
          <button
            @click="closePrintFormatDialog"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
          >
            取消
          </button>
          <button
            @click="submitNewPrintFormat"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useStudentStore } from '@/stores/student'
import { configApi } from '@/api'
import type { ErrorType, QuestionType, CorrectionGroup, PrintFormat } from '@/api/config'

const studentStore = useStudentStore()
const studentOptions = computed(() => studentStore.studentOptions)

const activeSubTab = ref<'errorTypes' | 'questionTypes' | 'groups' | 'printFormats'>('errorTypes')
const selectedStudentId = ref('')
const selectedSubject = ref('公用')
const subjectOptions = ref<string[]>([])

const items = ref<(ErrorType | QuestionType | CorrectionGroup | PrintFormat)[]>([])
const selectedItem = ref<(ErrorType | QuestionType | CorrectionGroup | PrintFormat) | null>(null)

const form = ref({
  description: '',
  front_lines: 0,
  back_lines: 0,
  allow_dual_column: true,
  allow_page_break: false,
  print_format_id: ''
})

const printFormatOptions = ref<PrintFormat[]>([])

const showPrintFormatDialog = ref(false)
const newPrintFormatForm = ref({
  description: '',
  front_lines: 0,
  back_lines: 0,
  allow_dual_column: true,
  allow_page_break: false
})

function onPrintFormatChange() {
  if (form.value.print_format_id === '__new__') {
    form.value.print_format_id = ''
    newPrintFormatForm.value = {
      description: '',
      front_lines: 0,
      back_lines: 0,
      allow_dual_column: true,
      allow_page_break: false
    }
    showPrintFormatDialog.value = true
  }
}

function closePrintFormatDialog() {
  showPrintFormatDialog.value = false
}

async function submitNewPrintFormat() {
  if (!newPrintFormatForm.value.description.trim()) {
    alert('请输入描述')
    return
  }
  try {
    const res = await configApi.createPrintFormat({
      description: newPrintFormatForm.value.description.trim(),
      front_lines: newPrintFormatForm.value.front_lines,
      back_lines: newPrintFormatForm.value.back_lines,
      allow_dual_column: newPrintFormatForm.value.allow_dual_column,
      allow_page_break: newPrintFormatForm.value.allow_page_break,
      student_id: selectedStudentId.value || undefined
    })
    const data = (res as any).data || res
    showPrintFormatDialog.value = false
    await loadPrintFormatOptions()
    // 自动选择新创建的打印格式
    if (data?.code) {
      form.value.print_format_id = data.code
    }
  } catch (err: any) {
    alert(err.message || '创建打印格式失败')
  }
}

const showAssignDialog = ref(false)
const availableErrorTypes = ref<ErrorType[]>([])
const assignedCodes = ref<string[]>([])

const formTitle = computed(() => {
  if (activeSubTab.value === 'errorTypes') return '错题类型'
  if (activeSubTab.value === 'questionTypes') return '试题类型'
  if (activeSubTab.value === 'printFormats') return '打印格式'
  return '错整分组'
})

const listTitle = computed(() => {
  if (activeSubTab.value === 'errorTypes') return '错题类型列表'
  if (activeSubTab.value === 'questionTypes') return '试题类型列表'
  if (activeSubTab.value === 'printFormats') return '打印格式列表'
  return '错整分组列表'
})

const canEdit = computed(() => {
  // 未选择学生时，只能添加/编辑默认配置？不，默认配置不可直接修改
  // 只有选择了学生，或者当前选中的项是 custom/override 时才能编辑
  if (selectedStudentId.value) return true
  if (selectedItem.value && selectedItem.value.source !== 'default') return true
  return false
})

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    default: '系统默认',
    override: '覆盖默认',
    custom: '自定义'
  }
  return map[source] || source
}

function getPrintFormatName(code: string | undefined): string {
  if (!code) return '-'
  const pf = printFormatOptions.value.find(p => p.code === code)
  return pf ? pf.description : code
}

function selectItem(item: any) {
  selectedItem.value = item
  form.value.description = item.description
  if (activeSubTab.value === 'questionTypes') {
    form.value.print_format_id = item.print_format_id || ''
  }
  if (activeSubTab.value === 'printFormats') {
    form.value.front_lines = item.front_lines ?? 0
    form.value.back_lines = item.back_lines ?? 0
    form.value.allow_dual_column = item.allow_dual_column ?? true
    form.value.allow_page_break = item.allow_page_break ?? false
  }
}

function resetForm() {
  selectedItem.value = null
  form.value.description = ''
  form.value.print_format_id = ''
  form.value.front_lines = 0
  form.value.back_lines = 0
  form.value.allow_dual_column = true
  form.value.allow_page_break = false
}

async function loadItems() {
  try {
    if (activeSubTab.value === 'errorTypes') {
      const res = await configApi.getErrorTypes({
        subject: selectedSubject.value,
        studentId: selectedStudentId.value || undefined,
        includeDefault: true,
        includeCommon: selectedSubject.value !== '公用'
      })
      const data = (res as any).data || res
      items.value = data?.items || []
    } else if (activeSubTab.value === 'questionTypes') {
      const res = await configApi.getQuestionTypes({
        subject: selectedSubject.value,
        studentId: selectedStudentId.value || undefined,
        includeDefault: true,
        includeCommon: selectedSubject.value !== '公用'
      })
      const data = (res as any).data || res
      items.value = data?.items || []
    } else if (activeSubTab.value === 'printFormats') {
      const res = await configApi.getPrintFormats({
        studentId: selectedStudentId.value || undefined,
        includeDefault: true
      })
      const data = (res as any).data || res
      items.value = data?.items || []
    } else {
      const res = await configApi.getGroups({
        subject: selectedSubject.value,
        studentId: selectedStudentId.value || undefined,
        includeDefault: true,
        includeCommon: selectedSubject.value !== '公用'
      })
      const data = (res as any).data || res
      items.value = data?.items || []
    }
  } catch (err) {
    console.error('加载数据失败:', err)
  }
}

async function handleAdd() {
  if (!form.value.description.trim()) {
    alert('请输入描述')
    return
  }
  try {
    if (activeSubTab.value === 'errorTypes') {
      await configApi.createErrorType({
        description: form.value.description.trim(),
        subject: selectedSubject.value,
        student_id: selectedStudentId.value || undefined
      })
    } else if (activeSubTab.value === 'questionTypes') {
      await configApi.createQuestionType({
        description: form.value.description.trim(),
        subject: selectedSubject.value,
        student_id: selectedStudentId.value || undefined,
        print_format_id: form.value.print_format_id || undefined
      })
    } else if (activeSubTab.value === 'printFormats') {
      await configApi.createPrintFormat({
        description: form.value.description.trim(),
        front_lines: form.value.front_lines,
        back_lines: form.value.back_lines,
        allow_dual_column: form.value.allow_dual_column,
        allow_page_break: form.value.allow_page_break,
        student_id: selectedStudentId.value || undefined
      })
    } else {
      await configApi.createGroup({
        description: form.value.description.trim(),
        subject: selectedSubject.value,
        student_id: selectedStudentId.value || undefined
      })
    }
    await loadItems()
    resetForm()
  } catch (err: any) {
    alert(err.message || '添加失败')
  }
}

async function handleUpdate() {
  if (!selectedItem.value) return
  if (!form.value.description.trim()) {
    alert('请输入描述')
    return
  }
  const code = selectedItem.value.code
  try {
    if (activeSubTab.value === 'errorTypes') {
      await configApi.updateErrorType(code, {
        description: form.value.description.trim(),
        subject: selectedItem.value.subject
      }, selectedStudentId.value || undefined)
    } else if (activeSubTab.value === 'questionTypes') {
      await configApi.updateQuestionType(code, {
        description: form.value.description.trim(),
        subject: selectedItem.value.subject,
        print_format_id: form.value.print_format_id || undefined
      }, selectedStudentId.value || undefined)
    } else if (activeSubTab.value === 'printFormats') {
      await configApi.updatePrintFormat(code, {
        description: form.value.description.trim(),
        front_lines: form.value.front_lines,
        back_lines: form.value.back_lines,
        allow_dual_column: form.value.allow_dual_column,
        allow_page_break: form.value.allow_page_break
      }, selectedStudentId.value || undefined)
    } else {
      await configApi.updateGroup(code, {
        description: form.value.description.trim(),
        subject: selectedItem.value.subject
      }, selectedStudentId.value || undefined)
    }
    await loadItems()
    resetForm()
  } catch (err: any) {
    alert(err.message || '更新失败')
  }
}

async function handleDelete() {
  if (!selectedItem.value) return
  const code = selectedItem.value.code

  // 【Phase 5】删除错题类型前，前端检查是否被错整分组引用
  if (activeSubTab.value === 'errorTypes') {
    try {
      const groupsRes = await configApi.getGroups({
        subject: selectedSubject.value,
        studentId: selectedStudentId.value || undefined,
        includeDefault: true,
        includeCommon: selectedSubject.value !== '公用'
      })
      const groupsData = (groupsRes as any).data || groupsRes
      const allGroups: CorrectionGroup[] = groupsData?.items || []
      const referencingGroups = allGroups.filter(
        (g: CorrectionGroup) => g.error_type_codes?.includes(code)
      )
      if (referencingGroups.length > 0) {
        const groupNames = referencingGroups.map(g => `  - ${g.description}`).join('\n')
        alert(
          `该错题类型已被以下错整分组引用，无法删除：\n\n` +
          `${groupNames}\n\n` +
          `请先从错整分组中移除该错题类型后再删除。`
        )
        return
      }
    } catch (err) {
      console.error('加载分组列表失败:', err)
    }
  }

  if (!confirm(`确定要删除 "${selectedItem.value.description}" 吗？`)) return
  try {
    if (activeSubTab.value === 'errorTypes') {
      await configApi.deleteErrorType(code, selectedStudentId.value || undefined)
    } else if (activeSubTab.value === 'questionTypes') {
      await configApi.deleteQuestionType(code, selectedStudentId.value || undefined)
    } else if (activeSubTab.value === 'printFormats') {
      await configApi.deletePrintFormat(code, selectedStudentId.value || undefined)
    } else {
      await configApi.deleteGroup(code, selectedStudentId.value || undefined)
    }
    await loadItems()
    resetForm()
  } catch (err: any) {
    alert(err.message || '删除失败')
  }
}

async function loadAvailableErrorTypes() {
  try {
    const res = await configApi.getErrorTypes({
      subject: selectedSubject.value,
      studentId: selectedStudentId.value || undefined,
      includeDefault: true,
      includeCommon: true
    })
    const data = (res as any).data || res
    let errorTypes: ErrorType[] = data?.items || []

    // 【Phase 5】排他性过滤：排除已被其他分组引用的错题类型
    if (activeSubTab.value === 'groups' && selectedItem.value) {
      const currentGroupCode = (selectedItem.value as CorrectionGroup).code
      const otherGroups = items.value.filter(
        (item): item is CorrectionGroup =>
          (item as CorrectionGroup).code !== currentGroupCode &&
          Array.isArray((item as CorrectionGroup).error_type_codes)
      )
      const occupiedCodes = new Set(
        otherGroups.flatMap(g => g.error_type_codes)
      )
      errorTypes = errorTypes.filter(et => !occupiedCodes.has(et.code))
    }

    availableErrorTypes.value = errorTypes
  } catch (err) {
    console.error('加载错题类型失败:', err)
  }
}

async function openAssignDialog() {
  if (!selectedItem.value) return
  await loadAvailableErrorTypes()
  assignedCodes.value = [...((selectedItem.value as any).error_type_codes || [])]
  showAssignDialog.value = true
}

async function submitAssign() {
  if (!selectedItem.value) return
  try {
    await configApi.assignErrorTypesToGroup(
      selectedItem.value.code,
      assignedCodes.value,
      selectedStudentId.value || undefined
    )
    showAssignDialog.value = false
    await loadItems()
  } catch (err: any) {
    alert(err.message || '分配失败')
  }
}

async function loadSystemConfig() {
  try {
    const res = await configApi.getSystemConfig()
    const data = (res as any).data || res
    if (data) {
      subjectOptions.value = data.subjects || []
    }
  } catch (err) {
    console.error('加载系统配置失败:', err)
  }
}

async function loadPrintFormatOptions() {
  try {
    const res = await configApi.getPrintFormats({
      studentId: selectedStudentId.value || undefined,
      includeDefault: true
    })
    const data = (res as any).data || res
    printFormatOptions.value = data?.items || []
  } catch (err) {
    console.error('加载打印格式选项失败:', err)
  }
}

watch([activeSubTab, selectedStudentId, selectedSubject], () => {
  resetForm()
  loadItems()
  if (activeSubTab.value === 'questionTypes') {
    loadPrintFormatOptions()
  }
})

// 点击"编辑分配"按钮时直接调用 openAssignDialog

onMounted(() => {
  studentStore.loadStudents()
  loadSystemConfig()
  loadItems()
  loadPrintFormatOptions()
})
</script>
