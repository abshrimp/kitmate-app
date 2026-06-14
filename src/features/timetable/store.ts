import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { currentAcademicYear, currentSemester } from '@/lib/terms';
import type { Quarter, Semester, TimetableEntry } from '@/types';

/** Math.random ベースの簡易 uuid (v4 風) */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface TimetableState {
  entries: TimetableEntry[];
  viewYear: number;
  viewTerm: Semester;
  quarterFilter: 'all' | Quarter;
  addEntry: (e: TimetableEntry) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, patch: Partial<TimetableEntry>) => void;
  replaceAll: (entries: TimetableEntry[]) => void;
  importEntries: (entries: TimetableEntry[], mode: 'merge' | 'replace') => void;
  setView: (year: number, term: Semester) => void;
  setQuarterFilter: (q: 'all' | Quarter) => void;
}

/** merge インポート時の重複判定キー */
function dedupeKey(e: TimetableEntry): string {
  const subject = e.courseId ?? `custom:${e.custom?.name ?? ''}`;
  const quarters = e.quarters === undefined ? '' : [...e.quarters].sort().join(',');
  return [e.year, e.term, e.day ?? '-', e.period ?? '-', subject, quarters].join('|');
}

export const useTimetable = create<TimetableState>()(
  persist(
    (set, get) => ({
      entries: [],
      viewYear: currentAcademicYear(),
      viewTerm: currentSemester(),
      quarterFilter: 'all',
      addEntry: (e) => set({ entries: [...get().entries, e] }),
      removeEntry: (id) => set({ entries: get().entries.filter((e) => e.id !== id) }),
      updateEntry: (id, patch) =>
        set({
          entries: get().entries.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
        }),
      replaceAll: (entries) => set({ entries: [...entries] }),
      importEntries: (incoming, mode) => {
        const current = get().entries;
        if (mode === 'replace') {
          // インポートに含まれる (年度, 学期) の既存エントリを置き換える
          const scopes = new Set(incoming.map((e) => `${e.year}|${e.term}`));
          const kept = current.filter((e) => !scopes.has(`${e.year}|${e.term}`));
          const usedIds = new Set(kept.map((e) => e.id));
          const next = incoming.map((e) => {
            const id = usedIds.has(e.id) ? generateId() : e.id;
            usedIds.add(id);
            return { ...e, id };
          });
          set({ entries: [...kept, ...next] });
          return;
        }
        // merge: 既存と内容が同一のものはスキップ。id 衝突は振り直す
        const existingKeys = new Set(current.map(dedupeKey));
        const usedIds = new Set(current.map((e) => e.id));
        const added: TimetableEntry[] = [];
        for (const e of incoming) {
          const key = dedupeKey(e);
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);
          const id = usedIds.has(e.id) ? generateId() : e.id;
          usedIds.add(id);
          added.push({ ...e, id });
        }
        set({ entries: [...current, ...added] });
      },
      setView: (year, term) => set({ viewYear: year, viewTerm: term }),
      setQuarterFilter: (q) => set({ quarterFilter: q }),
    }),
    {
      name: 'kitmate-timetable',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        entries: s.entries,
        viewYear: s.viewYear,
        viewTerm: s.viewTerm,
        quarterFilter: s.quarterFilter,
      }),
    },
  ),
);

/**
 * 指定年度・学期 (+クォーター) に表示すべきエントリを返す。
 * quarter 指定時: 学期全体開講 (quarters 未指定) と該当クォーター開講のみ。
 */
export function entriesFor(
  entries: TimetableEntry[],
  year: number,
  term: Semester,
  quarter?: Quarter,
): TimetableEntry[] {
  return entries.filter((e) => {
    if (e.year !== year || e.term !== term) return false;
    if (quarter === undefined) return true;
    return e.quarters === undefined || e.quarters.length === 0 || e.quarters.includes(quarter);
  });
}

/** 2つのエントリの開講期間 (クォーター集合) が重なるか。undefined/空 = 学期全体 */
export function quartersOverlap(a: Quarter[] | undefined, b: Quarter[] | undefined): boolean {
  if (a === undefined || a.length === 0 || b === undefined || b.length === 0) return true;
  return a.some((q) => b.includes(q));
}

/** 追加候補 candidates と同一コマ・同一期間で衝突する既存エントリを返す */
export function findConflicts(
  existing: TimetableEntry[],
  candidates: TimetableEntry[],
): TimetableEntry[] {
  return existing.filter((e) =>
    candidates.some(
      (c) =>
        e.year === c.year &&
        e.term === c.term &&
        e.day !== undefined &&
        c.day !== undefined &&
        e.day === c.day &&
        e.period === c.period &&
        quartersOverlap(e.quarters, c.quarters),
    ),
  );
}
