<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import {
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Calculator
} from 'lucide-vue-next';
import type { AttendanceSettings, DailyRecord } from '../types/attendance';
import { getMonthlyStats, getAnnualStats } from '../services/statsService';
import { calculateMonthlySalary, formatMoney } from '../services/salaryService';

const props = defineProps<{
  settings: AttendanceSettings;
  records: Record<string, DailyRecord>;
}>();

const mode = ref<'month' | 'year'>('month');

const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);

// 图表容器 DOM
const chartContainer = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

// 月度统计
const monthlyData = computed(() => {
  return getMonthlyStats(selectedYear.value, selectedMonth.value, props.records, props.settings);
});

// 月度薪资计算
const monthlySalary = computed(() => {
  return calculateMonthlySalary(monthlyData.value, props.settings.salary);
});

// 年度统计
const annualData = computed(() => {
  return getAnnualStats(selectedYear.value, props.records, props.settings);
});

function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

function initOrUpdateChart() {
  nextTick(() => {
    if (!chartContainer.value) return;

    if (!chartInstance) {
      chartInstance = echarts.init(chartContainer.value);
    }

    const dark = isDarkMode();
    const textColor = dark ? '#9b9a97' : '#787774';
    const splitLineColor = dark ? '#2a2a2a' : '#f0efeb';
    const primaryColor = dark ? '#9a6dd7' : '#6940a5';

    if (mode.value === 'month') {
      // 每日加班时长折线图：Notion 墨水纸质风格
      const days = monthlyData.value.dailyOvertime.map((d) => `${d.day}日`);
      const values = monthlyData.value.dailyOvertime.map((d) => d.hours);

      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        title: {
          text: `${selectedYear.value}年${selectedMonth.value}月 每日加班工时 (h)`,
          textStyle: {
            fontSize: 12,
            fontWeight: 500,
            color: dark ? '#e3e2de' : '#37352f',
          },
          left: 0,
          top: 0,
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: dark ? '#252525' : '#ffffff',
          borderColor: dark ? '#383838' : '#e9e9e7',
          borderWidth: 1,
          padding: [6, 10],
          textStyle: {
            color: dark ? '#e3e2de' : '#37352f',
            fontSize: 12,
          },
          formatter: (params: any) => {
            const item = params[0];
            const dataPoint = monthlyData.value.dailyOvertime[item.dataIndex];
            return `
              <div class="font-sans text-xs leading-relaxed">
                <div class="text-[#787774] dark:text-[#9b9a97]">${dataPoint.date}</div>
                <div>加班时长: <b class="text-[#6940a5] dark:text-[#9a6dd7] font-mono">${dataPoint.hours}h</b></div>
              </div>
            `;
          },
        },
        grid: {
          left: '1%',
          right: '3%',
          bottom: '3%',
          top: '18%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: days,
          boundaryGap: false,
          axisLine: { lineStyle: { color: dark ? '#2f3437' : '#e9e9e7' } },
          axisLabel: { color: textColor, fontSize: 10 },
        },
        yAxis: {
          type: 'value',
          name: '小时',
          nameTextStyle: { color: textColor, fontSize: 10 },
          axisLabel: { color: textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        },
        series: [
          {
            name: '加班时长',
            type: 'line',
            data: values,
            smooth: 0.35,
            symbol: 'circle',
            symbolSize: 4,
            itemStyle: {
              color: primaryColor,
            },
            lineStyle: {
              width: 2,
              color: primaryColor,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: dark ? 'rgba(154, 109, 215, 0.22)' : 'rgba(105, 64, 165, 0.16)' },
                { offset: 1, color: 'rgba(105, 64, 165, 0.0)' },
              ]),
            },
            markLine: {
              data: [{ type: 'average', name: '日均值' }],
              lineStyle: { type: 'dashed', color: dark ? '#df8b39' : '#d9730d', width: 1 },
              label: { color: dark ? '#df8b39' : '#d9730d', fontSize: 10, formatter: '均值: {c}h' },
            },
          },
        ],
      };

      chartInstance.setOption(option, true);
    } else {
      // 1-12月每月加班工时
      const months = annualData.value.monthlyOvertime.map((m) => `${m.month}月`);
      const values = annualData.value.monthlyOvertime.map((m) => m.hours);

      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        title: {
          text: `${selectedYear.value}年 每月加班工时统计 (h)`,
          textStyle: {
            fontSize: 12,
            fontWeight: 500,
            color: dark ? '#e3e2de' : '#37352f',
          },
          left: 0,
          top: 0,
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: dark ? '#252525' : '#ffffff',
          borderColor: dark ? '#383838' : '#e9e9e7',
          borderWidth: 1,
          padding: [6, 10],
          textStyle: {
            color: dark ? '#e3e2de' : '#37352f',
            fontSize: 12,
          },
          formatter: (params: any) => {
            const item = params[0];
            return `
              <div class="font-sans text-xs leading-relaxed">
                <div class="text-[#787774] dark:text-[#9b9a97]">${selectedYear.value}年 ${item.name}</div>
                <div>月加班合计: <b class="text-[#6940a5] dark:text-[#9a6dd7] font-mono">${item.value}h</b></div>
              </div>
            `;
          },
        },
        grid: {
          left: '1%',
          right: '3%',
          bottom: '3%',
          top: '18%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: months,
          axisLine: { lineStyle: { color: dark ? '#2f3437' : '#e9e9e7' } },
          axisLabel: { color: textColor, fontSize: 10 },
        },
        yAxis: {
          type: 'value',
          name: '小时',
          nameTextStyle: { color: textColor, fontSize: 10 },
          axisLabel: { color: textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        },
        series: [
          {
            name: '月加班',
            type: 'bar',
            data: values,
            barWidth: '32%',
            itemStyle: {
              color: dark ? '#529cca' : '#9bbbd4',
              borderRadius: [3, 3, 0, 0],
            },
          },
          {
            name: '趋势折线',
            type: 'line',
            data: values,
            smooth: 0.35,
            itemStyle: { color: primaryColor },
            lineStyle: { width: 2, color: primaryColor },
            markPoint: {
              data: [{ type: 'max', name: '最高月份' }],
              itemStyle: { color: dark ? '#eb5757' : '#e03e3e' },
              label: { fontSize: 9 },
            },
          },
        ],
      };

      chartInstance.setOption(option, true);
    }
  });
}

function handleResize() {
  chartInstance?.resize();
}

watch([mode, selectedYear, selectedMonth, () => props.records, () => props.settings], () => {
  initOrUpdateChart();
});

const observer = new MutationObserver(() => {
  initOrUpdateChart();
});

onMounted(() => {
  initOrUpdateChart();
  window.addEventListener('resize', handleResize);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  observer.disconnect();
  chartInstance?.dispose();
});

function prevPeriod() {
  if (mode.value === 'month') {
    if (selectedMonth.value === 1) {
      selectedMonth.value = 12;
      selectedYear.value--;
    } else {
      selectedMonth.value--;
    }
  } else {
    selectedYear.value--;
  }
}

function nextPeriod() {
  if (mode.value === 'month') {
    if (selectedMonth.value === 12) {
      selectedMonth.value = 1;
      selectedYear.value++;
    } else {
      selectedMonth.value++;
    }
  } else {
    selectedYear.value++;
  }
}
</script>

<template>
  <div class="space-y-3 pb-12">
    <!-- Notion 风格筛选器与模式切换 -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 py-1">
      <!-- 维度切换：月度 vs 年度 (Notion Pill Tabs) -->
      <div class="flex items-center gap-0.5 bg-[#ebeae5] dark:bg-[#252525] p-0.5 rounded-md border border-[#e2e1dd] dark:border-[#2f3437] w-fit">
        <button
          type="button"
          @click="mode = 'month'"
          class="px-3 py-1 rounded text-xs font-medium transition-colors"
          :class="[
            mode === 'month'
              ? 'bg-white dark:bg-[#2f3437] text-[#37352f] dark:text-[#e3e2de] shadow-2xs font-semibold'
              : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e3e2de]'
          ]"
        >
          月度明细
        </button>
        <button
          type="button"
          @click="mode = 'year'"
          class="px-3 py-1 rounded text-xs font-medium transition-colors"
          :class="[
            mode === 'year'
              ? 'bg-white dark:bg-[#2f3437] text-[#37352f] dark:text-[#e3e2de] shadow-2xs font-semibold'
              : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e3e2de]'
          ]"
        >
          年度趋势
        </button>
      </div>

      <!-- 年月控制器 -->
      <div class="flex items-center gap-1">
        <div class="flex items-center border border-[#e9e9e7] dark:border-[#2f3437] rounded-md bg-white dark:bg-[#202020] p-0.5 shadow-2xs">
          <button
            @click="prevPeriod"
            type="button"
            class="p-1 rounded text-[#787774] hover:text-[#37352f] dark:text-[#9b9a97] dark:hover:text-[#e3e2de] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a] transition-colors"
          >
            <ChevronLeft class="w-3.5 h-3.5" :stroke-width="1.75" />
          </button>
          <span class="text-xs font-medium text-[#37352f] dark:text-[#e3e2de] px-2 font-mono">
            {{ selectedYear }} 年 {{ mode === 'month' ? `${selectedMonth} 月` : '全年' }}
          </span>
          <button
            @click="nextPeriod"
            type="button"
            class="p-1 rounded text-[#787774] hover:text-[#37352f] dark:text-[#9b9a97] dark:hover:text-[#e3e2de] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a] transition-colors"
          >
            <ChevronRight class="w-3.5 h-3.5" :stroke-width="1.75" />
          </button>
        </div>
      </div>
    </div>

    <!-- Notion 莫兰迪属性汇总卡片 (Callout Metrics) -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
      <!-- 加班总时长 (Notion Purple) -->
      <div class="p-3 rounded-lg bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-normal text-[#787774] dark:text-[#9b9a97]">加班工时</span>
          <span class="w-2 h-2 rounded-full bg-[#6940a5]"></span>
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-semibold font-mono text-[#6940a5] dark:text-[#9a6dd7]">
            {{ mode === 'month' ? monthlyData.totalOvertimeHours : annualData.totalOvertimeHours }}
          </span>
          <span class="text-xs text-[#9b9a97]">h</span>
        </div>
        <p class="text-[10px] text-[#9b9a97] mt-0.5">
          {{ mode === 'month' ? `${selectedMonth}月累计` : `${selectedYear}年累计` }}
        </p>
      </div>

      <!-- 实际出勤天数 (Notion Green) -->
      <div class="p-3 rounded-lg bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-normal text-[#787774] dark:text-[#9b9a97]">出勤天数</span>
          <span class="w-2 h-2 rounded-full bg-[#448361]"></span>
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-semibold font-mono text-[#448361] dark:text-[#4d9375]">
            {{ monthlyData.actualWorkDays }}
          </span>
          <span class="text-xs text-[#9b9a97]">天</span>
        </div>
        <p class="text-[10px] text-[#9b9a97] mt-0.5">默认正常8h</p>
      </div>

      <!-- 缺勤天数 (Notion Red) -->
      <div class="p-3 rounded-lg bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-normal text-[#787774] dark:text-[#9b9a97]">缺勤记录</span>
          <span class="w-2 h-2 rounded-full bg-[#e03e3e]"></span>
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-semibold font-mono text-[#e03e3e] dark:text-[#eb5757]">
            {{ mode === 'month' ? monthlyData.absentDays : annualData.absentDays }}
          </span>
          <span class="text-xs text-[#9b9a97]">天</span>
        </div>
        <p class="text-[10px] text-[#9b9a97] mt-0.5">显式标记缺勤</p>
      </div>

      <!-- 请假天数 (Notion Orange) -->
      <div class="p-3 rounded-lg bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-normal text-[#787774] dark:text-[#9b9a97]">请假记录</span>
          <span class="w-2 h-2 rounded-full bg-[#d9730d]"></span>
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-semibold font-mono text-[#d9730d] dark:text-[#df8b39]">
            {{ mode === 'month' ? monthlyData.leaveDays : annualData.leaveDays }}
          </span>
          <span class="text-xs text-[#9b9a97]">天</span>
        </div>
        <p class="text-[10px] text-[#9b9a97] mt-0.5">假期天数</p>
      </div>

      <!-- 调休天数 (Notion Yellow) -->
      <div class="p-3 rounded-lg bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-normal text-[#787774] dark:text-[#9b9a97]">调休记录</span>
          <span class="w-2 h-2 rounded-full bg-[#cb912f]"></span>
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-semibold font-mono text-[#cb912f] dark:text-[#dfab01]">
            {{ mode === 'month' ? monthlyData.compensatoryDays : annualData.compensatoryDays }}
          </span>
          <span class="text-xs text-[#9b9a97]">天</span>
        </div>
        <p class="text-[10px] text-[#9b9a97] mt-0.5">置换调休</p>
      </div>
    </div>

    <!-- 月度薪资核算区块 (Notion Section) -->
    <div
      v-if="mode === 'month'"
      class="bg-white dark:bg-[#202020] p-4 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] space-y-3.5 shadow-2xs"
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#e9e9e7] dark:border-[#2f3437] gap-1.5">
        <div class="flex items-center gap-2">
          <Calculator class="w-4 h-4 text-[#6940a5] dark:text-[#9a6dd7]" :stroke-width="1.75" />
          <h3 class="font-medium text-[#37352f] dark:text-[#e3e2de] text-xs sm:text-sm">
            {{ selectedYear }} 年 {{ selectedMonth }} 月 薪资核算明细
          </h3>
        </div>
        <div class="text-[11px] text-[#9b9a97]">
          折算时薪: <span class="font-mono text-[#6940a5] dark:text-[#9a6dd7] font-semibold">{{ formatMoney(monthlySalary.hourlyWage) }}</span> /h
          <span class="text-[10px] ml-1">（日薪 {{ formatMoney(monthlySalary.dailyWage) }} ÷ 8）</span>
        </div>
      </div>

      <!-- 实发薪资总览卡片 (Notion Highlight Callout) -->
      <div class="p-3.5 rounded-lg bg-[#f7f6f3] dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#2f3437] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span class="text-xs font-normal text-[#787774] dark:text-[#9b9a97] block">
            本月预计实发薪资 (实发金额)
          </span>
          <div class="mt-1 flex items-baseline gap-1.5">
            <span class="text-2xl sm:text-3xl font-bold font-mono text-[#37352f] dark:text-[#e3e2de]">
              {{ formatMoney(monthlySalary.netSalary) }}
            </span>
            <span class="text-xs text-[#9b9a97]">元</span>
          </div>
          <p class="text-[11px] text-[#9b9a97] mt-0.5">
            公式：底薪 ({{ formatMoney(monthlySalary.baseSalary) }}) + 加班费 ({{ formatMoney(monthlySalary.totalOvertimePay) }}) + 杂项加项 ({{ formatMoney(monthlySalary.totalAdditions) }}) - 杂项减项 ({{ formatMoney(monthlySalary.totalDeductions) }})
          </p>
        </div>

        <!-- 4项快速汇总徽章 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div class="px-2.5 py-1.5 rounded bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437]">
            <span class="text-[10px] text-[#787774] dark:text-[#9b9a97] block">基本底薪</span>
            <span class="font-mono font-medium text-[#37352f] dark:text-[#e3e2de]">{{ formatMoney(monthlySalary.baseSalary) }}</span>
          </div>
          <div class="px-2.5 py-1.5 rounded bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437]">
            <span class="text-[10px] text-[#6940a5] dark:text-[#9a6dd7] block">加班工资</span>
            <span class="font-mono font-medium text-[#6940a5] dark:text-[#9a6dd7]">+{{ formatMoney(monthlySalary.totalOvertimePay) }}</span>
          </div>
          <div class="px-2.5 py-1.5 rounded bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437]">
            <span class="text-[10px] text-[#448361] dark:text-[#4d9375] block">杂项加项</span>
            <span class="font-mono font-medium text-[#448361] dark:text-[#4d9375]">+{{ formatMoney(monthlySalary.totalAdditions) }}</span>
          </div>
          <div class="px-2.5 py-1.5 rounded bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f3437]">
            <span class="text-[10px] text-[#e03e3e] dark:text-[#eb5757] block">杂项减项</span>
            <span class="font-mono font-medium text-[#e03e3e] dark:text-[#eb5757]">-{{ formatMoney(monthlySalary.totalDeductions) }}</span>
          </div>
        </div>
      </div>

      <!-- 详细分解网格：左侧各类加班工资、右侧杂项明细 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <!-- 左侧：加班工资拆解 -->
        <div class="p-3 rounded-md border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fafaf9] dark:bg-[#232323] space-y-2">
          <div class="flex items-center justify-between pb-1.5 border-b border-[#e9e9e7] dark:border-[#2f3437]">
            <span class="text-xs font-medium text-[#37352f] dark:text-[#e3e2de] flex items-center gap-1">
              <span>各类加班工资明细</span>
              <span class="text-[10px] text-[#9b9a97] font-normal font-mono">(累计 {{ monthlySalary.totalOvertimeHours }}h)</span>
            </span>
            <span class="text-xs font-mono font-semibold text-[#6940a5] dark:text-[#9a6dd7]">
              小计 +{{ formatMoney(monthlySalary.totalOvertimePay) }}
            </span>
          </div>

          <div class="space-y-1.5 text-xs">
            <!-- 日常加班 -->
            <div class="flex items-center justify-between py-1.5 px-2 rounded bg-white dark:bg-[#202020]">
              <div>
                <span class="font-medium text-[#37352f] dark:text-[#e3e2de]">日常加班</span>
                <span class="text-[11px] text-[#9b9a97] ml-1 font-mono">({{ monthlySalary.workdayHours }}h × {{ monthlySalary.workdayRate }}倍)</span>
              </div>
              <span class="font-mono text-[#6940a5] dark:text-[#9a6dd7] font-medium">
                +{{ formatMoney(monthlySalary.workdayPay) }}
              </span>
            </div>

            <!-- 周末加班 -->
            <div class="flex items-center justify-between py-1.5 px-2 rounded bg-white dark:bg-[#202020]">
              <div>
                <span class="font-medium text-[#37352f] dark:text-[#e3e2de]">周末加班</span>
                <span class="text-[11px] text-[#9b9a97] ml-1 font-mono">({{ monthlySalary.weekendHours }}h × {{ monthlySalary.weekendRate }}倍)</span>
              </div>
              <span class="font-mono text-[#6940a5] dark:text-[#9a6dd7] font-medium">
                +{{ formatMoney(monthlySalary.weekendPay) }}
              </span>
            </div>

            <!-- 节假日加班 -->
            <div class="flex items-center justify-between py-1.5 px-2 rounded bg-white dark:bg-[#202020]">
              <div>
                <span class="font-medium text-[#37352f] dark:text-[#e3e2de]">节假日加班</span>
                <span class="text-[11px] text-[#9b9a97] ml-1 font-mono">({{ monthlySalary.holidayHours }}h × {{ monthlySalary.holidayRate }}倍)</span>
              </div>
              <span class="font-mono text-[#6940a5] dark:text-[#9a6dd7] font-medium">
                +{{ formatMoney(monthlySalary.holidayPay) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 右侧：其他杂项明细 -->
        <div class="p-3 rounded-md border border-[#e9e9e7] dark:border-[#2f3437] bg-[#fafaf9] dark:bg-[#232323] space-y-2">
          <div class="flex items-center justify-between pb-1.5 border-b border-[#e9e9e7] dark:border-[#2f3437]">
            <span class="text-xs font-medium text-[#37352f] dark:text-[#e3e2de] flex items-center gap-1">
              <span>其他杂项明细</span>
              <span class="text-[10px] text-[#9b9a97] font-normal font-mono">({{ monthlySalary.additionItems.length + monthlySalary.deductionItems.length }} 项)</span>
            </span>
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="text-[#448361] dark:text-[#4d9375] font-medium">+{{ formatMoney(monthlySalary.totalAdditions) }}</span>
              <span class="text-[#e03e3e] dark:text-[#eb5757] font-medium">-{{ formatMoney(monthlySalary.totalDeductions) }}</span>
            </div>
          </div>

          <div v-if="monthlySalary.additionItems.length === 0 && monthlySalary.deductionItems.length === 0" class="py-4 text-center text-xs text-[#9b9a97]">
            暂无杂项配置，可在「设置」中添加餐补、全勤奖、五险一金等
          </div>

          <div v-else class="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            <!-- 加项列表 -->
            <div
              v-for="item in monthlySalary.additionItems"
              :key="item.id"
              class="flex items-center justify-between py-1 px-2 rounded bg-white dark:bg-[#202020] text-xs"
            >
              <div class="flex items-center gap-1.5">
                <span class="px-1 py-0.2 rounded text-[10px] bg-[#edf3ec] text-[#448361] dark:bg-[#203126] dark:text-[#4d9375] font-medium">加</span>
                <span class="text-[#37352f] dark:text-[#e3e2de]">{{ item.name || '未命名加项' }}</span>
              </div>
              <span class="font-mono text-[#448361] dark:text-[#4d9375] font-medium">
                +{{ formatMoney(item.amount) }}
              </span>
            </div>

            <!-- 减项列表 -->
            <div
              v-for="item in monthlySalary.deductionItems"
              :key="item.id"
              class="flex items-center justify-between py-1 px-2 rounded bg-white dark:bg-[#202020] text-xs"
            >
              <div class="flex items-center gap-1.5">
                <span class="px-1 py-0.2 rounded text-[10px] bg-[#fbe4e4] text-[#e03e3e] dark:bg-[#3c2121] dark:text-[#eb5757] font-medium">减</span>
                <span class="text-[#37352f] dark:text-[#e3e2de]">{{ item.name || '未命名减项' }}</span>
              </div>
              <span class="font-mono text-[#e03e3e] dark:text-[#eb5757] font-medium">
                -{{ formatMoney(item.amount) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notion 纸质风格折线图卡片 -->
    <div class="bg-white dark:bg-[#202020] p-4 rounded-lg border border-[#e9e9e7] dark:border-[#2f3437] shadow-2xs">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <TrendingUp class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
          <h3 class="font-medium text-[#37352f] dark:text-[#e3e2de] text-xs sm:text-sm">
            {{ mode === 'month' ? '每日加班时长折线图' : '每月加班时长折线图' }}
          </h3>
        </div>
        <span class="text-[11px] text-[#9b9a97]">触控查看数值</span>
      </div>

      <!-- 图表容器 -->
      <div ref="chartContainer" class="w-full h-64 sm:h-72"></div>
    </div>
  </div>
</template>
