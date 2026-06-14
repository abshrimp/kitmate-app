import type { I18n } from '@/i18n';
import type { Palette } from '@/theme';
import type {
  Course,
  CourseTerm,
  Quarter,
  Semester,
  SubjectCategory,
  TimetableEntry,
} from '@/types';
import { quarterBelongsTo } from '@/lib/terms';

type T = I18n['t'];

export function isQuarter(term: CourseTerm): term is Quarter {
  return term === '1Q' || term === '2Q' || term === '3Q' || term === '4Q';
}

/** 開講区分が属する学期 (full_year は両学期 → null) */
export function semesterOf(term: CourseTerm): Semester | null {
  if (term === 'first' || term === 'second') return term;
  if (isQuarter(term)) return quarterBelongsTo(term);
  return null;
}

/** 開講区分の表示ラベル */
export function termLabel(t: T, term: CourseTerm): string {
  switch (term) {
    case 'first':
      return t('common.semesterFirst');
    case 'second':
      return t('common.semesterSecond');
    case '1Q':
      return t('common.q1');
    case '2Q':
      return t('common.q2');
    case '3Q':
      return t('common.q3');
    case '4Q':
      return t('common.q4');
    case 'full_year':
      return t('syllabus.fullYear');
  }
}

const DAY_KEYS = {
  mon: 'common.dayMon',
  tue: 'common.dayTue',
  wed: 'common.dayWed',
  thu: 'common.dayThu',
  fri: 'common.dayFri',
} as const;

/** 曜日時限ラベル (例: '月3限・木4限'、集中講義は '集中') */
export function slotsLabel(t: T, course: Course): string {
  if (course.intensive || course.slots.length === 0) return t('common.intensive');
  return course.slots
    .map((s) => t('syllabus.slot', { day: t(DAY_KEYS[s.day]), n: s.period }))
    .join(t('syllabus.slotSeparator'));
}

/** 科目区分ラベル */
export function categoryLabel(t: T, category: SubjectCategory): string {
  return t(`syllabus.cat_${category}`);
}

/** 科目区分のアクセント色 (palette から選択) */
export function categoryColor(colors: Palette, category: SubjectCategory): string {
  switch (category) {
    case 'intro_required':
    case 'basic_required':
    case 'program_required':
    case 'graduation_research':
      return colors.danger;
    case 'intro_elective_required':
    case 'basic_elective_required':
    case 'program_elective_required':
    case 'program_elective_A':
    case 'program_elective_B':
    case 'program_elective_C':
    case 'program_elective_ABC':
    case 'program_elective_D':
    case 'program_elective_other_course':
      return colors.warning;
    case 'english':
    case 'liberal_foundation':
    case 'liberal_practical':
    case 'liberal_senior':
      return colors.accent;
    case 'intro_elective':
    case 'basic_elective':
    case 'program_elective':
      return colors.primary;
    case 'other_program':
      return colors.success;
    case 'out_of_scope':
    case 'not_allowed':
      return colors.textSecondary;
  }
}

/** 依存追加なしの簡易 UUID v4 */
export function newEntryId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.trunc(Math.random() * 16);
    const v = c === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });
}

/**
 * 講義から時間割エントリを生成する。
 * - 集中講義 (slots 空) は day/period 無しの 1 エントリ
 * - それ以外はコマごとに 1 エントリ
 * - クォーター開講なら quarters を設定
 */
export function buildTimetableEntries(course: Course, year: number, term: Semester): TimetableEntry[] {
  const base: Omit<TimetableEntry, 'id'> = {
    year,
    term,
    courseId: course.id,
    ...(isQuarter(course.term) ? { quarters: [course.term] } : {}),
    ...(course.classLabel !== undefined ? { classLabel: course.classLabel } : {}),
  };
  if (course.intensive || course.slots.length === 0) {
    return [{ id: newEntryId(), ...base }];
  }
  return course.slots.map((slot) => ({
    id: newEntryId(),
    ...base,
    day: slot.day,
    period: slot.period,
  }));
}
