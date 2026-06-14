import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

export interface SegmentedControlOption {
  label: string;
  value: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  const { colors, dark } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.cardAlt }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.item,
              selected && [
                styles.selected,
                {
                  backgroundColor: colors.card,
                  borderColor: `${colors.primary}33`,
                  shadowColor: colors.primary,
                  shadowOpacity: dark ? 0.35 : 0.16,
                },
              ],
            ]}
          >
            <Text
              style={[styles.label, { color: selected ? colors.primary : colors.textSecondary }]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  selected: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
