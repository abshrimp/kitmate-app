import type { Day, Period, Quarter, Semester } from '@/types';

/** 年度 (4月始まり。1-3月は前年扱い) */
export function currentAcademicYear(d: Date = new Date()): number {
  const month = d.getMonth() + 1;
  return month >= 4 ? d.getFullYear() : d.getFullYear() - 1;
}

/** 現在の学期 (4-9月 first / 10-3月 second) */
export function currentSemester(d: Date = new Date()): Semester {
  const month = d.getMonth() + 1;
  return month >= 4 && month <= 9 ? 'first' : 'second';
}

/** 現在のクォーター (4-5月1Q, 6-9月2Q, 10-11月3Q, 12-3月4Q の近似) */
export function currentQuarter(d: Date = new Date()): Quarter {
  const month = d.getMonth() + 1;
  if (month === 4 || month === 5) return '1Q';
  if (month >= 6 && month <= 9) return '2Q';
  if (month === 10 || month === 11) return '3Q';
  return '4Q';
}

/** 学年 (入学年度と年度から) */
export function gradeOf(admissionYear: number, academicYear: number): number {
  return academicYear - admissionYear + 1;
}

/** クォーターが属する学期 */
export function quarterBelongsTo(q: Quarter): Semester {
  return q === '1Q' || q === '2Q' ? 'first' : 'second';
}

/** 各時限の開始・終了時刻 */
export const PERIOD_TIMES: Record<Period, { start: string; end: string }> = {
  1: { start: '8:50', end: '10:20' },
  2: { start: '10:30', end: '12:00' },
  3: { start: '12:50', end: '14:20' },
  4: { start: '14:30', end: '16:00' },
  5: { start: '16:10', end: '17:40' },
};

export const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
