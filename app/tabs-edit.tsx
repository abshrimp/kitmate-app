import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ListItem, Screen, Section } from '@/components/ui';
import { REORDERABLE_TABS, reorderableTab } from '@/features/settings/tabsConfig';
import { useI18n } from '@/i18n';
import { useSettings, type TabKey } from '@/store/settings';
import { useTheme } from '@/theme';

/** 下部タブ(時間割/課題/お知らせ/リンク)の並び替え・表示切替を編集する (モーダル)。 */
export default function TabsEditScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const tabOrder = useSettings((s) => s.tabOrder);
  const set = useSettings((s) => s.set);

  const hidden = REORDERABLE_TABS.filter((d) => !tabOrder.includes(d.key));

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= tabOrder.length) return;
    const next = [...tabOrder];
    [next[index], next[j]] = [next[j], next[index]];
    set('tabOrder', next);
  };
  const hide = (key: TabKey) => set('tabOrder', tabOrder.filter((k) => k !== key));
  const add = (key: TabKey) => set('tabOrder', [...tabOrder, key]);

  return (
    <Screen title={t('settings.editTabs')} close>
      <Text style={[styles.note, { color: colors.textSecondary }]}>
        {t('settings.editTabsNote')}
      </Text>
      <Section title={t('home.shown')}>
        <Card>
          {tabOrder.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('settings.editTabsEmpty')}
            </Text>
          ) : (
            tabOrder.map((key, index) => {
              const def = reorderableTab(key);
              if (def === undefined) return null;
              return (
                <ListItem
                  key={key}
                  icon={def.icon}
                  iconColor={colors.primary}
                  title={t(def.titleKey)}
                  right={
                    <View style={styles.controls}>
                      <IconButton
                        icon="chevron-up"
                        disabled={index === 0}
                        onPress={() => move(index, -1)}
                      />
                      <IconButton
                        icon="chevron-down"
                        disabled={index === tabOrder.length - 1}
                        onPress={() => move(index, 1)}
                      />
                      <IconButton icon="eye-off-outline" tone="danger" onPress={() => hide(key)} />
                    </View>
                  }
                />
              );
            })
          )}
        </Card>
      </Section>

      {hidden.length > 0 && (
        <Section title={t('home.hidden')}>
          <Card>
            {hidden.map((def) => (
              <ListItem
                key={def.key}
                icon={def.icon}
                iconColor={colors.textSecondary}
                title={t(def.titleKey)}
                right={<IconButton icon="add" tone="primary" onPress={() => add(def.key)} />}
              />
            ))}
          </Card>
        </Section>
      )}
    </Screen>
  );
}

function IconButton({
  icon,
  onPress,
  disabled = false,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'danger';
}) {
  const { colors } = useTheme();
  const color = disabled
    ? colors.border
    : tone === 'danger'
      ? colors.danger
      : tone === 'primary'
        ? colors.primary
        : colors.textSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && !disabled && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
});
