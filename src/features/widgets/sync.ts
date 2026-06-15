import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { WidgetPayload } from './payload';

/** ウィジェットが読む共有ペイロードの保存キー。 */
export const WIDGET_PAYLOAD_KEY = 'kitmate.widget.payload';
/** ウィジェット名 (react-native-android-widget の widgetName と一致させる)。 */
export const WIDGET_NAME = 'KitmateWidget';

/**
 * ペイロードを共有ストレージへ保存し、ネイティブ側ウィジェットの再描画を要求する。
 * ネイティブ未導入 (Expo Go / web) では保存のみ行い、更新要求は no-op。
 */
export async function persistWidgetPayload(payload: WidgetPayload): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_PAYLOAD_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('widget: failed to persist payload', e);
    return;
  }
  await updateNativeWidgets(payload);
}

/** 保存済みのペイロードを読み出す (ウィジェットのレンダリングタスク用)。 */
export async function readWidgetPayload(): Promise<WidgetPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_PAYLOAD_KEY);
    return raw === null ? null : (JSON.parse(raw) as WidgetPayload);
  } catch (e) {
    console.error('widget: failed to read payload', e);
    return null;
  }
}

/**
 * ネイティブウィジェットの更新。各プラットフォーム実装は別モジュールで差し込む。
 * 端末にウィジェット機能が無い場合 (Expo Go など) は静かに失敗する。
 */
async function updateNativeWidgets(payload: WidgetPayload): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const { updateAndroidWidget } = await import('./android');
      await updateAndroidWidget(payload);
    } catch (e) {
      // react-native-android-widget 未導入 (Expo Go) 等は想定内
      if (__DEV__) console.warn('widget: android update skipped', e);
    }
  } else if (Platform.OS === 'ios') {
    try {
      const { updateIosWidget } = await import('./ios');
      updateIosWidget(payload);
    } catch (e) {
      if (__DEV__) console.warn('widget: ios update skipped', e);
    }
  }
}
