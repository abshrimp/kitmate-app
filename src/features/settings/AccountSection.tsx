import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { Card, ListItem, Section } from '@/components/ui';
import { logout } from '@/features/auth/login';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme';

/** 設定画面のアカウントセクション (プロフィール表示 + ログイン/ログアウト導線)。 */
export function AccountSection() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const wstoken = useAuth((s) => s.wstoken);
  const siteInfo = useAuth((s) => s.siteInfo);

  // web はログイン機能なし (仕様)
  if (Platform.OS === 'web') return null;

  const onLogout = () => {
    Alert.alert(t('auth.logoutConfirmTitle'), t('auth.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: () => logout().catch((e) => console.error('logout failed', e)),
      },
    ]);
  };

  return (
    <Section title={t('settings.sectionAccount')}>
      <Card>
        {siteInfo !== null ? (
          <>
            <View style={styles.profile}>
              {siteInfo.userpictureurl !== '' ? (
                <Image
                  source={{ uri: siteInfo.userpictureurl }}
                  style={[styles.avatar, { backgroundColor: colors.cardAlt }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.cardAlt }]}>
                  <Ionicons name="person" size={24} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.profileText}>
                <Text style={[styles.fullname, { color: colors.text }]} numberOfLines={1}>
                  {siteInfo.fullname}
                </Text>
                <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                  {siteInfo.username}
                </Text>
              </View>
            </View>
            <ListItem
              icon="log-out-outline"
              destructive
              title={t('common.logout')}
              onPress={onLogout}
            />
          </>
        ) : (
          <ListItem
            icon="log-in-outline"
            iconColor={colors.primary}
            title={wstoken === null ? t('auth.loginButton') : t('auth.relogin')}
            right={<Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
            onPress={() => router.push('/login')}
          />
        )}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  fullname: {
    fontSize: 16,
    fontWeight: '700',
  },
  username: {
    fontSize: 13,
  },
});
