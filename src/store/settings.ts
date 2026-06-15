import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ProgramSelection } from '@/types';

// メインタブの識別子 (ルート名)。'more' は起動タブ対象外。
export type TabKey = 'index' | 'timetable' | 'assignments' | 'info' | 'links';

export interface SettingsState {
  themeMode: 'system' | 'light' | 'dark';
  language: 'system' | 'ja' | 'en';
  admissionYear: number | null;            // 入学年度
  programSelection: ProgramSelection | null;
  showOtherProgram: boolean;               // 他課程科目を選択肢に表示 (default false)
  showNotAllowed: boolean;                 // 履修不可を選択肢に表示 (default false)
  showHigherGrades: boolean;               // 上の学年の講義も表示 (下履修, default false)
  assignmentNotifications: boolean;        // 課題 push 通知 (default false)
  assignmentNotifyHoursBefore: number[];   // 締切何時間前 (複数可, default [24])
  cancellationNotifications: boolean;      // 休講 push 通知 (default false)
  lectureInfoNotifications: boolean;       // 授業関連連絡 push 通知 (default false)
  startupTab: 'last' | TabKey;             // 起動時に開くタブ ('last' = 最後に開いていたタブ)
  lastTab: TabKey;                         // 最後に開いていたタブ (startupTab='last' 用に記録)
  homeQuickLinks: string[];                // ホームのクイックリンク (表示順, quickLinks カタログのキー)
  homeSections: string[];                  // ホームのセクション (表示順, 非表示は除外)
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      language: 'system',
      admissionYear: null,
      programSelection: null,
      showOtherProgram: false,
      showNotAllowed: false,
      showHigherGrades: false,
      assignmentNotifications: false,
      assignmentNotifyHoursBefore: [24],
      cancellationNotifications: false,
      lectureInfoNotifications: false,
      startupTab: 'index',
      lastTab: 'index',
      homeQuickLinks: ['timetable', 'syllabus', 'requirements', 'map'],
      homeSections: ['weather', 'assignments', 'notices', 'schedule', 'quickLinks'],
      set: (key, value) => set({ [key]: value } as unknown as Partial<SettingsState>),
    }),
    {
      name: 'kitmate-settings',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _set, ...rest }) => rest,
      // assignmentNotifyHoursBefore を number(旧) → number[] へ確実に正規化する
      migrate: (persisted) => {
        const s = (persisted ?? {}) as Record<string, unknown>;
        if (!Array.isArray(s.assignmentNotifyHoursBefore)) {
          s.assignmentNotifyHoursBefore =
            typeof s.assignmentNotifyHoursBefore === 'number'
              ? [s.assignmentNotifyHoursBefore]
              : [24];
        }
        return s as unknown as SettingsState;
      },
    },
  ),
);
