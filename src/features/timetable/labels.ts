import type { I18n } from '@/i18n';
import type { Palette } from '@/theme';
import type { Course, CourseTerm, Day, Quarter, SubjectCategory } from '@/types';

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

/** 講義の曜日・時限の短い表記 (例: 月1・木2 / Mon1, Thu2)。集中は集中表記 */
export function slotsLabel(t: I18n['t'], course: Course): string {
  if (course.intensive || course.slots.length === 0) return t('common.intensive');
  return course.slots.map((s) => `${dayLabel(t, s.day)}${s.period}`).join('・');
}
