import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { KitmateWidget } from './KitmateWidget';
import { readWidgetPayload } from './sync';

/**
 * Android ウィジェットのバックグラウンドタスク。
 * 追加・更新・リサイズ時に共有ストレージのペイロードを読み、ウィジェットを描画する。
 * index.js で registerWidgetTaskHandler に登録する。
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const payload = await readWidgetPayload();
      props.renderWidget({
        light: <KitmateWidget payload={payload} dark={false} />,
        dark: <KitmateWidget payload={payload} dark={true} />,
      });
      break;
    }
    case 'WIDGET_CLICK':
    case 'WIDGET_DELETED':
    default:
      break;
  }
}
