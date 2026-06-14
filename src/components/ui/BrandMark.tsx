import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { IoniconsName } from './icon';
import { useTheme } from '@/theme';

export interface BrandMarkProps {
  /** 中央のアイコン (既定: school) */
  icon?: IoniconsName;
  /** 円の直径 (既定: 88) */
  size?: number;
}

/**
 * 工繊カラーのブランド円章。藍の円に淡いハイライトを重ね、
 * 真鍮ゴールドの細いリングで縁取る。ライブラリ非依存。
 */
export function BrandMark({ icon = 'school', size = 88 }: BrandMarkProps) {
  const { colors } = useTheme();
  const ring = size + 12;
  return (
    <View style={[styles.ringWrap, { width: ring, height: ring, borderRadius: ring / 2, borderColor: `${colors.accent}88` }]}>
      <View
        style={[
          styles.disc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
      >
        {/* 上部の淡いハイライト (立体感) */}
        <View
          style={[
            styles.highlight,
            { width: size * 0.7, height: size * 0.7, borderRadius: size, top: -size * 0.28 },
          ]}
        />
        <Ionicons name={icon} size={size * 0.42} color={colors.onPrimary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  highlight: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    opacity: 0.16,
  },
});
