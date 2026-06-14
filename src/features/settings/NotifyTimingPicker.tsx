import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/ui';
import { useI18n, type I18n } from '@/i18n';
import { useTheme } from '@/theme';

// プリセットのリード時間 (時間)
const PRESETS = [1, 3, 6, 12, 24, 48, 168];

/** リード時間(時間) を「○時間前 / ○日前 / ○週間前」に整形 */
function leadLabel(h: number, t: I18n['t']): string {
  if (h % 168 === 0) return t('settings.leadWeeks', { n: h / 168 });
  if (h % 24 === 0) return t('settings.leadDays', { n: h / 24 });
  return t('settings.leadHours', { n: h });
}

export interface NotifyTimingPickerProps {
  value: number[];
  onChange: (value: number[]) => void;
}

/** 課題通知のリード時間を複数選択 + カスタム追加で設定する */
export function NotifyTimingPicker({ value, onChange }: NotifyTimingPickerProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [custom, setCustom] = useState('');

  const selected = new Set(value);
  const presetSet = new Set(PRESETS);
  const customValues = value.filter((v) => !presetSet.has(v)).sort((a, b) => a - b);

  const toggle = (h: number) => {
    onChange(selected.has(h) ? value.filter((x) => x !== h) : [...value, h].sort((a, b) => a - b));
  };

  const addCustom = () => {
    const n = Number(custom.trim());
    if (!Number.isFinite(n) || n <= 0) return;
    const h = Math.round(n);
    if (!selected.has(h)) onChange([...value, h].sort((a, b) => a - b));
    setCustom('');
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('settings.notifyTiming')}
      </Text>
      <View style={styles.chips}>
        {PRESETS.map((h) => {
          const on = selected.has(h);
          return (
            <Pressable
              key={h}
              accessibilityRole="button"
              onPress={() => toggle(h)}
              style={[
                styles.chip,
                {
                  backgroundColor: on ? colors.primary : colors.cardAlt,
                  borderColor: on ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: on ? colors.onPrimary : colors.text }]}>
                {leadLabel(h, t)}
              </Text>
            </Pressable>
          );
        })}
        {customValues.map((h) => (
          <Pressable
            key={h}
            accessibilityRole="button"
            onPress={() => toggle(h)}
            style={[styles.chip, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text style={[styles.chipText, { color: colors.onPrimary }]}>{leadLabel(h, t)}</Text>
            <Ionicons name="close" size={14} color={colors.onPrimary} />
          </Pressable>
        ))}
      </View>
      <View style={styles.customRow}>
        <View style={styles.customInput}>
          <TextField
            value={custom}
            onChangeText={setCustom}
            keyboardType="number-pad"
            placeholder={t('settings.notifyCustomPlaceholder')}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={addCustom}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add" size={20} color={colors.onPrimary} />
        </Pressable>
      </View>
      {value.length === 0 && (
        <Text style={[styles.hint, { color: colors.danger }]}>{t('settings.notifyNoneHint')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInput: {
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  hint: {
    fontSize: 12,
  },
});
