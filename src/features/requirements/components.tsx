import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export interface ProgressBarProps {
  earned: number;
  /** undefined = 要件なし (常に達成扱い) */
  required?: number;
}

/** 達成 = success / 不足 = warning のプログレスバー */
export function ProgressBar({ earned, required }: ProgressBarProps) {
  const { colors } = useTheme();
  const met = required === undefined || earned >= required;
  const ratio =
    required === undefined || required <= 0 ? 1 : Math.min(1, Math.max(0, earned / required));
  const width = `${Math.round(ratio * 100)}%` as DimensionValue;
  return (
    <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
      <View
        style={[
          styles.fill,
          { width, backgroundColor: met ? colors.success : colors.warning },
        ]}
      />
    </View>
  );
}

export interface CreditRowProps {
  label: string;
  earned: number;
  /** undefined = 要件なし (取得単位のみ表示) */
  required?: number;
  /** グループ合計行などを太字で表示 */
  emphasized?: boolean;
}

/** 区分1行: ラベル + 取得/必要単位 + プログレスバー */
export function CreditRow({ label, earned, required, emphasized }: CreditRowProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const met = required === undefined || earned >= required;
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text
          style={[styles.rowLabel, { color: colors.text }, emphasized === true && styles.bold]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.rowValue,
            { color: met ? colors.success : colors.warning },
            emphasized === true && styles.bold,
          ]}
        >
          {required === undefined
            ? t('common.credits', { n: earned })
            : t('requirements.progressValue', { earned, required })}
        </Text>
      </View>
      <ProgressBar earned={earned} required={required} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  row: {
    paddingVertical: 8,
    gap: 6,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  bold: {
    fontWeight: '700',
  },
});
