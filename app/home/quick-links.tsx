import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ListItem, Screen, Section } from '@/components/ui';
import { QUICK_LINK_CATALOG, quickLinkDef } from '@/features/home/quickLinks';
import { useI18n } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

/** ホームのクイックリンクの表示/非表示・並び替えを編集する (モーダル) */
export default function QuickLinksEditScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const visible = useSettings((s) => s.homeQuickLinks);
  const set = useSettings((s) => s.set);

  const hidden = QUICK_LINK_CATALOG.filter((d) => !visible.includes(d.key));

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= visible.length) return;
    const next = [...visible];
    [next[index], next[j]] = [next[j], next[index]];
    set('homeQuickLinks', next);
  };
  const hide = (key: string) => set('homeQuickLinks', visible.filter((k) => k !== key));
  const add = (key: string) => set('homeQuickLinks', [...visible, key]);

  return (
    <Screen title={t('home.editQuickLinks')} close>
      <Section title={t('home.shown')}>
        <Card>
          {visible.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('home.quickLinksEmpty')}
            </Text>
          ) : (
            visible.map((key, index) => {
              const def = quickLinkDef(key);
              if (def === undefined) return null;
              return (
                <ListItem
                  key={key}
                  icon={def.icon}
                  iconColor={colors.primary}
                  title={t(def.labelKey)}
                  right={
                    <View style={styles.controls}>
                      <IconButton
                        icon="chevron-up"
                        disabled={index === 0}
                        onPress={() => move(index, -1)}
                      />
                      <IconButton
                        icon="chevron-down"
                        disabled={index === visible.length - 1}
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
                title={t(def.labelKey)}
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
