import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import {
  AssignmentDueWidget,
  AssignmentRemainingWidget,
  TimetableWidget,
} from './androidWidgets';
import type { WidgetPayload } from './payload';
import { readWidgetPayload, WIDGET_NAMES } from './sync';

function renderFor(name: string, payload: WidgetPayload | null) {
  switch (name) {
    case WIDGET_NAMES.assignmentDue:
      return {
        light: <AssignmentDueWidget payload={payload} dark={false} />,
        dark: <AssignmentDueWidget payload={payload} dark={true} />,
      };
    case WIDGET_NAMES.assignmentRemaining:
      return {
        light: <AssignmentRemainingWidget payload={payload} dark={false} />,
        dark: <AssignmentRemainingWidget payload={payload} dark={true} />,
      };
    case WIDGET_NAMES.timetable:
    default:
      return {
        light: <TimetableWidget payload={payload} dark={false} />,
        dark: <TimetableWidget payload={payload} dark={true} />,
      };
  }
}

/**
 * Android ウィジェットのバックグラウンドタスク。widgetName で対象を判定し、
 * 共有ストレージのペイロードを読んで描画する。index.js で登録する。
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const payload = await readWidgetPayload();
      props.renderWidget(renderFor(props.widgetInfo.widgetName, payload));
      break;
    }
    case 'WIDGET_CLICK':
    case 'WIDGET_DELETED':
    default:
      break;
  }
}
