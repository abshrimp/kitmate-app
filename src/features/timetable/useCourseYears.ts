import { useEffect, useState } from 'react';

import { fetchCourseYears } from '@/lib/api';

// 講義データが存在する年度一覧を取得 (セッション内メモリキャッシュ)。
let cache: number[] | null = null;

/** データのある年度一覧。取得前/失敗時は null。 */
export function useCourseYears(): number[] | null {
  const [years, setYears] = useState<number[] | null>(cache);

  useEffect(() => {
    if (cache !== null) return;
    let cancelled = false;
    fetchCourseYears()
      .then((y) => {
        cache = y;
        if (!cancelled) setYears(y);
      })
      .catch((e: unknown) => console.error('fetchCourseYears failed', e));
    return () => {
      cancelled = true;
    };
  }, []);

  return years;
}
