import { requestWidgetUpdate } from 'react-native-android-widget';

import {
  AssignmentDueWidget,
  AssignmentRemainingWidget,
  TimetableWidget,
} from './androidWidgets';
import type { WidgetPayload } from './payload';
import { WIDGET_NAMES } from './sync';

/** 追加済みの Android ウィジェット (時間割 / 締切 / 残り時間) すべてに最新ペイロードを反映する。 */
export async function updateAndroidWidget(payload: WidgetPayload): Promise<void> {
  const updates: Promise<void>[] = [
    requestWidgetUpdate({
      widgetName: WIDGET_NAMES.timetable,
      renderWidget: () => ({
        light: <TimetableWidget payload={payload} dark={false} />,
        dark: <TimetableWidget payload={payload} dark={true} />,
      }),
      widgetNotFound: () => {},
    }),
    requestWidgetUpdate({
      widgetName: WIDGET_NAMES.assignmentDue,
      renderWidget: () => ({
        light: <AssignmentDueWidget payload={payload} dark={false} />,
        dark: <AssignmentDueWidget payload={payload} dark={true} />,
      }),
      widgetNotFound: () => {},
    }),
    requestWidgetUpdate({
      widgetName: WIDGET_NAMES.assignmentRemaining,
      renderWidget: () => ({
        light: <AssignmentRemainingWidget payload={payload} dark={false} />,
        dark: <AssignmentRemainingWidget payload={payload} dark={true} />,
      }),
      widgetNotFound: () => {},
    }),
  ];
  await Promise.all(updates);
}
