<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, Clock, Trash2, Check, Calendar, Plus, Minus, RotateCcw } from 'lucide-vue-next';
import type { AttendanceSettings, DailyRecord, AttendanceStatus, HolidayInfo } from '../types/attendance';
import { calculateOvertime } from '../services/calcService';
import { getHolidayInfo } from '../services/holidayService';

const props = defineProps<{
  visible: boolean;
  dateStr: string;
  initialRecord?: DailyRecord;
  settings: AttendanceSettings;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', record: DailyRecord): void;
  (e: 'delete', dateStr: string): void;
}>();

const clockIn = ref('');
const clockOut = ref('');
const isNextDayOut = ref(false);
const status = ref<AttendanceStatus>('normal');
const note = ref('');
const customHolidayType = ref<'holiday' | 'workday' | null>(null);

// 当弹窗打开时，默认取设置中设置的标准上下班时间
watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.initialRecord) {
        clockIn.value = props.initialRecord.clockIn || props.settings.workSchedule.start;
        clockOut.value = props.initialRecord.clockOut || props.settings.workSchedule.end;
        isNextDayOut.value = !!props.initialRecord.isNextDayOut;
        status.value = props.initialRecord.status || 'normal';
        note.value = props.initialRecord.note || '';
        customHolidayType.value = props.initialRecord.customHolidayType || null;
      } else {
        // 新建记录：默认取设置中的标准上下班时间
        clockIn.value = props.settings.workSchedule.start;
        clockOut.value = props.settings.workSchedule.end;
        isNextDayOut.value = false;
        status.value = 'normal';
        note.value = '';
        customHolidayType.value = null;
      }
    }
  },
  { immediate: true }
);

// 当前日期的节假日信息
const holidayInfo = computed<HolidayInfo>(() => {
  return getHolidayInfo(props.dateStr, customHolidayType.value, props.settings.customHolidays);
});

// 动态计算加班结果
const calcResult = computed(() => {
  if (status.value !== 'normal') return null;
  return calculateOvertime(
    clockIn.value,
    clockOut.value,
    isNextDayOut.value,
    !holidayInfo.value.isWorkday,
    props.settings
  );
});

// 快捷 +1h / -1h 调时
function adjustClockOut(deltaHours: number) {
  const current = clockOut.value || props.settings.workSchedule.end;
  let [h, m] = current.split(':').map(Number);
  if (isNaN(h)) h = 18;
  if (isNaN(m)) m = 0;

  let totalMinutes = h * 60 + m + (isNextDayOut.value ? 1440 : 0);
  totalMinutes += Math.round(deltaHours * 60);

  if (totalMinutes >= 1440) {
    isNextDayOut.value = true;
    const nextDayMin = totalMinutes - 1440;
    const newH = Math.floor(nextDayMin / 60) % 24;
    const newM = nextDayMin % 60;
    clockOut.value = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  } else {
    isNextDayOut.value = false;
    const safeMin = Math.max(0, totalMinutes);
    const newH = Math.floor(safeMin / 60) % 24;
    const newM = safeMin % 60;
    clockOut.value = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  }
}

function resetToStandardSchedule() {
  clockIn.value = props.settings.workSchedule.start;
  clockOut.value = props.settings.workSchedule.end;
  isNextDayOut.value = false;
}

function setCurrentTime(target: 'in' | 'out') {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${h}:${m}`;
  if (target === 'in') {
    clockIn.value = timeStr;
  } else {
    clockOut.value = timeStr;
  }
}

function handleSave() {
  const updated: DailyRecord = {
    date: props.dateStr,
    clockIn: clockIn.value,
    clockOut: clockOut.value,
    isNextDayOut: isNextDayOut.value,
    status: status.value,
    note: note.value.trim(),
    customHolidayType: customHolidayType.value,
  };
  emit('save', updated);
  emit('close');
}

function handleDelete() {
  if (confirm(`确定要清除 ${props.dateStr} 的打卡考勤记录吗？`)) {
    emit('delete', props.dateStr);
    emit('close');
  }
}

// Notion 经典莫兰迪胶囊标签配置
const statusOptions: { value: AttendanceStatus; label: string; activeClass: string; inactiveClass: string }[] = [
  {
    value: 'normal',
    label: '正常出勤',
    activeClass: 'bg-[#edf3ec] text-[#448361] dark:bg-[#203126] dark:text-[#4d9375] font-semibold ring-1 ring-[#448361]/30',
    inactiveClass: 'text-[#787774] dark:text-[#9b9a97] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a]'
  },
  {
    value: 'absent',
    label: '缺勤',
    activeClass: 'bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757] font-semibold ring-1 ring-[#e03e3e]/30',
    inactiveClass: 'text-[#787774] dark:text-[#9b9a97] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a]'
  },
  {
    value: 'leave',
    label: '请假',
    activeClass: 'bg-[#faece3] text-[#d9730d] dark:bg-[#38281e] dark:text-[#df8b39] font-semibold ring-1 ring-[#d9730d]/30',
    inactiveClass: 'text-[#787774] dark:text-[#9b9a97] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a]'
  },
  {
    value: 'compensatory',
    label: '调休',
    activeClass: 'bg-[#fbf3db] text-[#cb912f] dark:bg-[#39321c] dark:text-[#dfab01] font-semibold ring-1 ring-[#cb912f]/30',
    inactiveClass: 'text-[#787774] dark:text-[#9b9a97] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a]'
  },
];
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/35 backdrop-blur-2xs animate-fade-in"
    @click.self="emit('close')"
  >
    <div
      class="bg-white dark:bg-[#202020] rounded-lg w-full max-w-lg border border-[#e9e9e7] dark:border-[#2f3437] overflow-hidden flex flex-col max-h-[92vh] shadow-lg"
    >
      <!-- Notion 页面风格顶栏 -->
      <div class="px-5 py-3.5 border-b border-[#e9e9e7] dark:border-[#2f3437] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Calendar class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
          <h3 class="font-semibold text-[#37352f] dark:text-[#e3e2de] text-base">
            {{ dateStr }}
          </h3>
          <span
            class="px-1.5 py-0.5 rounded text-xs font-medium"
            :class="[
              holidayInfo.isHoliday
                ? 'bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757]'
                : holidayInfo.type === 'transfer_workday'
                ? 'bg-[#e7f3f8] text-[#337ea9] dark:bg-[#1d282e] dark:text-[#529cca]'
                : 'bg-[#f1f1ef] text-[#787774] dark:bg-[#2a2a2a] dark:text-[#9b9a97]'
            ]"
          >
            {{ holidayInfo.name }}
          </span>
        </div>
        <button
          @click="emit('close')"
          type="button"
          class="p-1 rounded text-[#787774] hover:text-[#37352f] dark:text-[#9b9a97] dark:hover:text-[#e3e2de] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a] transition-colors"
        >
          <X class="w-4 h-4" :stroke-width="1.75" />
        </button>
      </div>

      <!-- 表单主体：Notion 属性行布局 (Properties) -->
      <div class="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1">
        <!-- 属性：考勤状态 (Select Property) -->
        <div>
          <label class="block text-xs font-medium text-[#787774] dark:text-[#9b9a97] mb-1.5">
            考勤状态
          </label>
          <div class="grid grid-cols-4 gap-1.5 bg-[#f7f6f3] dark:bg-[#252525] p-1 rounded-md border border-[#e9e9e7] dark:border-[#2f3437]">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              type="button"
              @click="status = opt.value"
              class="py-1 px-1 text-xs rounded transition-colors text-center"
              :class="[
                status === opt.value ? opt.activeClass : opt.inactiveClass
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 正常出勤下的打卡时间 -->
        <div v-if="status === 'normal'" class="space-y-3 pt-1">
          <!-- 上班时间 -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-medium text-[#37352f] dark:text-[#e3e2de] flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-[#787774]" :stroke-width="1.75" />
                上班打卡时间
              </label>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="clockIn = settings.workSchedule.start"
                  class="text-xs text-[#6940a5] dark:text-[#9a6dd7] hover:underline"
                >
                  标准 {{ settings.workSchedule.start }}
                </button>
                <button
                  type="button"
                  @click="setCurrentTime('in')"
                  class="text-xs text-[#787774] hover:underline"
                >
                  现在
                </button>
              </div>
            </div>
            <input
              v-model="clockIn"
              type="time"
              class="w-full px-3 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none text-xs sm:text-sm font-mono"
            />
          </div>

          <!-- 下班时间与快捷 +1 / -1 调时按钮 -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-medium text-[#37352f] dark:text-[#e3e2de] flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-[#787774]" :stroke-width="1.75" />
                下班打卡时间
              </label>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="clockOut = settings.workSchedule.end; isNextDayOut = false"
                  class="text-xs text-[#6940a5] dark:text-[#9a6dd7] hover:underline"
                >
                  标准 {{ settings.workSchedule.end }}
                </button>
                <button
                  type="button"
                  @click="setCurrentTime('out')"
                  class="text-xs text-[#787774] hover:underline"
                >
                  现在
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input
                v-model="clockOut"
                type="time"
                class="flex-1 px-3 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de] focus:border-[#6940a5] focus:outline-none text-xs sm:text-sm font-mono"
              />
              <label class="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fbfbfa] dark:bg-[#252525] cursor-pointer select-none text-xs text-[#37352f] dark:text-[#e3e2de]">
                <input
                  v-model="isNextDayOut"
                  type="checkbox"
                  class="rounded text-[#6940a5] focus:ring-0"
                />
                <span>次日</span>
              </label>
            </div>

            <!-- Notion 风格快捷调时按钮组 -->
            <div class="grid grid-cols-4 gap-1 mt-1.5">
              <button
                type="button"
                @click="adjustClockOut(-1)"
                class="flex items-center justify-center gap-1 py-1 px-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#f7f6f3] dark:bg-[#252525] text-xs text-[#37352f] dark:text-[#e3e2de] hover:bg-[#ebeae5] dark:hover:bg-[#2d2d2d] transition-colors"
              >
                <Minus class="w-3 h-3 text-[#787774]" />
                <span>-1 小时</span>
              </button>
              <button
                type="button"
                @click="adjustClockOut(1)"
                class="flex items-center justify-center gap-1 py-1 px-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#f4f0f7] dark:bg-[#2b2438] text-xs font-medium text-[#6940a5] dark:text-[#9a6dd7] hover:bg-[#ede8f5] transition-colors"
              >
                <Plus class="w-3 h-3 text-[#6940a5] dark:text-[#9a6dd7]" />
                <span>+1 小时</span>
              </button>
              <button
                type="button"
                @click="adjustClockOut(0.5)"
                class="flex items-center justify-center gap-1 py-1 px-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#f7f6f3] dark:bg-[#252525] text-xs text-[#37352f] dark:text-[#e3e2de] hover:bg-[#ebeae5] dark:hover:bg-[#2d2d2d] transition-colors"
              >
                <Plus class="w-3 h-3 text-[#787774]" />
                <span>+0.5h</span>
              </button>
              <button
                type="button"
                @click="resetToStandardSchedule"
                class="flex items-center justify-center gap-1 py-1 px-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-[#f7f6f3] dark:bg-[#252525] text-xs text-[#787774] dark:text-[#9b9a97] hover:bg-[#ebeae5] transition-colors"
                title="重置为标准下班时间"
              >
                <RotateCcw class="w-3 h-3" />
                <span>标准</span>
              </button>
            </div>
          </div>

          <!-- Notion Callout 风格工时与加班计算卡片 -->
          <div
            v-if="calcResult && clockIn && clockOut"
            class="p-3 rounded-md text-xs space-y-1 border-l-3"
            :class="[
              calcResult.finalOvertimeHours > 0
                ? 'bg-[#f4f0f7]/70 dark:bg-[#2b2438]/40 border-[#6940a5] text-[#37352f] dark:text-[#e3e2de]'
                : 'bg-[#f7f6f3] dark:bg-[#252525] border-[#787774] text-[#787774] dark:text-[#9b9a97]'
            ]"
          >
            <div class="flex items-center justify-between font-medium">
              <span>在岗工时 {{ calcResult.workHours }}h</span>
              <span
                class="font-semibold text-xs sm:text-sm font-mono"
                :class="calcResult.finalOvertimeHours > 0 ? 'text-[#6940a5] dark:text-[#9a6dd7]' : 'text-[#787774]'"
              >
                加班 +{{ calcResult.finalOvertimeHours }}h
              </span>
            </div>
            <div v-if="calcResult.deductedMealHours > 0" class="text-[#d9730d] dark:text-[#df8b39] flex justify-between">
              <span>已扣除用餐 ({{ calcResult.deductedDetails.map(d => d.name).join('/') }})</span>
              <span>-{{ calcResult.deductedMealHours }}h</span>
            </div>
            <p class="text-[11px] text-[#787774] dark:text-[#9b9a97] pt-0.5">
              {{ calcResult.summary }}
            </p>
          </div>
        </div>

        <!-- 节假日覆盖 -->
        <div>
          <label class="block text-xs font-medium text-[#787774] dark:text-[#9b9a97] mb-1">
            日历属性覆盖
          </label>
          <select
            v-model="customHolidayType"
            class="w-full px-2.5 py-1.5 rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-xs text-[#37352f] dark:text-[#e3e2de] focus:outline-none focus:border-[#6940a5]"
          >
            <option :value="null">默认自动识别 ({{ holidayInfo.name }})</option>
            <option value="holiday">覆盖为：节假日 / 休息日</option>
            <option value="workday">覆盖为：调休 / 工作日</option>
          </select>
        </div>

        <!-- 备注：Notion Block 纯净文本框 -->
        <div>
          <label class="block text-xs font-medium text-[#787774] dark:text-[#9b9a97] mb-1">备注说明</label>
          <input
            v-model="note"
            placeholder="添加详细说明..."
            class="w-full px-3 py-1.5 text-xs sm:text-sm rounded border border-[#e9e9e7] dark:border-[#2f3437] bg-white dark:bg-[#252525] text-[#37352f] dark:text-[#e3e2de] placeholder-[#9b9a97] focus:outline-none focus:border-[#6940a5]"
          />
        </div>
      </div>

      <!-- 底部操作按钮：Notion 对话框底栏 -->
      <div class="px-5 py-3 bg-[#fbfbfa] dark:bg-[#252525] border-t border-[#e9e9e7] dark:border-[#2f3437] flex items-center justify-between">
        <div>
          <button
            v-if="initialRecord"
            @click="handleDelete"
            type="button"
            class="flex items-center gap-1 px-2 py-1 text-xs text-[#e03e3e] dark:text-[#eb5757] hover:bg-[#fbe4e4] dark:hover:bg-[#3c2121] rounded transition-colors"
          >
            <Trash2 class="w-3.5 h-3.5" :stroke-width="1.75" />
            <span>删除记录</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="emit('close')"
            type="button"
            class="px-3 py-1 text-xs font-normal text-[#787774] hover:text-[#37352f] dark:text-[#9b9a97] dark:hover:text-[#e3e2de] hover:bg-[#ebeae5] dark:hover:bg-[#2d2d2d] rounded transition-colors"
          >
            取消
          </button>
          <button
            @click="handleSave"
            type="button"
            class="flex items-center gap-1 px-3.5 py-1 text-xs font-medium text-white bg-[#37352f] dark:bg-[#e3e2de] dark:text-[#191919] hover:bg-[#232320] rounded transition-colors"
          >
            <Check class="w-3.5 h-3.5" :stroke-width="2" />
            <span>保存</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
