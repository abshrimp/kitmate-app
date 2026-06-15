import type { CourseMap } from '@/features/timetable/useCourseMap';
import {
  currentAcademicYear,
  currentQuarter,
  currentSemester,
  PERIOD_TIMES,
} from '@/lib/terms';
import type { AssignmentEvent, Day, TimetableEntry } from '@/types';

/** ウィジェットに表示する 1 コマ分 */
export interface WidgetClass {
  period: number;
  start: string;
  end: string;
  name: string;
  room: string;
  color: string | null;
}

/** ウィジェットに表示する直近の課題 */
export interface WidgetAssignment {
  title: string;
  course: string;
  dueAt: number; // unix 秒
  dueLabel: string; // 例 "6/15 23:59"
}

/** ホーム画面ウィジェットへ渡す共有ペイロード (iOS/Android 共通) */
export interface WidgetPayload {
  updatedAt: number; // unix ミリ秒
  dateLabel: string; // 例 "6/15 (日)"
  isWeekend: boolean;
  classes: WidgetClass[];
  assignment: WidgetAssignment | null;
}

const WEEKDAY_INDEX: Record<number, Day> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' };
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

/** その日に開講される (今学期・今クォーター・今日の曜日の) コマを時限順に返す */
export function buildTodayClasses(
  entries: TimetableEntry[],
  courseMap: CourseMap,
  date: Date,
): WidgetClass[] {
  const today = WEEKDAY_INDEX[date.getDay()];
  if (today === undefined) return []; // 土日は授業なし
  const year = currentAcademicYear(date);
  const term = currentSemester(date);
  const quarter = currentQuarter(date);

  return entries
    .filter((e) => {
      if (e.year !== year || e.term !== term) return false;
      if (e.day !== today || e.period === undefined) return false;
      if (e.quarters !== undefined && e.quarters.length > 0 && !e.quarters.includes(quarter)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.period ?? 0) - (b.period ?? 0))
    .map((e) => {
      const period = e.period ?? 0;
      const course = e.courseId !== undefined ? courseMap[e.courseId] : undefined;
      const name = e.custom?.name ?? course?.name ?? e.courseId ?? '';
      const room = e.custom?.room ?? course?.room ?? '';
      const times = PERIOD_TIMES[period as keyof typeof PERIOD_TIMES];
      return {
        period,
        start: times?.start ?? '',
        end: times?.end ?? '',
        name,
        room,
        color: e.color ?? null,
      };
    });
}

/** 締切が一番近い (未提出の) 課題を 1 件返す */
export function buildNextAssignment(events: AssignmentEvent[]): WidgetAssignment | null {
  const sorted = [...events].sort((a, b) => a.timesort - b.timesort);
  const first = sorted[0];
  if (first === undefined) return null;
  const d = new Date(first.timesort * 1000);
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, '0');
  const dueLabel = `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
  return {
    title: first.activityname,
    course: first.courseFullname,
    dueAt: first.timesort,
    dueLabel,
  };
}

/** 日付ラベル "6/15 (日)" を作る */
export function dateLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} (${WEEKDAY_JA[date.getDay()]})`;
}
