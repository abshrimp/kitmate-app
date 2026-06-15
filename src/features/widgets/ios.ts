import type { WidgetPayload } from './payload';

/**
 * iOS ホーム画面ウィジェット (WidgetKit) の更新。
 * App Group へのデータ書き込み + reloadAllTimelines をネイティブブリッジ経由で行う。
 * ブリッジ未設定の間は呼び出し側 (sync.ts) で握りつぶされる。
 */
export function updateIosWidget(_payload: WidgetPayload): void {
  throw new Error('ios widget not configured');
}
