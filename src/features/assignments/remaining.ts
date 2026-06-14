import type { I18n } from '@/i18n';

/**
 * 締切までの残り時間を日・時間・分の複合で返す (例「あと2日3時間20分」)。
 * 過去 (締切超過) は overdueKey の文言を返す。単位文言は assignments.* を共用する。
 */
export function formatRemaining(
  timesortSec: number,
  nowMs: number,
  t: I18n['t'],
  overdueKey: string,
): string {
  const diff = timesortSec * 1000 - nowMs;
  if (diff <= 0) return t(overdueKey);
  const totalMin = Math.floor(diff / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(t('assignments.unitDay', { n: days }));
  if (hours > 0) parts.push(t('assignments.unitHour', { n: hours }));
  if (mins > 0 || parts.length === 0) parts.push(t('assignments.unitMinute', { n: mins }));
  return t('assignments.remainingPrefix') + parts.join(t('assignments.remainingSeparator'));
}
