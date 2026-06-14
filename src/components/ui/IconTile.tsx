import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { IoniconsName } from './icon';
import { useTheme } from '@/theme';

export type IconTileSize = 'sm' | 'md' | 'lg';
/**
 * - 'soft' (既定): tint を薄く敷いた背景に tint 色のアイコン
 * - 'solid': tint で塗りつぶした背景に白アイコン (強調・ブランド面)
 * - 'plain': cardAlt 背景に tint 色のアイコン (中立)
 */
export type IconTileVariant = 'soft' | 'solid' | 'plain';

export interface IconTileProps {
  icon: IoniconsName;
  /** アイコン/背景の基調色。未指定なら primary。 */
  color?: string;
  size?: IconTileSize;
  variant?: IconTileVariant;
  style?: StyleProp<ViewStyle>;
}

const BOX = { sm: 30, md: 38, lg: 56 } as const;
const RADIUS = { sm: 9, md: 12, lg: 18 } as const;
const GLYPH = { sm: 16, md: 19, lg: 28 } as const;

/** 角丸の色付きアイコンチップ。アプリ全体のアイコン語彙を統一する。 */
export function IconTile({ icon, color, size = 'md', variant = 'soft', style }: IconTileProps) {
  const { colors } = useTheme();
  const tint = color ?? colors.primary;
  const background =
    variant === 'solid' ? tint : variant === 'plain' ? colors.cardAlt : `${tint}22`;
  const glyph = variant === 'solid' ? colors.onPrimary : tint;
  return (
    <View
      style={[
        styles.box,
        { width: BOX[size], height: BOX[size], borderRadius: RADIUS[size], backgroundColor: background },
        style,
      ]}
    >
      <Ionicons name={icon} size={GLYPH[size]} color={glyph} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
