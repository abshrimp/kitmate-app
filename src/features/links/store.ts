import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { IoniconsName } from '@/components/ui';

/** ユーザーが追加したカスタムリンク */
export interface CustomLink {
  id: string;
  /** 既存グループの id、または新規グループ名 (ユーザー入力文字列をそのままキーにする) */
  group: string;
  title: string;
  url: string;
  icon: IoniconsName;
}

/** カスタムリンク用の簡易一意 id */
function generateCustomLinkId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `custom-${Date.now().toString(36)}-${rand}`;
}

export interface LinksState {
  /** 非表示にしたリンクの id (デフォルト・カスタム共通) */
  hiddenIds: string[];
  /** グループキー → グループ内リンク id の表示順 */
  orderOverrides: Record<string, string[]>;
  customLinks: CustomLink[];
  toggleHidden: (id: string) => void;
  setGroupOrder: (groupKey: string, orderedIds: string[]) => void;
  addCustomLink: (link: Omit<CustomLink, 'id'>) => void;
  removeCustomLink: (id: string) => void;
}

export const useLinks = create<LinksState>()(
  persist(
    (set, get) => ({
      hiddenIds: [],
      orderOverrides: {},
      customLinks: [],
      toggleHidden: (id) => {
        const current = get().hiddenIds;
        set({
          hiddenIds: current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id],
        });
      },
      setGroupOrder: (groupKey, orderedIds) =>
        set({
          orderOverrides: { ...get().orderOverrides, [groupKey]: [...orderedIds] },
        }),
      addCustomLink: (link) =>
        set({
          customLinks: [...get().customLinks, { ...link, id: generateCustomLinkId() }],
        }),
      removeCustomLink: (id) => {
        const { customLinks, hiddenIds, orderOverrides } = get();
        const next: Record<string, string[]> = {};
        for (const [key, ids] of Object.entries(orderOverrides)) {
          next[key] = ids.filter((x) => x !== id);
        }
        set({
          customLinks: customLinks.filter((l) => l.id !== id),
          hiddenIds: hiddenIds.filter((x) => x !== id),
          orderOverrides: next,
        });
      },
    }),
    {
      name: 'kitmate-links',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
