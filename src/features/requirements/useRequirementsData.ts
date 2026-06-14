import { useCallback, useEffect, useState } from 'react';

import { fetchCourse, fetchCourses, fetchRequirements, type RequirementsResponse } from '@/lib/api';
import type { Course } from '@/types';

export type RequirementsDataStatus = 'loading' | 'error' | 'ready';

export interface RequirementsData {
  status: RequirementsDataStatus;
  /** 講義 id → Course (fetchCourses + 不足分の個別 fetchCourse) */
  coursesById: ReadonlyMap<string, Course>;
  requirements: RequirementsResponse | null;
  reload: () => void;
}

const EMPTY_COURSES: ReadonlyMap<string, Course> = new Map<string, Course>();

/** 読み込み結果。key が現在の入力と一致しなければ loading 扱い (派生状態) */
interface LoadedResult {
  key: string;
  coursesById: ReadonlyMap<string, Course>;
  requirements: RequirementsResponse | null;
  failed: boolean;
}

/**
 * 要件セットと講義マスタを読み込む。
 * 取得失敗時はフォールバックせず failed 状態にする (lib/api はエラーを伝播する)。
 */
export function useRequirementsData(
  admissionYear: number,
  variantKey: string,
  courseIds: readonly string[],
): RequirementsData {
  const [loaded, setLoaded] = useState<LoadedResult | null>(null);
  const [nonce, setNonce] = useState(0);

  // 配列の同値性で effect を安定させるためのキー (時間割番号に区切り文字は含まれない前提)
  const idsKey = courseIds.join('\u0000');
  const loadKey = `${admissionYear}\u0001${variantKey}\u0001${idsKey}\u0001${nonce}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = idsKey === '' ? [] : idsKey.split('\u0000');
      const [courses, reqs] = await Promise.all([
        fetchCourses({}),
        fetchRequirements(admissionYear, variantKey),
      ]);
      const map = new Map<string, Course>(courses.map((c): [string, Course] => [c.id, c]));
      const missing = ids.filter((id) => !map.has(id));
      if (missing.length > 0) {
        const results = await Promise.allSettled(missing.map((id) => fetchCourse(id)));
        for (const r of results) {
          if (r.status === 'fulfilled') map.set(r.value.id, r.value);
        }
      }
      if (cancelled) return;
      setLoaded({ key: loadKey, coursesById: map, requirements: reqs, failed: false });
    })().catch((e: unknown) => {
      console.error('useRequirementsData: failed to load', e);
      if (cancelled) return;
      setLoaded({ key: loadKey, coursesById: EMPTY_COURSES, requirements: null, failed: true });
    });
    return () => {
      cancelled = true;
    };
  }, [admissionYear, variantKey, idsKey, loadKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const current = loaded !== null && loaded.key === loadKey ? loaded : null;
  const status: RequirementsDataStatus =
    current === null ? 'loading' : current.failed ? 'error' : 'ready';

  return {
    status,
    coursesById: current?.coursesById ?? EMPTY_COURSES,
    requirements: current?.requirements ?? null,
    reload,
  };
}
