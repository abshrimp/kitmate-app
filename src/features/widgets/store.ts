import { create } from 'zustand';

import type { WidgetAssignment, WidgetClass } from './payload';

/**
 * ウィジェット用データの一時保持ストア (永続化しない)。
 * 今日のコマは {@link useWidgetSync} が、直近の課題は課題取得時に各画面が書き込み、
 * どちらかが更新されるたびに共有ストレージへ反映する。
 */
interface WidgetDataState {
  classes: WidgetClass[] | null;
  assignments: WidgetAssignment[] | null;
  setClasses: (classes: WidgetClass[]) => void;
  setAssignments: (assignments: WidgetAssignment[]) => void;
}

export const useWidgetData = create<WidgetDataState>((set) => ({
  classes: null,
  assignments: null,
  setClasses: (classes) => set({ classes }),
  setAssignments: (assignments) => set({ assignments }),
}));
