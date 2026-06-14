import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ProgramSelection } from '@/types';

export interface SettingsState {
  themeMode: 'system' | 'light' | 'dark';
  language: 'system' | 'ja' | 'en';
  admissionYear: number | null;            // 入学年度
  programSelection: ProgramSelection | null;
  showOtherProgram: boolean;               // 他課程科目を選択肢に表示 (default false)
  showNotAllowed: boolean;                 // 履修不可を選択肢に表示 (default false)
  assignmentNotifications: boolean;        // 課題 push 通知 (default false)
  assignmentNotifyHoursBefore: number;     // 締切何時間前 (default 24)
  cancellationNotifications: boolean;      // 休講 push 通知 (default false)
  lectureInfoNotifications: boolean;       // 授業関連連絡 push 通知 (default false)
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
      assignmentNotifications: false,
      assignmentNotifyHoursBefore: 24,
      cancellationNotifications: false,
      lectureInfoNotifications: false,
      set: (key, value) => set({ [key]: value } as unknown as Partial<SettingsState>),
    }),
    {
      name: 'kitmate-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
);
