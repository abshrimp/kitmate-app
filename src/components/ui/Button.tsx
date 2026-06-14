import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import type { IoniconsName } from './icon';
import { useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IoniconsName;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, icon }: ButtonProps) {
  const { colors } = useTheme();
  const background =
    variant === 'primary' ? colors.primary :
    variant === 'accent' ? colors.accent :
    variant === 'secondary' ? colors.cardAlt :
    variant === 'danger' ? colors.danger :
    'transparent';
  const foreground =
    variant === 'primary' || variant === 'danger' ? colors.onPrimary :
    variant === 'accent' ? colors.onAccent :
    variant === 'secondary' ? colors.text :
    colors.primary;
  const inactive = disabled === true || loading === true;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background },
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        inactive && styles.disabled,
      ]}
    >
      {loading === true ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        <>
          {icon !== undefined && <Ionicons name={icon} size={18} color={foreground} />}
          <Text style={[styles.title, { color: foreground }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    minHeight: 48,
  },
  ghost: {
    paddingVertical: 9,
    minHeight: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
