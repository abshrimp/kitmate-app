import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import { useTimetable } from './store';
import { fetchSyncedTimetable, putSyncedTimetable } from '@/lib/api';
import { useAuth } from '@/store/auth';

export type SyncStatus = 'loggedOut' | 'syncing' | 'synced' | 'error';

interface SyncStatusState {
  status: SyncStatus;
  lastSyncedAt: number | null;
}

export const useSyncStatus = create<SyncStatusState>(() => ({
  status: 'loggedOut',
  lastSyncedAt: null,
}));

const DEBOUNCE_MS = 2000;

/**
 * ログイン済みのとき時間割をサーバと同期する。
 * - ログイン直後/起動時: サーバ側を取得し、ローカルが空でサーバにデータがあれば取り込み。
 *   それ以外はローカル優先で push。
 * - 以後 entries の変更を 2 秒デバウンスで push。
 */
export function useTimetableSync(): SyncStatus {
  const wstoken = useAuth((s) => s.wstoken);
  const status = useSyncStatus((s) => s.status);
  const skipNextPush = useRef(false);

  useEffect(() => {
    if (wstoken === null) {
      useSyncStatus.setState({ status: 'loggedOut' });
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const push = async () => {
      try {
        await putSyncedTimetable(wstoken, useTimetable.getState().entries);
        if (!cancelled) useSyncStatus.setState({ status: 'synced', lastSyncedAt: Date.now() });
      } catch (e) {
        console.error('timetable sync: push failed', e);
        if (!cancelled) useSyncStatus.setState({ status: 'error' });
      }
    };

    // 初回同期
    (async () => {
      useSyncStatus.setState({ status: 'syncing' });
      try {
        const remote = await fetchSyncedTimetable(wstoken);
        if (cancelled) return;
        const local = useTimetable.getState().entries;
        if (local.length === 0 && remote !== null && remote.entries.length > 0) {
          skipNextPush.current = true;
          useTimetable.getState().replaceAll(remote.entries);
          useSyncStatus.setState({ status: 'synced', lastSyncedAt: Date.now() });
        } else {
          await push();
        }
      } catch (e) {
        console.error('timetable sync: initial sync failed', e);
        if (!cancelled) useSyncStatus.setState({ status: 'error' });
      }
    })();

    // entries 変更の監視 → デバウンス push
    const unsubscribe = useTimetable.subscribe((state, prev) => {
      if (state.entries === prev.entries) return;
      if (skipNextPush.current) {
        skipNextPush.current = false;
        return;
      }
      if (timer !== null) clearTimeout(timer);
      useSyncStatus.setState({ status: 'syncing' });
      timer = setTimeout(() => {
        timer = null;
        void push();
      }, DEBOUNCE_MS);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (timer !== null) clearTimeout(timer);
    };
  }, [wstoken]);

  return status;
}
