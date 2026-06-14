import { useCallback, useEffect, useState } from 'react';

interface LoadedResult<T> {
  loader: () => Promise<T>;
  nonce: number;
  value: T | null;
  failed: boolean;
}

export interface LoadState<T> {
  /** 取得済みデータ (loading / failed 中は null) */
  data: T | null;
  loading: boolean;
  failed: boolean;
  reload: () => void;
}

/**
 * useCallback でメモ化した loader を実行する小さなデータ取得フック。
 * 結果は loader の同一性 + nonce をキーに保持し、一致しない間は loading として
 * 扱う派生状態パターン (effect 内での同期 setState を避ける)。
 */
export function useLoad<T>(loader: () => Promise<T>): LoadState<T> {
  const [result, setResult] = useState<LoadedResult<T> | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((value) => {
        if (!cancelled) setResult({ loader, nonce, value, failed: false });
      })
      .catch((e: unknown) => {
        console.error('useLoad: loader failed', e);
        if (!cancelled) setResult({ loader, nonce, value: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [loader, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const current = result !== null && result.loader === loader && result.nonce === nonce ? result : null;
  return {
    data: current?.value ?? null,
    loading: current === null,
    failed: current?.failed ?? false,
    reload,
  };
}
