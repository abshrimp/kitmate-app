import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { WidgetPayload } from './payload';

/** ウィジェットが読む共有ペイロードの保存キー。 */
export const WIDGET_PAYLOAD_KEY = 'kitmate.widget.payload';

/** ウィジェット名 (Android: app.json の widgetName / iOS: Swift の kind と一致させる)。 */
export const WIDGET_NAMES = {
  timetable: 'KitmateTimetable',
  assignmentDue: 'KitmateAssignmentDue',
  assignmentRemaining: 'KitmateAssignmentRemaining',
} as const;

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
  // require は Metro が静的解決できるため動的 import の "unknown module" を避けられる。
  // 各プラットフォームのモジュールは require された時だけ評価されるので、
  // 反対 OS の native モジュール (react-native-android-widget / ExtensionStorage) は読み込まれない。
  try {
    if (Platform.OS === 'android') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateAndroidWidget } = require('./android') as typeof import('./android');
      await updateAndroidWidget(payload);
    } else if (Platform.OS === 'ios') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateIosWidget } = require('./ios') as typeof import('./ios');
      updateIosWidget(payload);
    }
  } catch (e) {
    // native ウィジェット未導入 (Expo Go) 等は想定内
    if (__DEV__) console.warn('widget: native update skipped', e);
  }
}
