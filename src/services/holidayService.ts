import { HOLIDAY_DATABASE } from '../constants/holidays';
import type { HolidayInfo } from '../types/attendance';

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 解析 YYYY-MM-DD 为本地 Date 对象
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 获取指定日期的节假日与工作日属性
 * 支持传入 customType 进行用户级覆盖
 */
export function getHolidayInfo(
  dateStr: string,
  customType?: 'holiday' | 'workday' | null,
  customHolidaysMap?: Record<string, { name: string; isHoliday: boolean }>
): HolidayInfo {
  const date = parseDate(dateStr);
  const dayOfWeek = date.getDay(); // 0 是周日，6 是周六
  const isWeekendNatural = dayOfWeek === 0 || dayOfWeek === 6;

  // 1. 如果有单个日期的用户自定义覆盖优先响应 (DailyRecord.customHolidayType)
  if (customType === 'workday') {
    return {
      date: dateStr,
      name: '自定义工作日',
      isHoliday: false,
      isWorkday: true,
      type: 'workday',
    };
  } else if (customType === 'holiday') {
    return {
      date: dateStr,
      name: '自定义休息日',
      isHoliday: true,
      isWorkday: false,
      type: 'statutory_holiday',
    };
  }

  // 2. 查阅设置中配置的节假日与调休数据 (customHolidaysMap)
  if (customHolidaysMap && customHolidaysMap[dateStr]) {
    const item = customHolidaysMap[dateStr];
    return {
      date: dateStr,
      name: item.name,
      isHoliday: item.isHoliday,
      isWorkday: !item.isHoliday,
      type: item.isHoliday ? 'statutory_holiday' : 'transfer_workday',
    };
  }

  // 3. 查阅内置官方节假日/调休数据库
  const item = HOLIDAY_DATABASE[dateStr];
  if (item) {
    if (item.holiday) {
      return {
        date: dateStr,
        name: item.name,
        isHoliday: true,
        isWorkday: false,
        type: 'statutory_holiday',
      };
    } else {
      return {
        date: dateStr,
        name: item.name,
        isHoliday: false,
        isWorkday: true,
        type: 'transfer_workday',
      };
    }
  }

  // 4. 常规自然周判断
  if (isWeekendNatural) {
    return {
      date: dateStr,
      name: '周末',
      isHoliday: true,
      isWorkday: false,
      type: 'weekend',
    };
  }

  return {
    date: dateStr,
    name: '工作日',
    isHoliday: false,
    isWorkday: true,
    type: 'workday',
  };
}

export interface CalendarCell {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  holidayInfo: HolidayInfo;
}

/**
 * 生成当月日历网格数据（以周一为一周起始），补充前后月份天数占位
 * @param year 年份
 * @param month 月份 (1 - 12)
 * @param customOverrides 用户自定义覆盖映射
 */
export function generateMonthCalendar(
  year: number,
  month: number,
  customOverrides: Record<string, 'holiday' | 'workday' | null> = {},
  customHolidaysMap?: Record<string, { name: string; isHoliday: boolean }>
): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const todayStr = formatDate(new Date());

  // 当月第一天
  const firstDay = new Date(year, month - 1, 1);
  // 当月天数
  const lastDay = new Date(year, month, 0);
  const totalDays = lastDay.getDate();

  // 周一为第一列，周日为第七列。getDay() 返回 0 (周日) 到 6 (周六)
  // 转换后：周一=0, 周二=1, ..., 周六=5, 周日=6
  let firstDayWeekIndex = firstDay.getDay() - 1;
  if (firstDayWeekIndex === -1) firstDayWeekIndex = 6;

  // 补齐上月剩余天数
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
  for (let i = firstDayWeekIndex - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 2, day);
    const dateStr = formatDate(prevDate);
    cells.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      holidayInfo: getHolidayInfo(dateStr, customOverrides[dateStr], customHolidaysMap),
    });
  }

  // 填充当月
  for (let d = 1; d <= totalDays; d++) {
    const currDate = new Date(year, month - 1, d);
    const dateStr = formatDate(currDate);
    cells.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      holidayInfo: getHolidayInfo(dateStr, customOverrides[dateStr], customHolidaysMap),
    });
  }

  // 补齐下月天数，保持完整的 6 行 (42格) 或 5 行 (35格)
  const remainder = cells.length % 7;
  const daysToAdd = remainder === 0 ? 0 : 7 - remainder;
  for (let d = 1; d <= daysToAdd; d++) {
    const nextDate = new Date(year, month, d);
    const dateStr = formatDate(nextDate);
    cells.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      holidayInfo: getHolidayInfo(dateStr, customOverrides[dateStr], customHolidaysMap),
    });
  }

  return cells;
}
