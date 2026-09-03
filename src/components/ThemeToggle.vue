<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Sun, Moon, Monitor } from 'lucide-vue-next';
import { getSettings, saveSettings } from '../services/storageService';

const currentTheme = ref<'light' | 'dark' | 'system'>('system');

function applyTheme(theme: 'light' | 'dark' | 'system') {
  currentTheme.value = theme;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  const settings = getSettings();
  settings.theme = theme;
  saveSettings(settings);
}

function cycleTheme() {
  if (currentTheme.value === 'system') applyTheme('dark');
  else if (currentTheme.value === 'dark') applyTheme('light');
  else applyTheme('system');
}

onMounted(() => {
  const settings = getSettings();
  currentTheme.value = settings.theme || 'system';
  applyTheme(currentTheme.value);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentTheme.value === 'system') {
      applyTheme('system');
    }
  });
});
</script>

<template>
  <button
    @click="cycleTheme"
    type="button"
    class="p-1.5 rounded-md text-[#787774] hover:text-[#37352f] dark:text-[#9b9a97] dark:hover:text-[#e3e2de] hover:bg-[#ebeae5] dark:hover:bg-[#252525] transition-colors"
    :title="`主题模式: ${currentTheme === 'system' ? '跟随系统' : currentTheme === 'dark' ? '深色' : '浅色'}`"
  >
    <Sun v-if="currentTheme === 'light'" class="w-4 h-4 text-[#cb912f]" :stroke-width="1.75" />
    <Moon v-else-if="currentTheme === 'dark'" class="w-4 h-4 text-[#9a6dd7]" :stroke-width="1.75" />
    <Monitor v-else class="w-4 h-4" :stroke-width="1.75" />
  </button>
</template>
