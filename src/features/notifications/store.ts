import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MAX_ITEMS = 100;

export interface NotificationRecord {
  id: string; // 通知の識別子 (重複追加防止に使う)
  title: string;
  body: string;
  receivedAt: number; // unix ms
}

interface NotificationHistoryState {
  items: NotificationRecord[];
  lastSeenAt: number; // 通知画面を最後に開いた時刻 (unix ms)。未読バッジ判定に使う
  add: (rec: NotificationRecord) => void;
  clear: () => void;
  markSeen: (ts: number) => void;
}

/** 受信したローカル/プッシュ通知の履歴 (新しい順、最大 100 件) を端末に永続化する。 */
export const useNotificationHistory = create<NotificationHistoryState>()(
  persist(
    (set) => ({
      items: [],
      lastSeenAt: 0,
      add: (rec) =>
        set((state) => {
          // 同一 id が直近にあれば重複追加しない (受信 + タップで二重に来るため)
          if (state.items.some((x) => x.id === rec.id)) return state;
          return { items: [rec, ...state.items].slice(0, MAX_ITEMS) };
        }),
      clear: () => set({ items: [] }),
      markSeen: (ts) => set((state) => ({ lastSeenAt: Math.max(state.lastSeenAt, ts) })),
    }),
    {
      name: 'kitmate-notification-history',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
