import type { AttendanceSettings, DailyRecord, MonthlyStats, AnnualStats } from '../types/attendance';
import { calculateOvertime } from './calcService';
import { getHolidayInfo, parseDate } from './holidayService';

/**
 * 计算指定年月的考勤与加班统计
 */
export function getMonthlyStats(
  year: number,
  month: number, // 1-12
  records: Record<string, DailyRecord>,
  settings: AttendanceSettings
): MonthlyStats {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let totalOvertimeHours = 0;
  let workdayOvertimeHours = 0;
  let weekendOvertimeHours = 0;
  let holidayOvertimeHours = 0;
  let actualWorkDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let compensatoryDays = 0;

  const dailyOvertime: MonthlyStats['dailyOvertime'] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = parseDate(dateStr);
    const isPastOrToday = dateObj <= today;

    const r = records[dateStr];
    const holiday = getHolidayInfo(dateStr, r?.customHolidayType, settings.customHolidays);

    let otHours = 0;
    let status = r?.status;

    if (r) {
      if (r.status === 'normal') {
        actualWorkDays++;
        if (r.clockIn && r.clockOut) {
          const otRes = calculateOvertime(r.clockIn, r.clockOut, r.isNextDayOut, !holiday.isWorkday, settings);
          otHours = otRes.finalOvertimeHours;
          totalOvertimeHours += otHours;
          if (otHours > 0) {
            if (holiday.type === 'statutory_holiday') {
              holidayOvertimeHours += otHours;
            } else if (holiday.type === 'weekend') {
              weekendOvertimeHours += otHours;
            } else {
              workdayOvertimeHours += otHours;
            }
          }
        }
      } else if (r.status === 'absent') {
        absentDays++;
      } else if (r.status === 'leave') {
        leaveDays++;
      } else if (r.status === 'compensatory') {
        compensatoryDays++;
      }
    } else {
      // 若无打卡记录，按需求全部默认正常8小时出勤
      if (holiday.isWorkday) {
        if (isPastOrToday) {
          actualWorkDays++;
        }
        status = 'normal';
      } else {
        status = 'rest';
      }
    }

    dailyOvertime.push({
      date: dateStr,
      day: d,
      hours: otHours,
      status: status || 'normal',
    });
  }

  return {
    year,
    month,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    workdayOvertimeHours: Math.round(workdayOvertimeHours * 100) / 100,
    weekendOvertimeHours: Math.round(weekendOvertimeHours * 100) / 100,
    holidayOvertimeHours: Math.round(holidayOvertimeHours * 100) / 100,
    actualWorkDays,
    absentDays,
    leaveDays,
    compensatoryDays,
    dailyOvertime,
  };
}

/**
 * 计算整年的考勤与加班统计
 */
export function getAnnualStats(
  year: number,
  records: Record<string, DailyRecord>,
  settings: AttendanceSettings
): AnnualStats {
  let totalOvertimeHours = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let compensatoryDays = 0;
  const monthlyOvertime: { month: number; hours: number }[] = [];

  for (let m = 1; m <= 12; m++) {
    const mStats = getMonthlyStats(year, m, records, settings);
    totalOvertimeHours += mStats.totalOvertimeHours;
    absentDays += mStats.absentDays;
    leaveDays += mStats.leaveDays;
    compensatoryDays += mStats.compensatoryDays;
    monthlyOvertime.push({
      month: m,
      hours: mStats.totalOvertimeHours,
    });
  }

  return {
    year,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    absentDays,
    leaveDays,
    compensatoryDays,
    monthlyOvertime,
  };
}
