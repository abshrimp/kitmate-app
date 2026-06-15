import { requestWidgetUpdate } from 'react-native-android-widget';

import { KitmateWidget } from './KitmateWidget';
import type { WidgetPayload } from './payload';
import { WIDGET_NAME } from './sync';

/** 追加済みの Android ウィジェットすべてに最新ペイロードを反映する。 */
export async function updateAndroidWidget(payload: WidgetPayload): Promise<void> {
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: () => ({
      light: <KitmateWidget payload={payload} dark={false} />,
      dark: <KitmateWidget payload={payload} dark={true} />,
    }),
    widgetNotFound: () => {
      // ホーム画面にウィジェットが無い場合は何もしない
    },
  });
}
