import { Ionicons } from '@expo/vector-icons';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

export interface SelectModalOption {
  label: string;
  value: string;
  subtitle?: string;
}

export interface SelectModalProps {
  visible: boolean;
  title: string;
  options: SelectModalOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

/** ボトムシート風の選択モーダル */
export function SelectModal({ visible, title, options, onSelect, onClose }: SelectModalProps) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => undefined}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            )}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => onSelect(item.value)}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <View style={styles.optionBody}>
                  <Text style={[styles.optionLabel, { color: colors.text }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.subtitle !== undefined && (
                    <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                  )}
                </View>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
  },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionBody: {
    gap: 2,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionSubtitle: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.6,
  },
});
