import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface CardProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** 'brand' でブランド色を薄く敷いた強調カードにする */
  tone?: 'default' | 'brand';
}

/** 角丸16・控えめな影のカード */
export function Card({ children, style, onPress, tone = 'default' }: CardProps) {
  const { colors, dark } = useTheme();
  const brand = tone === 'brand';
  const base: ViewStyle = {
    backgroundColor: brand ? `${colors.primary}${dark ? '24' : '14'}` : colors.card,
    borderColor: brand ? `${colors.primary}${dark ? '40' : '2E'}` : colors.border,
    shadowColor: brand ? colors.primary : colors.text,
    shadowOpacity: brand ? (dark ? 0.3 : 0.12) : dark ? 0.25 : 0.06,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, base, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, base, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
