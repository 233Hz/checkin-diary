<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Download
} from 'lucide-vue-next';
import type { AttendanceSettings, DailyRecord, AttendanceStatus } from '../types/attendance';
import { generateMonthCalendar, formatDate, type CalendarCell } from '../services/holidayService';
import { calculateOvertime } from '../services/calcService';
import { getMonthlyStats } from '../services/statsService';
import { exportAttendanceToExcel } from '../services/excelService';
import PunchModal from '../components/PunchModal.vue';
import ExcelImportModal from '../components/ExcelImportModal.vue';

const props = defineProps<{
  settings: AttendanceSettings;
  records: Record<string, DailyRecord>;
}>();

const emit = defineEmits<{
  (e: 'save-record', record: DailyRecord): void;
  (e: 'delete-record', dateStr: string): void;
  (e: 'import-records', records: DailyRecord[]): void;
}>();

const today = new Date();
const currentYear = ref(today.getFullYear());
const currentMonth = ref(today.getMonth() + 1); // 1-12

// 模态弹窗状态
const punchModalVisible = ref(false);
const selectedDateStr = ref(formatDate(today));
const excelModalVisible = ref(false);

// 生成当月网格
const calendarCells = computed<CalendarCell[]>(() => {
  const overrides: Record<string, 'holiday' | 'workday' | null> = {};
  for (const date in props.records) {
    if (props.records[date].customHolidayType) {
      overrides[date] = props.records[date].customHolidayType!;
    }
  }
  return generateMonthCalendar(currentYear.value, currentMonth.value, overrides, props.settings.customHolidays);
});

// 当月统计指标
const monthStats = computed(() => {
  return getMonthlyStats(currentYear.value, currentMonth.value, props.records, props.settings);
});

// 计算每个单元格在当天的打卡与加班展示数据
function getCellDisplay(cell: CalendarCell) {
  const record = props.records[cell.date];
  const isWorkday = cell.holidayInfo.isWorkday;

  let overtimeHours = 0;
  // 未填写的记录全部默认正常8小时出勤
  let status: AttendanceStatus = record?.status || (isWorkday ? 'normal' : 'rest');

  if (record && record.status === 'normal' && record.clockIn && record.clockOut) {
    const otRes = calculateOvertime(
      record.clockIn,
      record.clockOut,
      record.isNextDayOut,
      !isWorkday,
      props.settings
    );
    overtimeHours = otRes.finalOvertimeHours;
  }

  return {
    record,
    overtimeHours,
    status,
  };
}

// 触摸滑动支持 (Mobile Gestures)
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e: TouchEvent) {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
    if (deltaX > 0) {
      prevMonth();
    } else {
      nextMonth();
    }
  }
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
}

function goToToday() {
  const now = new Date();
  currentYear.value = now.getFullYear();
  currentMonth.value = now.getMonth() + 1;
}

function onCellClick(cell: CalendarCell) {
  // 禁用非当月日期点击添加
  if (!cell.isCurrentMonth) return;
  selectedDateStr.value = cell.date;
  punchModalVisible.value = true;
}

function handleExportExcel() {
  exportAttendanceToExcel(props.records, props.settings);
}
</script>

<template>
  <div class="space-y-3 pb-12">
    <!-- Notion 风格日历顶栏：重构响应式布局，彻底避免移动端拥挤换行 -->
    <div class="bg-white dark:bg-[#202020] p-2.5 sm:p-3 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs space-y-2 sm:space-y-0">
      <!-- 第一行：年月控制器与今天按钮 -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <!-- 翻月按钮 -->
          <div class="flex items-center border border-[#e9e9e7] dark:border-[#2f3437] rounded bg-[#fafaf9] dark:bg-[#262626] p-0.5">
            <button
              @click="prevMonth"
              type="button"
              class="p-1 rounded text-[#787774] hover:text-[#37352f] dark:text-[#9b9a97] dark:hover:text-[#e3e2de] hover:bg-[#f1f1ef] dark:hover:bg-[#2d2d2d] transition-colors"
              title="上一月"
            >
              <ChevronLeft class="w-4 h-4" :stroke-width="1.75" />
            </button>
            <button
              @click="nextMonth"
              type="button"
              class="p-1 rounded text-[#787774] hover:text-[#37352f] dark:text-[#9b9a97] dark:hover:text-[#e3e2de] hover:bg-[#f1f1ef] dark:hover:bg-[#2d2d2d] transition-colors"
              title="下一月"
            >
              <ChevronRight class="w-4 h-4" :stroke-width="1.75" />
            </button>
          </div>

          <!-- 年月标题：强制不换行 -->
          <span class="text-base sm:text-lg font-semibold text-[#37352f] dark:text-[#e3e2de] tracking-tight whitespace-nowrap">
            {{ currentYear }} 年 {{ currentMonth }} 月
          </span>

          <button
            @click="goToToday"
            type="button"
            class="px-2 py-0.5 text-xs font-normal rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fafaf9] dark:bg-[#262626] text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e3e2de] hover:bg-[#f1f1ef] dark:hover:bg-[#2d2d2d] transition-colors whitespace-nowrap"
          >
            今天
          </button>
        </div>

        <!-- 桌面端操作项（在移动端第一行隐藏，防止拥挤） -->
        <div class="hidden sm:flex items-center gap-2">
          <button
            @click="excelModalVisible = true"
            type="button"
            class="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-normal border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#202020] text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e3e2de] hover:bg-[#f1f1ef] dark:hover:bg-[#2d2d2d] transition-colors whitespace-nowrap"
          >
            <Upload class="w-3.5 h-3.5 text-[#337ea9]" :stroke-width="1.75" />
            <span>导入表格</span>
          </button>
          <button
            @click="handleExportExcel"
            type="button"
            class="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-normal border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#202020] text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e3e2de] hover:bg-[#f1f1ef] dark:hover:bg-[#2d2d2d] transition-colors whitespace-nowrap"
          >
            <Download class="w-3.5 h-3.5 text-[#448361]" :stroke-width="1.75" />
            <span>导出 Excel</span>
          </button>
        </div>
      </div>

      <!-- 移动端专属第二行：轻扫提示 + 宽敞的导入/导出按钮，绝不挤成一团 -->
      <div class="sm:hidden flex items-center justify-between pt-1.5 border-t border-[#f0efeb] dark:border-[#2a2a2a]">
        <span class="text-[11px] text-[#9b9a97]">轻扫快速切月</span>
        <div class="flex items-center gap-1.5">
          <button
            @click="excelModalVisible = true"
            type="button"
            class="flex items-center gap-1 px-2 py-1 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fafaf9] dark:bg-[#262626] text-xs text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e3e2de] whitespace-nowrap"
          >
            <Upload class="w-3 h-3 text-[#337ea9]" :stroke-width="1.75" />
            <span>导入表格</span>
          </button>
          <button
            @click="handleExportExcel"
            type="button"
            class="flex items-center gap-1 px-2 py-1 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fafaf9] dark:bg-[#262626] text-xs text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e3e2de] whitespace-nowrap"
          >
            <Download class="w-3 h-3 text-[#448361]" :stroke-width="1.75" />
            <span>导出 Excel</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Notion 纸质日历表格卡片 -->
    <div
      class="bg-white dark:bg-[#202020] rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] overflow-hidden select-none shadow-2xs"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- 星期表头：Notion 浅灰表头 -->
      <div class="grid grid-cols-7 border-b border-[#e9e9e7] dark:border-[#2f3437] bg-[#fbfbfa] dark:bg-[#252525] text-center py-1.5 text-xs font-normal text-[#787774] dark:text-[#9b9a97]">
        <div>周一</div>
        <div>周二</div>
        <div>周三</div>
        <div>周四</div>
        <div>周五</div>
        <div class="text-[#e03e3e] dark:text-[#eb5757]">周六</div>
        <div class="text-[#e03e3e] dark:text-[#eb5757]">周日</div>
      </div>

      <!-- 日历网格：Notion 细分割线 -->
      <div class="grid grid-cols-7 divide-x divide-y divide-[#e9e9e7] dark:divide-[#2f3437]">
        <div
          v-for="cell in calendarCells"
          :key="cell.date"
          @click="onCellClick(cell)"
          class="min-h-[72px] sm:min-h-[88px] p-1.5 flex flex-col justify-between relative transition-colors"
          :class="[
            cell.isCurrentMonth
              ? 'cursor-pointer hover:bg-[#f7f6f3] dark:hover:bg-[#262626]'
              : 'cursor-not-allowed opacity-25 bg-[#fafaf9]/80 dark:bg-[#181818]/80 pointer-events-none',
            cell.isToday && cell.isCurrentMonth ? 'bg-[#f4f0f7]/40 dark:bg-[#2b2438]/30' : '',
          ]"
        >
          <!-- 顶部：日期数字与节假日角标 -->
          <div class="flex items-start justify-between leading-none">
            <span
              class="text-xs sm:text-sm font-medium rounded w-5 h-5 flex items-center justify-center transition-colors"
              :class="[
                cell.isToday && cell.isCurrentMonth
                  ? 'bg-[#6940a5] text-white font-semibold'
                  : 'text-[#37352f] dark:text-[#e3e2de]'
              ]"
            >
              {{ cell.dayNumber }}
            </span>

            <!-- 法定休 / 班角标：Notion 莫兰迪粉 / 莫兰迪蓝 -->
            <div class="flex items-center">
              <span
                v-if="cell.holidayInfo.isHoliday"
                class="px-1 py-0.2 rounded text-[9px] font-medium leading-tight bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757]"
                :title="cell.holidayInfo.name"
              >
                休
              </span>
              <span
                v-else-if="cell.holidayInfo.type === 'transfer_workday'"
                class="px-1 py-0.2 rounded text-[9px] font-medium leading-tight bg-[#e7f3f8] text-[#337ea9] dark:bg-[#1d282e] dark:text-[#529cca]"
                :title="cell.holidayInfo.name"
              >
                班
              </span>
            </div>
          </div>

          <!-- 中部：打卡时间摘要 (宽屏显示) -->
          <div v-if="cell.isCurrentMonth && getCellDisplay(cell).record?.clockIn" class="hidden sm:block text-[10px] text-[#9b9a97] dark:text-[#787774] font-mono truncate my-0.5">
            {{ getCellDisplay(cell).record?.clockIn }}-{{ getCellDisplay(cell).record?.clockOut || '?' }}
          </div>

          <!-- 底部：加班徽标与考勤状态标记 (Notion 莫兰迪胶囊标签，绝不折行) -->
          <div class="mt-auto flex flex-col gap-0.5 w-full">
            <!-- 仅在当月显示加班与状态标签 -->
            <template v-if="cell.isCurrentMonth">
              <!-- 加班标签：Notion 经典莫兰迪紫 (Purple Tag) -->
              <div
                v-if="getCellDisplay(cell).overtimeHours > 0"
                class="w-full py-0.5 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-[#f4f0f7] text-[#6940a5] dark:bg-[#2b2438] dark:text-[#9a6dd7] text-center whitespace-nowrap overflow-hidden text-ellipsis leading-tight font-mono"
              >
                +{{ getCellDisplay(cell).overtimeHours }}h
              </div>

              <!-- 缺勤/请假/调休标签（仅在有明确记录时展示） -->
              <div
                v-if="getCellDisplay(cell).record?.status === 'absent'"
                class="w-full py-0.2 rounded text-[10px] font-medium bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757] text-center whitespace-nowrap leading-tight"
              >
                缺勤
              </div>
              <div
                v-else-if="getCellDisplay(cell).record?.status === 'leave'"
                class="w-full py-0.2 rounded text-[10px] font-medium bg-[#faece3] text-[#d9730d] dark:bg-[#38281e] dark:text-[#df8b39] text-center whitespace-nowrap leading-tight"
              >
                请假
              </div>
              <div
                v-else-if="getCellDisplay(cell).record?.status === 'compensatory'"
                class="w-full py-0.2 rounded text-[10px] font-medium bg-[#fbf3db] text-[#cb912f] dark:bg-[#39321c] dark:text-[#dfab01] text-center whitespace-nowrap leading-tight"
              >
                调休
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Notion 风格图例说明 -->
    <div class="flex flex-wrap items-center justify-between text-xs text-[#787774] dark:text-[#9b9a97] px-1 py-1 gap-2">
      <div class="flex flex-wrap items-center gap-2.5">
        <span class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f4f0f7] text-[#6940a5] dark:bg-[#2b2438] dark:text-[#9a6dd7] text-[11px]">
          加班 (+Xh)
        </span>
        <span class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757] text-[11px]">
          缺勤
        </span>
        <span class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#faece3] text-[#d9730d] dark:bg-[#38281e] dark:text-[#df8b39] text-[11px]">
          请假
        </span>
        <span class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#fbf3db] text-[#cb912f] dark:bg-[#39321c] dark:text-[#dfab01] text-[11px]">
          调休
        </span>
        <span class="flex items-center gap-1 text-[11px]">
          <span class="px-1 rounded bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757]">休</span>
          法定节假日
        </span>
        <span class="flex items-center gap-1 text-[11px]">
          <span class="px-1 rounded bg-[#e7f3f8] text-[#337ea9] dark:bg-[#1d282e] dark:text-[#529cca]">班</span>
          调休补班
        </span>
      </div>
    </div>

    <!-- Notion 风格月度数据汇总行 (Database Summary Bar) -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
      <div class="p-3 rounded-lg bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs">
        <span class="text-[11px] font-normal text-[#787774] dark:text-[#9b9a97]">当月加班总工时</span>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="text-xl font-semibold text-[#6940a5] dark:text-[#9a6dd7] font-mono">{{ monthStats.totalOvertimeHours }}</span>
          <span class="text-xs text-[#9b9a97]">h</span>
        </div>
      </div>

      <div class="p-3 rounded-lg bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs">
        <span class="text-[11px] font-normal text-[#787774] dark:text-[#9b9a97]">正常出勤</span>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="text-xl font-semibold text-[#448361] dark:text-[#4d9375] font-mono">{{ monthStats.actualWorkDays }}</span>
          <span class="text-xs text-[#9b9a97]">天</span>
        </div>
      </div>

      <div class="p-3 rounded-lg bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs">
        <span class="text-[11px] font-normal text-[#787774] dark:text-[#9b9a97]">缺勤记录</span>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="text-xl font-semibold text-[#e03e3e] dark:text-[#eb5757] font-mono">{{ monthStats.absentDays }}</span>
          <span class="text-xs text-[#9b9a97]">天</span>
        </div>
      </div>

      <div class="p-3 rounded-lg bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs">
        <span class="text-[11px] font-normal text-[#787774] dark:text-[#9b9a97]">请假记录</span>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="text-xl font-semibold text-[#d9730d] dark:text-[#df8b39] font-mono">{{ monthStats.leaveDays }}</span>
          <span class="text-xs text-[#9b9a97]">天</span>
        </div>
      </div>

      <div class="p-3 rounded-lg bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs col-span-2 sm:col-span-1">
        <span class="text-[11px] font-normal text-[#787774] dark:text-[#9b9a97]">调休记录</span>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="text-xl font-semibold text-[#cb912f] dark:text-[#dfab01] font-mono">{{ monthStats.compensatoryDays }}</span>
          <span class="text-xs text-[#9b9a97]">天</span>
        </div>
      </div>
    </div>

    <!-- 打卡录入弹窗 -->
    <PunchModal
      :visible="punchModalVisible"
      :date-str="selectedDateStr"
      :initial-record="records[selectedDateStr]"
      :settings="settings"
      @close="punchModalVisible = false"
      @save="emit('save-record', $event)"
      @delete="emit('delete-record', $event)"
    />

    <!-- Excel 导入弹窗 -->
    <ExcelImportModal
      :visible="excelModalVisible"
      @close="excelModalVisible = false"
      @import-success="emit('import-records', $event)"
    />
  </div>
</template>
