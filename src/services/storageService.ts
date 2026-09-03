import type { AttendanceSettings, DailyRecord } from '../types/attendance';
import { getAllDefaultHolidays } from '../constants/holidays';

const SETTINGS_KEY = 'checkin_diary_settings_v1';
const RECORDS_KEY = 'checkin_diary_records_v1';

export const DEFAULT_SETTINGS: AttendanceSettings = {
  workSchedule: {
    start: '09:00',
    end: '18:00',
  },
  dayBoundaryCutoff: '06:00',
  enableMealDeduction: false,
  mealIntervals: [
    { id: 'meal-1', name: '午餐', start: '12:00', end: '13:00' },
    { id: 'meal-2', name: '晚餐', start: '18:00', end: '19:00' },
  ],
  roundingType: 'floor_int',
  weekendHolidayAsOvertime: true,
  theme: 'system',
  customHolidays: getAllDefaultHolidays(),
};

export function getSettings(): AttendanceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      customHolidays: parsed.customHolidays || getAllDefaultHolidays(),
      workSchedule: {
        ...DEFAULT_SETTINGS.workSchedule,
        ...(parsed.workSchedule || {}),
      },
    };
  } catch (err) {
    console.error('Failed to load settings:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AttendanceSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function getRecords(): Record<string, DailyRecord> {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, DailyRecord>;
  } catch (err) {
    console.error('Failed to load records:', err);
    return {};
  }
}

export function getRecord(date: string): DailyRecord | undefined {
  const records = getRecords();
  return records[date];
}

export function saveRecord(record: DailyRecord): void {
  const records = getRecords();
  records[record.date] = record;
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save record:', err);
  }
}

export function saveRecords(recordsList: DailyRecord[]): void {
  const records = getRecords();
  for (const r of recordsList) {
    records[r.date] = r;
  }
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to batch save records:', err);
  }
}

export function deleteRecord(date: string): void {
  const records = getRecords();
  if (records[date]) {
    delete records[date];
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }
}

export function clearAllData(): void {
  localStorage.removeItem(RECORDS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}

export function exportDataAsJSON(): string {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    settings: getSettings(),
    records: getRecords(),
  };
  return JSON.stringify(data, null, 2);
}

export function importDataFromJSON(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.settings) {
      saveSettings(parsed.settings);
    }
    if (parsed.records && typeof parsed.records === 'object') {
      const recordsList = Object.values(parsed.records) as DailyRecord[];
      saveRecords(recordsList);
      return { success: true, count: recordsList.length };
    }
    return { success: false, count: 0, error: '无效的数据结构' };
  } catch (err) {
    return { success: false, count: 0, error: (err as Error).message };
  }
}

/**
 * 注入演示样例数据（以当月为基准填充部分考勤与加班）
 */
export function seedSampleData(): void {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const sampleRecords: DailyRecord[] = [];

  for (let d = 1; d <= Math.min(daysInMonth, 28); d++) {
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dateObj.getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // 周末偶尔加班一次
      if (d === 13 || d === 14) {
        sampleRecords.push({
          date: dateStr,
          clockIn: '10:00',
          clockOut: '17:30',
          status: 'normal',
          note: '项目紧急攻坚',
        });
      }
    } else {
      // 工作日
      if (d === 5) {
        // 请假
        sampleRecords.push({
          date: dateStr,
          clockIn: '',
          clockOut: '',
          status: 'leave',
          note: '事假半天',
        });
      } else if (d === 12) {
        // 调休
        sampleRecords.push({
          date: dateStr,
          clockIn: '',
          clockOut: '',
          status: 'compensatory',
          note: '上周六加班调休',
        });
      } else if (d === 20) {
        // 缺勤
        sampleRecords.push({
          date: dateStr,
          clockIn: '',
          clockOut: '',
          status: 'absent',
          note: '忘记打卡/未出勤',
        });
      } else {
        // 正常出勤，随机带加班
        const otRand = d % 4;
        let clockOut = '18:00';
        if (otRand === 1) clockOut = '20:30';
        else if (otRand === 2) clockOut = '21:15';
        else if (otRand === 3) clockOut = '22:00';

        sampleRecords.push({
          date: dateStr,
          clockIn: '08:45',
          clockOut,
          status: 'normal',
        });
      }
    }
  }

  saveRecords(sampleRecords);
}
