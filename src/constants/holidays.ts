/**
 * 中国法定节假日及调休补班数据字典 (2023 - 2026)
 * holiday: true 表示节假日（放假）
 * holiday: false 表示调休工作日（虽为周末但需上班）
 */
export interface RawHolidayItem {
  name: string;
  holiday: boolean;
}

export const HOLIDAY_DATABASE: Record<string, RawHolidayItem> = {
  // ================= 2023 =================
  "2023-01-01": { name: "元旦", holiday: true },
  "2023-01-02": { name: "元旦", holiday: true },
  "2023-01-21": { name: "除夕", holiday: true },
  "2023-01-22": { name: "春节", holiday: true },
  "2023-01-23": { name: "春节", holiday: true },
  "2023-01-24": { name: "春节", holiday: true },
  "2023-01-25": { name: "春节", holiday: true },
  "2023-01-26": { name: "春节", holiday: true },
  "2023-01-27": { name: "春节", holiday: true },
  "2023-01-28": { name: "春节补班", holiday: false },
  "2023-01-29": { name: "春节补班", holiday: false },
  "2023-04-05": { name: "清明节", holiday: true },
  "2023-04-23": { name: "劳动节补班", holiday: false },
  "2023-04-29": { name: "劳动节", holiday: true },
  "2023-04-30": { name: "劳动节", holiday: true },
  "2023-05-01": { name: "劳动节", holiday: true },
  "2023-05-02": { name: "劳动节", holiday: true },
  "2023-05-03": { name: "劳动节", holiday: true },
  "2023-05-06": { name: "劳动节补班", holiday: false },
  "2023-06-22": { name: "端午节", holiday: true },
  "2023-06-23": { name: "端午节", holiday: true },
  "2023-06-24": { name: "端午节", holiday: true },
  "2023-06-25": { name: "端午补班", holiday: false },
  "2023-09-29": { name: "中秋节", holiday: true },
  "2023-09-30": { name: "国庆节", holiday: true },
  "2023-10-01": { name: "国庆节", holiday: true },
  "2023-10-02": { name: "国庆节", holiday: true },
  "2023-10-03": { name: "国庆节", holiday: true },
  "2023-10-04": { name: "国庆节", holiday: true },
  "2023-10-05": { name: "国庆节", holiday: true },
  "2023-10-06": { name: "国庆节", holiday: true },
  "2023-10-07": { name: "国庆补班", holiday: false },
  "2023-10-08": { name: "国庆补班", holiday: false },

  // ================= 2024 =================
  "2024-01-01": { name: "元旦", holiday: true },
  "2024-02-04": { name: "春节补班", holiday: false },
  "2024-02-10": { name: "春节", holiday: true },
  "2024-02-11": { name: "春节", holiday: true },
  "2024-02-12": { name: "春节", holiday: true },
  "2024-02-13": { name: "春节", holiday: true },
  "2024-02-14": { name: "春节", holiday: true },
  "2024-02-15": { name: "春节", holiday: true },
  "2024-02-16": { name: "春节", holiday: true },
  "2024-02-17": { name: "春节", holiday: true },
  "2024-02-18": { name: "春节补班", holiday: false },
  "2024-04-04": { name: "清明节", holiday: true },
  "2024-04-05": { name: "清明节", holiday: true },
  "2024-04-06": { name: "清明节", holiday: true },
  "2024-04-07": { name: "清明补班", holiday: false },
  "2024-04-28": { name: "劳动节补班", holiday: false },
  "2024-05-01": { name: "劳动节", holiday: true },
  "2024-05-02": { name: "劳动节", holiday: true },
  "2024-05-03": { name: "劳动节", holiday: true },
  "2024-05-04": { name: "劳动节", holiday: true },
  "2024-05-05": { name: "劳动节", holiday: true },
  "2024-05-11": { name: "劳动节补班", holiday: false },
  "2024-06-10": { name: "端午节", holiday: true },
  "2024-09-14": { name: "中秋补班", holiday: false },
  "2024-09-15": { name: "中秋节", holiday: true },
  "2024-09-16": { name: "中秋节", holiday: true },
  "2024-09-17": { name: "中秋节", holiday: true },
  "2024-09-29": { name: "国庆补班", holiday: false },
  "2024-10-01": { name: "国庆节", holiday: true },
  "2024-10-02": { name: "国庆节", holiday: true },
  "2024-10-03": { name: "国庆节", holiday: true },
  "2024-10-04": { name: "国庆节", holiday: true },
  "2024-10-05": { name: "国庆节", holiday: true },
  "2024-10-06": { name: "国庆节", holiday: true },
  "2024-10-07": { name: "国庆节", holiday: true },
  "2024-10-12": { name: "国庆补班", holiday: false },

  // ================= 2025 =================
  "2025-01-01": { name: "元旦", holiday: true },
  "2025-01-26": { name: "春节补班", holiday: false },
  "2025-01-28": { name: "除夕", holiday: true },
  "2025-01-29": { name: "春节", holiday: true },
  "2025-01-30": { name: "春节", holiday: true },
  "2025-01-31": { name: "春节", holiday: true },
  "2025-02-01": { name: "春节", holiday: true },
  "2025-02-02": { name: "春节", holiday: true },
  "2025-02-03": { name: "春节", holiday: true },
  "2025-02-04": { name: "春节", holiday: true },
  "2025-02-08": { name: "春节补班", holiday: false },
  "2025-04-04": { name: "清明节", holiday: true },
  "2025-04-05": { name: "清明节", holiday: true },
  "2025-04-06": { name: "清明节", holiday: true },
  "2025-04-27": { name: "劳动节补班", holiday: false },
  "2025-05-01": { name: "劳动节", holiday: true },
  "2025-05-02": { name: "劳动节", holiday: true },
  "2025-05-03": { name: "劳动节", holiday: true },
  "2025-05-04": { name: "劳动节", holiday: true },
  "2025-05-05": { name: "劳动节", holiday: true },
  "2025-05-31": { name: "端午节", holiday: true },
  "2025-06-01": { name: "端午节", holiday: true },
  "2025-06-02": { name: "端午节", holiday: true },
  "2025-09-28": { name: "国庆补班", holiday: false },
  "2025-10-01": { name: "国庆中秋", holiday: true },
  "2025-10-02": { name: "国庆中秋", holiday: true },
  "2025-10-03": { name: "国庆中秋", holiday: true },
  "2025-10-04": { name: "国庆中秋", holiday: true },
  "2025-10-05": { name: "国庆中秋", holiday: true },
  "2025-10-06": { name: "国庆中秋", holiday: true },
  "2025-10-07": { name: "国庆中秋", holiday: true },
  "2025-10-08": { name: "国庆中秋", holiday: true },
  "2025-10-11": { name: "国庆补班", holiday: false },

  // ================= 2026 =================
  "2026-01-01": { name: "元旦", holiday: true },
  "2026-01-02": { name: "元旦", holiday: true },
  "2026-01-03": { name: "元旦", holiday: true },
  "2026-01-04": { name: "元旦补班", holiday: false },
  "2026-02-14": { name: "春节补班", holiday: false },
  "2026-02-16": { name: "除夕", holiday: true },
  "2026-02-17": { name: "春节", holiday: true },
  "2026-02-18": { name: "春节", holiday: true },
  "2026-02-19": { name: "春节", holiday: true },
  "2026-02-20": { name: "春节", holiday: true },
  "2026-02-21": { name: "春节", holiday: true },
  "2026-02-22": { name: "春节", holiday: true },
  "2026-02-23": { name: "春节", holiday: true },
  "2026-02-28": { name: "春节补班", holiday: false },
  "2026-04-04": { name: "清明节", holiday: true },
  "2026-04-05": { name: "清明节", holiday: true },
  "2026-04-06": { name: "清明节", holiday: true },
  "2026-04-26": { name: "劳动节补班", holiday: false },
  "2026-05-01": { name: "劳动节", holiday: true },
  "2026-05-02": { name: "劳动节", holiday: true },
  "2026-05-03": { name: "劳动节", holiday: true },
  "2026-05-04": { name: "劳动节", holiday: true },
  "2026-05-05": { name: "劳动节", holiday: true },
  "2026-05-09": { name: "劳动节补班", holiday: false },
  "2026-06-19": { name: "端午节", holiday: true },
  "2026-06-20": { name: "端午节", holiday: true },
  "2026-06-21": { name: "端午节", holiday: true },
  "2026-09-25": { name: "中秋节", holiday: true },
  "2026-09-26": { name: "中秋节", holiday: true },
  "2026-09-27": { name: "国庆补班", holiday: false },
  "2026-10-01": { name: "国庆节", holiday: true },
  "2026-10-02": { name: "国庆节", holiday: true },
  "2026-10-03": { name: "国庆节", holiday: true },
  "2026-10-04": { name: "国庆节", holiday: true },
  "2026-10-05": { name: "国庆节", holiday: true },
  "2026-10-06": { name: "国庆节", holiday: true },
  "2026-10-07": { name: "国庆节", holiday: true },
  "2026-10-10": { name: "国庆补班", holiday: false },
};

/**
 * 获取指定年份的官方默认节假日与调休补班数据
 */
export function getDefaultHolidaysForYear(year: number): Record<string, { name: string; isHoliday: boolean }> {
  const result: Record<string, { name: string; isHoliday: boolean }> = {};
  const prefix = `${year}-`;
  for (const date in HOLIDAY_DATABASE) {
    if (date.startsWith(prefix)) {
      result[date] = {
        name: HOLIDAY_DATABASE[date].name,
        isHoliday: HOLIDAY_DATABASE[date].holiday,
      };
    }
  }
  return result;
}

/**
 * 获取全部已内置年份的官方默认节假日数据字典
 */
export function getAllDefaultHolidays(): Record<string, { name: string; isHoliday: boolean }> {
  const result: Record<string, { name: string; isHoliday: boolean }> = {};
  for (const date in HOLIDAY_DATABASE) {
    result[date] = {
      name: HOLIDAY_DATABASE[date].name,
      isHoliday: HOLIDAY_DATABASE[date].holiday,
    };
  }
  return result;
}
