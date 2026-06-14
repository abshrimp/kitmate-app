import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, IconTile, ListItem, Screen, Section, type IoniconsName } from '@/components/ui';
import { parseDateLocal, subjectMatchesAny } from '@/features/cancellations/feed';
import { useCancellationFeed } from '@/features/cancellations/useCancellationFeed';
import { useMyCourseNames } from '@/features/cancellations/useMyCourseNames';
import { formatTime } from '@/features/assignments/format';
import { formatRemaining } from '@/features/assignments/remaining';
import { useAssignments } from '@/features/assignments/useAssignments';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme';
import type { AssignmentEvent, CancellationNotice, LectureNotice } from '@/types';

const PREVIEW_COUNT = 3;

/** 時間帯に応じた挨拶キー */
function greetingKey(hour: number): string {
  if (hour < 11) return 'home.greetingMorning';
  if (hour < 18) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}

/** 時間帯に応じたアイコン (文字に頼らず時間帯を示す) */
function greetingIcon(hour: number): IoniconsName {
  if (hour < 11) return 'partly-sunny-outline';
  if (hour < 18) return 'sunny-outline';
  return 'moon-outline';
}

/** クイックリンク定義 (色分けされたアイコンで一覧性を高める) */
const QUICK_LINKS: { key: string; icon: IoniconsName; tone: 'primary' | 'accent'; route: '/timetable' | '/syllabus' | '/requirements' | '/map' }[] = [
  { key: 'home.quickTimetable', icon: 'calendar-outline', tone: 'primary', route: '/timetable' },
  { key: 'home.quickSyllabus', icon: 'document-text-outline', tone: 'accent', route: '/syllabus' },
  { key: 'home.quickRequirements', icon: 'school-outline', tone: 'primary', route: '/requirements' },
  { key: 'home.quickMap', icon: 'map-outline', tone: 'accent', route: '/map' },
];

/** 休講通知 / 授業関連連絡 を表示順にそろえた共通の型 */
type FeedItem =
  | { kind: 'cancellation'; key: string; sortAt: number; data: CancellationNotice }
  | { kind: 'notice'; key: string; sortAt: number; data: LectureNotice };

function dateValue(s: string): number {
  const d = parseDateLocal(s);
  return d === null ? 0 : d.getTime();
}

export default function HomeScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  // 画面表示時の現在時刻を一度だけ確定させる (挨拶・日付・残り時間表示用)
  const [now] = useState(() => Date.now());
  const today = new Date(now);

  const greeting = t(greetingKey(today.getHours()));
  const dateLine = t('home.dateFormat', {
    m: today.getMonth() + 1,
    d: today.getDate(),
    w: t(`assignments.weekday${today.getDay()}`),
  });

  return (
    <Screen
      title={greeting}
      right={<IconTile icon={greetingIcon(today.getHours())} color={colors.accent} variant="soft" />}
    >
      <View style={styles.dateRow}>
        <Ionicons name="calendar-clear-outline" size={14} color={colors.textSecondary} />
        <Text style={[styles.dateLine, { color: colors.textSecondary }]}>{dateLine}</Text>
      </View>

      <AssignmentsPreview now={now} onSeeAll={() => router.push('/assignments')} />

      <NoticesPreview onSeeAll={() => router.push('/info')} />

      <Section title={t('home.quickLinksTitle')}>
        <Card style={styles.listCard}>
          {QUICK_LINKS.map((link, index) => (
            <View key={link.route}>
              {index > 0 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
              <ListItem
                icon={link.icon}
                iconColor={link.tone === 'accent' ? colors.accent : colors.primary}
                title={t(link.key)}
                onPress={() => router.push(link.route)}
              />
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}

/** 近い課題プレビュー (締切順 上位3件) */
function AssignmentsPreview({ now, onSeeAll }: { now: number; onSeeAll: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const wstoken = useAuth((s) => s.wstoken);
  const hydrated = useAuth((s) => s.hydrated);

  // web はログイン機能なし (仕様) → 課題セクションは出さない
  const enabled = Platform.OS !== 'web';
  const { events } = useAssignments();
  const preview = events.slice(0, PREVIEW_COUNT);

  if (!enabled) return null;

  // 未ログイン: ログイン導線のみ
  if (hydrated && wstoken === null) {
    return (
      <Section title={t('home.assignmentsTitle')}>
        <Card style={styles.promptCard}>
          <Text style={[styles.promptText, { color: colors.textSecondary }]}>
            {t('home.assignmentsLoginPrompt')}
          </Text>
          <Button
            title={t('home.assignmentsLogin')}
            icon="log-in-outline"
            variant="secondary"
            onPress={() => router.push('/login')}
          />
        </Card>
      </Section>
    );
  }

  return (
    <Section
      title={t('home.assignmentsTitle')}
      right={
        preview.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={onSeeAll} hitSlop={6}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              {t('home.assignmentsSeeAll')}
            </Text>
          </Pressable>
        ) : undefined
      }
    >
      {preview.length === 0 ? (
        <Card>
          <EmptyState icon="checkmark-done-outline" title={t('home.assignmentsEmpty')} />
        </Card>
      ) : (
        <Card style={styles.listCard}>
          {preview.map((event, index) => (
            <View key={String(event.id)}>
              {index > 0 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
              <AssignmentRow event={event} now={now} onPress={onSeeAll} />
            </View>
          ))}
        </Card>
      )}
    </Section>
  );
}

function AssignmentRow({
  event,
  now,
  onPress,
}: {
  event: AssignmentEvent;
  now: number;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const dueColor = event.overdue ? colors.danger : colors.textSecondary;
  const remainColor = event.overdue ? colors.danger : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
          {event.activityname}
        </Text>
        <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {event.courseFullname}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.rowDue, { color: dueColor }]}>
            {t('home.dueOn', {
              m: new Date(event.timesort * 1000).getMonth() + 1,
              d: new Date(event.timesort * 1000).getDate(),
              time: formatTime(event.timesort),
            })}
          </Text>
          <Text style={[styles.rowRemaining, { color: remainColor }]}>
            {formatRemaining(event.timesort, now, t, 'home.overdue')}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

/** 最近の休講・連絡プレビュー (自分の時間割に関係するもの 上位3件) */
function NoticesPreview({ onSeeAll }: { onSeeAll: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { feed, status } = useCancellationFeed();
  const { names: myCourseNames } = useMyCourseNames();
  const loading = feed === null && status === 'loading';

  const items = useMemo<FeedItem[]>(() => {
    if (feed === null) return [];
    const relevant = (name: string) =>
      myCourseNames.length === 0 || subjectMatchesAny(name, myCourseNames);

    const cancellations: FeedItem[] = feed.cancellations
      .filter((c) => relevant(c.courseName))
      .map((c) => ({
        kind: 'cancellation',
        key: `c-${c.no}`,
        sortAt: Math.max(dateValue(c.postedAt), dateValue(c.cancelledOn)),
        data: c,
      }));
    const notices: FeedItem[] = feed.notices
      .filter((n) => relevant(n.courseName))
      .map((n) => ({
        kind: 'notice',
        key: `n-${n.no}`,
        sortAt: Math.max(dateValue(n.updatedAt), dateValue(n.firstPostedAt)),
        data: n,
      }));

    return [...cancellations, ...notices]
      .sort((a, b) => b.sortAt - a.sortAt)
      .slice(0, PREVIEW_COUNT);
  }, [feed, myCourseNames]);

  return (
    <Section
      title={t('home.noticesTitle')}
      right={
        items.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={onSeeAll} hitSlop={6}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              {t('home.noticesSeeAll')}
            </Text>
          </Pressable>
        ) : undefined
      }
    >
      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon="sunny-outline" title={t('home.noticesEmpty')} />
        </Card>
      ) : (
        <Card style={styles.listCard}>
          {items.map((item, index) => (
            <View key={item.key}>
              {index > 0 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
              <NoticeRow item={item} onPress={onSeeAll} />
            </View>
          ))}
        </Card>
      )}
    </Section>
  );
}

function NoticeRow({ item, onPress }: { item: FeedItem; onPress: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const isCancellation = item.kind === 'cancellation';
  const periodLabel = item.data.periodLabel;
  const slot = [item.data.dayLabel, periodLabel].filter((s) => s !== null && s !== '').join(' ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowBody}>
        <View style={styles.noticeHeader}>
          <Badge
            label={isCancellation ? t('home.cancelledBadge') : t('home.noticeBadge')}
            color={isCancellation ? colors.danger : colors.accent}
            icon={isCancellation ? 'close-circle-outline' : 'information-circle-outline'}
          />
          <Text style={[styles.noticeCourse, { color: colors.text }]} numberOfLines={1}>
            {item.data.courseName}
          </Text>
        </View>
        {slot !== '' && (
          <View style={styles.slotRow}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {slot}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: -4,
    marginBottom: 4,
  },
  dateLine: {
    fontSize: 15,
    fontWeight: '500',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  listCard: {
    paddingVertical: 4,
  },
  promptCard: {
    gap: 12,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  loadingText: {
    fontSize: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  rowSubtitle: {
    fontSize: 13,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  rowDue: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowRemaining: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeCourse: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
