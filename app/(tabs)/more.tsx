import Constants from 'expo-constants';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark, Card, ListItem, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export default function MoreScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const menu = [
    { icon: 'document-text-outline', label: 'settings.menuSyllabus', color: colors.primary, route: '/syllabus' },
    { icon: 'map-outline', label: 'settings.menuMap', color: colors.accent, route: '/map' },
    { icon: 'school-outline', label: 'settings.menuRequirements', color: colors.primary, route: '/requirements' },
    { icon: 'settings-outline', label: 'settings.menuSettings', color: colors.accent, route: '/settings' },
  ] as const;

  return (
    <Screen title={t('common.tabMore')}>
      <Card style={styles.listCard}>
        {menu.map((item, index) => (
          <View key={item.route}>
            {index > 0 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
            <ListItem
              icon={item.icon}
              iconColor={item.color}
              title={t(item.label)}
              onPress={() => router.push(item.route)}
            />
          </View>
        ))}
      </Card>
      <View style={styles.footer}>
        <BrandMark icon="school" size={56} />
        <Text style={[styles.appName, { color: colors.text }]}>{t('common.appName')}</Text>
        <Text style={[styles.version, { color: colors.textSecondary }]}>
          {t('settings.version', { v: version })}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: {
    paddingVertical: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
    marginLeft: 50,
  },
  footer: {
    alignItems: 'center',
    marginTop: 36,
    gap: 6,
  },
  appName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  version: {
    fontSize: 12,
  },
});
