import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, ListItem, Screen, Section } from '@/components/ui';
import { parseDateLocal, subjectMatchesAny } from '@/features/cancellations/feed';
import { useCancellationFeed } from '@/features/cancellations/useCancellationFeed';
import { useMyCourseNames } from '@/features/cancellations/useMyCourseNames';
import { formatTime } from '@/features/assignments/format';
import { formatRemaining } from '@/features/assignments/remaining';
import { useAssignments } from '@/features/assignments/useAssignments';
import { eventLabel, formatEventDate, upcomingEvents } from '@/features/home/academicCalendar';
import { quickLinkDef } from '@/features/home/quickLinks';
import { useWeather, weatherIcon } from '@/features/home/useWeather';
import { useI18n } from '@/i18n';
import { useSettings } from '@/store/settings';
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
  const sections = useSettings((s) => s.homeSections);

  // 画面表示時の現在時刻を一度だけ確定させる (挨拶・日付・残り時間表示用)
  const [now] = useState(() => Date.now());
  const today = new Date(now);

  const greeting = t(greetingKey(today.getHours()));
  const dateLine = t('home.dateFormat', {
    m: today.getMonth() + 1,
    d: today.getDate(),
    w: t(`assignments.weekday${today.getDay()}`),
  });

  // 設定の順序で表示するセクション (非表示は homeSections から除外されている)
  const sectionMap: Record<string, ReactNode> = {
    weather: <WeatherCard />,
    assignments: <AssignmentsPreview now={now} onSeeAll={() => router.push('/assignments')} />,
    notices: <NoticesPreview onSeeAll={() => router.push('/info')} />,
    schedule: <UpcomingSchedule now={now} />,
    quickLinks: <QuickLinksSection />,
  };

  return (
    <Screen
      title={greeting}
      left={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.accountButton')}
          onPress={() => router.push('/login')}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
        </Pressable>
      }
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.notificationsButton')}
          onPress={() => router.push('/notifications')}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Ionicons name="notifications-outline" size={26} color={colors.primary} />
        </Pressable>
      }
    >
      <View style={styles.dateRow}>
        <Ionicons name="calendar-clear-outline" size={14} color={colors.textSecondary} />
        <Text style={[styles.dateLine, { color: colors.textSecondary }]}>{dateLine}</Text>
      </View>

      {sections.map((key) => {
        const el = sectionMap[key];
        return el === undefined ? null : <Fragment key={key}>{el}</Fragment>;
      })}
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

/** クイックリンクのセクション (設定の homeQuickLinks を表示・編集導線つき) */
function QuickLinksSection() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const quickLinks = useSettings((s) => s.homeQuickLinks);

  return (
    <Section
      title={t('home.quickLinksTitle')}
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.editQuickLinks')}
          onPress={() => router.push('/home/quick-links')}
          hitSlop={6}
        >
          <Text style={[styles.seeAll, { color: colors.primary }]}>{t('home.edit')}</Text>
        </Pressable>
      }
    >
      <Card style={styles.listCard}>
        {quickLinks
          .map((key) => quickLinkDef(key))
          .filter((def): def is NonNullable<typeof def> => def !== undefined)
          .map((def, index) => (
            <View key={def.key}>
              {index > 0 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
              <ListItem
                icon={def.icon}
                iconColor={index % 2 === 1 ? colors.accent : colors.primary}
                title={t(def.labelKey)}
                onPress={() => router.push(def.route)}
              />
            </View>
          ))}
      </Card>
    </Section>
  );
}

/** 京都の今日の天気カード */
function WeatherCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { status, data } = useWeather();

  if (status === 'error' && data === null) return null; // 取得失敗かつキャッシュ無し → 非表示
  if (data === null) {
    return (
      <Card style={styles.weatherCard}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.weatherTelop, { color: colors.textSecondary }]}>
          {t('common.loading')}
        </Text>
      </Card>
    );
  }

  const temps = [
    data.tempMax !== null ? t('home.weatherMax', { n: data.tempMax }) : null,
    data.tempMin !== null ? t('home.weatherMin', { n: data.tempMin }) : null,
  ].filter((s): s is string => s !== null);

  return (
    <Card style={styles.weatherCard}>
      <Ionicons name={weatherIcon(data.telop)} size={30} color={colors.accent} />
      <View style={styles.weatherBody}>
        <Text style={[styles.weatherTitle, { color: colors.textSecondary }]}>
          {t('home.weatherTitle')}
        </Text>
        <Text style={[styles.weatherTelop, { color: colors.text }]}>{data.telop}</Text>
      </View>
      <View style={styles.weatherMeta}>
        {temps.length > 0 && (
          <Text style={[styles.weatherTemp, { color: colors.text }]}>{temps.join('  ')}</Text>
        )}
        {data.chanceOfRain !== null && (
          <Text style={[styles.weatherRain, { color: colors.textSecondary }]}>
            {t('home.weatherRain', { n: data.chanceOfRain })}
          </Text>
        )}
      </View>
    </Card>
  );
}

/** 学年暦の今後の予定 (上位4件) */
function UpcomingSchedule({ now }: { now: number }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const events = useMemo(() => upcomingEvents(now, 4), [now]);
  if (events.length === 0) return null;

  return (
    <Section title={t('home.scheduleTitle')}>
      <Card style={styles.listCard}>
        {events.map((e, index) => (
          <View key={`${e.start}-${index}`}>
            {index > 0 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleDate, { color: colors.primary }]}>
                {formatEventDate(e)}
              </Text>
              <Text style={[styles.scheduleLabel, { color: colors.text }]} numberOfLines={2}>
                {eventLabel(e, locale)}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </Section>
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
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  weatherBody: {
    flex: 1,
    gap: 1,
  },
  weatherTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  weatherTelop: {
    fontSize: 16,
    fontWeight: '700',
  },
  weatherMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  weatherTemp: {
    fontSize: 14,
    fontWeight: '700',
  },
  weatherRain: {
    fontSize: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  scheduleDate: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 64,
  },
  scheduleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
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
