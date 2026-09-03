<script setup lang="ts">
import { ref } from 'vue';
import { X, UploadCloud, FileSpreadsheet, Download, Check, AlertTriangle } from 'lucide-vue-next';
import type { DailyRecord } from '../types/attendance';
import { parseExcelFile, downloadExcelTemplate } from '../services/excelService';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'import-success', records: DailyRecord[]): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const parsedRecords = ref<DailyRecord[]>([]);

function triggerFileInput() {
  fileInput.value?.click();
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    await processFile(target.files[0]);
  }
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    await processFile(event.dataTransfer.files[0]);
  }
}

async function processFile(file: File) {
  errorMessage.value = '';
  isLoading.value = true;
  parsedRecords.value = [];

  try {
    const res = await parseExcelFile(file);
    if (res.records.length === 0) {
      errorMessage.value = '未能从该 Excel 中解析出有效的考勤数据，请参考标准模板。';
    } else {
      parsedRecords.value = res.records;
    }
  } catch (err) {
    errorMessage.value = `解析失败: ${(err as Error).message}`;
  } finally {
    isLoading.value = false;
  }
}

function handleConfirmImport() {
  if (parsedRecords.value.length === 0) return;
  emit('import-success', parsedRecords.value);
  emit('close');
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/35 backdrop-blur-2xs animate-fade-in"
    @click.self="emit('close')"
  >
    <div
      class="bg-white dark:bg-[#202020] rounded-lg w-full max-w-2xl border border-[#e9e9e7] dark:border-[#2f3437] overflow-hidden flex flex-col max-h-[92vh] shadow-lg"
    >
      <!-- 头部 -->
      <div class="px-5 py-3.5 border-b border-[#e9e9e7] dark:border-[#2f3437] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <FileSpreadsheet class="w-4 h-4 text-[#337ea9]" :stroke-width="1.75" />
          <h3 class="font-semibold text-[#37352f] dark:text-[#e3e2de] text-base">批量导入考勤 Excel</h3>
        </div>
        <button
          @click="emit('close')"
          type="button"
          class="p-1 rounded text-[#787774] hover:text-[#37352f] dark:text-[#9b9a97] dark:hover:text-[#e3e2de] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a] transition-colors"
        >
          <X class="w-4 h-4" :stroke-width="1.75" />
        </button>
      </div>

      <!-- 内容区 -->
      <div class="p-5 space-y-3.5 overflow-y-auto no-scrollbar flex-1">
        <!-- 下载模板快捷提示 (Notion Callout) -->
        <div class="flex items-center justify-between p-2.5 rounded bg-[#f7f6f3] dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f3437] text-xs">
          <span class="text-[#787774] dark:text-[#9b9a97]">
            支持自动识别日期与时间列。如不兼容可下载标准模板：
          </span>
          <button
            @click="downloadExcelTemplate"
            type="button"
            class="flex items-center gap-1 font-medium text-[#337ea9] hover:underline whitespace-nowrap ml-2"
          >
            <Download class="w-3.5 h-3.5" :stroke-width="1.75" />
            下载标准模板
          </button>
        </div>

        <!-- 拖拽上传区 -->
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx, .xls"
          class="hidden"
          @change="handleFileChange"
        />

        <div
          @click="triggerFileInput"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          class="border border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2"
          :class="[
            isDragging
              ? 'border-[#6940a5] bg-[#f4f0f7]/50 dark:bg-[#2b2438]/40'
              : 'border-[#e9e9e7] dark:border-[#2f3437] hover:border-[#9b9a97] bg-[#fbfbfa] dark:bg-[#252525]'
          ]"
        >
          <div class="w-9 h-9 rounded bg-[#ede8f5] dark:bg-[#2b2438] text-[#6940a5] dark:text-[#9a6dd7] flex items-center justify-center">
            <UploadCloud class="w-4 h-4" :stroke-width="1.75" />
          </div>
          <div>
            <p class="text-xs sm:text-sm font-medium text-[#37352f] dark:text-[#e3e2de]">
              点击选择或拖拽考勤 Excel 到此处
            </p>
            <p class="text-[11px] text-[#9b9a97] mt-0.5">
              支持 .xlsx、.xls 格式
            </p>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMessage" class="p-2.5 rounded bg-[#fbe4e4] dark:bg-[#3c2121] text-xs text-[#e03e3e] dark:text-[#eb5757] flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0" :stroke-width="1.75" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- 解析结果预览 (Notion Table) -->
        <div v-if="parsedRecords.length > 0" class="space-y-2">
          <div class="flex items-center justify-between text-xs text-[#787774] dark:text-[#9b9a97]">
            <span>成功解析 <b class="text-[#6940a5] dark:text-[#9a6dd7] font-mono">{{ parsedRecords.length }}</b> 条记录：</span>
            <span>导入将覆盖已有日期的记录</span>
          </div>

          <div class="max-h-48 overflow-y-auto rounded border border-[#e9e9e7] dark:border-[#2f3437] text-xs font-mono">
            <table class="w-full text-left">
              <thead class="bg-[#f7f6f3] dark:bg-[#252525] text-[#787774] dark:text-[#9b9a97] sticky top-0 font-sans border-b border-[#e9e9e7] dark:border-[#2f3437]">
                <tr>
                  <th class="py-1.5 px-3">日期</th>
                  <th class="py-1.5 px-3">上班</th>
                  <th class="py-1.5 px-3">下班</th>
                  <th class="py-1.5 px-3">状态</th>
                  <th class="py-1.5 px-3">备注</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#e9e9e7] dark:divide-[#2f3437] text-[#37352f] dark:text-[#e3e2de]">
                <tr v-for="(rec, idx) in parsedRecords.slice(0, 100)" :key="idx" class="hover:bg-[#fbfbfa] dark:hover:bg-[#262626]">
                  <td class="py-1 px-3">{{ rec.date }}</td>
                  <td class="py-1 px-3">{{ rec.clockIn || '--' }}</td>
                  <td class="py-1 px-3">{{ rec.clockOut || '--' }}</td>
                  <td class="py-1 px-3 font-sans">
                    <span
                      class="px-1 py-0.2 rounded text-[10px]"
                      :class="[
                        rec.status === 'normal' ? 'bg-[#edf3ec] text-[#448361] dark:bg-[#203126] dark:text-[#4d9375]' :
                        rec.status === 'absent' ? 'bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757]' :
                        rec.status === 'leave' ? 'bg-[#faece3] text-[#d9730d] dark:bg-[#38281e] dark:text-[#df8b39]' :
                        'bg-[#fbf3db] text-[#cb912f] dark:bg-[#39321c] dark:text-[#dfab01]'
                      ]"
                    >
                      {{ rec.status === 'normal' ? '正常' : rec.status === 'absent' ? '缺勤' : rec.status === 'leave' ? '请假' : '调休' }}
                    </span>
                  </td>
                  <td class="py-1 px-3 text-[#9b9a97] truncate max-w-[120px] font-sans">{{ rec.note || '--' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="px-5 py-3 bg-[#fbfbfa] dark:bg-[#252525] border-t border-[#e9e9e7] dark:border-[#2f3437] flex items-center justify-end gap-2">
        <button
          @click="emit('close')"
          type="button"
          class="px-3 py-1 text-xs font-normal text-[#787774] hover:text-[#37352f] dark:text-[#9b9a97] dark:hover:text-[#e3e2de] hover:bg-[#ebeae5] dark:hover:bg-[#2d2d2d] rounded transition-colors"
        >
          取消
        </button>
        <button
          @click="handleConfirmImport"
          :disabled="parsedRecords.length === 0"
          type="button"
          class="flex items-center gap-1 px-3.5 py-1 text-xs font-medium text-white bg-[#37352f] dark:bg-[#e3e2de] dark:text-[#191919] hover:bg-[#232320] disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
        >
          <Check class="w-3.5 h-3.5" :stroke-width="2" />
          <span>确认导入 ({{ parsedRecords.length }} 条)</span>
        </button>
      </div>
    </div>
  </div>
</template>
