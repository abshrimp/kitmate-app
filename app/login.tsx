import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { BrandMark, Button, Card, EmptyState, Screen } from '@/components/ui';
import { loginWithBrowser } from '@/features/auth/login';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme';

/**
 * ログイン / 再ログイン専用画面。
 * アカウント情報の表示・ログアウトは設定画面 (AccountSection) に集約したため、
 * この画面はログイン操作のみを担う (ログイン済みなら再ログイン導線として機能)。
 */
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

  // セッション復元中
  if (!hydrated || (wstoken !== null && siteInfo === null)) {
    return (
      <Screen title={t('auth.title')}>
        <Card style={styles.centerCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            {t('auth.checkingSession')}
          </Text>
        </Card>
      </Screen>
    );
  }

  const loggedIn = siteInfo !== null;

  return (
    <Screen title={t('auth.title')}>
      <Card style={styles.centerCard}>
        <View style={styles.heroMark}>
          <BrandMark icon="school" size={80} />
        </View>
        <Text style={[styles.introTitle, { color: colors.text }]}>
          {loggedIn ? t('auth.reloginTitle') : t('auth.introTitle')}
        </Text>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          {loggedIn ? t('auth.reloginMessage') : t('auth.introMessage')}
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
          title={loggedIn ? t('auth.relogin') : t('auth.loginButton')}
          icon={loggedIn ? 'refresh-outline' : 'log-in-outline'}
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
  heroMark: {
    marginBottom: 10,
    marginTop: 4,
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
  buttons: {
    marginTop: 16,
    gap: 10,
  },
});
