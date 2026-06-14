import { generateId } from './store';
import { quarterBelongsTo } from '@/lib/terms';
import type { Course, Quarter, Semester, TimetableEntry } from '@/types';

function isQuarter(term: Course['term']): term is Quarter {
  return term === '1Q' || term === '2Q' || term === '3Q' || term === '4Q';
}

/**
 * 公式講義から TimetableEntry を組み立てる。
 * - クォーター開講: quarters に設定
 * - 通年: 前期・後期の両方にエントリを作成
 * - 複数コマ開講: コマごとにエントリを作成
 * - 集中講義: day/period なしの 1 エントリ (学期ごと)
 */
export function buildEntriesForCourse(course: Course, year: number): TimetableEntry[] {
  const quarters: Quarter[] | undefined = isQuarter(course.term) ? [course.term] : undefined;
  const terms: Semester[] =
    course.term === 'full_year'
      ? ['first', 'second']
      : [isQuarter(course.term) ? quarterBelongsTo(course.term) : course.term];

  const entries: TimetableEntry[] = [];
  for (const term of terms) {
    const base: TimetableEntry = {
      id: generateId(),
      year,
      term,
      courseId: course.id,
      ...(quarters !== undefined ? { quarters } : {}),
      ...(course.classLabel !== undefined ? { classLabel: course.classLabel } : {}),
    };
    if (course.intensive || course.slots.length === 0) {
      entries.push(base);
    } else {
      for (const slot of course.slots) {
        entries.push({ ...base, id: generateId(), day: slot.day, period: slot.period });
      }
    }
  }
  return entries;
}
