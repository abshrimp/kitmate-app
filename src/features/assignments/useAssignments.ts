import { useCallback, useEffect, useState } from 'react';

import { startOfTodayUnixSec } from './format';
import { syncAssignmentNotifications } from './notifications';
import { getUpcomingEvents, isInvalidToken } from '@/lib/moodle';
import { useAuth } from '@/store/auth';
import type { AssignmentEvent } from '@/types';

export type AssignmentsStatus = 'loading' | 'refreshing' | 'ready' | 'error' | 'invalidToken';

export interface UseAssignmentsResult {
  events: AssignmentEvent[];
  status: AssignmentsStatus;
  /** 初回ロードと同じ表示で再取得 (エラー時の再試行) */
  reload: () => void;
  /** pull-to-refresh 用 */
  refresh: () => void;
}

const FETCH_LIMIT = 50;

/** Moodle から直近の課題イベントを取得し、締切昇順で保持する */
export function useAssignments(): UseAssignmentsResult {
  const wstoken = useAuth((s) => s.wstoken);
  const clearSession = useAuth((s) => s.clearSession);
  const [events, setEvents] = useState<AssignmentEvent[]>([]);
  const [status, setStatus] = useState<AssignmentsStatus>('loading');

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (wstoken === null) return;
      setStatus(mode === 'refresh' ? 'refreshing' : 'loading');
      try {
        const list = await getUpcomingEvents(wstoken, startOfTodayUnixSec(), FETCH_LIMIT);
        const sorted = [...list].sort((a, b) => a.timesort - b.timesort);
        setEvents(sorted);
        setStatus('ready');
        // 通知の再スケジュール (失敗しても UI には影響させない)
        void syncAssignmentNotifications(sorted);
      } catch (e) {
        console.error('Failed to load assignments', e);
        if (isInvalidToken(e)) {
          // トークン失効: セッションを破棄して再ログイン案内へ
          clearSession();
          setEvents([]);
          setStatus('invalidToken');
        } else {
          setStatus('error');
        }
      }
    },
    [wstoken, clearSession],
  );

  useEffect(() => {
    if (wstoken !== null) void load('initial');
  }, [wstoken, load]);

  const reload = useCallback(() => {
    void load('initial');
  }, [load]);
  const refresh = useCallback(() => {
    void load('refresh');
  }, [load]);

  return { events, status, reload, refresh };
}
