<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { AttendanceSettings, DailyRecord } from './types/attendance';
import {
  getSettings,
  saveSettings,
  getRecords,
  saveRecord,
  saveRecords,
  deleteRecord as removeRecordStorage,
} from './services/storageService';
import Navigation from './components/Navigation.vue';
import CalendarView from './views/CalendarView.vue';
import StatsView from './views/StatsView.vue';
import SettingsView from './views/SettingsView.vue';

const activeTab = ref<'calendar' | 'stats' | 'settings'>('calendar');
const settingsViewRef = ref<{
  hasUnsavedChanges?: boolean;
  discardChanges?: () => void;
  saveChanges?: () => void;
} | null>(null);

const settings = ref<AttendanceSettings>(getSettings());
const records = ref<Record<string, DailyRecord>>({});

function loadAllData() {
  settings.value = getSettings();
  records.value = getRecords();
}

function handleTabChange(targetTab: 'calendar' | 'stats' | 'settings') {
  if (activeTab.value === targetTab) return;
  if (activeTab.value === 'settings' && settingsViewRef.value?.hasUnsavedChanges) {
    const confirmLeave = confirm('您在设置页面有未保存的修改，离开将放弃草稿并恢复为上次已保存的设置。确定要离开吗？');
    if (confirmLeave) {
      settingsViewRef.value?.discardChanges?.();
      activeTab.value = targetTab;
    }
    return;
  }
  activeTab.value = targetTab;
}

function handleSaveRecord(record: DailyRecord) {
  saveRecord(record);
  records.value[record.date] = record;
  // 触发响应式更新
  records.value = { ...records.value };
}

function handleDeleteRecord(dateStr: string) {
  removeRecordStorage(dateStr);
  delete records.value[dateStr];
  records.value = { ...records.value };
}

function handleImportRecords(imported: DailyRecord[]) {
  saveRecords(imported);
  loadAllData();
}

function handleUpdateSettings(newSettings: AttendanceSettings) {
  settings.value = newSettings;
  saveSettings(newSettings);
}

onMounted(() => {
  loadAllData();
  window.addEventListener('beforeunload', (e) => {
    if (settingsViewRef.value?.hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#f7f6f3] text-[#37352f] dark:bg-[#191919] dark:text-[#e3e2de] transition-colors font-sans">
    <!-- 导航栏组件（自动适配桌面端顶部与移动端底部） -->
    <Navigation
      :active-tab="activeTab"
      @update:active-tab="handleTabChange"
    />

    <!-- 主体内容容器 -->
    <main class="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6">
      <Transition name="fade" mode="out-in">
        <KeepAlive>
          <CalendarView
            v-if="activeTab === 'calendar'"
            :settings="settings"
            :records="records"
            @save-record="handleSaveRecord"
            @delete-record="handleDeleteRecord"
            @import-records="handleImportRecords"
          />
          <StatsView
            v-else-if="activeTab === 'stats'"
            :settings="settings"
            :records="records"
          />
          <SettingsView
            ref="settingsViewRef"
            v-else-if="activeTab === 'settings'"
            :settings="settings"
            :records="records"
            @update-settings="handleUpdateSettings"
            @refresh-data="loadAllData"
          />
        </KeepAlive>
      </Transition>
    </main>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
