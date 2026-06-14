import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';

export interface Palette {
  background: string; card: string; cardAlt: string; text: string; textSecondary: string;
  border: string; primary: string; onPrimary: string; accent: string; onAccent: string;
  danger: string; success: string; warning: string; overlay: string;
}

// 時間割コマの科目区分デフォルト色 (英語:赤 / 基盤教養:黄 / 実践教養:緑 / 高年次:橙 /
// 専門導入:水色 / 専門基礎:紫 / 課程専門:青 / 卒業研究:桃 / 要件外:灰)
export interface CategoryPalette {
  english: string; foundation: string; practical: string; senior: string;
  intro: string; basic: string; program: string; research: string; other: string;
}

export const lightCategoryColors: CategoryPalette = {
  english: '#E0484D', foundation: '#D9A41C', practical: '#2FA56B', senior: '#E0852E',
  intro: '#2F9FC4', basic: '#8B5CF6', program: '#3B6FE0', research: '#E0529B', other: '#9AA0A8',
};

export const darkCategoryColors: CategoryPalette = {
  english: '#E5736B', foundation: '#E0B450', practical: '#43C18B', senior: '#E8A24E',
  intro: '#5FB8D6', basic: '#A78BFA', program: '#6E97E8', research: '#E87CB3', other: '#969CA5',
};

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
  category: CategoryPalette;
  dark: boolean;
}

const ThemeContext = createContext<Theme>({
  colors: lightPalette,
  category: lightCategoryColors,
  dark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const themeMode = useSettings((s) => s.themeMode);
  const dark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const value = useMemo<Theme>(
    () => ({
      colors: dark ? darkPalette : lightPalette,
      category: dark ? darkCategoryColors : lightCategoryColors,
      dark,
    }),
    [dark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
