import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconTile, type IconTileVariant } from './IconTile';
import type { IoniconsName } from './icon';
import { useTheme } from '@/theme';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: IoniconsName;
  /** アイコンチップの基調色。指定すると色付きタイルになる。 */
  iconColor?: string;
  /** アイコンチップの見た目 (既定: 色指定があれば 'soft'、無ければ 'plain') */
  iconVariant?: IconTileVariant;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}

export function ListItem({
  title,
  subtitle,
  icon,
  iconColor,
  iconVariant,
  right,
  onPress,
  destructive,
}: ListItemProps) {
  const { colors } = useTheme();
  const tint = destructive === true ? colors.danger : iconColor ?? colors.primary;
  const titleColor = destructive === true ? colors.danger : colors.text;
  const variant: IconTileVariant =
    iconVariant ?? (iconColor !== undefined || destructive === true ? 'soft' : 'plain');
  const content = (
    <>
      {icon !== undefined && <IconTile icon={icon} color={tint} variant={variant} />}
      <View style={styles.body}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle !== undefined && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {right != null && <View style={styles.right}>{right}</View>}
      {right == null && onPress !== undefined && (
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      )}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.root, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.root}>{content}</View>;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
