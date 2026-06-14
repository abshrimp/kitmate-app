import type { Course, RequirementSet, SubjectCategory, TimetableEntry } from '@/types';
import { categoryFor } from '@/types';

/** 集計対象になる区分 (要件外・履修不可を除く) */
export type CountedCategory = Exclude<SubjectCategory, 'out_of_scope' | 'not_allowed'>;

/** 対象外として別枠表示する理由 */
export type ExcludedReason = 'out_of_scope' | 'not_allowed' | 'unknown';

export interface ExcludedItem {
  /** courseId (公式講義 / 不明講義) または entry.id (custom 講義) */
  key: string;
  name: string;
  /** 不明講義 (講義データが引けなかった) のときは null */
  credits: number | null;
  reason: ExcludedReason;
}

export interface CreditAggregation {
  earned: Partial<Record<CountedCategory, number>>;
  excluded: ExcludedItem[];
}

// ===== 区分グループ定義 =====

export const LIBERAL_CATEGORIES: readonly CountedCategory[] = [
  'english',
  'liberal_foundation',
  'liberal_practical',
  'liberal_senior',
];

export const BASIC_CATEGORIES: readonly CountedCategory[] = [
  'intro_required',
  'intro_elective_required',
  'intro_elective',
  'basic_required',
  'basic_elective_required',
  'basic_elective',
];

export const PROGRAM_CATEGORIES: readonly CountedCategory[] = [
  'program_required',
  'program_elective_required',
  'program_elective',
  'program_elective_A',
  'program_elective_B',
  'program_elective_C',
  'program_elective_ABC',
  'program_elective_D',
  'program_elective_other_course',
  'graduation_research',
  'other_program',
];

export type GroupKey = 'liberal' | 'basic' | 'specialized';

export interface CategoryGroupDef {
  key: GroupKey;
  categories: readonly CountedCategory[];
}

/** 画面表示用のグループ → 区分リスト (表示順) */
export const CATEGORY_GROUPS: readonly CategoryGroupDef[] = [
  { key: 'liberal', categories: LIBERAL_CATEGORIES },
  { key: 'basic', categories: BASIC_CATEGORIES },
  { key: 'specialized', categories: PROGRAM_CATEGORIES },
];

// ===== 集計 =====

/**
 * 時間割エントリから区分ごとの取得単位を集計する。
 * - 公式講義は courseId で重複排除 (留年等で同一講義が複数年度にあっても 1 回だけ数える)
 * - custom 講義は entry.id 単位でそのまま数える
 * - out_of_scope / not_allowed / 講義データ不明 は excluded に積む (単位には加算しない)
 */
export function aggregateCredits(
  entries: readonly TimetableEntry[],
  coursesById: ReadonlyMap<string, Course>,
  admissionYear: number,
  variantKey: string,
): CreditAggregation {
  const earned: Partial<Record<CountedCategory, number>> = {};
  const excluded: ExcludedItem[] = [];
  const seenCourseIds = new Set<string>();

  const add = (category: SubjectCategory, credits: number, key: string, name: string): void => {
    if (category === 'out_of_scope' || category === 'not_allowed') {
      excluded.push({ key, name, credits, reason: category });
      return;
    }
    earned[category] = (earned[category] ?? 0) + credits;
  };

  for (const entry of entries) {
    if (entry.courseId !== undefined) {
      if (seenCourseIds.has(entry.courseId)) continue;
      seenCourseIds.add(entry.courseId);
      const course = coursesById.get(entry.courseId);
      if (course === undefined) {
        excluded.push({ key: entry.courseId, name: entry.courseId, credits: null, reason: 'unknown' });
        continue;
      }
      add(categoryFor(course, admissionYear, variantKey), course.credits, course.id, course.name);
    } else if (entry.custom !== undefined) {
      add(entry.custom.category, entry.custom.credits, entry.id, entry.custom.name);
    }
  }

  return { earned, excluded };
}

// ===== グループ合計 =====

export function sumCategories(
  earned: Partial<Record<CountedCategory, number>>,
  categories: readonly CountedCategory[],
): number {
  return categories.reduce((acc, c) => acc + (earned[c] ?? 0), 0);
}

export interface GroupEarned {
  liberal: number;
  /** 専門基礎計 (専門導入 + 専門基礎) */
  basic: number;
  /** 専門教育計 (専門基礎 + 課程専門・卒研・他課程) */
  specialized: number;
  /** 総合計 (対象外を除く全区分) */
  grand: number;
}

export function groupEarned(earned: Partial<Record<CountedCategory, number>>): GroupEarned {
  const liberal = sumCategories(earned, LIBERAL_CATEGORIES);
  const basic = sumCategories(earned, BASIC_CATEGORIES);
  const program = sumCategories(earned, PROGRAM_CATEGORIES);
  return {
    liberal,
    basic,
    specialized: basic + program,
    grand: liberal + basic + program,
  };
}

// ===== 不足単位 =====

function categoryShortfall(
  earned: Partial<Record<CountedCategory, number>>,
  minima: RequirementSet['minima'],
  categories: readonly CountedCategory[],
): number {
  return categories.reduce((acc, c) => acc + Math.max(0, (minima[c] ?? 0) - (earned[c] ?? 0)), 0);
}

/**
 * あと何単位必要かの見積り (下限値)。
 * 区分ごとの不足とグループ合計 (liberalTotal / basicTotal / specializedTotal / grandTotal)
 * の不足のうち大きい方を階層的に取って合算する。
 */
export function computeRemaining(
  earned: Partial<Record<CountedCategory, number>>,
  requirement: RequirementSet,
): number {
  const g = groupEarned(earned);
  const totals = requirement.groupTotals ?? {};
  const minima = requirement.minima;

  const liberalNeed = Math.max(
    categoryShortfall(earned, minima, LIBERAL_CATEGORIES),
    (totals.liberalTotal ?? 0) - g.liberal,
    0,
  );
  const basicNeed = Math.max(
    categoryShortfall(earned, minima, BASIC_CATEGORIES),
    (totals.basicTotal ?? 0) - g.basic,
    0,
  );
  const specializedNeed = Math.max(
    basicNeed + categoryShortfall(earned, minima, PROGRAM_CATEGORIES),
    (totals.specializedTotal ?? 0) - g.specialized,
    0,
  );
  return Math.max(liberalNeed + specializedNeed, (totals.grandTotal ?? 0) - g.grand, 0);
}
