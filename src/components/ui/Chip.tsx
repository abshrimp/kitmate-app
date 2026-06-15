import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { IoniconsName } from './icon';
import { useTheme } from '@/theme';

export type ChipTone = 'neutral' | 'primary' | 'accent' | 'danger' | 'success' | 'warning';

export interface ChipProps {
  label: string;
  /** ラベル左の小アイコン (文字に頼らない識別性) */
  icon?: IoniconsName;
  /** 色調。neutral は淡いサーフェス、その他はその色のソフトな下地 + 文字色。 */
  tone?: ChipTone;
}

/**
 * 事実系メタデータ (日付・時刻・教室・時限など) をやわらかい角丸の器で囲うチップ。
 * 分類・状態を強調する {@link Badge} (濃いピル) とは役割が異なり、
 * こちらは読みやすさのための控えめな情報まとまり。
 */
export function Chip({ label, icon, tone = 'neutral' }: ChipProps) {
  const { colors } = useTheme();
  const palette: Record<ChipTone, { fg: string; bg: string }> = {
    neutral: { fg: colors.textSecondary, bg: colors.cardAlt },
    primary: { fg: colors.primary, bg: `${colors.primary}1F` },
    accent: { fg: colors.accent, bg: `${colors.accent}1F` },
    danger: { fg: colors.danger, bg: `${colors.danger}1F` },
    success: { fg: colors.success, bg: `${colors.success}1F` },
    warning: { fg: colors.warning, bg: `${colors.warning}1F` },
  };
  const { fg, bg } = palette[tone];
  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {icon !== undefined && <Ionicons name={icon} size={12} color={fg} />}
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
