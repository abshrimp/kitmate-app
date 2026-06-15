import { ExtensionStorage } from '@bacons/apple-targets';

import type { WidgetPayload } from './payload';

/** メインアプリと WidgetKit 拡張で共有する App Group (app.json と一致させる)。 */
const APP_GROUP = 'group.com.abshrimp.kitmate';
const PAYLOAD_KEY = 'payload';

const storage = new ExtensionStorage(APP_GROUP);

/** ペイロードを App Group UserDefaults へ書き込み、全ウィジェットのタイムラインを再読込する。 */
export function updateIosWidget(payload: WidgetPayload): void {
  storage.set(PAYLOAD_KEY, JSON.stringify(payload));
  ExtensionStorage.reloadWidget(); // 引数なし = reloadAllTimelines (3 種すべて)
}
