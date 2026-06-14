import { useEffect, useState } from 'react';

import { fetchCourse, fetchCourses } from '@/lib/api';
import type { Course, TimetableEntry } from '@/types';

export type CourseMap = Record<string, Course>;

const EMPTY_MAP: CourseMap = {};

const yearCache = new Map<number, Promise<Course[]>>();

function coursesForYear(year: number): Promise<Course[]> {
  const cached = yearCache.get(year);
  if (cached) return cached;
  const p = fetchCourses({ year }).catch((e: unknown) => {
    yearCache.delete(year);
    throw e;
  });
  yearCache.set(year, p);
  return p;
}

interface LoadedMap {
  key: string;
  map: CourseMap;
}

/**
 * エントリが参照する公式講義を解決して id → Course のマップを返す。
 * 年度一覧をまず引き、足りない id は個別取得で補完する。
 * 結果はキー付きで保持し、現在の入力と一致しない間は loading 扱い (派生状態)。
 */
export function useCourseMap(
  year: number,
  entries: TimetableEntry[],
): { courseMap: CourseMap; loading: boolean } {
  const [loaded, setLoaded] = useState<LoadedMap | null>(null);

  const wantedIds = entries
    .map((e) => e.courseId)
    .filter((id): id is string => id !== undefined)
    .sort();
  const wantedKey = wantedIds.join(',');
  const key = `${year}|${wantedKey}`;

  useEffect(() => {
    if (wantedKey === '') return;
    let cancelled = false;
    (async () => {
      const map: CourseMap = {};
      try {
        const list = await coursesForYear(year);
        for (const c of list) map[c.id] = c;
      } catch (e) {
        console.error('useCourseMap: failed to fetch course list', e);
      }
      const missing = wantedKey.split(',').filter((id) => map[id] === undefined);
      if (missing.length > 0) {
        const results = await Promise.allSettled(missing.map((id) => fetchCourse(id)));
        for (const r of results) {
          if (r.status === 'fulfilled') map[r.value.id] = r.value;
        }
      }
      if (!cancelled) setLoaded({ key: `${year}|${wantedKey}`, map });
    })();
    return () => {
      cancelled = true;
    };
  }, [year, wantedKey]);

  if (wantedKey === '') {
    return { courseMap: EMPTY_MAP, loading: false };
  }
  const isCurrent = loaded !== null && loaded.key === key;
  // 再読み込み中は直前のマップを返してちらつきを抑える
  return { courseMap: loaded?.map ?? EMPTY_MAP, loading: !isCurrent };
}
