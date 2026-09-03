export type AttendanceStatus = 'normal' | 'absent' | 'leave' | 'compensatory' | 'rest';

export type RoundingType = 'floor_int' | 'floor_half' | 'none';

export interface MealInterval {
  id: string;
  name: string;
  start: string; // "12:00"
  end: string;   // "13:00"
}

export interface CustomHolidayItem {
  name: string;
  isHoliday: boolean; // true: 放假, false: 调休补班
}

export interface SalaryItem {
  id: string;
  name: string;
  type: 'addition' | 'deduction'; // 加项 / 减项
  amount: number;
}

export interface SalarySettings {
  baseSalary: number; // 底薪
  calculationCoefficient: number; // 计算系数，默认 21.75
  overtimeRates: {
    workday: number; // 日常加班倍数，默认 1.5
    weekend: number; // 周末加班倍数，默认 2.0
    holiday: number; // 节假日加班倍数，默认 3.0
  };
  otherItems: SalaryItem[]; // 杂项加减项列表
}

export interface AttendanceSettings {
  workSchedule: {
    start: string; // "09:00"
    end: string;   // "18:00"
  };
  dayBoundaryCutoff: string; // "06:00" 次日凌晨此时间之前下班仍算作前一天
  enableMealDeduction: boolean;
  mealIntervals: MealInterval[];
  roundingType: RoundingType;
  weekendHolidayAsOvertime: boolean; // 周末/节假日出勤全额计为加班
  theme: 'light' | 'dark' | 'system';
  customHolidays?: Record<string, CustomHolidayItem>; // 用户自定义/官方内置的节假日与调休配置
  salary?: SalarySettings; // 薪资配置
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  clockIn: string; // HH:mm
  clockOut: string; // HH:mm
  isNextDayOut?: boolean; // 是否跨天至次日下班
  status: AttendanceStatus;
  note?: string;
  customHolidayType?: 'holiday' | 'workday' | null; // 用户手动覆盖的节假日属性
}

export interface OvertimeCalculationResult {
  workHours: number;           // 总在岗时长 (h)
  baseOvertimeHours: number;   // 扣除用餐前的基准加班时长 (h)
  deductedMealHours: number;   // 实际扣减的用餐时长 (h)
  deductedDetails: { name: string; hours: number }[]; // 扣减明细
  rawOvertimeHours: number;    // 扣减后的未取整加班时长 (h)
  finalOvertimeHours: number;  // 最终取整后的加班时长 (h)
  isWeekendOrHoliday: boolean; // 是否按非工作日加班计算
  summary: string;             // 一句话说明，例如 "加班 2.5h (扣除晚餐 1h)"
}

export type DayType = 'workday' | 'weekend' | 'statutory_holiday' | 'transfer_workday';

export interface HolidayInfo {
  date: string; // YYYY-MM-DD
  name: string; // 如 "春节", "国庆节", "调休补班", "周末"
  isHoliday: boolean; // 是否放假
  isWorkday: boolean; // 是否需上班
  type: DayType;
}

export interface MonthlyStats {
  year: number;
  month: number; // 1-12
  totalOvertimeHours: number;
  workdayOvertimeHours: number; // 日常加班工时
  weekendOvertimeHours: number; // 周末加班工时
  holidayOvertimeHours: number; // 节假日加班工时
  actualWorkDays: number;
  absentDays: number;
  leaveDays: number;
  compensatoryDays: number;
  dailyOvertime: { date: string; day: number; hours: number; status: AttendanceStatus }[];
}

export interface AnnualStats {
  year: number;
  totalOvertimeHours: number;
  absentDays: number;
  leaveDays: number;
  compensatoryDays: number;
  monthlyOvertime: { month: number; hours: number }[];
}
