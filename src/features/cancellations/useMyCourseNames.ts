import { useEffect, useMemo, useState } from 'react';

import { entriesFor, useTimetable } from '@/features/timetable/store';
import { fetchCourse, fetchCourses } from '@/lib/api';
import { currentAcademicYear, currentSemester } from '@/lib/terms';
import type { Course } from '@/types';

const courseListCache = new Map<number, Promise<Course[]>>();

function coursesForYear(year: number): Promise<Course[]> {
  const cached = courseListCache.get(year);
  if (cached) return cached;
  const p = fetchCourses({ year }).catch((e: unknown) => {
    courseListCache.delete(year);
    throw e;
  });
  courseListCache.set(year, p);
  return p;
}

export interface MyCourseNames {
  /** 現在学期の時間割に入っている講義名 (公式は Course.name、オリジナルは custom.name) */
  names: string[];
  /** 公式講義名の解決中か (解決完了までフィルタ結果が不完全になりうる) */
  resolving: boolean;
}

interface Resolved {
  key: string;
  names: string[];
}

/**
 * 「自分の時間割のみ」フィルタ用に、現在年度・現在学期のエントリの講義名を解決する。
 * courseId 持ちのエントリは api.fetchCourses (一覧 → 不足分は個別取得) で名前を引く。
 */
export function useMyCourseNames(): MyCourseNames {
  const entries = useTimetable((s) => s.entries);
  const year = currentAcademicYear();
  const term = currentSemester();

  const termEntries = useMemo(() => entriesFor(entries, year, term), [entries, year, term]);

  const customNames = useMemo(
    () =>
      termEntries
        .map((e) => e.custom?.name)
        .filter((name): name is string => name !== undefined && name !== ''),
    [termEntries],
  );

  const wantedKey = useMemo(
    () =>
      [...new Set(termEntries.map((e) => e.courseId).filter((id): id is string => id !== undefined))]
        .sort()
        .join(','),
    [termEntries],
  );

  // 解決結果は wantedKey と紐付けて保持し、キー不一致 (= 古い結果) は使わない
  const [resolved, setResolved] = useState<Resolved>({ key: '', names: [] });

  useEffect(() => {
    if (wantedKey === '') return;
    let cancelled = false;
    (async () => {
      const byId = new Map<string, string>();
      try {
        const list = await coursesForYear(year);
        for (const c of list) byId.set(c.id, c.name);
      } catch (e) {
        console.error('useMyCourseNames: failed to fetch course list', e);
      }
      const ids = wantedKey.split(',');
      const missing = ids.filter((id) => !byId.has(id));
      if (missing.length > 0) {
        const results = await Promise.allSettled(missing.map((id) => fetchCourse(id)));
        for (const r of results) {
          if (r.status === 'fulfilled') byId.set(r.value.id, r.value.name);
        }
      }
      if (cancelled) return;
      setResolved({
        key: wantedKey,
        names: ids.map((id) => byId.get(id)).filter((n): n is string => n !== undefined && n !== ''),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [year, wantedKey]);

  const resolving = wantedKey !== '' && resolved.key !== wantedKey;

  const names = useMemo(() => {
    const resolvedNames = resolved.key === wantedKey ? resolved.names : [];
    return [...new Set([...customNames, ...resolvedNames])];
  }, [customNames, resolved, wantedKey]);

  return { names, resolving };
}
