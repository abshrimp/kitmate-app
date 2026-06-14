import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  dayLabelI18nKey,
  formatShortDate,
  isRecentPost,
  noticeCategoryKind,
  shortDayLabel,
} from './feed';
import { Badge, Card, type IoniconsName } from '@/components/ui';
import { useI18n, type I18n } from '@/i18n';
import { useTheme } from '@/theme';
import type { CancellationNotice, LectureNotice } from '@/types';

/** フィードの曜日表記をローカライズ ('金曜日' → '金'/'Fri')。対応外は短縮表記のまま。 */
function localizedDay(dayLabel: string, t: I18n['t']): string {
  if (dayLabel === '') return '';
  const key = dayLabelI18nKey(dayLabel);
  return key === null ? shortDayLabel(dayLabel) : t(key);
}

/** 時限表記 ('3' → '3限'/'Period 3')。'限' を含むなど整形済みならそのまま。 */
function localizedPeriod(periodLabel: string, t: I18n['t']): string {
  if (periodLabel === '') return '';
  if (/^[0-9０-９・,、~〜-]+$/.test(periodLabel)) {
    return t('cancellations.periodLabel', { p: periodLabel });
  }
  return periodLabel;
}

function joinInstructors(instructors: readonly string[], t: I18n['t']): string {
  return instructors.join(t('cancellations.instructorSeparator'));
}

/** 説明(remarks / message)を開閉トグルで表示する。空なら何も描画しない。 */
function CollapsibleBody({ text }: { text: string }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (text === '') return null;
  return (
    <View style={styles.bodyBlock}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.bodyToggle} hitSlop={6}>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
        <Text style={[styles.bodyToggleText, { color: colors.textSecondary }]}>
          {open ? t('cancellations.hideDetail') : t('cancellations.showDetail')}
        </Text>
      </Pressable>
      {open && <Text style={[styles.body, { color: colors.text }]}>{text}</Text>}
    </View>
  );
}

// ===== 休講通知カード =====

export function CancellationCard({ item }: { item: CancellationNotice }) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const day = localizedDay(item.dayLabel, t);
  const period = localizedPeriod(item.periodLabel, t);
  const when = [
    formatShortDate(item.cancelledOn),
    day === '' ? null : `(${day})`,
    period === '' ? null : period,
  ]
    .filter((s): s is string => s !== null)
    .join(' ');
  const instructors = joinInstructors(item.instructors, t);
  const isNew = isRecentPost(item.postedAt);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.courseName, { color: colors.text }]}>{item.courseName}</Text>
        {isNew && <Badge label={t('cancellations.newBadge')} color={colors.danger} icon="ellipse" />}
      </View>
      {instructors !== '' && (
        <Text style={[styles.instructors, { color: colors.textSecondary }]} numberOfLines={2}>
          {instructors}
        </Text>
      )}
      <View style={[styles.whenBox, { backgroundColor: `${colors.danger}14` }]}>
        <Ionicons name="close-circle" size={18} color={colors.danger} />
        <Text style={[styles.whenText, { color: colors.danger }]}>
          {t('cancellations.cancelledLine', { when })}
        </Text>
      </View>
      <CollapsibleBody text={item.remarks} />
      <View style={styles.footerRow}>
        {item.facultyLabel !== '' && (
          <Text style={[styles.footerText, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.facultyLabel}
          </Text>
        )}
        <Text style={[styles.footerText, styles.footerRight, { color: colors.textSecondary }]}>
          {t('cancellations.postedAt', { date: formatShortDate(item.postedAt) })}
        </Text>
      </View>
    </Card>
  );
}

// ===== 授業関連連絡カード =====

export function LectureNoticeCard({ item }: { item: LectureNotice }) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const kind = noticeCategoryKind(item.category);
  const badgeColor =
    kind === 'room' ? colors.warning :
    kind === 'schedule' ? colors.accent :
    kind === 'notice' ? colors.primary :
    colors.textSecondary;
  const badgeIcon: IoniconsName =
    kind === 'room' ? 'location-outline' :
    kind === 'schedule' ? 'time-outline' :
    kind === 'notice' ? 'information-circle-outline' :
    'pricetag-outline';
  const badgeLabel =
    kind === 'room' ? t('cancellations.categoryRoom') :
    kind === 'schedule' ? t('cancellations.categorySchedule') :
    kind === 'notice' ? t('cancellations.categoryNotice') :
    item.category;

  const day = localizedDay(item.dayLabel, t);
  const period = item.periodLabel === null ? '' : localizedPeriod(item.periodLabel, t);
  const slot = [day, period].filter((s) => s !== '').join(' ');
  const instructors = joinInstructors(item.instructors, t);
  const isNew = isRecentPost(item.firstPostedAt) || isRecentPost(item.updatedAt);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Badge
          label={badgeLabel === '' ? t('cancellations.categoryNotice') : badgeLabel}
          color={badgeColor}
          icon={badgeIcon}
        />
        {isNew && <Badge label={t('cancellations.newBadge')} color={colors.danger} icon="ellipse" />}
      </View>
      <Text style={[styles.courseName, { color: colors.text }]}>
        {item.courseName}
        {slot === '' ? '' : ' '}
        {slot !== '' && (
          <Text style={[styles.slotInline, { color: colors.textSecondary }]}>{slot}</Text>
        )}
      </Text>
      {instructors !== '' && (
        <Text style={[styles.instructors, { color: colors.textSecondary }]} numberOfLines={2}>
          {instructors}
        </Text>
      )}
      <CollapsibleBody text={item.message} />
      <View style={styles.footerRow}>
        {item.facultyLabel !== '' && (
          <Text style={[styles.footerText, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.termLabel === '' ? item.facultyLabel : `${item.facultyLabel} · ${item.termLabel}`}
          </Text>
        )}
        <Text style={[styles.footerText, styles.footerRight, { color: colors.textSecondary }]}>
          {t('cancellations.updatedAt', {
            date: formatShortDate(item.updatedAt !== '' ? item.updatedAt : item.firstPostedAt),
          })}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  courseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  slotInline: {
    fontSize: 13,
    fontWeight: '600',
  },
  instructors: {
    fontSize: 13,
  },
  whenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'stretch',
  },
  whenText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bodyBlock: {
    gap: 6,
  },
  bodyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  bodyToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  footerText: {
    fontSize: 12,
    flexShrink: 1,
  },
  footerRight: {
    marginLeft: 'auto',
  },
});
