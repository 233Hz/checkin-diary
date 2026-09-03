import type { AttendanceSettings, OvertimeCalculationResult, RoundingType } from '../types/attendance';

/**
 * 将 HH:mm 格式时间转换为分钟数
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * 将分钟数格式化为时分文字，如 152 分钟 -> "2小时32分钟"
 */
export function formatMinutesToHM(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const remMin = m % 60;
  if (h === 0) return `${remMin}分钟`;
  if (remMin === 0) return `${h}小时`;
  return `${h}小时${remMin}分钟`;
}

/**
 * 核心加班与工时计算逻辑
 * @param clockIn 上班打卡时间 (HH:mm)
 * @param clockOut 下班打卡时间 (HH:mm)
 * @param isNextDayOut 是否跨天至次日下班（如未指定，若打卡时间小于上班或小于日界时间可自动识别）
 * @param isWeekendOrHoliday 是否为周末或法定节假日
 * @param settings 系统设置
 */
export function calculateOvertime(
  clockIn: string,
  clockOut: string,
  isNextDayOut: boolean | undefined,
  isWeekendOrHoliday: boolean,
  settings: AttendanceSettings
): OvertimeCalculationResult {
  const emptyResult: OvertimeCalculationResult = {
    workHours: 0,
    baseOvertimeHours: 0,
    deductedMealHours: 0,
    deductedDetails: [],
    rawOvertimeHours: 0,
    finalOvertimeHours: 0,
    isWeekendOrHoliday,
    summary: '暂无打卡数据',
  };

  if (!clockIn || !clockOut) {
    return emptyResult;
  }

  let inMin = timeStringToMinutes(clockIn);
  let outMin = timeStringToMinutes(clockOut);

  // 跨天判断：若明确声明 isNextDayOut，或者 outMin < inMin，或者 outMin 小于等于日界分割时间（例如 06:00），视为跨天打卡
  const cutoffMin = timeStringToMinutes(settings.dayBoundaryCutoff || '06:00');
  const actualIsNextDay =
    isNextDayOut === true ||
    (isNextDayOut === undefined && (outMin < inMin || outMin <= cutoffMin));

  if (actualIsNextDay) {
    outMin += 1440; // 加上 24 小时
  }

  // 若打卡时间无效（下班仍在上班前）
  if (outMin <= inMin) {
    return {
      ...emptyResult,
      summary: '下班时间不可早于上班时间',
    };
  }

  const totalWorkMin = outMin - inMin;
  const workHours = Math.round((totalWorkMin / 60) * 100) / 100;

  let otStartMin = 0;
  let otEndMin = 0;
  let baseOtMin = 0;

  const standardScheduleEndMin = timeStringToMinutes(settings.workSchedule.end || '18:00');

  if (isWeekendOrHoliday && settings.weekendHolidayAsOvertime) {
    // 周末/节假日：全天在岗时间均作为加班基数
    otStartMin = inMin;
    otEndMin = outMin;
    baseOtMin = totalWorkMin;
  } else {
    // 工作日：上班前早到不计加班，仅下班时间之后计算加班
    if (outMin > standardScheduleEndMin) {
      otStartMin = Math.max(inMin, standardScheduleEndMin);
      otEndMin = outMin;
      baseOtMin = Math.max(0, otEndMin - otStartMin);
    } else {
      otStartMin = 0;
      otEndMin = 0;
      baseOtMin = 0;
    }
  }

  const baseOvertimeHours = Math.round((baseOtMin / 60) * 100) / 100;

  // 用餐扣减计算（仅当开启用餐扣减且存在基础加班时段时）
  let totalMealDeductionMin = 0;
  const deductedDetails: { name: string; hours: number }[] = [];

  if (settings.enableMealDeduction && baseOtMin > 0 && Array.isArray(settings.mealIntervals)) {
    for (const meal of settings.mealIntervals) {
      const mealStart = timeStringToMinutes(meal.start);
      const mealEnd = timeStringToMinutes(meal.end);

      if (mealEnd > mealStart) {
        // 第一天常规用餐时段交集
        const overlapStart = Math.max(otStartMin, mealStart);
        const overlapEnd = Math.min(otEndMin, mealEnd);
        const overlap = Math.max(0, overlapEnd - overlapStart);

        // 如果跨天，次日的用餐时段交集也一并检测（加上 1440 分钟）
        let nextDayOverlap = 0;
        if (actualIsNextDay) {
          const nextMealStart = mealStart + 1440;
          const nextMealEnd = mealEnd + 1440;
          const nextOverlapStart = Math.max(otStartMin, nextMealStart);
          const nextOverlapEnd = Math.min(otEndMin, nextMealEnd);
          nextDayOverlap = Math.max(0, nextOverlapEnd - nextOverlapStart);
        }

        const mealTotalOverlap = overlap + nextDayOverlap;

        if (mealTotalOverlap > 0) {
          const mealHours = Math.round((mealTotalOverlap / 60) * 100) / 100;
          totalMealDeductionMin += mealTotalOverlap;
          deductedDetails.push({
            name: meal.name || '用餐',
            hours: mealHours,
          });
        }
      }
    }
  }

  // 净加班分钟数，不可小于 0
  const netOtMin = Math.max(0, baseOtMin - totalMealDeductionMin);
  const rawOvertimeHours = Math.round((netOtMin / 60) * 100) / 100;
  const deductedMealHours = Math.round((totalMealDeductionMin / 60) * 100) / 100;

  // 取整策略
  const finalOvertimeHours = applyRounding(rawOvertimeHours, settings.roundingType);

  // 构造文字说明
  let summary = '';
  if (baseOtMin === 0) {
    summary = isWeekendOrHoliday ? '出勤时长 0' : '未达到加班标准（正常上班工时内）';
  } else {
    const otType = isWeekendOrHoliday ? '非工作日出勤' : '下班后加班';
    let detailText = `${otType} ${formatMinutesToHM(baseOtMin)}`;
    if (deductedMealHours > 0) {
      const mealNames = deductedDetails.map((d) => `${d.name} ${d.hours}h`).join(', ');
      detailText += `，扣除: ${mealNames}`;
    }
    detailText += `，净加班 ${rawOvertimeHours}h`;
    if (settings.roundingType !== 'none') {
      detailText += `（取整后 ${finalOvertimeHours}h）`;
    }
    summary = detailText;
  }

  return {
    workHours,
    baseOvertimeHours,
    deductedMealHours,
    deductedDetails,
    rawOvertimeHours,
    finalOvertimeHours,
    isWeekendOrHoliday,
    summary,
  };
}

/**
 * 执行取整规则
 */
export function applyRounding(hours: number, roundingType: RoundingType): number {
  if (hours <= 0) return 0;

  switch (roundingType) {
    case 'floor_int':
      return Math.floor(hours);
    case 'floor_half':
      return Math.floor(hours * 2) / 2;
    case 'none':
    default:
      return Math.round(hours * 100) / 100;
  }
}
