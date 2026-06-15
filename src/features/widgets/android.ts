import type { WidgetPayload } from './payload';

/**
 * Android ホーム画面ウィジェットの更新。
 * react-native-android-widget の導入・設定後に実装を差し込む。
 * 未設定の間は呼び出し側 (sync.ts) で握りつぶされる。
 */
export async function updateAndroidWidget(_payload: WidgetPayload): Promise<void> {
  throw new Error('android widget not configured');
}
