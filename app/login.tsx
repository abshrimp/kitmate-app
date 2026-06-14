import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { BrandMark, Button, Card, EmptyState, ListItem, Screen, Section } from '@/components/ui';
import { loginWithBrowser, logout } from '@/features/auth/login';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const wstoken = useAuth((s) => s.wstoken);
  const siteInfo = useAuth((s) => s.siteInfo);
  const hydrated = useAuth((s) => s.hydrated);
  const [busy, setBusy] = useState(false);

  // web はログイン機能なし (仕様)
  if (Platform.OS === 'web') {
    return (
      <Screen title={t('auth.title')}>
        <EmptyState
          icon="phone-portrait-outline"
          title={t('auth.webNotSupported')}
          message={t('auth.webNotSupportedMessage')}
        />
      </Screen>
    );
  }

  const handleLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await loginWithBrowser();
      if (result.status === 'error') {
        Alert.alert(t('auth.errorTitle'), t(result.messageKey));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logoutConfirmTitle'), t('auth.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: () => {
          logout().catch((e) => console.error('logout failed', e));
        },
      },
    ]);
  };

  // セッション復元中
  if (!hydrated || (wstoken !== null && siteInfo === null)) {
    return (
      <Screen title={t('auth.title')}>
        <Card style={styles.centerCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            {t('auth.checkingSession')}
          </Text>
          {wstoken !== null && (
            <View style={styles.buttonRow}>
              <Button
                title={t('common.logout')}
                variant="ghost"
                icon="log-out-outline"
                onPress={handleLogout}
              />
            </View>
          )}
        </Card>
      </Screen>
    );
  }

  // ログイン済み
  if (siteInfo !== null) {
    return (
      <Screen title={t('auth.title')}>
        <Card style={styles.centerCard}>
          {siteInfo.userpictureurl !== '' ? (
            <Image
              source={{ uri: siteInfo.userpictureurl }}
              style={[styles.avatar, { backgroundColor: colors.cardAlt }]}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.cardAlt }]}>
              <Ionicons name="person" size={40} color={colors.textSecondary} />
            </View>
          )}
          <Text style={[styles.fullname, { color: colors.text }]}>{siteInfo.fullname}</Text>
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            {t('auth.loggedInTitle')}
          </Text>
        </Card>
        <Section title={t('auth.accountSection')}>
          <Card style={styles.listCard}>
            <ListItem
              icon="person-outline"
              title={t('auth.usernameLabel')}
              subtitle={siteInfo.username}
            />
            <ListItem icon="globe-outline" title={t('auth.siteLabel')} subtitle={siteInfo.siteurl} />
          </Card>
        </Section>
        <View style={styles.buttons}>
          <Button
            title={t('auth.relogin')}
            icon="refresh-outline"
            loading={busy}
            onPress={() => {
              void handleLogin();
            }}
          />
          <Button
            title={t('common.logout')}
            variant="danger"
            icon="log-out-outline"
            disabled={busy}
            onPress={handleLogout}
          />
        </View>
      </Screen>
    );
  }

  // 未ログイン
  return (
    <Screen title={t('auth.title')}>
      <Card style={styles.centerCard}>
        <View style={styles.heroMark}>
          <BrandMark icon="school" size={80} />
        </View>
        <Text style={[styles.introTitle, { color: colors.text }]}>{t('auth.introTitle')}</Text>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          {t('auth.introMessage')}
        </Text>
        <View style={[styles.tokenNoteRow, { backgroundColor: colors.cardAlt }]}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.success} />
          <Text style={[styles.tokenNote, { color: colors.textSecondary }]}>
            {t('auth.tokenNote')}
          </Text>
        </View>
      </Card>
      <View style={styles.buttons}>
        <Button
          title={t('auth.loginButton')}
          icon="log-in-outline"
          loading={busy}
          onPress={() => {
            void handleLogin();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
    marginTop: 8,
  },
  listCard: {
    paddingVertical: 4,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMark: {
    marginBottom: 10,
    marginTop: 4,
  },
  fullname: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  introTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  tokenNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  tokenNote: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  note: {
    fontSize: 13,
    textAlign: 'center',
  },
  buttonRow: {
    marginTop: 8,
  },
  buttons: {
    marginTop: 16,
    gap: 10,
  },
});
