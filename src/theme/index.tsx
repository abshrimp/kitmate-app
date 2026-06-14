import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';

export interface Palette {
  background: string; card: string; cardAlt: string; text: string; textSecondary: string;
  border: string; primary: string; onPrimary: string; accent: string; onAccent: string;
  danger: string; success: string; warning: string; overlay: string;
}

/**
 * ベースは可読性重視の中立色（白〜グレー / 読みやすい近黒テキスト）。
 * 京都工芸繊維大学のスクールカラーは「アクセント」として使う:
 *   primary = 深い藍 #286883 … ボタン・リンク・選択など操作色
 *   accent  = 真鍮ゴールド #BB8F51 … バッジ・強調・装飾アイコン
 * 背景や本文には色を乗せず、彩度はアクセント箇所に集中させる。
 */
export const lightPalette: Palette = {
  background: '#F5F6F8',
  card: '#FFFFFF',
  cardAlt: '#EEF0F3',
  text: '#1A1D21',
  textSecondary: '#697079',
  border: '#E4E7EC',
  primary: '#286883',
  onPrimary: '#FFFFFF',
  accent: '#BB8F51',
  onAccent: '#FFFFFF',
  danger: '#D14343',
  success: '#1F9D6B',
  warning: '#D98A1F',
  overlay: 'rgba(17, 20, 24, 0.45)',
};

export const darkPalette: Palette = {
  background: '#0E1113',
  card: '#181B1F',
  cardAlt: '#22262B',
  text: '#ECEEF1',
  textSecondary: '#969CA5',
  border: '#2C3137',
  primary: '#5FA8C2',
  onPrimary: '#08171C',
  accent: '#D6AC72',
  onAccent: '#1A130A',
  danger: '#E5736B',
  success: '#43C18B',
  warning: '#E0A24E',
  overlay: 'rgba(0, 0, 0, 0.62)',
};

export interface Theme {
  colors: Palette;
  dark: boolean;
}

const ThemeContext = createContext<Theme>({ colors: lightPalette, dark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const themeMode = useSettings((s) => s.themeMode);
  const dark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const value = useMemo<Theme>(() => ({ colors: dark ? darkPalette : lightPalette, dark }), [dark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
