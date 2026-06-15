import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ListItem, Screen, Section } from '@/components/ui';
import { QUICK_LINK_CATALOG } from '@/features/home/quickLinks';
import { linkQuickKey, useQuickLinkResolver } from '@/features/home/useQuickLinks';
import { useLinkGroups } from '@/features/links/useLinkGroups';
import { useI18n } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

/** ホームのクイックリンクの表示/非表示・並び替えを編集する (モーダル) */
export default function QuickLinksEditScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const visible = useSettings((s) => s.homeQuickLinks);
  const set = useSettings((s) => s.set);
  const resolve = useQuickLinkResolver();
  const groups = useLinkGroups();

  const visibleItems = visible
    .map(resolve)
    .filter((it): it is NonNullable<typeof it> => it !== null);

  // 追加できる候補: カタログ (画面遷移) で未追加のもの
  const availableCatalog = QUICK_LINK_CATALOG.filter((d) => !visible.includes(d.key));
  // 追加できる候補: リンク集のリンクで未追加のもの (非表示にしたものは除く)
  const availableLinks = groups.flatMap((g) =>
    g.links
      .filter((l) => !l.hidden && !visible.includes(linkQuickKey(l.id)))
      .map((l) => ({ link: l, groupTitle: g.title })),
  );

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
          {visibleItems.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('home.quickLinksEmpty')}
            </Text>
          ) : (
            visibleItems.map((item, index) => (
              <ListItem
                key={item.key}
                icon={item.icon}
                iconColor={colors.primary}
                title={item.title}
                right={
                  <View style={styles.controls}>
                    <IconButton
                      icon="chevron-up"
                      disabled={index === 0}
                      onPress={() => move(index, -1)}
                    />
                    <IconButton
                      icon="chevron-down"
                      disabled={index === visibleItems.length - 1}
                      onPress={() => move(index, 1)}
                    />
                    <IconButton icon="eye-off-outline" tone="danger" onPress={() => hide(item.key)} />
                  </View>
                }
              />
            ))
          )}
        </Card>
      </Section>

      {availableCatalog.length > 0 && (
        <Section title={t('home.hidden')}>
          <Card>
            {availableCatalog.map((def) => (
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

      {availableLinks.length > 0 && (
        <Section title={t('home.addFromLinks')}>
          <Card>
            {availableLinks.map(({ link, groupTitle }) => (
              <ListItem
                key={link.id}
                icon={link.icon}
                iconColor={colors.textSecondary}
                title={link.title}
                subtitle={groupTitle}
                right={
                  <IconButton
                    icon="add"
                    tone="primary"
                    onPress={() => add(linkQuickKey(link.id))}
                  />
                }
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
