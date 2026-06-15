import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, EmptyState, Screen } from '@/components/ui';
import { confirmAsync } from '@/features/settings/dialogs';
import { useNotificationHistory } from '@/features/notifications/store';
import { useI18n } from '@/i18n';
import { fetchAnnouncements } from '@/lib/api';
import { useTheme } from '@/theme';

interface DisplayItem {
  id: string;
  title: string;
  body: string;
  receivedAt: number;
  isAnnouncement: boolean;
}

function timeText(ms: number, t: ReturnType<typeof useI18n>['t']): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return t('notifications.timeFormat', {
    m: d.getMonth() + 1,
    d: d.getDate(),
    time: `${hh}:${mm}`,
  });
}

/** 受信した通知の履歴一覧 (モーダル) */
export default function NotificationsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const local = useNotificationHistory((s) => s.items);
  const clear = useNotificationHistory((s) => s.clear);

  // 運営お知らせ (サーバ) を取得し、端末の通知履歴と統合 (内容一致でローカル分は重複排除)
  const [announcements, setAnnouncements] = useState<{ id: number; title: string; body: string; createdAt: number }[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchAnnouncements()
      .then((a) => {
        if (!cancelled) setAnnouncements(a);
      })
      .catch((e: unknown) => console.error('fetchAnnouncements failed', e));
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo<DisplayItem[]>(() => {
    const annKeys = new Set(announcements.map((a) => `${a.title}\n${a.body}`));
    const annItems: DisplayItem[] = announcements.map((a) => ({
      id: `ann-${a.id}`,
      title: a.title,
      body: a.body,
      receivedAt: a.createdAt,
      isAnnouncement: true,
    }));
    const localItems: DisplayItem[] = local
      .filter((x) => !annKeys.has(`${x.title}\n${x.body}`))
      .map((x) => ({ ...x, isAnnouncement: false }));
    return [...annItems, ...localItems].sort((a, b) => b.receivedAt - a.receivedAt);
  }, [local, announcements]);

  const onClear = async () => {
    const ok = await confirmAsync({
      title: t('notifications.clearConfirmTitle'),
      message: t('notifications.clearConfirmMessage'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) clear();
  };

  return (
    <Screen
      title={t('notifications.title')}
      close
      scroll={false}
      padded={false}
      right={
        items.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notifications.clear')}
            onPress={() => void onClear()}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title={t('notifications.empty')}
          message={t('notifications.emptyMessage')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.titleWrap}>
                  {item.isAnnouncement && (
                    <Badge
                      label={t('notifications.announcementBadge')}
                      color={colors.accent}
                      icon="megaphone-outline"
                    />
                  )}
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                  {timeText(item.receivedAt, t)}
                </Text>
              </View>
              {item.body !== '' && (
                <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
              )}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 8,
  },
  card: {
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});
