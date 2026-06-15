import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, ListItem, Screen, Section } from '@/components/ui';
import { HOME_SECTION_CATALOG } from '@/features/home/sections';
import { useI18n } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

function labelKeyOf(key: string): string {
  return HOME_SECTION_CATALOG.find((s) => s.key === key)?.labelKey ?? key;
}

/** ホーム画面のセクションの表示/非表示・並び替えを編集する (モーダル) */
export default function HomeEditScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const visible = useSettings((s) => s.homeSections);
  const set = useSettings((s) => s.set);

  const hidden = HOME_SECTION_CATALOG.filter((s) => !visible.includes(s.key));

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= visible.length) return;
    const next = [...visible];
    [next[index], next[j]] = [next[j], next[index]];
    set('homeSections', next);
  };
  const hide = (key: string) => set('homeSections', visible.filter((k) => k !== key));
  const add = (key: string) => set('homeSections', [...visible, key]);

  return (
    <Screen title={t('home.editHome')} close>
      <Section title={t('home.sectionsTitle')}>
        <Card>
          {visible.map((key, index) => (
            <ListItem
              key={key}
              title={t(labelKeyOf(key))}
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
          ))}
        </Card>
      </Section>

      {hidden.length > 0 && (
        <Section title={t('home.hidden')}>
          <Card>
            {hidden.map((s) => (
              <ListItem
                key={s.key}
                title={t(s.labelKey)}
                right={<IconButton icon="add" tone="primary" onPress={() => add(s.key)} />}
              />
            ))}
          </Card>
        </Section>
      )}

      <Section title={t('home.quickLinksTitle')}>
        <Card>
          <ListItem
            icon="apps-outline"
            iconColor={colors.primary}
            title={t('home.editQuickLinks')}
            right={<Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
            onPress={() => router.push('/home/quick-links')}
          />
        </Card>
      </Section>
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
});
