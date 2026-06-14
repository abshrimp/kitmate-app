import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import type { MoodleSiteInfo } from '@/types';

const WSTOKEN_KEY = 'kitmate.wstoken';

export interface AuthState {
  wstoken: string | null;          // メモリ上。永続化は SecureStore (native のみ)
  siteInfo: MoodleSiteInfo | null;
  lastValidatedAt: number | null;  // unix ms
  hydrated: boolean;
  setSession: (wstoken: string, info: MoodleSiteInfo) => void;  // SecureStore へも保存
  clearSession: () => void;
  hydrate: () => Promise<void>;    // 起動時に SecureStore から復元
}

export const useAuth = create<AuthState>()((set) => ({
  wstoken: null,
  siteInfo: null,
  lastValidatedAt: null,
  hydrated: false,
  setSession: (wstoken, info) => {
    set({ wstoken, siteInfo: info, lastValidatedAt: Date.now() });
    if (Platform.OS !== 'web') {
      SecureStore.setItemAsync(WSTOKEN_KEY, wstoken).catch((e) => {
        console.error('Failed to persist wstoken', e);
      });
    }
  },
  clearSession: () => {
    set({ wstoken: null, siteInfo: null, lastValidatedAt: null });
    if (Platform.OS !== 'web') {
      SecureStore.deleteItemAsync(WSTOKEN_KEY).catch((e) => {
        console.error('Failed to delete wstoken', e);
      });
    }
  },
  hydrate: async () => {
    // web ではログイン機能なし: 常に未ログインのまま hydrated にする
    if (Platform.OS === 'web') {
      set({ hydrated: true });
      return;
    }
    try {
      const token = await SecureStore.getItemAsync(WSTOKEN_KEY);
      if (token) set({ wstoken: token });
    } catch (e) {
      console.error('Failed to hydrate wstoken', e);
    } finally {
      set({ hydrated: true });
    }
  },
}));
