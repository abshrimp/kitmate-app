import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { withAlpha } from './colors';
import { categoryColor, dayLabel, entryCategory } from './labels';
import type { CourseMap } from './useCourseMap';
import { useI18n } from '@/i18n';
import { DAYS, PERIOD_TIMES } from '@/lib/terms';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import { programVariantKey } from '@/types';
import type { Day, Period, Quarter, TimetableEntry } from '@/types';

const PERIODS: Period[] = [1, 2, 3, 4, 5];

/** エントリの表示名 (公式講義は courseMap から解決) */
export function entryTitle(entry: TimetableEntry, courseMap: CourseMap): string {
  if (entry.custom !== undefined) return entry.custom.name;
  if (entry.courseId !== undefined) return courseMap[entry.courseId]?.name ?? entry.courseId;
  return '';
}

/** エントリの講義室 */
export function entryRoom(entry: TimetableEntry, courseMap: CourseMap): string | undefined {
  if (entry.custom !== undefined) return entry.custom.room;
  if (entry.courseId !== undefined) return courseMap[entry.courseId]?.room;
  return undefined;
}

function quarterTag(entry: TimetableEntry): string | undefined {
  if (entry.quarters === undefined || entry.quarters.length === 0) return undefined;
  return entry.quarters.join('/');
}

export interface TimetableGridProps {
  /** 表示学期 (year/term で絞り込み済み) のエントリ */
  entries: TimetableEntry[];
  quarter: 'all' | Quarter;
  courseMap: CourseMap;
  onPressEntry?: (entry: TimetableEntry) => void;
  onPressEmptyCell?: (day: Day, period: Period) => void;
  onPressAddIntensive?: () => void;
  /** 集中講義セクションを表示するか (default true) */
  showIntensive?: boolean;
}

export function TimetableGrid({
  entries,
  quarter,
  courseMap,
  onPressEntry,
  onPressEmptyCell,
  onPressAddIntensive,
  showIntensive = true,
}: TimetableGridProps) {
  const { t } = useI18n();
  const { colors, category } = useTheme();
  const admissionYear = useSettings((s) => s.admissionYear);
  const programSelection = useSettings((s) => s.programSelection);
  const variantKey = programSelection === null ? null : programVariantKey(programSelection);

  // コマ色: 明示色があればそれを、無ければ科目区分のデフォルト色を使う
  const tintFor = (entry: TimetableEntry): string => {
    if (entry.color !== undefined) return entry.color;
    const course = entry.courseId !== undefined ? courseMap[entry.courseId] : undefined;
    return categoryColor(entryCategory(entry, course, admissionYear, variantKey), category);
  };

  const visible =
    quarter === 'all'
      ? entries
      : entries.filter(
          (e) => e.quarters === undefined || e.quarters.length === 0 || e.quarters.includes(quarter),
        );
  const intensives = visible.filter((e) => e.day === undefined || e.period === undefined);

  const dow = new Date().getDay(); // 0=Sun..6=Sat
  const today: Day | undefined = dow >= 1 && dow <= 5 ? DAYS[dow - 1] : undefined;

  const cellEntries = (day: Day, period: Period): TimetableEntry[] => {
    const list = visible.filter((e) => e.day === day && e.period === period);
    // 学期全体 → 1Q/2Q (3Q/4Q) の順で安定して積む
    return [...list].sort((a, b) => {
      const qa = a.quarters?.[0] ?? '';
      const qb = b.quarters?.[0] ?? '';
      return qa < qb ? -1 : qa > qb ? 1 : 0;
    });
  };

  const renderEntry = (entry: TimetableEntry) => {
    const tint = tintFor(entry);
    const tag = quarterTag(entry);
    return (
      <Pressable
        key={entry.id}
        accessibilityRole="button"
        disabled={onPressEntry === undefined}
        onPress={onPressEntry === undefined ? undefined : () => onPressEntry(entry)}
        style={({ pressed }) => [
          styles.entry,
          { backgroundColor: withAlpha(tint, 38), borderColor: withAlpha(tint, 90) },
          pressed && styles.pressed,
        ]}
      >
        {tag !== undefined && (
          <Text style={[styles.entryQuarter, { color: tint }]} numberOfLines={1}>
            {tag}
          </Text>
        )}
        <Text style={[styles.entryName, { color: colors.text }]} numberOfLines={3}>
          {entryTitle(entry, courseMap)}
        </Text>
        {entryRoom(entry, courseMap) !== undefined && (
          <Text style={[styles.entryRoom, { color: colors.textSecondary }]} numberOfLines={1}>
            {entryRoom(entry, courseMap)}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View>
      {/* 曜日ヘッダ */}
      <View style={styles.headerRow}>
        <View style={styles.timeCol} />
        {DAYS.map((day) => {
          const isToday = day === today;
          return (
            <View
              key={day}
              style={[styles.dayHeader, isToday && { backgroundColor: colors.primary }]}
            >
              <Text
                style={[
                  styles.dayHeaderText,
                  { color: isToday ? colors.onPrimary : colors.textSecondary },
                ]}
              >
                {dayLabel(t, day)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 1〜5限 */}
      {PERIODS.map((period) => (
        <View key={period} style={styles.row}>
          <View style={styles.timeCol}>
            <Text style={[styles.periodNum, { color: colors.text }]}>{period}</Text>
            <Text style={[styles.periodTime, { color: colors.textSecondary }]}>
              {PERIOD_TIMES[period].start}
            </Text>
            <Text style={[styles.periodTime, { color: colors.textSecondary }]}>
              {PERIOD_TIMES[period].end}
            </Text>
          </View>
          {DAYS.map((day) => {
            const list = cellEntries(day, period);
            if (list.length === 0) {
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(t, day)} ${t('common.period', { n: period })} ${t('timetable.emptyCell')}`}
                  disabled={onPressEmptyCell === undefined}
                  onPress={
                    onPressEmptyCell === undefined ? undefined : () => onPressEmptyCell(day, period)
                  }
                  style={({ pressed }) => [
                    styles.cell,
                    styles.emptyCell,
                    { backgroundColor: withAlpha(colors.text, 8), borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}
                >
                  {onPressEmptyCell !== undefined && (
                    <Ionicons name="add" size={16} color={withAlpha(colors.textSecondary, 110)} />
                  )}
                </Pressable>
              );
            }
            return (
              <View key={day} style={styles.cell}>
                {list.map(renderEntry)}
              </View>
            );
          })}
        </View>
      ))}

      {/* 集中講義 */}
      {showIntensive && (
        <View style={styles.intensiveSection}>
          <View style={styles.intensiveHeader}>
            <Text style={[styles.intensiveTitle, { color: colors.textSecondary }]}>
              {t('timetable.intensiveSection')}
            </Text>
            {onPressAddIntensive !== undefined && (
              <Pressable
                accessibilityRole="button"
                onPress={onPressAddIntensive}
                hitSlop={8}
                style={({ pressed }) => [styles.intensiveAdd, pressed && styles.pressed]}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.intensiveAddText, { color: colors.primary }]}>
                  {t('timetable.addIntensive')}
                </Text>
              </Pressable>
            )}
          </View>
          {intensives.length === 0 ? (
            <View
              style={[
                styles.intensiveEmpty,
                { backgroundColor: withAlpha(colors.text, 8), borderColor: colors.border },
              ]}
            >
              <Text style={[styles.intensiveEmptyText, { color: colors.textSecondary }]}>
                {t('timetable.emptyCell')}
              </Text>
            </View>
          ) : (
            <View style={styles.intensiveList}>
              {intensives.map((entry) => {
                const tint = tintFor(entry);
                const tag = quarterTag(entry);
                const room = entryRoom(entry, courseMap);
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    disabled={onPressEntry === undefined}
                    onPress={onPressEntry === undefined ? undefined : () => onPressEntry(entry)}
                    style={({ pressed }) => [
                      styles.intensiveItem,
                      { backgroundColor: withAlpha(tint, 38), borderColor: withAlpha(tint, 90) },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.intensiveName, { color: colors.text }]} numberOfLines={1}>
                      {entryTitle(entry, courseMap)}
                    </Text>
                    <View style={styles.intensiveMeta}>
                      {tag !== undefined && (
                        <Text style={[styles.entryQuarter, { color: tint }]}>{tag}</Text>
                      )}
                      {room !== undefined && (
                        <Text
                          style={[styles.entryRoom, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {room}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
    gap: 3,
  },
  timeCol: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  periodNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  periodTime: {
    fontSize: 8.5,
    lineHeight: 11,
  },
  cell: {
    flex: 1,
    minHeight: 88,
    borderRadius: 10,
    gap: 3,
  },
  emptyCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  entry: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  entryQuarter: {
    fontSize: 9,
    fontWeight: '800',
  },
  entryName: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13.5,
  },
  entryRoom: {
    fontSize: 9,
    marginTop: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  intensiveSection: {
    marginTop: 16,
  },
  intensiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  intensiveTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  intensiveAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  intensiveAddText: {
    fontSize: 13,
    fontWeight: '600',
  },
  intensiveEmpty: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingVertical: 14,
  },
  intensiveEmptyText: {
    fontSize: 12,
  },
  intensiveList: {
    gap: 6,
  },
  intensiveItem: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  intensiveName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  intensiveMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
