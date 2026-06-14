import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { IoniconsName } from './icon';
import { useTheme } from '@/theme';

export interface BadgeProps {
  label: string;
  color?: string;
  /** ラベル左に小さなアイコンを添える (文字に頼らない識別性) */
  icon?: IoniconsName;
}

/** 小さなピル型ラベル。color 未指定時は primary。 */
export function Badge({ label, color, icon }: BadgeProps) {
  const { colors } = useTheme();
  const tint = color ?? colors.primary;
  return (
    <View style={[styles.root, { backgroundColor: `${tint}1F` }]}>
      {icon !== undefined && <Ionicons name={icon} size={11} color={tint} />}
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
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
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
