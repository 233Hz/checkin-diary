import type { SalarySettings, SalaryItem, MonthlyStats } from '../types/attendance';

export const DEFAULT_SALARY_SETTINGS: SalarySettings = {
  baseSalary: 0,
  calculationCoefficient: 21.75,
  overtimeRates: {
    workday: 1.5,
    weekend: 2.0,
    holiday: 3.0,
  },
  otherItems: [],
};

/**
 * 金额数值保留两位小数四舍五入
 */
export function roundMoney(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * 格式化金额为两位小数字符串，可带货币符号
 */
export function formatMoney(val: number, prefix: string = '¥'): string {
  const safeVal = isNaN(val) || !isFinite(val) ? 0 : val;
  const fixed = safeVal.toFixed(2);
  return `${prefix}${fixed}`;
}

/**
 * 计算日薪
 * 规则：日薪 = 底薪 ÷ 系数
 */
export function calculateDailyWage(baseSalary: number, coefficient: number): number {
  if (baseSalary <= 0 || coefficient <= 0) return 0;
  return roundMoney(baseSalary / coefficient);
}

/**
 * 计算时薪
 * 规则：时薪 = 日薪 ÷ 8
 */
export function calculateHourlyWage(dailyWage: number): number {
  if (dailyWage <= 0) return 0;
  return roundMoney(dailyWage / 8);
}

export interface SalaryBreakdown {
  baseSalary: number;
  coefficient: number;
  dailyWage: number;
  hourlyWage: number;
  // 加班拆解
  workdayHours: number;
  workdayRate: number;
  workdayPay: number;
  weekendHours: number;
  weekendRate: number;
  weekendPay: number;
  holidayHours: number;
  holidayRate: number;
  holidayPay: number;
  totalOvertimeHours: number;
  totalOvertimePay: number;
  // 其他杂项
  additionItems: SalaryItem[];
  totalAdditions: number;
  deductionItems: SalaryItem[];
  totalDeductions: number;
  // 实发金额
  netSalary: number;
}

/**
 * 计算月度薪资明细与合计
 */
export function calculateMonthlySalary(
  monthlyStats: MonthlyStats,
  salarySettings?: SalarySettings
): SalaryBreakdown {
  const settings: SalarySettings = salarySettings || DEFAULT_SALARY_SETTINGS;
  const baseSalary = Math.max(0, Number(settings.baseSalary) || 0);
  const coefficient = Math.max(0.01, Number(settings.calculationCoefficient) || 21.75);

  const dailyWage = calculateDailyWage(baseSalary, coefficient);
  const hourlyWage = calculateHourlyWage(dailyWage);

  const workdayHours = monthlyStats.workdayOvertimeHours || 0;
  const weekendHours = monthlyStats.weekendOvertimeHours || 0;
  const holidayHours = monthlyStats.holidayOvertimeHours || 0;
  const totalOvertimeHours = monthlyStats.totalOvertimeHours || 0;

  const workdayRate = Math.max(0, Number(settings.overtimeRates?.workday ?? 1.5));
  const weekendRate = Math.max(0, Number(settings.overtimeRates?.weekend ?? 2.0));
  const holidayRate = Math.max(0, Number(settings.overtimeRates?.holiday ?? 3.0));

  const workdayPay = roundMoney(workdayHours * hourlyWage * workdayRate);
  const weekendPay = roundMoney(weekendHours * hourlyWage * weekendRate);
  const holidayPay = roundMoney(holidayHours * hourlyWage * holidayRate);
  const totalOvertimePay = roundMoney(workdayPay + weekendPay + holidayPay);

  const items = Array.isArray(settings.otherItems) ? settings.otherItems : [];
  const additionItems = items.filter((i) => i.type === 'addition');
  const deductionItems = items.filter((i) => i.type === 'deduction');

  const totalAdditions = roundMoney(
    additionItems.reduce((acc, item) => acc + Math.max(0, Number(item.amount) || 0), 0)
  );
  const totalDeductions = roundMoney(
    deductionItems.reduce((acc, item) => acc + Math.max(0, Number(item.amount) || 0), 0)
  );

  // 实发金额 = 底薪 + 各类加班工资 + 杂项加项 - 杂项减项
  const netSalary = roundMoney(baseSalary + totalOvertimePay + totalAdditions - totalDeductions);

  return {
    baseSalary: roundMoney(baseSalary),
    coefficient: roundMoney(coefficient),
    dailyWage,
    hourlyWage,
    workdayHours,
    workdayRate,
    workdayPay,
    weekendHours,
    weekendRate,
    weekendPay,
    holidayHours,
    holidayRate,
    holidayPay,
    totalOvertimeHours,
    totalOvertimePay,
    additionItems,
    totalAdditions,
    deductionItems,
    totalDeductions,
    netSalary,
  };
}
