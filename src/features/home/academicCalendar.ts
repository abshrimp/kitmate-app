import type { LocaleCode } from '@/i18n';

// KIT 2026 年度 学年暦 (メモリ kitmate-academic-schedule 由来)。年度ごとに更新が必要。
export interface CalendarEvent {
  start: string; // 'YYYY-MM-DD'
  end?: string; // 期間の終了日 (単日なら省略)
  ja: string;
  en: string;
}

export const ACADEMIC_CALENDAR: CalendarEvent[] = [
  { start: '2026-04-01', end: '2026-04-06', ja: '春季休業', en: 'Spring break' },
  { start: '2026-04-06', ja: '入学宣誓式', en: 'Entrance ceremony' },
  { start: '2026-04-07', ja: '前期・1Q授業開始', en: 'Spring / 1Q classes begin' },
  { start: '2026-05-28', end: '2026-05-29', ja: '1Q試験', en: '1Q exams' },
  { start: '2026-06-04', ja: '2Q授業開始', en: '2Q classes begin' },
  { start: '2026-07-21', ja: '授業振替日(月曜授業)', en: 'Substitute day (Mon classes)' },
  { start: '2026-07-23', end: '2026-07-24', ja: '授業予備日', en: 'Reserve class days' },
  { start: '2026-07-30', end: '2026-08-05', ja: '前期・2Q試験期間', en: 'Spring / 2Q exam period' },
  { start: '2026-08-06', end: '2026-09-27', ja: '夏季休業', en: 'Summer break' },
  { start: '2026-08-07', end: '2026-08-08', ja: 'オープンキャンパス', en: 'Open campus' },
  { start: '2026-09-28', ja: '後期・3Q授業開始', en: 'Fall / 3Q classes begin' },
  { start: '2026-10-14', ja: '授業振替日(月曜授業)', en: 'Substitute day (Mon classes)' },
  { start: '2026-11-13', ja: '松ヶ崎祭による休講', en: 'No classes (Matsugasaki Festival)' },
  { start: '2026-11-16', ja: '3Q試験', en: '3Q exams' },
  { start: '2026-11-19', ja: '3Q試験', en: '3Q exams' },
  { start: '2026-11-24', ja: '3Q試験', en: '3Q exams' },
  { start: '2026-11-25', ja: '3Q試験', en: '3Q exams' },
  { start: '2026-11-26', ja: '4Q授業開始', en: '4Q classes begin' },
  { start: '2026-11-27', ja: '3Q試験', en: '3Q exams' },
  { start: '2026-12-24', end: '2027-01-06', ja: '冬季休業', en: 'Winter break' },
  { start: '2027-01-14', ja: '授業振替日(金曜授業)', en: 'Substitute day (Fri classes)' },
  { start: '2027-01-15', ja: '共通テストによる休講', en: 'No classes (national exam)' },
  { start: '2027-02-02', end: '2027-02-03', ja: '授業予備日', en: 'Reserve class days' },
  { start: '2027-02-04', end: '2027-02-10', ja: '後期・4Q試験期間', en: 'Fall / 4Q exam period' },
  { start: '2027-02-11', end: '2027-03-31', ja: '春季休業', en: 'Spring break' },
  { start: '2027-03-25', ja: '学位記授与式', en: 'Commencement' },
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** unix ms → 'YYYY-MM-DD' (ローカル) */
function isoDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 今日以降 (継続中を含む) の予定を開始日順に最大 count 件返す。 */
export function upcomingEvents(nowMs: number, count: number): CalendarEvent[] {
  const today = isoDate(nowMs);
  return ACADEMIC_CALENDAR.filter((e) => (e.end ?? e.start) >= today)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    .slice(0, count);
}

/** 予定の日付表示 (例: 7/21 / 7/23–24 / 12/24–1/6)。 */
export function formatEventDate(e: CalendarEvent): string {
  const [, sm, sd] = e.start.split('-');
  const startLabel = `${Number(sm)}/${Number(sd)}`;
  if (e.end === undefined) return startLabel;
  const [, em, ed] = e.end.split('-');
  return `${startLabel}–${Number(em)}/${Number(ed)}`;
}

export function eventLabel(e: CalendarEvent, locale: LocaleCode): string {
  return locale === 'en' ? e.en : e.ja;
}
