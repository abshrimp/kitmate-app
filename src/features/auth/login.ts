import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import {
  buildLaunchUrl,
  getSiteInfo,
  isInvalidToken,
  MoodleApiError,
  parseWstokenFromRedirect,
} from '@/lib/moodle';
import { getString, remove, setString } from '@/lib/storage';
import { useAuth } from '@/store/auth';

import { applyProfileFromUsername } from './profile';

/**
 * Moodle ブラウザログインフロー (feature:auth)。
 * wstoken 自体は store/auth.ts 経由で SecureStore (kitmate.wstoken) に保存される。
 * lastValidatedAt はストアではメモリのみのため、再ログイン推奨判定用に
 * AsyncStorage へ別途永続化する (機密情報ではないため SecureStore 不要)。
 */

const LAST_VALIDATED_KEY = 'kitmate.auth.lastValidatedAt';

export type LoginResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; messageKey: string }; // i18n キー (auth.* / common.*)

/** Moodle 公式アプリと同様の Math.random ベースの passport (数値文字列) */
function generatePassport(): string {
  return (Math.random() * 1000).toString();
}

/**
 * ブラウザを開いて Moodle にログインし、wstoken を取得・検証してセッションを保存する。
 * UI はこの戻り値の messageKey を t() で表示する。
 */
export async function loginWithBrowser(): Promise<LoginResult> {
  if (Platform.OS === 'web') {
    return { status: 'error', messageKey: 'auth.webNotSupported' };
  }

  let result: WebBrowser.WebBrowserAuthSessionResult;
  try {
    const passport = generatePassport();
    result = await WebBrowser.openAuthSessionAsync(buildLaunchUrl(passport), 'kitmate://');
  } catch (e) {
    console.error('loginWithBrowser: failed to open auth session', e);
    return { status: 'error', messageKey: 'auth.errorBrowser' };
  }

  if (result.type !== 'success') {
    // cancel / dismiss / locked など
    return { status: 'cancelled' };
  }

  let wstoken: string;
  try {
    wstoken = parseWstokenFromRedirect(result.url);
  } catch (e) {
    console.error('loginWithBrowser: failed to parse wstoken from redirect', e);
    return { status: 'error', messageKey: 'auth.errorParseToken' };
  }

  try {
    const info = await getSiteInfo(wstoken);
    useAuth.getState().setSession(wstoken, info);
    applyProfileFromUsername(info.username); // username から入学年度・課程・Tech を自動適用
    await markValidatedNow();
    return { status: 'success' };
  } catch (e) {
    console.error('loginWithBrowser: token validation failed', e);
    if (isInvalidToken(e)) {
      return { status: 'error', messageKey: 'auth.errorInvalidToken' };
    }
    if (e instanceof MoodleApiError) {
      return { status: 'error', messageKey: 'auth.errorApi' };
    }
    return { status: 'error', messageKey: 'auth.errorNetwork' };
  }
}

/** セッションを破棄し、永続化した検証時刻も消す */
export async function logout(): Promise<void> {
  useAuth.getState().clearSession();
  await remove(LAST_VALIDATED_KEY);
}

/** 永続化されたトークン検証時刻 (unix ms)。無ければ null */
export async function getPersistedLastValidatedAt(): Promise<number | null> {
  const raw = await getString(LAST_VALIDATED_KEY);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** トークン検証成功時刻を永続化する */
export async function markValidatedNow(): Promise<void> {
  await setString(LAST_VALIDATED_KEY, String(Date.now()));
}

/**
 * 再ログイン推奨判定 (CONVENTIONS §7)。
 * 現在月が 4 月か 9 月 (パスワード更新時期) で、lastValidatedAt が
 * その月の 1 日より前 (または記録なし) なら true。
 */
export function shouldSuggestRelogin(
  lastValidatedAt: number | null,
  now: Date = new Date(),
): boolean {
  const month = now.getMonth() + 1;
  if (month !== 4 && month !== 9) return false;
  if (lastValidatedAt === null) return true;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
  return lastValidatedAt < monthStart;
}
