/** assignments feature: 日付・HTML 整形の純粋ヘルパ (i18n 非依存) */

/** 今日の 0:00 (ローカル) を unix 秒で返す */
export function startOfTodayUnixSec(now: Date = new Date()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

/** その日の 0:00 (ローカル) */
export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** a(0:00) から b の属する日までの暦日差 (b が翌日なら 1) */
export function calendarDaysFrom(todayStart: Date, target: Date): number {
  const diff = startOfDay(target).getTime() - todayStart.getTime();
  return Math.round(diff / 86_400_000);
}

/** unix 秒 → 'HH:MM' (ローカル時刻) */
export function formatTime(tsSec: number): string {
  const d = new Date(tsSec * 1000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** HTML からタグを除去しプレーンテキストへ (簡易) */
export function stripHtml(html: string): string {
  const withBreaks = html
    .replace(/<\s*(?:br|\/p|\/div|\/li|\/tr|\/h[1-6])[^>]*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ');
  const noTags = withBreaks.replace(/<[^>]*>/g, '');
  const decoded = noTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
  return decoded
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
