import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, EmptyState, Screen, TextField } from '@/components/ui';
import { buildEntriesForCourse } from '@/features/timetable/addCourse';
import { confirmAsync, notify } from '@/features/timetable/confirm';
import { categoryLabel, categoryTint, courseTermLabel, dayLabel, slotsLabel } from '@/features/timetable/labels';
import { findConflicts, useTimetable } from '@/features/timetable/store';
import { useLoad } from '@/features/timetable/useLoad';
import { useI18n } from '@/i18n';
import { fetchCourses, type CourseQuery } from '@/lib/api';
import { DAYS, gradeOf, PERIOD_TIMES, quarterBelongsTo } from '@/lib/terms';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import type { Course, CourseTerm, Day, Period, Quarter, Semester, SubjectCategory, TimetableEntry } from '@/types';
import { categoryFor, programVariantKey } from '@/types';

function isQuarter(term: CourseTerm): term is Quarter {
  return term === '1Q' || term === '2Q' || term === '3Q' || term === '4Q';
}

/** 講義の開講区分が表示中の学期 (+クォーターフィルタ) に合うか */
function termMatches(term: CourseTerm, semester: Semester, quarter: 'all' | Quarter): boolean {
  if (term === 'full_year') return true;
  const courseSemester = isQuarter(term) ? quarterBelongsTo(term) : term;
  if (courseSemester !== semester) return false;
  if (quarter !== 'all' && isQuarter(term) && term !== quarter) return false;
  return true;
}

export default function TimetablePickerScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string; period?: string; intensive?: string }>();

  const intensive = params.intensive === '1' || params.intensive === 'true';
  const day: Day | undefined =
    !intensive && DAYS.includes(params.day as Day) ? (params.day as Day) : undefined;
  const periodNum = Number(params.period);
  const period: Period | undefined =
    !intensive && periodNum >= 1 && periodNum <= 5 && Number.isInteger(periodNum)
      ? (periodNum as Period)
      : undefined;

  const viewYear = useTimetable((s) => s.viewYear);
  const viewTerm = useTimetable((s) => s.viewTerm);
  const quarterFilter = useTimetable((s) => s.quarterFilter);
  const admissionYear = useSettings((s) => s.admissionYear);
  const programSelection = useSettings((s) => s.programSelection);
  const showOtherProgram = useSettings((s) => s.showOtherProgram);
  const showNotAllowed = useSettings((s) => s.showNotAllowed);
  const showHigherGrades = useSettings((s) => s.showHigherGrades);

  const [query, setQuery] = useState('');

  const loadCourses = useCallback(() => {
    const q: CourseQuery = intensive
      ? { year: viewYear, intensive: true }
      : {
          year: viewYear,
          ...(day !== undefined ? { day } : {}),
          ...(period !== undefined ? { period } : {}),
        };
    return fetchCourses(q);
  }, [viewYear, day, period, intensive]);
  const { data: courses, failed: loadError, reload } = useLoad(loadCourses);

  const profileIncomplete = admissionYear === null || programSelection === null;
  const variantKey = programSelection !== null ? programVariantKey(programSelection) : null;

  const visible = useMemo(() => {
    if (courses === null) return [];
    const text = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (!c.offeredThisYear) return false;
      if (!termMatches(c.term, viewTerm, quarterFilter)) return false;
      if (admissionYear !== null) {
        // 下履修: showHigherGrades が false のときだけ現在学年以下に絞る
        if (!showHigherGrades && c.targetGrade > gradeOf(admissionYear, viewYear)) return false;
        if (variantKey !== null) {
          const cat = categoryFor(c, admissionYear, variantKey);
          if (cat === 'other_program' && !showOtherProgram) return false;
          if (cat === 'not_allowed' && !showNotAllowed) return false;
        }
      }
      if (text !== '') {
        const hit =
          c.name.toLowerCase().includes(text) ||
          c.subjectNumber.toLowerCase().includes(text) ||
          c.instructors.some((i) => i.toLowerCase().includes(text));
        if (!hit) return false;
      }
      return true;
    });
  }, [courses, query, viewTerm, quarterFilter, admissionYear, viewYear, variantKey, showOtherProgram, showNotAllowed, showHigherGrades]);

  const conflictName = useCallback(
    (entry: TimetableEntry): string => {
      if (entry.custom !== undefined) return entry.custom.name;
      if (entry.courseId !== undefined) {
        const found = courses?.find((c) => c.id === entry.courseId);
        return found?.name ?? entry.courseId;
      }
      return '';
    },
    [courses],
  );

  const onSelect = useCallback(
    async (course: Course) => {
      const store = useTimetable.getState();
      if (store.entries.some((e) => e.year === viewYear && e.courseId === course.id)) {
        notify(t('timetable.alreadyAddedTitle'), t('timetable.alreadyAddedMessage', { name: course.name }));
        return;
      }
      const candidates = buildEntriesForCourse(course, viewYear);
      const conflicts = findConflicts(store.entries, candidates);
      const first = conflicts[0];
      if (first !== undefined) {
        const ok = await confirmAsync({
          title: t('timetable.replaceConfirmTitle'),
          message: t('timetable.replaceConfirmMessage', { name: conflictName(first) }),
          confirmLabel: t('timetable.replace'),
          cancelLabel: t('common.cancel'),
          destructive: true,
        });
        if (!ok) return;
        for (const c of conflicts) store.removeEntry(c.id);
      }
      for (const e of candidates) useTimetable.getState().addEntry(e);
      router.back();
    },
    [viewYear, t, conflictName, router],
  );

  const renderCourse = useCallback(
    ({ item }: { item: Course }) => {
      const cat: SubjectCategory | null =
        admissionYear !== null && variantKey !== null
          ? categoryFor(item, admissionYear, variantKey)
          : null;
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => void onSelect(item)}
          style={({ pressed }) => [
            styles.courseRow,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.courseBody}>
            <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
              {item.classLabel !== undefined && item.classLabel !== '' ? ` (${item.classLabel})` : ''}
            </Text>
            <Text style={[styles.courseMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {[item.instructors.join('、'), slotsLabel(t, item), item.room]
                .filter((s): s is string => s !== undefined && s !== '')
                .join(' ・ ')}
            </Text>
            <View style={styles.courseBadges}>
              {cat !== null && <Badge label={categoryLabel(t, cat)} color={categoryTint(cat, colors)} />}
              <Badge label={courseTermLabel(t, item.term)} color={colors.textSecondary} />
              <Badge label={t('common.credits', { n: item.credits })} />
              <Badge label={t('common.grade', { n: item.targetGrade })} color={colors.accent} />
            </View>
          </View>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </Pressable>
      );
    },
    [admissionYear, variantKey, colors, t, onSelect],
  );

  const contextLabel =
    day !== undefined && period !== undefined
      ? `${dayLabel(t, day)} ${t('common.period', { n: period })} ・ ${PERIOD_TIMES[period].start}-${PERIOD_TIMES[period].end}`
      : intensive
        ? t('common.intensive')
        : undefined;

  return (
    <Screen
      title={intensive ? t('timetable.pickerIntensiveTitle') : t('timetable.pickerTitle')}
      scroll={false}
      padded={false}
      close
    >
      <View style={styles.top}>
        {contextLabel !== undefined && (
          <View style={styles.contextRow}>
            <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.contextText, { color: colors.textSecondary }]}>{contextLabel}</Text>
          </View>
        )}
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder={t('timetable.searchPlaceholder')}
        />
        {profileIncomplete && (
          <View
            style={[styles.banner, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.bannerText, { color: colors.text }]}>
              {t('timetable.settingsBanner')}
            </Text>
            <Button
              title={t('timetable.openSettings')}
              variant="ghost"
              onPress={() => router.push('/settings')}
            />
          </View>
        )}
      </View>

      {courses === null && !loadError && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </View>
      )}
      {loadError && (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('common.error')}
          action={<Button title={t('common.retry')} variant="secondary" onPress={reload} />}
        />
      )}
      {courses !== null && !loadError && (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderCourse}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState icon="search-outline" title={t('timetable.noCourses')} />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  contextText: {
    fontSize: 13,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    marginTop: 6,
  },
  bannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 8,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  courseBody: {
    flex: 1,
    gap: 4,
  },
  courseName: {
    fontSize: 15,
    fontWeight: '600',
  },
  courseMeta: {
    fontSize: 12.5,
  },
  courseBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
