import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { IoniconsName } from './icon';
import { useTheme } from '@/theme';

export interface EmptyStateProps {
  icon?: IoniconsName;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      {icon !== undefined && (
        <View style={[styles.iconWrap, { backgroundColor: colors.cardAlt }]}>
          <Ionicons name={icon} size={36} color={colors.textSecondary} />
        </View>
      )}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message !== undefined && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      )}
      {action != null && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 6,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: 14,
  },
});
