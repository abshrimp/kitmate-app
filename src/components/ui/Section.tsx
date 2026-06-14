import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

export interface SectionProps {
  title: string;
  children?: ReactNode;
  right?: ReactNode;
}

/** 小見出し付きセクション */
export function Section({ title, children, right }: SectionProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        {right != null && <View style={styles.right}>{right}</View>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
