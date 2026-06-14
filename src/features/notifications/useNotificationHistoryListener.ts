import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useNotificationHistory } from './store';

function record(notification: Notifications.Notification): void {
  const content = notification.request.content;
  useNotificationHistory.getState().add({
    id: notification.request.identifier,
    title: content.title ?? '',
    body: content.body ?? '',
    receivedAt: Date.now(),
  });
}

/**
 * 受信したローカル/プッシュ通知を履歴ストアに記録するリスナを張る (ルートで一度だけ呼ぶ)。
 * - 受信 (フォアグラウンド) と タップ応答 の両方を拾い、id で重複排除する。
 */
export function useNotificationHistoryListener(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const recvSub = Notifications.addNotificationReceivedListener(record);
    const respSub = Notifications.addNotificationResponseReceivedListener((r) =>
      record(r.notification),
    );
    return () => {
      recvSub.remove();
      respSub.remove();
    };
  }, []);
}
