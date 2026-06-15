import { create } from 'zustand';

import type { WidgetAssignment, WidgetClass } from './payload';

/**
 * ウィジェット用データの一時保持ストア (永続化しない)。
 * 今日のコマは {@link useWidgetSync} が、直近の課題は課題取得時に各画面が書き込み、
 * どちらかが更新されるたびに共有ストレージへ反映する。
 */
interface WidgetDataState {
  classes: WidgetClass[] | null;
  assignment: WidgetAssignment | null;
  setClasses: (classes: WidgetClass[]) => void;
  setAssignment: (assignment: WidgetAssignment | null) => void;
}

export const useWidgetData = create<WidgetDataState>((set) => ({
  classes: null,
  assignment: null,
  setClasses: (classes) => set({ classes }),
  setAssignment: (assignment) => set({ assignment }),
}));
