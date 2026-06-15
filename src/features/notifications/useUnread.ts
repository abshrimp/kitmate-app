import { useEffect, useState } from 'react';

import { fetchAnnouncements } from '@/lib/api';
import { useNotificationHistory } from './store';

// 運営お知らせの最新 createdAt をキャッシュ (未読バッジ用、5分)。
let annCache: { at: number; newest: number } | null = null;
const TTL = 5 * 60 * 1000;

function newestOf(items: { createdAt: number }[]): number {
  return items.reduce((m, x) => Math.max(m, x.createdAt), 0);
}

/** 未読通知 (ローカル受信 or 運営お知らせ) が lastSeenAt より新しく存在するか。 */
export function useHasUnreadNotifications(): boolean {
  const items = useNotificationHistory((s) => s.items);
  const lastSeenAt = useNotificationHistory((s) => s.lastSeenAt);
  const [annNewest, setAnnNewest] = useState(annCache?.newest ?? 0);

  useEffect(() => {
    // キャッシュが新鮮なら初期 state で足りる (再取得不要)
    if (annCache !== null && Date.now() - annCache.at < TTL) return;
    let cancelled = false;
    fetchAnnouncements()
      .then((a) => {
        const newest = newestOf(a);
        annCache = { at: Date.now(), newest };
        if (!cancelled) setAnnNewest(newest);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const localNewest = items.reduce((m, x) => Math.max(m, x.receivedAt), 0);
  return Math.max(localNewest, annNewest) > lastSeenAt;
}
