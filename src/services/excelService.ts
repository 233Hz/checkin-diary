import * as XLSX from 'xlsx';
import type { AttendanceSettings, DailyRecord, AttendanceStatus } from '../types/attendance';
import { calculateOvertime } from './calcService';
import { getHolidayInfo } from './holidayService';

/**
 * 格式化 Excel 单元格中的日期
 */
function normalizeDateStr(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel 日期序列号（从 1899-12-30 开始）
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const s = String(val).trim();
  // 匹配类似 2026/09/01 或 2026.09.01 或 2026-9-1
  const cleaned = s.replace(/[\/\.]/g, '-');
  const parts = cleaned.split('-');
  if (parts.length === 3) {
    const y = parts[0].padStart(4, '20');
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return s;
}

/**
 * 格式化 Excel 单元格中的时间
 */
function normalizeTimeStr(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'number') {
    // Excel 时间小数（0.5 = 12:00）
    if (val < 1) {
      const totalSeconds = Math.round(val * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }
  const s = String(val).trim();
  // 格式如 "09:00:00" 或 "9:00"
  const parts = s.split(':');
  if (parts.length >= 2) {
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    return `${h}:${m}`;
  }
  return s;
}

/**
 * 标准化状态文本
 */
function normalizeStatus(val: any): AttendanceStatus {
  if (!val) return 'normal';
  const s = String(val).trim();
  if (s.includes('缺勤') || s.includes('旷工') || s.includes('未打卡')) return 'absent';
  if (s.includes('假')) return 'leave';
  if (s.includes('调休')) return 'compensatory';
  if (s.includes('休')) return 'rest';
  return 'normal';
}

/**
 * 智能解析 Excel 文件并提取考勤记录
 */
export async function parseExcelFile(file: File): Promise<{ records: DailyRecord[]; summary: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        if (!sheet) {
          throw new Error('未找到有效工作表');
        }

        const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
        if (!rawRows || rawRows.length < 2) {
          throw new Error('工作表内容为空或数据不足两行');
        }

        // 智能定位表头行
        let headerRowIndex = 0;
        let dateCol = -1;
        let inCol = -1;
        let outCol = -1;
        let statusCol = -1;
        let noteCol = -1;

        for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;

          for (let c = 0; c < row.length; c++) {
            const cell = String(row[c] || '').trim().toLowerCase();
            if (dateCol === -1 && (cell.includes('日') || cell.includes('date') || cell.includes('时间'))) {
              if (!cell.includes('上班') && !cell.includes('下班') && !cell.includes('签到') && !cell.includes('签退')) {
                dateCol = c;
              }
            }
            if (inCol === -1 && (cell.includes('上班') || cell.includes('签到') || cell.includes('打卡1') || cell.includes('in'))) {
              inCol = c;
            }
            if (outCol === -1 && (cell.includes('下班') || cell.includes('签退') || cell.includes('打卡2') || cell.includes('out'))) {
              outCol = c;
            }
            if (statusCol === -1 && (cell.includes('状态') || cell.includes('status'))) {
              statusCol = c;
            }
            if (noteCol === -1 && (cell.includes('备') || cell.includes('说明') || cell.includes('note') || cell.includes('remark'))) {
              noteCol = c;
            }
          }

          if (dateCol !== -1 && (inCol !== -1 || outCol !== -1 || statusCol !== -1)) {
            headerRowIndex = r;
            break;
          }
        }

        // 如果智能匹配失败，采用默认第 0 行 0, 1, 2, 3 列
        if (dateCol === -1) dateCol = 0;
        if (inCol === -1) inCol = 1;
        if (outCol === -1) outCol = 2;
        if (statusCol === -1) statusCol = 3;
        if (noteCol === -1) noteCol = 4;

        const parsedRecords: DailyRecord[] = [];

        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!Array.isArray(row) || row.length === 0) continue;

          const dateStr = normalizeDateStr(row[dateCol]);
          if (!dateStr || !dateStr.includes('-')) continue;

          const clockIn = inCol >= 0 ? normalizeTimeStr(row[inCol]) : '';
          const clockOut = outCol >= 0 ? normalizeTimeStr(row[outCol]) : '';
          const status = statusCol >= 0 ? normalizeStatus(row[statusCol]) : (clockIn || clockOut ? 'normal' : 'absent');
          const note = noteCol >= 0 && row[noteCol] ? String(row[noteCol]).trim() : '';

          parsedRecords.push({
            date: dateStr,
            clockIn,
            clockOut,
            status,
            note,
          });
        }

        resolve({
          records: parsedRecords,
          summary: `成功解析 ${parsedRecords.length} 条记录`,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 下载标准 Excel 模板
 */
export function downloadExcelTemplate(): void {
  const sampleData = [
    {
      '日期 (必填)': '2026-09-01',
      '上班打卡 (HH:mm)': '08:45',
      '下班打卡 (HH:mm)': '20:30',
      '考勤状态 (正常/缺勤/请假/调休)': '正常',
      '备注': '按时出勤，晚间赶进度加班',
    },
    {
      '日期 (必填)': '2026-09-02',
      '上班打卡 (HH:mm)': '09:00',
      '下班打卡 (HH:mm)': '18:00',
      '考勤状态 (正常/缺勤/请假/调休)': '正常',
      '备注': '准时下班',
    },
    {
      '日期 (必填)': '2026-09-03',
      '上班打卡 (HH:mm)': '',
      '下班打卡 (HH:mm)': '',
      '考勤状态 (正常/缺勤/请假/调休)': '请假',
      '备注': '事假 1 天',
    },
    {
      '日期 (必填)': '2026-09-04',
      '上班打卡 (HH:mm)': '',
      '下班打卡 (HH:mm)': '',
      '考勤状态 (正常/缺勤/请假/调休)': '调休',
      '备注': '上周六加班调休',
    },
    {
      '日期 (必填)': '2026-09-05',
      '上班打卡 (HH:mm)': '10:00',
      '下班打卡 (HH:mm)': '18:00',
      '考勤状态 (正常/缺勤/请假/调休)': '正常',
      '备注': '周六加班攻坚',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  // 列宽自适应
  ws['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 30 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '考勤导入模板');
  XLSX.writeFile(wb, '考勤数据批量导入模板.xlsx');
}

/**
 * 导出考勤数据与加班明细为 Excel
 */
export function exportAttendanceToExcel(records: Record<string, DailyRecord>, settings: AttendanceSettings): void {
  const dates = Object.keys(records).sort();
  const statusMap: Record<AttendanceStatus, string> = {
    normal: '正常出勤',
    absent: '缺勤',
    leave: '请假',
    compensatory: '调休',
    rest: '休息日',
  };

  const rows = dates.map((dateStr) => {
    const r = records[dateStr];
    const holidayInfo = getHolidayInfo(dateStr, r.customHolidayType);
    const otRes = calculateOvertime(r.clockIn, r.clockOut, r.isNextDayOut, !holidayInfo.isWorkday, settings);

    return {
      '日期': r.date,
      '属性': holidayInfo.name,
      '类型': holidayInfo.isWorkday ? '工作日' : '非工作日/休',
      '状态': statusMap[r.status] || r.status,
      '上班打卡': r.clockIn || '--',
      '下班打卡': r.clockOut || '--',
      '总在岗工时(h)': otRes.workHours,
      '基础加班(h)': otRes.baseOvertimeHours,
      '扣除用餐(h)': otRes.deductedMealHours,
      '最终加班时长(h)': otRes.finalOvertimeHours,
      '计算说明': otRes.summary,
      '备注': r.note || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 36 },
    { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '考勤与加班明细');
  XLSX.writeFile(wb, `考勤统计数据导出_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
