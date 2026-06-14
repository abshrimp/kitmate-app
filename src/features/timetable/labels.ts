import type { I18n } from '@/i18n';
import type { CategoryPalette, Palette } from '@/theme';
import { categoryFor } from '@/types';
import type { Course, CourseTerm, Day, Quarter, SubjectCategory, TimetableEntry } from '@/types';

const DAY_KEYS: Record<Day, string> = {
  mon: 'common.dayMon',
  tue: 'common.dayTue',
  wed: 'common.dayWed',
  thu: 'common.dayThu',
  fri: 'common.dayFri',
};

export function dayLabel(t: I18n['t'], day: Day): string {
  return t(DAY_KEYS[day]);
}

const QUARTER_KEYS: Record<Quarter, string> = {
  '1Q': 'common.q1',
  '2Q': 'common.q2',
  '3Q': 'common.q3',
  '4Q': 'common.q4',
};

export function quarterLabel(t: I18n['t'], q: Quarter): string {
  return t(QUARTER_KEYS[q]);
}

export function courseTermLabel(t: I18n['t'], term: CourseTerm): string {
  if (term === 'first') return t('common.semesterFirst');
  if (term === 'second') return t('common.semesterSecond');
  if (term === 'full_year') return t('timetable.fullYear');
  return quarterLabel(t, term);
}

export function categoryLabel(t: I18n['t'], category: SubjectCategory): string {
  return t(`timetable.cat_${category}`);
}

/** 科目区分のアクセント色 (テーマパレットから選択) */
export function categoryTint(category: SubjectCategory, colors: Palette): string {
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
    case 'other_program':
    case 'out_of_scope':
    case 'not_allowed':
      return colors.textSecondary;
    default:
      return colors.primary;
  }
}

// 科目区分の大分類 (シラバスの区分フィルタ・コマ色で共有)
export type CategoryGroup =
  | 'english' | 'foundation' | 'practical' | 'senior'
  | 'intro' | 'basic' | 'program' | 'research' | 'other';

export function categoryGroup(category: SubjectCategory): CategoryGroup {
  switch (category) {
    case 'english':
      return 'english';
    case 'liberal_foundation':
      return 'foundation';
    case 'liberal_practical':
      return 'practical';
    case 'liberal_senior':
      return 'senior';
    case 'intro_required':
    case 'intro_elective_required':
    case 'intro_elective':
      return 'intro';
    case 'basic_required':
    case 'basic_elective_required':
    case 'basic_elective':
      return 'basic';
    case 'program_required':
    case 'program_elective_required':
    case 'program_elective':
    case 'program_elective_A':
    case 'program_elective_B':
    case 'program_elective_C':
    case 'program_elective_ABC':
    case 'program_elective_D':
    case 'program_elective_other_course':
      return 'program';
    case 'graduation_research':
      return 'research';
    default:
      return 'other';
  }
}

/** 科目区分のデフォルトコマ色 (ユーザー指定の区分→色マッピング) */
export function categoryColor(category: SubjectCategory, cat: CategoryPalette): string {
  switch (category) {
    case 'english':
      return cat.english;
    case 'liberal_foundation':
      return cat.foundation;
    case 'liberal_practical':
      return cat.practical;
    case 'liberal_senior':
      return cat.senior;
    case 'intro_required':
    case 'intro_elective_required':
    case 'intro_elective':
      return cat.intro;
    case 'basic_required':
    case 'basic_elective_required':
    case 'basic_elective':
      return cat.basic;
    case 'program_required':
    case 'program_elective_required':
    case 'program_elective':
    case 'program_elective_A':
    case 'program_elective_B':
    case 'program_elective_C':
    case 'program_elective_ABC':
    case 'program_elective_D':
    case 'program_elective_other_course':
      return cat.program;
    case 'graduation_research':
      return cat.research;
    default:
      return cat.other;
  }
}

/** エントリの科目区分を解決する (公式講義は入学年度・課程変種から、オリジナルは custom.category)。 */
export function entryCategory(
  entry: TimetableEntry,
  course: Course | undefined,
  admissionYear: number | null,
  variantKey: string | null,
): SubjectCategory {
  if (entry.custom !== undefined) return entry.custom.category;
  if (course !== undefined && admissionYear !== null && variantKey !== null) {
    return categoryFor(course, admissionYear, variantKey);
  }
  return 'out_of_scope';
}

/** 講義の曜日・時限の短い表記 (例: 月1・木2 / Mon1, Thu2)。集中は集中表記 */
export function slotsLabel(t: I18n['t'], course: Course): string {
  if (course.intensive || course.slots.length === 0) return t('common.intensive');
  return course.slots.map((s) => `${dayLabel(t, s.day)}${s.period}`).join('・');
}
