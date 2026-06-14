import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  EmptyState,
  Screen,
  SegmentedControl,
  SelectModal,
  TextField,
} from '@/components/ui';
import { CourseListItem } from '@/features/syllabus/CourseListItem';
import { semesterOf } from '@/features/syllabus/lib';
import { categoryGroup, type CategoryGroup } from '@/features/timetable/labels';
import { useI18n } from '@/i18n';
import { fetchCourses } from '@/lib/api';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import { categoryFor, programVariantKey } from '@/types';
import type { Course, Day, Semester } from '@/types';

type SemesterFilter = 'all' | Semester;
type GradeFilter = 'all' | '1' | '2' | '3' | '4';
type DayFilter = 'all' | Day;
type CategoryFilter = 'all' | CategoryGroup;

// シラバス区分フィルタの選択肢 (大分類)
const CATEGORY_FILTERS: { value: CategoryFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'syllabus.all' },
  { value: 'english', labelKey: 'syllabus.catEnglish' },
  { value: 'foundation', labelKey: 'syllabus.catFoundation' },
  { value: 'practical', labelKey: 'syllabus.catPractical' },
  { value: 'senior', labelKey: 'syllabus.catSenior' },
  { value: 'intro', labelKey: 'syllabus.catIntro' },
  { value: 'basic', labelKey: 'syllabus.catBasic' },
  { value: 'program', labelKey: 'syllabus.catProgram' },
];

const DAY_VALUES: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_LABEL_KEYS: Record<Day, string> = {
  mon: 'common.dayMon',
  tue: 'common.dayTue',
  wed: 'common.dayWed',
  thu: 'common.dayThu',
  fri: 'common.dayFri',
};

export default function SyllabusSearchScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();

  const admissionYear = useSettings((s) => s.admissionYear);
  const programSelection = useSettings((s) => s.programSelection);
  const variantKey = programSelection === null ? null : programVariantKey(programSelection);
  const canFilterCategory = admissionYear !== null && variantKey !== null;

  const [keyword, setKeyword] = useState('');
  const [semester, setSemester] = useState<SemesterFilter>('all');
  const [grade, setGrade] = useState<GradeFilter>('all');
  const [day, setDay] = useState<DayFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [categoryModal, setCategoryModal] = useState(false);

  const [courses, setCourses] = useState<Course[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setFailed(false);
    const timer = setTimeout(() => {
      const q = keyword.trim();
      fetchCourses({
        ...(q !== '' ? { q } : {}),
        ...(grade !== 'all' ? { grade: Number(grade) } : {}),
        ...(day !== 'all' ? { day } : {}),
      })
        .then((data) => {
          if (requestSeq.current !== seq) return;
          setCourses(data);
          setLoading(false);
        })
        .catch((e: unknown) => {
          if (requestSeq.current !== seq) return;
          console.error('syllabus search failed', e);
          setFailed(true);
          setLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [keyword, grade, day, reloadKey]);

  // 学期・区分はクライアント側で絞り込む (学期はクォーター/通年を内包、区分は課程依存のため)
  const visibleCourses = useMemo(() => {
    if (courses === null) return [];
    return courses.filter((c) => {
      if (semester !== 'all') {
        const s = semesterOf(c.term);
        if (s !== null && s !== semester) return false;
      }
      if (category !== 'all' && admissionYear !== null && variantKey !== null) {
        if (categoryGroup(categoryFor(c, admissionYear, variantKey)) !== category) return false;
      }
      return true;
    });
  }, [courses, semester, category, admissionYear, variantKey]);

  const categoryLabelText =
    CATEGORY_FILTERS.find((f) => f.value === category) ?? CATEGORY_FILTERS[0];

  const semesterOptions = [
    { label: t('syllabus.all'), value: 'all' },
    { label: t('common.semesterFirst'), value: 'first' },
    { label: t('common.semesterSecond'), value: 'second' },
  ];
  const gradeOptions = [
    { label: t('syllabus.all'), value: 'all' },
    ...(['1', '2', '3', '4'] as const).map((n) => ({ label: n, value: n })),
  ];
  const dayOptions = [
    { label: t('syllabus.all'), value: 'all' },
    ...DAY_VALUES.map((d) => ({ label: t(DAY_LABEL_KEYS[d]), value: d })),
  ];

  return (
    <Screen title={t('syllabus.searchTitle')} scroll={false} padded={false}>
      <View style={styles.filters}>
        <TextField
          value={keyword}
          onChangeText={setKeyword}
          placeholder={t('syllabus.searchPlaceholder')}
        />
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
            {t('syllabus.filterSemester')}
          </Text>
          <View style={styles.filterControl}>
            <SegmentedControl
              options={semesterOptions}
              value={semester}
              onChange={(v) => setSemester(v as SemesterFilter)}
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
            {t('syllabus.filterGrade')}
          </Text>
          <View style={styles.filterControl}>
            <SegmentedControl
              options={gradeOptions}
              value={grade}
              onChange={(v) => setGrade(v as GradeFilter)}
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
            {t('syllabus.filterDay')}
          </Text>
          <View style={styles.filterControl}>
            <SegmentedControl
              options={dayOptions}
              value={day}
              onChange={(v) => setDay(v as DayFilter)}
            />
          </View>
        </View>
        {canFilterCategory && (
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
              {t('syllabus.filterCategory')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCategoryModal(true)}
              style={({ pressed }) => [
                styles.categorySelect,
                { borderColor: colors.border, backgroundColor: colors.card },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.categoryValue, { color: colors.text }]} numberOfLines={1}>
                {t(categoryLabelText.labelKey)}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingLabel, { color: colors.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </View>
      ) : failed ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('syllabus.loadFailed')}
          message={t('common.error')}
          action={
            <Button
              title={t('common.retry')}
              variant="secondary"
              onPress={() => setReloadKey((k) => k + 1)}
            />
          }
        />
      ) : visibleCourses.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title={t('syllabus.noResults')}
          message={t('syllabus.noResultsMessage')}
        />
      ) : (
        <FlatList
          data={visibleCourses}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {t('syllabus.resultCount', { n: visibleCourses.length })}
            </Text>
          }
          renderItem={({ item }) => (
            <CourseListItem course={item} onPress={() => router.push(`/syllabus/${item.id}`)} />
          )}
        />
      )}

      <SelectModal
        visible={categoryModal}
        title={t('syllabus.filterCategory')}
        options={CATEGORY_FILTERS.map((f) => ({ label: t(f.labelKey), value: f.value }))}
        onSelect={(v) => {
          setCategory(v as CategoryFilter);
          setCategoryModal(false);
        }}
        onClose={() => setCategoryModal(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterLabel: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
  },
  filterControl: {
    flex: 1,
  },
  categorySelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  categoryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingLabel: {
    fontSize: 14,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
});
