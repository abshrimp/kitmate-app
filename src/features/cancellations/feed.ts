import { fetchCancellations } from '@/lib/api';
import type { CancellationFeed, CancellationNotice, LectureNotice } from '@/types';

/** 生 cancel.json の URL (サーバ中継が使えないときの直接フォールバック先) */
export const RAW_CANCEL_JSON_URL = 'https://ebii.net/cancel.json';

/** 「掲示が新しい」と見なす日数 (NEW バッジ) */
export const NEW_BADGE_DAYS = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function asNullableString(value: unknown): string | null {
  const s = asString(value);
  return s === '' ? null : s;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asInstructors(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(asString).filter((s) => s !== '');
  }
  const s = asString(value);
  if (s === '') return [];
  return s
    .split(/[、,]/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/**
 * 生 cancel.json (日本語キー) を CancellationFeed へ正規化する共有実装。
 * サーバ中継 (/api/cancellations) と同等の形へそろえる。
 */
export function normalizeCancellationFeed(raw: unknown): CancellationFeed {
  const root: Record<string, unknown> = isRecord(raw) ? raw : {};
  const rawNotices: unknown[] = Array.isArray(root['授業関連連絡']) ? root['授業関連連絡'] : [];
  const rawCancellations: unknown[] = Array.isArray(root['休講通知']) ? root['休講通知'] : [];

  const notices: LectureNotice[] = rawNotices.filter(isRecord).map((item, index) => ({
    no: asNumber(item['No'], index + 1),
    facultyLabel: asString(item['学部名など']),
    termLabel: asString(item['学期']),
    courseName: asString(item['授業科目名']),
    instructors: asInstructors(item['担当教員名']),
    dayLabel: asString(item['曜日']),
    periodLabel: asNullableString(item['時限']),
    category: asString(item['分類']),
    message: asString(item['連絡事項']),
    firstPostedAt: asString(item['初回掲示日']),
    updatedAt: asString(item['最終更新日']),
  }));

  const cancellations: CancellationNotice[] = rawCancellations.filter(isRecord).map((item, index) => ({
    no: asNumber(item['No'], index + 1),
    facultyLabel: asString(item['学部名など']),
    courseName: asString(item['授業科目名']),
    instructors: asInstructors(item['担当教員名']),
    cancelledOn: asString(item['休講年月日']),
    dayLabel: asString(item['曜日']),
    periodLabel: asString(item['時限']),
    remarks: asString(item['備考']),
    postedAt: asString(item['掲示年月日']),
  }));

  return { notices, cancellations, fetchedAt: new Date().toISOString() };
}

/**
 * 休講フィードの取得。まずサーバ中継 (api.fetchCancellations) を試し、
 * 失敗時は https://ebii.net/cancel.json を直接 fetch して正規化する。
 */
export async function loadCancellationFeed(): Promise<CancellationFeed> {
  try {
    return await fetchCancellations();
  } catch (e) {
    console.error('loadCancellationFeed: server relay failed, falling back to direct fetch', e);
    const res = await fetch(RAW_CANCEL_JSON_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`cancel.json fetch failed: ${res.status}`);
    }
    return normalizeCancellationFeed((await res.json()) as unknown);
  }
}

// ===== 日付ヘルパ =====

/** 'YYYY-MM-DD' (区切りは - or /) をローカル日付として解釈。失敗時 null。 */
export function parseDateLocal(value: string): Date | null {
  const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1] ?? '');
  const mo = Number(m[2] ?? '');
  const d = Number(m[3] ?? '');
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo - 1, d);
}

/** 'YYYY-MM-DD' → 'M/D'。パースできなければ元の文字列を返す。 */
export function formatShortDate(value: string): string {
  const d = parseDateLocal(value);
  if (d === null) return value;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 掲示日が直近 days 日以内 (当日・未来日含む) なら true。 */
export function isRecentPost(value: string, days: number = NEW_BADGE_DAYS, now: Date = new Date()): boolean {
  const d = parseDateLocal(value);
  if (d === null) return false;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((todayStart - d.getTime()) / 86_400_000);
  return diffDays <= days;
}

// ===== 表示ヘルパ =====

/** '金曜日' → '金' のように曜日サフィックスを除く。 */
export function shortDayLabel(dayLabel: string): string {
  return dayLabel.replace(/曜日?$/, '');
}

/** フィードの曜日表記をローカライズするための i18n キー。対応外は null。 */
export function dayLabelI18nKey(dayLabel: string): string | null {
  if (dayLabel.includes('集中')) return 'common.intensive';
  if (dayLabel.startsWith('月')) return 'common.dayMon';
  if (dayLabel.startsWith('火')) return 'common.dayTue';
  if (dayLabel.startsWith('水')) return 'common.dayWed';
  if (dayLabel.startsWith('木')) return 'common.dayThu';
  if (dayLabel.startsWith('金')) return 'common.dayFri';
  return null;
}

// ===== 授業連絡の分類 =====

/** 授業関連連絡の分類を既知の種別へ寄せる (バッジ色・ローカライズ用) */
export type NoticeCategoryKind = 'room' | 'schedule' | 'notice' | 'other';

export function noticeCategoryKind(category: string): NoticeCategoryKind {
  if (category.includes('講義室') || category.includes('教室')) return 'room';
  if (category.includes('日程') || category.includes('場所')) return 'schedule';
  if (category.includes('連絡')) return 'notice';
  return 'other';
}

// ===== 時間割マッチング =====

function normalizeSubject(name: string): string {
  return name.replace(/[\s　]+/g, '').toLowerCase();
}

/**
 * フィードの科目名が自分の講義名のいずれかと部分一致するか。
 * (クラス記号などの揺れがあるため双方向の includes で判定)
 */
export function subjectMatchesAny(feedCourseName: string, myCourseNames: readonly string[]): boolean {
  const target = normalizeSubject(feedCourseName);
  if (target === '') return false;
  return myCourseNames.some((name) => {
    const mine = normalizeSubject(name);
    if (mine === '') return false;
    return target.includes(mine) || mine.includes(target);
  });
}
