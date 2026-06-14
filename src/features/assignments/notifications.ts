import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatTime } from './format';
import { t } from '@/i18n';
import { useSettings } from '@/store/settings';
import type { AssignmentEvent } from '@/types';

/** Android 通知チャンネル ID */
const CHANNEL_ID = 'assignments';
/** スケジュール識別子のプレフィックス */
const ID_PREFIX = 'assign-';

let handlerInstalled = false;

/** フォアグラウンドでも通知を表示するハンドラ (一度だけ設定) */
function ensureHandler(): void {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
  });
}

/** 既存の assign-* スケジュールをすべてキャンセル */
export async function cancelAssignmentNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((req) => req.identifier.startsWith(ID_PREFIX))
        .map((req) => Notifications.cancelScheduledNotificationAsync(req.identifier)),
    );
  } catch (e) {
    console.error('Failed to cancel assignment notifications', e);
  }
}

/**
 * 取得済み課題に対しローカル通知を再スケジュールする。
 * - web では何もしない (画面側で「通知はアプリ版のみ」の注記を表示)
 * - settings.assignmentNotifications が false なら既存スケジュールの削除のみ
 * - 通知権限が拒否されたら静かに無効
 * - 通知時刻 = timesort*1000 - assignmentNotifyHoursBefore*3600*1000 (過去はスキップ)
 */
export async function syncAssignmentNotifications(events: AssignmentEvent[]): Promise<void> {
  if (Platform.OS === 'web') return;
  const { assignmentNotifications, assignmentNotifyHoursBefore } = useSettings.getState();
  try {
    // 再スケジュール前に既存の assign-* を一掃
    await cancelAssignmentNotifications();
    if (!assignmentNotifications) return;

    // 権限リクエスト (拒否なら静かに無効)
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return;

    ensureHandler();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: t('assignments.notificationChannelName'),
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // 重複を除いた有効なリード時間 (時間) のリスト (旧 number 形式も配列に正規化)
    const rawLeads = assignmentNotifyHoursBefore as number[] | number;
    const leadHours = [...new Set(Array.isArray(rawLeads) ? rawLeads : [rawLeads])].filter(
      (h) => h > 0,
    );
    const now = Date.now();
    for (const event of events) {
      const due = new Date(event.timesort * 1000);
      const timeLabel = t('assignments.notifyTimeFormat', {
        m: due.getMonth() + 1,
        d: due.getDate(),
        time: formatTime(event.timesort),
      });
      for (const hours of leadHours) {
        const fireAt = event.timesort * 1000 - hours * 3600 * 1000;
        if (fireAt <= now) continue; // 過去ならスキップ
        await Notifications.scheduleNotificationAsync({
          identifier: `${ID_PREFIX}${event.id}-${hours}`,
          content: {
            title: t('assignments.notificationTitle'),
            body: t('assignments.notificationBody', { name: event.activityname, time: timeLabel }),
            data: { url: event.actionUrl ?? event.url, eventId: event.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(fireAt),
            channelId: CHANNEL_ID,
          },
        });
      }
    }
  } catch (e) {
    console.error('Failed to schedule assignment notifications', e);
  }
}
