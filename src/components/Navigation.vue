<script setup lang="ts">
import { Calendar, BarChart3, Sliders, Clock } from 'lucide-vue-next';
import ThemeToggle from './ThemeToggle.vue';

defineProps<{
  activeTab: 'calendar' | 'stats' | 'settings';
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: 'calendar' | 'stats' | 'settings'): void;
}>();

const navItems = [
  { id: 'calendar', label: '日历视图', icon: Calendar },
  { id: 'stats', label: '工时统计', icon: BarChart3 },
  { id: 'settings', label: '考勤规则', icon: Sliders },
] as const;
</script>

<template>
  <!-- 桌面端顶部导航栏：Notion 极简文档纸质风 -->
  <header class="hidden md:flex sticky top-0 z-40 w-full bg-[#f7f6f3] dark:bg-[#191919] border-b border-[#e9e9e7] dark:border-[#2f3437] transition-colors">
    <div class="max-w-5xl mx-auto w-full px-6 h-12 flex items-center justify-between">
      <!-- 品牌 Logo 与标题（Notion 风格面包屑/标题） -->
      <div class="flex items-center gap-2 cursor-pointer select-none" @click="emit('update:activeTab', 'calendar')">
        <div class="w-6 h-6 rounded flex items-center justify-center text-[#37352f] dark:text-[#e3e2de] hover:bg-[#ebeae5] dark:hover:bg-[#252525] transition-colors">
          <Clock class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
        </div>
        <div class="flex items-baseline gap-2">
          <h1 class="font-semibold text-[#37352f] dark:text-[#e3e2de] text-sm tracking-tight">考勤记</h1>
          <span class="text-[11px] text-[#787774] dark:text-[#9b9a97] font-normal">/ 本地考勤与工时管理</span>
        </div>
      </div>

      <!-- 导航标签：Notion 视图切换器外观 -->
      <nav class="flex items-center gap-0.5 bg-[#ebeae5] dark:bg-[#252525] p-0.5 rounded-md border border-[#e2e1dd] dark:border-[#2f3437]">
        <button
          v-for="item in navItems"
          :key="item.id"
          @click="emit('update:activeTab', item.id)"
          type="button"
          class="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors"
          :class="[
            activeTab === item.id
              ? 'bg-white dark:bg-[#2f3437] text-[#37352f] dark:text-[#e3e2de] shadow-2xs font-semibold'
              : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#e3e2de] hover:bg-[#e4e3dd]/60 dark:hover:bg-[#2a2a2a]',
          ]"
        >
          <component :is="item.icon" class="w-3.5 h-3.5" :stroke-width="1.75" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <!-- 右侧操作区：主题切换 -->
      <div class="flex items-center gap-1.5">
        <ThemeToggle />
      </div>
    </div>
  </header>

  <!-- 移动端顶部轻量 Bar：Notion 风格 -->
  <header class="md:hidden sticky top-0 z-40 w-full bg-[#f7f6f3] dark:bg-[#191919] border-b border-[#e9e9e7] dark:border-[#2f3437] px-4 h-11 flex items-center justify-between transition-colors">
    <div class="flex items-center gap-1.5">
      <Clock class="w-4 h-4 text-[#787774] dark:text-[#9b9a97]" :stroke-width="1.75" />
      <span class="font-semibold text-[#37352f] dark:text-[#e3e2de] text-sm">考勤记</span>
    </div>
    <div class="flex items-center gap-1">
      <ThemeToggle />
    </div>
  </header>

  <!-- 移动端底部 TabBar：Notion 纸质风 -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#f7f6f3]/95 dark:bg-[#191919]/95 backdrop-blur-xs border-t border-[#e9e9e7] dark:border-[#2f3437] pb-[calc(env(safe-area-inset-bottom,0px)+3px)] pt-1.5 px-4 transition-colors">
    <div class="flex items-center justify-around">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="emit('update:activeTab', item.id)"
        type="button"
        class="flex flex-col items-center gap-1 py-1 px-4 transition-colors"
        :class="[
          activeTab === item.id
            ? 'text-[#37352f] dark:text-[#e3e2de] font-semibold'
            : 'text-[#9b9a97] dark:text-[#787774] hover:text-[#37352f] dark:hover:text-[#e3e2de]',
        ]"
      >
        <component :is="item.icon" class="w-4 h-4" :stroke-width="1.75" />
        <span class="text-[10px] leading-none">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>
