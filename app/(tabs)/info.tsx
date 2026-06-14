import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Button, EmptyState, Screen, SegmentedControl } from '@/components/ui';
import { CancellationCard, LectureNoticeCard } from '@/features/cancellations/NoticeCards';
import { parseDateLocal } from '@/features/cancellations/feed';
import { useCancellationFeed } from '@/features/cancellations/useCancellationFeed';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import type { CancellationNotice, LectureNotice } from '@/types';

type Segment = 'cancellations' | 'notices';

function dateValue(s: string): number {
  const d = parseDateLocal(s);
  return d === null ? 0 : d.getTime();
}

export default function InfoScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { feed, status, reload, refresh } = useCancellationFeed();

  const [segment, setSegment] = useState<Segment>('cancellations');

  const cancellations = useMemo<CancellationNotice[]>(
    () =>
      [...(feed?.cancellations ?? [])].sort(
        (a, b) =>
          dateValue(b.postedAt) - dateValue(a.postedAt) ||
          dateValue(b.cancelledOn) - dateValue(a.cancelledOn) ||
          b.no - a.no,
      ),
    [feed],
  );

  const notices = useMemo<LectureNotice[]>(
    () =>
      [...(feed?.notices ?? [])].sort(
        (a, b) =>
          Math.max(dateValue(b.updatedAt), dateValue(b.firstPostedAt)) -
            Math.max(dateValue(a.updatedAt), dateValue(a.firstPostedAt)) || b.no - a.no,
      ),
    [feed],
  );

  // ----- 初回ロード -----
  if (feed === null && status === 'loading') {
    return (
      <Screen title={t('cancellations.title')} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  // ----- 取得失敗 (表示できるデータなし) -----
  if (feed === null) {
    return (
      <Screen title={t('cancellations.title')}>
        <EmptyState
          icon="cloud-offline-outline"
          title={t('cancellations.loadFailedTitle')}
          message={t('cancellations.loadFailedMessage')}
          action={<Button title={t('common.retry')} icon="refresh-outline" onPress={reload} />}
        />
      </Screen>
    );
  }

  const emptyState =
    segment === 'cancellations' ? (
      <EmptyState
        icon="sunny-outline"
        title={t('cancellations.emptyCancellationsTitle')}
        message={t('cancellations.emptyCancellationsMessage')}
      />
    ) : (
      <EmptyState
        icon="megaphone-outline"
        title={t('cancellations.emptyNoticesTitle')}
        message={t('cancellations.emptyNoticesMessage')}
      />
    );

  const refreshControl = (
    <RefreshControl
      refreshing={status === 'refreshing'}
      onRefresh={refresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  const header = (
    <View style={styles.controls}>
      <SegmentedControl
        options={[
          { label: t('cancellations.segCancellations'), value: 'cancellations' },
          { label: t('cancellations.segNotices'), value: 'notices' },
        ]}
        value={segment}
        onChange={(value) => setSegment(value === 'notices' ? 'notices' : 'cancellations')}
      />
    </View>
  );

  // ----- 一覧 -----
  return (
    <Screen title={t('cancellations.title')} scroll={false} padded={false}>
      {header}
      {segment === 'cancellations' ? (
        <FlatList<CancellationNotice>
          data={cancellations}
          keyExtractor={(item, index) => `c-${item.no}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={refreshControl}
          renderItem={({ item }) => <CancellationCard item={item} />}
          ListEmptyComponent={emptyState}
        />
      ) : (
        <FlatList<LectureNotice>
          data={notices}
          keyExtractor={(item, index) => `n-${item.no}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={refreshControl}
          renderItem={({ item }) => <LectureNoticeCard item={item} />}
          ListEmptyComponent={emptyState}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
});
