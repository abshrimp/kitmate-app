import { useCallback, useEffect, useRef, useState } from 'react';

import { loadCancellationFeed } from './feed';
import type { CancellationFeed } from '@/types';

export type FeedStatus = 'loading' | 'refreshing' | 'ready' | 'error';

export interface CancellationFeedState {
  feed: CancellationFeed | null;
  status: FeedStatus;
  /** 初回ロード or リトライ (全画面ローディング表示用) */
  reload: () => void;
  /** pull-to-refresh 用 (既存データを保持したまま再取得) */
  refresh: () => void;
}

/** 休講フィードの取得状態を管理するフック (サーバ中継 → 直接 fetch フォールバック込み) */
export function useCancellationFeed(): CancellationFeedState {
  const [feed, setFeed] = useState<CancellationFeed | null>(null);
  const [status, setStatus] = useState<FeedStatus>('loading');
  const requestSeq = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** 取得本体。状態の更新は promise 解決後にのみ行う。 */
  const execute = useCallback(() => {
    const seq = ++requestSeq.current;
    loadCancellationFeed()
      .then((result) => {
        if (!mounted.current || seq !== requestSeq.current) return;
        setFeed(result);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        console.error('useCancellationFeed: failed to load feed', e);
        if (!mounted.current || seq !== requestSeq.current) return;
        setStatus('error');
      });
  }, []);

  // 初回ロード (status 初期値が 'loading' なので setState は不要)
  useEffect(() => {
    execute();
  }, [execute]);

  const reload = useCallback(() => {
    setStatus('loading');
    execute();
  }, [execute]);

  const refresh = useCallback(() => {
    setStatus('refreshing');
    execute();
  }, [execute]);

  return { feed, status, reload, refresh };
}
