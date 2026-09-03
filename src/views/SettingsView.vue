<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import {
  Clock,
  Utensils,
  Plus,
  Trash2,
  Sliders,
  Database,
  Download,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  CalendarDays,
  RotateCcw,
  X,
  Check,
  Calculator,
  Receipt,
  Save
} from 'lucide-vue-next';
import type { AttendanceSettings, SalaryItem } from '../types/attendance';
import {
  getDefaultHolidaysForYear,
  getAllDefaultHolidays
} from '../constants/holidays';
import {
  DEFAULT_SALARY_SETTINGS,
  calculateDailyWage,
  calculateHourlyWage,
  formatMoney
} from '../services/salaryService';
import {
  exportDataAsJSON,
  importDataFromJSON,
  clearAllData,
  seedSampleData,
  DEFAULT_SETTINGS,
  getSettings
} from '../services/storageService';
import { exportAttendanceToExcel } from '../services/excelService';

const props = defineProps<{
  settings: AttendanceSettings;
  records: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update-settings', settings: AttendanceSettings): void;
  (e: 'refresh-data'): void;
}>();

function cloneAndNormalizeSettings(src: AttendanceSettings): AttendanceSettings {
  const cloned: AttendanceSettings = JSON.parse(JSON.stringify(src || DEFAULT_SETTINGS));
  if (!cloned.customHolidays || Object.keys(cloned.customHolidays).length === 0) {
    cloned.customHolidays = getAllDefaultHolidays();
  }
  if (!cloned.salary) {
    cloned.salary = JSON.parse(JSON.stringify(DEFAULT_SALARY_SETTINGS));
  } else {
    if (!cloned.salary.overtimeRates) {
      cloned.salary.overtimeRates = { workday: 1.5, weekend: 2.0, holiday: 3.0 };
    }
    if (!Array.isArray(cloned.salary.otherItems)) {
      cloned.salary.otherItems = [];
    }
  }
  return cloned;
}

// 草稿状态对象
const localSettings = reactive<AttendanceSettings>(cloneAndNormalizeSettings(props.settings));
// 记录上次已保存快照
const savedSettingsSnapshot = ref(JSON.stringify(localSettings));
// 是否存在未保存修改
const hasUnsavedChanges = computed(() => JSON.stringify(localSettings) !== savedSettingsSnapshot.value);

// 外部设置变更同步（仅在当前没有未保存草稿时自动同步）
watch(
  () => props.settings,
  (newSettings) => {
    if (!hasUnsavedChanges.value) {
      const normalized = cloneAndNormalizeSettings(newSettings);
      Object.keys(localSettings).forEach((k) => {
        delete (localSettings as any)[k];
      });
      Object.assign(localSettings, normalized);
      savedSettingsSnapshot.value = JSON.stringify(normalized);
    }
  },
  { deep: true }
);

// ---------------- 薪资折算与校验 ----------------
const calculatedDailyWage = computed(() => {
  const base = Number(localSettings.salary?.baseSalary) || 0;
  const coef = Number(localSettings.salary?.calculationCoefficient) || 0;
  return calculateDailyWage(base, coef);
});

const calculatedHourlyWage = computed(() => {
  return calculateHourlyWage(calculatedDailyWage.value);
});

function validateBaseSalary() {
  if (!localSettings.salary) return;
  const raw = Number(localSettings.salary.baseSalary);
  if (isNaN(raw) || raw < 0) {
    localSettings.salary.baseSalary = 0;
  } else {
    localSettings.salary.baseSalary = Math.round(raw * 100) / 100;
  }
}

function validateCoefficient() {
  if (!localSettings.salary) return;
  const raw = Number(localSettings.salary.calculationCoefficient);
  if (isNaN(raw) || raw <= 0) {
    localSettings.salary.calculationCoefficient = 21.75;
    showToast('计薪天数系数须大于0，已恢复默认 21.75');
  } else {
    localSettings.salary.calculationCoefficient = Math.round(raw * 100) / 100;
  }
}

function validateRate(key: 'workday' | 'weekend' | 'holiday') {
  if (!localSettings.salary || !localSettings.salary.overtimeRates) return;
  const raw = Number(localSettings.salary.overtimeRates[key]);
  if (isNaN(raw) || raw < 0) {
    const defaults = { workday: 1.5, weekend: 2.0, holiday: 3.0 };
    localSettings.salary.overtimeRates[key] = defaults[key];
  } else {
    localSettings.salary.overtimeRates[key] = Math.round(raw * 100) / 100;
  }
}

function addSalaryItem() {
  if (!localSettings.salary) return;
  if (!Array.isArray(localSettings.salary.otherItems)) {
    localSettings.salary.otherItems = [];
  }
  localSettings.salary.otherItems.push({
    id: `item-${Date.now()}`,
    name: '',
    type: 'addition',
    amount: 0,
  });
}

function removeSalaryItem(index: number) {
  if (!localSettings.salary || !Array.isArray(localSettings.salary.otherItems)) return;
  localSettings.salary.otherItems.splice(index, 1);
}

function validateItemAmount(item: SalaryItem) {
  const raw = Number(item.amount);
  if (isNaN(raw) || raw < 0) {
    item.amount = 0;
  } else {
    item.amount = Math.round(raw * 100) / 100;
  }
}

const toastMessage = ref('');
function showToast(msg: string) {
  toastMessage.value = msg;
  setTimeout(() => {
    toastMessage.value = '';
  }, 2400);
}

// ---------------- 保存与放弃修改 ----------------
function handleSaveSettings() {
  validateBaseSalary();
  validateCoefficient();
  validateRate('workday');
  validateRate('weekend');
  validateRate('holiday');
  if (localSettings.salary && Array.isArray(localSettings.salary.otherItems)) {
    localSettings.salary.otherItems.forEach(validateItemAmount);
  }

  const payload = JSON.parse(JSON.stringify(localSettings));
  savedSettingsSnapshot.value = JSON.stringify(payload);
  emit('update-settings', payload);
  showToast('设置已成功保存并立即生效');
}

function handleDiscardChanges() {
  const saved = JSON.parse(savedSettingsSnapshot.value);
  Object.keys(localSettings).forEach((k) => {
    delete (localSettings as any)[k];
  });
  Object.assign(localSettings, saved);
  showToast('已放弃未保存修改，恢复为上次保存的值');
}

defineExpose({
  hasUnsavedChanges,
  discardChanges: handleDiscardChanges,
  saveChanges: handleSaveSettings,
});

// ---------------- 节假日与调休配置 ----------------
const availableYears = [2024, 2025, 2026, 2027];
const selectedHolidayYear = ref(2026);
const holidayFilter = ref<'all' | 'holiday' | 'workday'>('all');

// 星期计算辅助
function getDayOfWeekName(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[date.getDay()];
}

// 筛选当前年份的节假日与调休列表
const holidayListForYear = computed(() => {
  if (!localSettings.customHolidays) return [];
  const prefix = `${selectedHolidayYear.value}-`;
  const list = Object.entries(localSettings.customHolidays)
    .filter(([date]) => date.startsWith(prefix))
    .map(([date, item]) => ({
      date,
      name: item.name,
      isHoliday: item.isHoliday,
      dayOfWeek: getDayOfWeekName(date),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (holidayFilter.value === 'holiday') {
    return list.filter((i) => i.isHoliday);
  } else if (holidayFilter.value === 'workday') {
    return list.filter((i) => !i.isHoliday);
  }
  return list;
});

// 操作步骤 1：按照默认节假日生成当年的所有数据
function handleGenerateDefaultHolidays() {
  if (confirm(`确定要按照官方默认规则，重新生成 ${selectedHolidayYear.value} 年的所有法定节假日与调休补班数据吗？`)) {
    const defaults = getDefaultHolidaysForYear(selectedHolidayYear.value);
    if (!localSettings.customHolidays) localSettings.customHolidays = {};

    // 清空当年已有项
    const prefix = `${selectedHolidayYear.value}-`;
    for (const date in localSettings.customHolidays) {
      if (date.startsWith(prefix)) {
        delete localSettings.customHolidays[date];
      }
    }
    // 注入官方预设项
    for (const date in defaults) {
      localSettings.customHolidays[date] = defaults[date];
    }
    showToast(`已生成 ${selectedHolidayYear.value} 年官方默认节假日数据！`);
  }
}

// 操作步骤 2：用户手动调整调休/节假日
const showAddHolidayDialog = ref(false);
const newHolidayDate = ref(`${selectedHolidayYear.value}-09-01`);
const newHolidayName = ref('');
const newHolidayIsHoliday = ref(false); // 默认调休补班方便用户添加

function openAddHoliday() {
  newHolidayDate.value = `${selectedHolidayYear.value}-09-01`;
  newHolidayName.value = '';
  newHolidayIsHoliday.value = false;
  showAddHolidayDialog.value = true;
}

function handleSaveNewHoliday() {
  if (!newHolidayDate.value) {
    alert('请选择有效日期');
    return;
  }
  if (!localSettings.customHolidays) localSettings.customHolidays = {};
  localSettings.customHolidays[newHolidayDate.value] = {
    name: newHolidayName.value.trim() || (newHolidayIsHoliday.value ? '放假' : '调休补班'),
    isHoliday: newHolidayIsHoliday.value,
  };
  showAddHolidayDialog.value = false;
  showToast(`已成功添加 ${newHolidayDate.value} 配置`);
}

// 快速切换某天的 放假(休) / 调休补班(班)
function toggleHolidayType(date: string) {
  if (localSettings.customHolidays && localSettings.customHolidays[date]) {
    const item = localSettings.customHolidays[date];
    item.isHoliday = !item.isHoliday;
    if (item.isHoliday) {
      if (item.name.includes('补班')) {
        item.name = item.name.replace('补班', '放假');
      }
    } else {
      if (item.name.includes('放假')) {
        item.name = item.name.replace('放假', '补班');
      } else if (!item.name.includes('补班')) {
        item.name += '补班';
      }
    }
  }
}

// 移除某天的特殊排期
function handleDeleteHoliday(date: string) {
  if (localSettings.customHolidays && localSettings.customHolidays[date]) {
    delete localSettings.customHolidays[date];
    showToast(`已移除 ${date} 的特殊排期`);
  }
}

// ---------------- 用餐时段 ----------------
function addMealInterval() {
  const newId = `meal-${Date.now()}`;
  localSettings.mealIntervals.push({
    id: newId,
    name: `时段 ${localSettings.mealIntervals.length + 1}`,
    start: '18:00',
    end: '19:00',
  });
}

function removeMealInterval(index: number) {
  localSettings.mealIntervals.splice(index, 1);
}

// ---------------- 备份与导出 ----------------
const jsonFileInput = ref<HTMLInputElement | null>(null);

function handleExportJSON() {
  const jsonStr = exportDataAsJSON();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `考勤记_本地数据备份_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('数据备份导出成功');
}

function triggerImportJSON() {
  jsonFileInput.value?.click();
}

function handleFileImportJSON(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files || !target.files[0]) return;
  const file = target.files[0];
  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target?.result as string;
    const res = importDataFromJSON(text);
    if (res.success) {
      showToast(`成功恢复 ${res.count} 条记录`);
      emit('refresh-data');
      const fresh = cloneAndNormalizeSettings(getSettings());
      Object.keys(localSettings).forEach((k) => {
        delete (localSettings as any)[k];
      });
      Object.assign(localSettings, fresh);
      savedSettingsSnapshot.value = JSON.stringify(fresh);
    } else {
      alert(`导入失败: ${res.error}`);
    }
  };
  reader.readAsText(file);
}

function handleLoadSampleData() {
  if (confirm('是否注入当月演示样例数据？（已有同日记录将被覆盖）')) {
    seedSampleData();
    emit('refresh-data');
    const fresh = cloneAndNormalizeSettings(getSettings());
    Object.keys(localSettings).forEach((k) => {
      delete (localSettings as any)[k];
    });
    Object.assign(localSettings, fresh);
    savedSettingsSnapshot.value = JSON.stringify(fresh);
    showToast('样例数据已注入');
  }
}

function handleClearAll() {
  if (confirm('警告：此操作将清空所有本地考勤数据与自定义设置，无法撤回！确定清空吗？')) {
    clearAllData();
    const defaults = cloneAndNormalizeSettings(DEFAULT_SETTINGS);
    Object.keys(localSettings).forEach((k) => {
      delete (localSettings as any)[k];
    });
    Object.assign(localSettings, defaults);
    savedSettingsSnapshot.value = JSON.stringify(defaults);
    emit('refresh-data');
    showToast('数据已全部清空');
  }
}

function handleExportExcel() {
  exportAttendanceToExcel(props.records, localSettings);
}
</script>

<template>
  <div class="space-y-3.5 pb-16 max-w-3xl mx-auto">
    <!-- Notion 浮动通知 Toast -->
    <div
      v-if="toastMessage"
      class="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#37352f] text-white dark:bg-[#e3e2de] dark:text-[#191919] px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-md animate-fade-in"
    >
      <CheckCircle class="w-3.5 h-3.5 text-[#448361]" />
      <span>{{ toastMessage }}</span>
    </div>

    <!-- 顶部状态与显式保存/取消栏 (Sticky Action Bar) -->
    <div class="sticky top-12 z-30 bg-[#f7f6f3]/95 dark:bg-[#191919]/95 backdrop-blur-xs py-2 px-3 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors">
      <div class="flex items-center gap-2">
        <span
          class="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"
          :class="hasUnsavedChanges ? 'bg-[#d9730d] animate-pulse' : 'bg-[#448361]'"
        ></span>
        <div>
          <span class="text-xs font-medium text-[#37352f] dark:text-[#e3e2de]">
            {{ hasUnsavedChanges ? '存在未保存修改项（草稿中）' : '所有规则已是最新（已生效）' }}
          </span>
          <span v-if="hasUnsavedChanges" class="text-[11px] text-[#9b9a97] hidden sm:inline ml-1.5">
            — 需点击保存后才真正写入并生效
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto">
        <button
          v-if="hasUnsavedChanges"
          type="button"
          @click="handleDiscardChanges"
          class="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-[#787774] dark:text-[#9b9a97] hover:bg-[#ebeae5] dark:hover:bg-[#2d2d2d] transition-colors cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" :stroke-width="1.75" />
          <span>放弃修改</span>
        </button>

        <button
          type="button"
          @click="handleSaveSettings"
          :disabled="!hasUnsavedChanges"
          class="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium transition-all shadow-2xs"
          :class="[
            hasUnsavedChanges
              ? 'bg-[#6940a5] hover:bg-[#58338f] text-white cursor-pointer ring-1 ring-[#6940a5]/50'
              : 'bg-[#ebeae5] dark:bg-[#2d2d2d] text-[#9b9a97] cursor-not-allowed'
          ]"
        >
          <Save class="w-3.5 h-3.5" :stroke-width="2" />
          <span>{{ hasUnsavedChanges ? '保存设置' : '已保存' }}</span>
        </button>
      </div>
    </div>

    <!-- 1. 工作时间段与日界设置 (Notion Section) -->
    <div class="bg-white dark:bg-[#202020] p-4 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] space-y-3 shadow-2xs">
      <div class="flex items-center gap-1.5 pb-2 border-b border-[#e9e9e7] dark:border-[#2f3437]">
        <Clock class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
        <h3 class="font-medium text-[#37352f] dark:text-[#e3e2de] text-xs sm:text-sm">工作时间与日界设置</h3>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-normal text-[#787774] dark:text-[#9b9a97] mb-1">
            标准上班时间
          </label>
          <input
            v-model="localSettings.workSchedule.start"
            type="time"
            class="w-full px-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none text-xs font-mono"
          />
          <p class="text-[11px] text-[#9b9a97] mt-0.5">早于此时段出勤不计加班</p>
        </div>

        <div>
          <label class="block text-xs font-normal text-[#787774] dark:text-[#9b9a97] mb-1">
            标准下班时间
          </label>
          <input
            v-model="localSettings.workSchedule.end"
            type="time"
            class="w-full px-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none text-xs font-mono"
          />
          <p class="text-[11px] text-[#9b9a97] mt-0.5">工作日晚于此时段计为加班</p>
        </div>
      </div>

      <!-- 次日归属分割时间 -->
      <div class="pt-2 border-t border-[#e9e9e7] dark:border-[#2f3437]">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label class="text-xs font-normal text-[#37352f] dark:text-[#e3e2de] block">
              次日凌晨分割点
            </label>
            <p class="text-[11px] text-[#9b9a97]">
              次日凌晨此时段（默认 06:00）前打卡，归属前一日晚间加班
            </p>
          </div>
          <input
            v-model="localSettings.dayBoundaryCutoff"
            type="time"
            class="w-28 px-2 py-1 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none text-xs font-mono"
          />
        </div>
      </div>

      <!-- 周末节假日全额加班开关 -->
      <div class="flex items-center justify-between pt-2 border-t border-[#e9e9e7] dark:border-[#2f3437]">
        <div>
          <span class="text-xs font-normal text-[#37352f] dark:text-[#e3e2de] block">
            周末及法定节假日出勤全额计加班
          </span>
          <span class="text-[11px] text-[#9b9a97]">
            开启后，非工作日的打卡出勤时长全部作为加班基数
          </span>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            v-model="localSettings.weekendHolidayAsOvertime"
            class="sr-only peer"
          />
          <div class="w-9 h-5 bg-[#e9e9e7] peer-focus:outline-none rounded-full peer dark:bg-[#2f3437] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6940a5]"></div>
        </label>
      </div>
    </div>

    <!-- 2. 法定节假日与调休配置 (Notion Section) -->
    <div class="bg-white dark:bg-[#202020] p-4 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] space-y-3 shadow-2xs">
      <div class="flex items-center justify-between pb-2 border-b border-[#e9e9e7] dark:border-[#2f3437]">
        <div class="flex items-center gap-1.5">
          <CalendarDays class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
          <h3 class="font-medium text-[#37352f] dark:text-[#e3e2de] text-xs sm:text-sm">法定节假日与调休配置</h3>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-xs text-[#9b9a97]">年份:</span>
          <select
            v-model="selectedHolidayYear"
            class="px-2 py-0.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fafaf9] dark:bg-[#262626] text-xs text-[#37352f] dark:text-[#e3e2de] focus:outline-none"
          >
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }} 年</option>
          </select>
        </div>
      </div>

      <p class="text-[11px] text-[#9b9a97]">
        已为您内置今年官方法定节假日与调休补班排期。您可点击下方按钮重新生成默认数据，或手动新增与调整调休日期：
      </p>

      <!-- 操作步骤工具栏：步骤1按默认生成，步骤2手动调整 -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <!-- 步骤1：按默认生成 -->
        <button
          @click="handleGenerateDefaultHolidays"
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fafaf9] dark:bg-[#262626] text-xs text-[#37352f] dark:text-[#e3e2de] hover:bg-[#f1f1ef] dark:hover:bg-[#2d2d2d] transition-colors shadow-2xs"
          title="按官方默认数据覆盖重新生成当年的节假日与调休"
        >
          <RotateCcw class="w-3.5 h-3.5 text-[#337ea9]" :stroke-width="1.75" />
          <span>生成 {{ selectedHolidayYear }} 年默认节假日</span>
        </button>

        <!-- 步骤2：手动添加自定义调休/放假 -->
        <button
          @click="openAddHoliday"
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#f4f0f7] dark:bg-[#2b2438] text-xs font-medium text-[#6940a5] dark:text-[#9a6dd7] hover:bg-[#ede8f5] transition-colors shadow-2xs"
        >
          <Plus class="w-3.5 h-3.5 text-[#6940a5] dark:text-[#9a6dd7]" :stroke-width="1.75" />
          <span>添加节假日 / 调休日</span>
        </button>
      </div>

      <!-- 快速筛选 Tabs -->
      <div class="flex items-center gap-1 bg-[#f7f6f3] dark:bg-[#252525] p-0.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] w-fit text-[11px]">
        <button
          type="button"
          @click="holidayFilter = 'all'"
          class="px-2 py-0.5 rounded transition-colors"
          :class="[
            holidayFilter === 'all'
              ? 'bg-white dark:bg-[#2f3437] text-[#37352f] dark:text-[#e3e2de] font-semibold shadow-2xs'
              : 'text-[#787774] dark:text-[#9b9a97]'
          ]"
        >
          全部 ({{ holidayListForYear.length }})
        </button>
        <button
          type="button"
          @click="holidayFilter = 'holiday'"
          class="px-2 py-0.5 rounded transition-colors"
          :class="[
            holidayFilter === 'holiday'
              ? 'bg-white dark:bg-[#2f3437] text-[#e03e3e] dark:text-[#eb5757] font-semibold shadow-2xs'
              : 'text-[#787774] dark:text-[#9b9a97]'
          ]"
        >
          放假 (休)
        </button>
        <button
          type="button"
          @click="holidayFilter = 'workday'"
          class="px-2 py-0.5 rounded transition-colors"
          :class="[
            holidayFilter === 'workday'
              ? 'bg-white dark:bg-[#2f3437] text-[#337ea9] dark:text-[#529cca] font-semibold shadow-2xs'
              : 'text-[#787774] dark:text-[#9b9a97]'
          ]"
        >
          调休补班 (班)
        </button>
      </div>

      <!-- 节假日列表：Notion 属性行风格 -->
      <div class="max-h-60 overflow-y-auto rounded border border-[#e9e9e7] dark:border-[#2f3437] divide-y divide-[#e9e9e7] dark:divide-[#2f3437]">
        <div
          v-if="holidayListForYear.length === 0"
          class="p-4 text-center text-xs text-[#9b9a97]"
        >
          暂无 {{ selectedHolidayYear }} 年的节假日数据，请点击上方「生成默认节假日」
        </div>

        <div
          v-for="item in holidayListForYear"
          :key="item.date"
          class="flex items-center justify-between p-2 hover:bg-[#fafaf9] dark:hover:bg-[#252525] transition-colors text-xs"
        >
          <div class="flex items-center gap-2">
            <!-- 状态标签：点击可直接在 休 / 班 之间切换 -->
            <button
              type="button"
              @click="toggleHolidayType(item.date)"
              class="px-1.5 py-0.5 rounded text-[10px] font-medium leading-none cursor-pointer transition-transform active:scale-95"
              :class="[
                item.isHoliday
                  ? 'bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757]'
                  : 'bg-[#e7f3f8] text-[#337ea9] dark:bg-[#1d282e] dark:text-[#529cca]'
              ]"
              :title="`点击切换为${item.isHoliday ? '调休补班' : '放假'}`"
            >
              {{ item.isHoliday ? '休' : '班' }}
            </button>

            <!-- 日期与星期 -->
            <span class="font-mono text-[#37352f] dark:text-[#e3e2de]">{{ item.date }}</span>
            <span class="text-[11px] text-[#9b9a97]">({{ item.dayOfWeek }})</span>

            <!-- 名称 -->
            <span class="text-[#787774] dark:text-[#9b9a97]">{{ item.name }}</span>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              @click="handleDeleteHoliday(item.date)"
              type="button"
              class="p-1 rounded text-[#9b9a97] hover:text-[#e03e3e] hover:bg-[#fbe4e4]/60 dark:hover:bg-[#3c2121]/60 transition-colors"
              title="删除此项特殊排期"
            >
              <Trash2 class="w-3.5 h-3.5" :stroke-width="1.75" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加节假日/调休日 弹窗对话框 -->
    <div
      v-if="showAddHolidayDialog"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/35 backdrop-blur-2xs animate-fade-in"
      @click.self="showAddHolidayDialog = false"
    >
      <div class="bg-white dark:bg-[#202020] rounded-lg w-full max-w-md border border-[#e9e9e7] dark:border-[#2f3437] p-5 space-y-4 shadow-lg">
        <div class="flex items-center justify-between pb-2 border-b border-[#e9e9e7] dark:border-[#2f3437]">
          <h3 class="font-semibold text-sm text-[#37352f] dark:text-[#e3e2de]">
            添加节假日 / 调休日期
          </h3>
          <button
            @click="showAddHolidayDialog = false"
            type="button"
            class="p-1 text-[#787774] hover:text-[#37352f] dark:hover:text-[#e3e2de]"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-[#787774] dark:text-[#9b9a97] mb-1">选择日期</label>
            <input
              v-model="newHolidayDate"
              type="date"
              class="w-full px-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none font-mono"
            />
          </div>

          <div>
            <label class="block text-[#787774] dark:text-[#9b9a97] mb-1">排期类型</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="newHolidayIsHoliday = true"
                class="py-1.5 px-2 rounded border text-center font-medium transition-colors"
                :class="[
                  newHolidayIsHoliday
                    ? 'border-[#e03e3e]/40 bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757]'
                    : 'border-[#e9e9e7] dark:border-[#2f3437] text-[#787774]'
                ]"
              >
                放假（休）
              </button>
              <button
                type="button"
                @click="newHolidayIsHoliday = false"
                class="py-1.5 px-2 rounded border text-center font-medium transition-colors"
                :class="[
                  !newHolidayIsHoliday
                    ? 'border-[#337ea9]/40 bg-[#e7f3f8] text-[#337ea9] dark:bg-[#1d282e] dark:text-[#529cca]'
                    : 'border-[#e9e9e7] dark:border-[#2f3437] text-[#787774]'
                ]"
              >
                调休补班（班）
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[#787774] dark:text-[#9b9a97] mb-1">说明名称</label>
            <input
              v-model="newHolidayName"
              :placeholder="newHolidayIsHoliday ? '如：公司额外年假、春节' : '如：国庆调休补班'"
              class="w-full px-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#e9e9e7] dark:border-[#2f3437]">
          <button
            @click="showAddHolidayDialog = false"
            type="button"
            class="px-3 py-1 text-xs text-[#787774] hover:bg-[#ebeae5] dark:hover:bg-[#2d2d2d] rounded transition-colors"
          >
            取消
          </button>
          <button
            @click="handleSaveNewHoliday"
            type="button"
            class="flex items-center gap-1 px-3.5 py-1 text-xs font-medium text-white bg-[#37352f] dark:bg-[#e3e2de] dark:text-[#191919] hover:bg-[#232320] rounded transition-colors"
          >
            <Check class="w-3.5 h-3.5" />
            <span>保存</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 3. 用餐扣除设置 (Notion Section) -->
    <div class="bg-white dark:bg-[#202020] p-4 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] space-y-3 shadow-2xs">
      <div class="flex items-center justify-between pb-2 border-b border-[#e9e9e7] dark:border-[#2f3437]">
        <div class="flex items-center gap-1.5">
          <Utensils class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
          <h3 class="font-medium text-[#37352f] dark:text-[#e3e2de] text-xs sm:text-sm">用餐时间扣减设置</h3>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            v-model="localSettings.enableMealDeduction"
            class="sr-only peer"
          />
          <div class="w-9 h-5 bg-[#e9e9e7] peer-focus:outline-none rounded-full peer dark:bg-[#2f3437] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6940a5]"></div>
        </label>
      </div>

      <div v-if="!localSettings.enableMealDeduction" class="text-xs text-[#9b9a97] py-0.5">
        “是否包含用餐时间”开关已关闭。开启后才可添加用餐时段并在加班中扣除重叠交集。
      </div>

      <div v-else class="space-y-2 pt-1">
        <p class="text-[11px] text-[#9b9a97]">
          仅当用餐时段落在加班时间段内（交集）时才自动扣减对应时长：
        </p>

        <div
          v-for="(meal, index) in localSettings.mealIntervals"
          :key="meal.id"
          class="flex items-center gap-2 p-2 rounded bg-[#fbfbfa] dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f3437]"
        >
          <input
            v-model="meal.name"
            placeholder="名称"
            class="w-20 px-2 py-1 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#202020] text-xs text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none"
          />
          <div class="flex items-center gap-1.5 flex-1 font-mono text-xs">
            <input
              v-model="meal.start"
              type="time"
              class="w-full px-2 py-1 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#202020] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none"
            />
            <span class="text-[#9b9a97]">至</span>
            <input
              v-model="meal.end"
              type="time"
              class="w-full px-2 py-1 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#202020] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none"
            />
          </div>
          <button
            @click="removeMealInterval(index)"
            type="button"
            class="p-1 text-[#9b9a97] hover:text-[#e03e3e] transition-colors"
          >
            <Trash2 class="w-3.5 h-3.5" :stroke-width="1.75" />
          </button>
        </div>

        <button
          @click="addMealInterval"
          type="button"
          class="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-normal text-[#6940a5] dark:text-[#9a6dd7] border border-[#e9e9e7] dark:border-[#2f3437] hover:bg-[#f4f0f7] dark:hover:bg-[#2b2438] transition-colors"
        >
          <Plus class="w-3.5 h-3.5" :stroke-width="1.75" />
          <span>添加用餐时段</span>
        </button>
      </div>
    </div>

    <!-- 4. 加班时长取整策略 (Notion Section) -->
    <div class="bg-white dark:bg-[#202020] p-4 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] space-y-3 shadow-2xs">
      <div class="flex items-center gap-1.5 pb-2 border-b border-[#e9e9e7] dark:border-[#2f3437]">
        <Sliders class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
        <h3 class="font-medium text-[#37352f] dark:text-[#e3e2de] text-xs sm:text-sm">加班时长取整方式</h3>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label
          class="p-2.5 rounded border cursor-pointer transition-colors flex flex-col justify-between"
          :class="[
            localSettings.roundingType === 'floor_int'
              ? 'border-[#6940a5] bg-[#f4f0f7]/60 dark:bg-[#2b2438]/50 text-[#6940a5] dark:text-[#9a6dd7]'
              : 'border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de]'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium text-xs">向下取整（默认）</span>
            <input
              type="radio"
              name="roundingType"
              value="floor_int"
              v-model="localSettings.roundingType"
              class="text-[#6940a5] focus:ring-0"
            />
          </div>
          <span class="text-[10px] text-[#9b9a97] mt-1">如 3.25h 记为 3h</span>
        </label>

        <label
          class="p-2.5 rounded border cursor-pointer transition-colors flex flex-col justify-between"
          :class="[
            localSettings.roundingType === 'floor_half'
              ? 'border-[#6940a5] bg-[#f4f0f7]/60 dark:bg-[#2b2438]/50 text-[#6940a5] dark:text-[#9a6dd7]'
              : 'border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de]'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium text-xs">按 0.5h 向下取整</span>
            <input
              type="radio"
              name="roundingType"
              value="floor_half"
              v-model="localSettings.roundingType"
              class="text-[#6940a5] focus:ring-0"
            />
          </div>
          <span class="text-[10px] text-[#9b9a97] mt-1">如 3.75h 记为 3.5h</span>
        </label>

        <label
          class="p-2.5 rounded border cursor-pointer transition-colors flex flex-col justify-between"
          :class="[
            localSettings.roundingType === 'none'
              ? 'border-[#6940a5] bg-[#f4f0f7]/60 dark:bg-[#2b2438]/50 text-[#6940a5] dark:text-[#9a6dd7]'
              : 'border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de]'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium text-xs">不取整（精确）</span>
            <input
              type="radio"
              name="roundingType"
              value="none"
              v-model="localSettings.roundingType"
              class="text-[#6940a5] focus:ring-0"
            />
          </div>
          <span class="text-[10px] text-[#9b9a97] mt-1">保留两位小数 3.25h</span>
        </label>
      </div>
    </div>

    <!-- 5. 薪资设置 – 底薪与工时折算配置 (Notion Section) -->
    <div v-if="localSettings.salary" class="bg-white dark:bg-[#202020] p-4 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] space-y-3 shadow-2xs">
      <div class="flex items-center gap-1.5 pb-2 border-b border-[#e9e9e7] dark:border-[#2f3437]">
        <Calculator class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
        <h3 class="font-medium text-[#37352f] dark:text-[#e3e2de] text-xs sm:text-sm">薪资设置 – 底薪与工时折算</h3>
      </div>

      <p class="text-[11px] text-[#9b9a97]">
        配置您的基本底薪与月计薪天数系数，系统将自动折算日薪与时薪并用于加班费核算：
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- 底薪 -->
        <div>
          <label class="block text-xs font-normal text-[#787774] dark:text-[#9b9a97] mb-1">
            基本底薪 (元)
          </label>
          <div class="relative">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#9b9a97]">¥</span>
            <input
              v-model.number="localSettings.salary.baseSalary"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              @blur="validateBaseSalary"
              class="w-full pl-6 pr-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none text-xs font-mono"
            />
          </div>
          <p class="text-[11px] text-[#9b9a97] mt-0.5">月度标准计薪基数（非负数，保留两位小数）</p>
        </div>

        <!-- 计算系数 -->
        <div>
          <label class="block text-xs font-normal text-[#787774] dark:text-[#9b9a97] mb-1">
            月计薪天数系数 (天)
          </label>
          <div class="relative">
            <input
              v-model.number="localSettings.salary.calculationCoefficient"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="21.75"
              @blur="validateCoefficient"
              class="w-full px-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none text-xs font-mono"
            />
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#9b9a97]">天/月</span>
          </div>
          <p class="text-[11px] text-[#9b9a97] mt-0.5">法定标准月计薪天数默认为 21.75 天</p>
        </div>
      </div>

      <!-- 实时折算结果展示 -->
      <div class="grid grid-cols-2 gap-2 pt-2 border-t border-[#e9e9e7] dark:border-[#2f3437]">
        <div class="p-2.5 rounded bg-[#f7f6f3] dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f3437] flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-[#787774] dark:text-[#9b9a97]">折算日薪 (底薪 ÷ 系数)</span>
          </div>
          <div class="mt-1 flex items-baseline gap-1">
            <span class="text-base sm:text-lg font-semibold font-mono text-[#37352f] dark:text-[#e3e2de]">
              {{ formatMoney(calculatedDailyWage) }}
            </span>
            <span class="text-[10px] text-[#9b9a97]">/天</span>
          </div>
        </div>

        <div class="p-2.5 rounded bg-[#f4f0f7]/70 dark:bg-[#2b2438]/40 border border-[#6940a5]/20 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-[#6940a5] dark:text-[#9a6dd7]">折算时薪 (日薪 ÷ 8)</span>
          </div>
          <div class="mt-1 flex items-baseline gap-1">
            <span class="text-base sm:text-lg font-semibold font-mono text-[#6940a5] dark:text-[#9a6dd7]">
              {{ formatMoney(calculatedHourlyWage) }}
            </span>
            <span class="text-[10px] text-[#9a6dd7]/70">/小时</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 6. 薪资设置 – 加班工资倍数 (Notion Section) -->
    <div v-if="localSettings.salary" class="bg-white dark:bg-[#202020] p-4 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] space-y-3 shadow-2xs">
      <div class="flex items-center justify-between pb-2 border-b border-[#e9e9e7] dark:border-[#2f3437]">
        <div class="flex items-center gap-1.5">
          <Sliders class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
          <h3 class="font-medium text-[#37352f] dark:text-[#e3e2de] text-xs sm:text-sm">薪资设置 – 加班工资倍数</h3>
        </div>
        <span class="text-[11px] text-[#9b9a97]">修改后即时生效并保存</span>
      </div>

      <p class="text-[11px] text-[#9b9a97]">
        法定标准倍数通常为：工作日 1.5 倍、周末 2 倍、法定节假日 3 倍。系统将依据打卡日期的日历属性自动匹配对应倍数：
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <!-- 日常加班 -->
        <div class="p-2.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525]">
          <label class="block text-xs font-medium text-[#37352f] dark:text-[#e3e2de] mb-1">
            日常加班倍数
          </label>
          <div class="relative">
            <input
              v-model.number="localSettings.salary.overtimeRates.workday"
              type="number"
              step="0.1"
              min="0"
              placeholder="1.5"
              @blur="validateRate('workday')"
              class="w-full px-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fafaf9] dark:bg-[#202020] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none text-xs font-mono"
            />
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9b9a97]">倍</span>
          </div>
          <p class="text-[10px] text-[#9b9a97] mt-1">常规工作日及调休补班日</p>
        </div>

        <!-- 周末加班 -->
        <div class="p-2.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525]">
          <label class="block text-xs font-medium text-[#37352f] dark:text-[#e3e2de] mb-1">
            周末加班倍数
          </label>
          <div class="relative">
            <input
              v-model.number="localSettings.salary.overtimeRates.weekend"
              type="number"
              step="0.1"
              min="0"
              placeholder="2.0"
              @blur="validateRate('weekend')"
              class="w-full px-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fafaf9] dark:bg-[#202020] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none text-xs font-mono"
            />
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9b9a97]">倍</span>
          </div>
          <p class="text-[10px] text-[#9b9a97] mt-1">周六、周日自然休息日</p>
        </div>

        <!-- 节假日加班 -->
        <div class="p-2.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525]">
          <label class="block text-xs font-medium text-[#37352f] dark:text-[#e3e2de] mb-1">
            节假日加班倍数
          </label>
          <div class="relative">
            <input
              v-model.number="localSettings.salary.overtimeRates.holiday"
              type="number"
              step="0.1"
              min="0"
              placeholder="3.0"
              @blur="validateRate('holiday')"
              class="w-full px-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fafaf9] dark:bg-[#202020] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none text-xs font-mono"
            />
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9b9a97]">倍</span>
          </div>
          <p class="text-[10px] text-[#9b9a97] mt-1">元旦/春节/国庆等法定节假日</p>
        </div>
      </div>
    </div>

    <!-- 7. 薪资设置 – 其他薪资杂项 (Notion Section) -->
    <div v-if="localSettings.salary" class="bg-white dark:bg-[#202020] p-4 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] space-y-3 shadow-2xs">
      <div class="flex items-center justify-between pb-2 border-b border-[#e9e9e7] dark:border-[#2f3437]">
        <div class="flex items-center gap-1.5">
          <Receipt class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
          <h3 class="font-medium text-[#37352f] dark:text-[#e3e2de] text-xs sm:text-sm">薪资设置 – 其他杂项 (津贴 / 扣款)</h3>
        </div>
        <button
          @click="addSalaryItem"
          type="button"
          class="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-[#6940a5] dark:text-[#9a6dd7] border border-[#e9e9e7] dark:border-[#2f3437] hover:bg-[#f4f0f7] dark:hover:bg-[#2b2438] transition-colors"
        >
          <Plus class="w-3.5 h-3.5" :stroke-width="1.75" />
          <span>添加杂项</span>
        </button>
      </div>

      <p class="text-[11px] text-[#9b9a97]">
        支持自定义增减款项（如岗位补贴、全勤奖、绩效奖金、五险一金代扣、迟到扣款等），并实时计入统计报表实发薪资：
      </p>

      <div
        v-if="localSettings.salary.otherItems.length === 0"
        class="text-xs text-[#9b9a97] py-3 text-center border border-dashed border-[#e9e9e7] dark:border-[#2f3437] rounded"
      >
        暂无其他杂项，点击右上角「添加杂项」新增
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="(item, index) in localSettings.salary.otherItems"
          :key="item.id"
          class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded bg-[#fbfbfa] dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f3437]"
        >
          <!-- 类型选择：加项 / 减项 -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              @click="item.type = 'addition'"
              class="px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer"
              :class="[
                item.type === 'addition'
                  ? 'bg-[#edf3ec] text-[#448361] dark:bg-[#203126] dark:text-[#4d9375] font-semibold ring-1 ring-[#448361]/30'
                  : 'text-[#787774] dark:text-[#9b9a97] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a]'
              ]"
            >
              加项 (+)
            </button>
            <button
              type="button"
              @click="item.type = 'deduction'"
              class="px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer"
              :class="[
                item.type === 'deduction'
                  ? 'bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757] font-semibold ring-1 ring-[#e03e3e]/30'
                  : 'text-[#787774] dark:text-[#9b9a97] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a]'
              ]"
            >
              减项 (-)
            </button>
          </div>

          <!-- 名称输入 -->
          <input
            v-model="item.name"
            placeholder="项目名称 (如餐补、五险一金)"
            class="flex-1 px-2.5 py-1 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#202020] text-xs text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none"
          />

          <!-- 金额输入 -->
          <div class="relative w-full sm:w-32">
            <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono text-[#9b9a97]">¥</span>
            <input
              v-model.number="item.amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              @blur="validateItemAmount(item)"
              class="w-full pl-5 pr-2 py-1 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#202020] text-xs text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none font-mono"
            />
          </div>

          <!-- 删除按钮 -->
          <button
            @click="removeSalaryItem(index)"
            type="button"
            class="self-end sm:self-center p-1 text-[#9b9a97] hover:text-[#e03e3e] transition-colors"
            title="删除此杂项"
          >
            <Trash2 class="w-3.5 h-3.5" :stroke-width="1.75" />
          </button>
        </div>
      </div>
    </div>

    <!-- 8. 本地数据管理与备份 (Notion Section) -->
    <div class="bg-white dark:bg-[#202020] p-4 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] space-y-3 shadow-2xs">
      <div class="flex items-center gap-1.5 pb-2 border-b border-[#e9e9e7] dark:border-[#2f3437]">
        <Database class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
        <h3 class="font-medium text-[#37352f] dark:text-[#e3e2de] text-xs sm:text-sm">本地数据管理</h3>
      </div>

      <p class="text-[11px] text-[#9b9a97]">
        所有考勤与设置数据保存在您的本地浏览器中。建议定期导出 JSON 备份以防数据意外丢失。
      </p>

      <input
        ref="jsonFileInput"
        type="file"
        accept=".json"
        class="hidden"
        @change="handleFileImportJSON"
      />

      <div class="grid grid-cols-2 gap-2">
        <button
          @click="handleExportJSON"
          type="button"
          class="flex items-center justify-center gap-1.5 p-2 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-xs font-normal text-[#37352f] dark:text-[#e3e2de] hover:bg-[#f7f6f3] dark:hover:bg-[#2b2b2b] transition-colors shadow-2xs"
        >
          <Download class="w-3.5 h-3.5 text-[#337ea9]" :stroke-width="1.75" />
          <span>导出 JSON 备份</span>
        </button>

        <button
          @click="triggerImportJSON"
          type="button"
          class="flex items-center justify-center gap-1.5 p-2 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-xs font-normal text-[#37352f] dark:text-[#e3e2de] hover:bg-[#f7f6f3] dark:hover:bg-[#2b2b2b] transition-colors shadow-2xs"
        >
          <Upload class="w-3.5 h-3.5 text-[#337ea9]" :stroke-width="1.75" />
          <span>恢复 JSON 备份</span>
        </button>

        <button
          @click="handleExportExcel"
          type="button"
          class="flex items-center justify-center gap-1.5 p-2 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-xs font-normal text-[#37352f] dark:text-[#e3e2de] hover:bg-[#f7f6f3] dark:hover:bg-[#2b2b2b] transition-colors shadow-2xs"
        >
          <FileSpreadsheet class="w-3.5 h-3.5 text-[#448361]" :stroke-width="1.75" />
          <span>导出 Excel 报表</span>
        </button>

        <button
          @click="handleLoadSampleData"
          type="button"
          class="flex items-center justify-center gap-1.5 p-2 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-xs font-normal text-[#cb912f] dark:text-[#dfab01] hover:bg-[#fbf3db]/50 transition-colors shadow-2xs"
        >
          <Sparkles class="w-3.5 h-3.5" :stroke-width="1.75" />
          <span>注入演示样例数据</span>
        </button>
      </div>

      <div class="pt-2 border-t border-[#e9e9e7] dark:border-[#2f3437] flex items-center justify-between">
        <span class="text-xs text-[#e03e3e] flex items-center gap-1">
          <AlertTriangle class="w-3.5 h-3.5" :stroke-width="1.75" />
          危险区：清空所有数据
        </span>
        <button
          @click="handleClearAll"
          type="button"
          class="px-2 py-0.5 rounded border border-[#e03e3e]/30 text-[#e03e3e] dark:text-[#eb5757] text-xs hover:bg-[#fbe4e4] dark:hover:bg-[#3c2121] transition-colors"
        >
          全部清空
        </button>
      </div>
    </div>

    <!-- 底部保存/取消操作栏 -->
    <div class="flex items-center justify-between p-3.5 bg-white dark:bg-[#202020] rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs">
      <div class="flex items-center gap-2">
        <span
          class="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"
          :class="hasUnsavedChanges ? 'bg-[#d9730d] animate-pulse' : 'bg-[#448361]'"
        ></span>
        <span class="text-xs text-[#787774] dark:text-[#9b9a97]">
          {{ hasUnsavedChanges ? '当前有未保存的草稿修改' : '所有规则设置已保存并生效' }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="hasUnsavedChanges"
          type="button"
          @click="handleDiscardChanges"
          class="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-[#787774] dark:text-[#9b9a97] hover:bg-[#ebeae5] dark:hover:bg-[#2d2d2d] transition-colors cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" :stroke-width="1.75" />
          <span>放弃修改</span>
        </button>

        <button
          type="button"
          @click="handleSaveSettings"
          :disabled="!hasUnsavedChanges"
          class="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium transition-all shadow-2xs"
          :class="[
            hasUnsavedChanges
              ? 'bg-[#6940a5] hover:bg-[#58338f] text-white cursor-pointer ring-1 ring-[#6940a5]/50'
              : 'bg-[#ebeae5] dark:bg-[#2d2d2d] text-[#9b9a97] cursor-not-allowed'
          ]"
        >
          <Save class="w-3.5 h-3.5" :stroke-width="2" />
          <span>{{ hasUnsavedChanges ? '保存设置' : '已保存' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
