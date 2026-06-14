import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/i18n';
import { apiFetch, registerPush, unregisterPush } from '@/lib/api';
import { getString, remove, setString } from '@/lib/storage';

/** 登録済み Expo push トークンの保存キー (解除時に使用) */
const EXPO_TOKEN_KEY = 'kitmate.push.expoToken';

/** push 通知の購読設定 (休講通知 / 授業関連連絡)。1 デバイス購読で両フラグを保持する。 */
export interface PushPreferences {
  cancellation: boolean;   // 休講通知
  lectureInfo: boolean;    // 授業関連連絡
}

/** ユーザー向けメッセージ付きの push 設定エラー */
export class PushSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PushSetupError';
  }
}

// ===== ヘルパ =====

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | null | undefined;
  const fromExtra = extra?.eas?.projectId;
  if (typeof fromExtra === 'string' && fromExtra !== '') return fromExtra;
  const fromEasConfig = Constants.easConfig?.projectId;
  return typeof fromEasConfig === 'string' && fromEasConfig !== '' ? fromEasConfig : undefined;
}

/** base64url 文字列 → Uint8Array (web push の applicationServerKey 用) */
function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function webPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * VAPID 公開鍵の取得。
 * 注意: CONVENTIONS の API 契約表に未記載のため、server-impl 側で
 * GET /api/push/vapid-public-key → { publicKey: string } の実装が必要。
 */
async function fetchVapidPublicKey(): Promise<string> {
  const res = await apiFetch<{ publicKey: string }>('/api/push/vapid-public-key');
  return res.publicKey;
}

// ===== native (expo) =====

async function subscribeNative(prefs: PushPreferences): Promise<void> {
  // 通知権限
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    throw new PushSetupError(t('settings.pushPermissionDenied'));
  }

  // Android はチャンネルが無いと通知が表示されない
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: t('common.appName'),
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch (e) {
      console.error('Failed to set up notification channel', e);
    }
  }

  // Expo push トークン取得 (Expo Go 等では失敗しうる)
  let token: string;
  try {
    const projectId = easProjectId();
    const result = await Notifications.getExpoPushTokenAsync(
      projectId !== undefined ? { projectId } : undefined,
    );
    token = result.data;
  } catch (e) {
    console.error('getExpoPushTokenAsync failed', e);
    throw new PushSetupError(t('settings.expoTokenError'));
  }

  try {
    await registerPush({
      platform: 'expo',
      token,
      cancellationNotifications: prefs.cancellation,
      lectureInfoNotifications: prefs.lectureInfo,
    });
  } catch (e) {
    console.error('push register failed', e);
    throw new PushSetupError(t('settings.pushRegisterFailed'));
  }
  await setString(EXPO_TOKEN_KEY, token);
}

async function unsubscribeNative(): Promise<void> {
  let token = await getString(EXPO_TOKEN_KEY);
  if (token === null) {
    // 保存が無ければ再取得を試みる (失敗したら諦める)
    try {
      const projectId = easProjectId();
      const result = await Notifications.getExpoPushTokenAsync(
        projectId !== undefined ? { projectId } : undefined,
      );
      token = result.data;
    } catch (e) {
      console.error('getExpoPushTokenAsync failed during unregister', e);
      return;
    }
  }
  try {
    await unregisterPush({ platform: 'expo', token });
  } catch (e) {
    console.error('push unregister failed', e);
  }
  await remove(EXPO_TOKEN_KEY);
}

// ===== web =====

async function subscribeWeb(prefs: PushPreferences): Promise<void> {
  if (!webPushSupported()) {
    throw new PushSetupError(t('settings.pushUnsupported'));
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new PushSetupError(t('settings.pushPermissionDenied'));
  }

  let subscription: PushSubscription;
  try {
    await navigator.serviceWorker.register('/sw.js');
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing !== null) {
      subscription = existing;
    } else {
      const publicKey = await fetchVapidPublicKey();
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey),
      });
    }
  } catch (e) {
    if (e instanceof PushSetupError) throw e;
    console.error('web push subscribe failed', e);
    throw new PushSetupError(t('settings.pushUnsupported'));
  }

  try {
    await registerPush({
      platform: 'web',
      subscription: subscription.toJSON(),
      cancellationNotifications: prefs.cancellation,
      lectureInfoNotifications: prefs.lectureInfo,
    });
  } catch (e) {
    console.error('push register failed', e);
    throw new PushSetupError(t('settings.pushRegisterFailed'));
  }
}

async function unsubscribeWeb(): Promise<void> {
  if (!webPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (registration === undefined) return;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription === null) return;
    try {
      await unregisterPush({ platform: 'web', endpoint: subscription.endpoint });
    } catch (e) {
      console.error('push unregister failed', e);
    }
    await subscription.unsubscribe();
  } catch (e) {
    console.error('web push unsubscribe failed', e);
  }
}

// ===== 公開 API =====

/**
 * push 通知の購読状態を設定に合わせて更新する。
 * 休講通知・授業関連連絡は 1 つのデバイス購読でフラグだけを切り替えるため、
 * どちらか一方でも ON なら(再)登録し、両方 OFF のときだけ購読を解除する。
 *
 * 登録に失敗した場合は PushSetupError (message はユーザー向け文言) を throw するので、
 * 呼び出し側で Switch を戻して Alert すること。解除はベストエフォート(throw しない)。
 */
export async function updatePushSubscription(prefs: PushPreferences): Promise<void> {
  const anyEnabled = prefs.cancellation || prefs.lectureInfo;
  if (Platform.OS === 'web') {
    if (anyEnabled) await subscribeWeb(prefs);
    else await unsubscribeWeb();
  } else {
    if (anyEnabled) await subscribeNative(prefs);
    else await unsubscribeNative();
  }
}
