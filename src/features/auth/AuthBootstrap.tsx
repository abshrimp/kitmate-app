import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';

import {
  getPersistedLastValidatedAt,
  markValidatedNow,
  shouldSuggestRelogin,
} from './login';
import { t } from '@/i18n';
import { getSiteInfo, isInvalidToken } from '@/lib/moodle';
import { getString, setString } from '@/lib/storage';
import { useAuth } from '@/store/auth';

/** 同月内に再ログイン推奨 Alert を一度だけ出すためのキー (値: "YYYY-M") */
const RELOGIN_SUGGESTED_KEY = 'kitmate.auth.reloginSuggestedFor';

async function bootstrap(): Promise<void> {
  await useAuth.getState().hydrate();

  // web はログイン機能なし: hydrate (即 hydrated=true) 以外は何もしない
  if (Platform.OS === 'web') return;

  const wstoken = useAuth.getState().wstoken;
  if (wstoken === null) return;

  // 検証で setSession すると lastValidatedAt が更新されるため、先に前回値を取得
  const previousValidatedAt = await getPersistedLastValidatedAt();

  try {
    const info = await getSiteInfo(wstoken);
    useAuth.getState().setSession(wstoken, info);
    await markValidatedNow();
  } catch (e) {
    if (isInvalidToken(e)) {
      console.error('AuthBootstrap: stored token is invalid, clearing session', e);
      useAuth.getState().clearSession();
      return;
    }
    // オフライン等の一時的な失敗ではセッションを保持したまま続行
    console.error('AuthBootstrap: token validation failed (keeping session)', e);
  }

  if (!shouldSuggestRelogin(previousValidatedAt)) return;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const alreadySuggestedFor = await getString(RELOGIN_SUGGESTED_KEY);
  if (alreadySuggestedFor === monthKey) return;
  await setString(RELOGIN_SUGGESTED_KEY, monthKey);

  Alert.alert(t('auth.reloginTitle'), t('auth.reloginMessage'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.login'), onPress: () => router.push('/login') },
  ]);
}

/**
 * 認証ブートストラップ (feature:auth 本実装)。
 * マウント時に SecureStore からセッションを復元し、トークンを Moodle で検証する。
 * 4月/9月 (パスワード更新時期) には再ログインを一度だけ提案する。
 */
export default function AuthBootstrap() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    bootstrap().catch((e) => {
      console.error('AuthBootstrap failed', e);
    });
  }, []);
  return null;
}
