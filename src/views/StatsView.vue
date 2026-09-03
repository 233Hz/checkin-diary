<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import {
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next';
import type { AttendanceSettings, DailyRecord } from '../types/attendance';
import { getMonthlyStats, getAnnualStats } from '../services/statsService';

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
