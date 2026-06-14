import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, EmptyState, Screen, SelectModal } from '@/components/ui';
import { buildEntriesForCourse } from '@/features/timetable/addCourse';
import { categoryLabel, categoryTint, courseTermLabel, slotsLabel } from '@/features/timetable/labels';
import { useTimetable } from '@/features/timetable/store';
import { useLoad } from '@/features/timetable/useLoad';
import { useI18n } from '@/i18n';
import { fetchCourses } from '@/lib/api';
import { gradeOf, quarterBelongsTo } from '@/lib/terms';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import type { Course, CourseTerm, Quarter, Semester, SubjectCategory } from '@/types';
import { categoryFor, programVariantKey } from '@/types';

const REQUIRED_CATEGORIES: SubjectCategory[] = [
  'intro_required',
  'basic_required',
  'program_required',
  'graduation_research',
  'english',
];

function isQuarter(term: CourseTerm): term is Quarter {
  return term === '1Q' || term === '2Q' || term === '3Q' || term === '4Q';
}

/** 講義の開講区分が現在学期に属するか (クォーター・通年含む) */
function belongsToSemester(term: CourseTerm, semester: Semester): boolean {
  if (term === 'full_year') return true;
  if (isQuarter(term)) return quarterBelongsTo(term) === semester;
  return term === semester;
}

interface CourseGroup {
  name: string;
  category: SubjectCategory;
  courses: Course[];
  registered: boolean;
}

export default function TimetableBulkScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const viewYear = useTimetable((s) => s.viewYear);
  const viewTerm = useTimetable((s) => s.viewTerm);
  const entries = useTimetable((s) => s.entries);
  const admissionYear = useSettings((s) => s.admissionYear);
  const programSelection = useSettings((s) => s.programSelection);

  // チェック状態の上書き (未指定のグループは「未登録かつ単一クラスなら ON」がデフォルト)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [selectedClass, setSelectedClass] = useState<Record<string, string>>({});
  const [classModalGroup, setClassModalGroup] = useState<string | null>(null);

  const profileIncomplete = admissionYear === null || programSelection === null;
  const grade = admissionYear !== null ? gradeOf(admissionYear, viewYear) : null;
  const variantKey = programSelection !== null ? programVariantKey(programSelection) : null;

  const loadCourses = useCallback(() => fetchCourses({ year: viewYear }), [viewYear]);
  const { data: courses, failed: loadError, reload } = useLoad(loadCourses);

  const registeredCourseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      if (e.year === viewYear && e.courseId !== undefined) ids.add(e.courseId);
    }
    return ids;
  }, [entries, viewYear]);

  const groups = useMemo<CourseGroup[]>(() => {
    if (courses === null || admissionYear === null || variantKey === null || grade === null) {
      return [];
    }
    const targets = courses.filter((c) => {
      if (!c.offeredThisYear) return false;
      if (c.targetGrade !== grade) return false;
      if (!belongsToSemester(c.term, viewTerm)) return false;
      const cat = categoryFor(c, admissionYear, variantKey);
      return REQUIRED_CATEGORIES.includes(cat);
    });
    const byName = new Map<string, Course[]>();
    for (const c of targets) {
      const list = byName.get(c.name);
      if (list === undefined) byName.set(c.name, [c]);
      else list.push(c);
    }
    return [...byName.entries()].map(([name, list]) => ({
      name,
      category: categoryFor(list[0] as Course, admissionYear, variantKey),
      courses: list,
      registered: list.some((c) => registeredCourseIds.has(c.id)),
    }));
  }, [courses, admissionYear, variantKey, grade, viewTerm, registeredCourseIds]);

  const isChecked = (group: CourseGroup): boolean =>
    !group.registered &&
    (overrides[group.name] ?? group.courses.length === 1);

  const toggleGroup = (group: CourseGroup) => {
    if (group.registered) return;
    const on = isChecked(group);
    if (!on && group.courses.length > 1 && selectedClass[group.name] === undefined) {
      setClassModalGroup(group.name);
      return;
    }
    setOverrides((prev) => ({ ...prev, [group.name]: !on }));
  };

  const resolveCourse = (group: CourseGroup): Course | undefined => {
    if (group.courses.length === 1) return group.courses[0];
    return group.courses.find((c) => c.id === selectedClass[group.name]);
  };

  const selectedCount = groups.filter(
    (g) => isChecked(g) && resolveCourse(g) !== undefined,
  ).length;

  const onRegister = () => {
    const store = useTimetable.getState();
    for (const g of groups) {
      if (!isChecked(g)) continue;
      const course = resolveCourse(g);
      if (course === undefined) continue;
      for (const e of buildEntriesForCourse(course, viewYear)) {
        store.addEntry(e);
      }
    }
    router.back();
  };

  if (profileIncomplete) {
    return (
      <Screen title={t('timetable.bulkTitle')} close>
        <EmptyState
          icon="person-circle-outline"
          title={t('timetable.bulkNeedProfile')}
          message={t('timetable.bulkNeedProfileMessage')}
          action={
            <Button
              title={t('timetable.openSettings')}
              variant="secondary"
              onPress={() => router.push('/settings')}
            />
          }
        />
      </Screen>
    );
  }

  const classModal = groups.find((g) => g.name === classModalGroup);
  const semesterLabel =
    viewTerm === 'first' ? t('common.semesterFirst') : t('common.semesterSecond');

  return (
    <Screen title={t('timetable.bulkTitle')} close>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {t('timetable.bulkDescription', {
          year: t('common.year', { y: viewYear }),
          term: semesterLabel,
          grade: t('common.grade', { n: grade ?? 0 }),
        })}
      </Text>

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
      {courses !== null && !loadError && groups.length === 0 && (
        <EmptyState icon="albums-outline" title={t('timetable.bulkEmpty')} />
      )}

      {courses !== null && !loadError && groups.length > 0 && (
        <>
          <View style={styles.list}>
            {groups.map((group) => {
              const on = isChecked(group);
              const multi = group.courses.length > 1;
              const chosen = resolveCourse(group);
              const representative = chosen ?? (group.courses[0] as Course);
              return (
                <Pressable
                  key={group.name}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: group.registered }}
                  onPress={() => toggleGroup(group)}
                  disabled={group.registered}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    group.registered && styles.rowDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={
                      group.registered
                        ? 'checkmark-done-outline'
                        : on
                          ? 'checkbox'
                          : 'square-outline'
                    }
                    size={24}
                    color={
                      group.registered
                        ? colors.textSecondary
                        : on
                          ? colors.primary
                          : colors.textSecondary
                    }
                  />
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={2}>
                      {group.name}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {[
                        representative.instructors.join('、'),
                        slotsLabel(t, representative),
                      ]
                        .filter((s) => s !== '')
                        .join(' ・ ')}
                    </Text>
                    <View style={styles.rowBadges}>
                      <Badge
                        label={categoryLabel(t, group.category)}
                        color={categoryTint(group.category, colors)}
                      />
                      <Badge
                        label={courseTermLabel(t, representative.term)}
                        color={colors.textSecondary}
                      />
                      <Badge label={t('common.credits', { n: representative.credits })} />
                      {group.registered && (
                        <Badge label={t('timetable.bulkRegistered')} color={colors.success} />
                      )}
                    </View>
                    {multi && !group.registered && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setClassModalGroup(group.name)}
                        hitSlop={6}
                        style={({ pressed }) => [styles.classRow, pressed && styles.pressed]}
                      >
                        <Ionicons name="people-outline" size={14} color={colors.primary} />
                        <Text style={[styles.classText, { color: colors.primary }]}>
                          {chosen?.classLabel !== undefined && chosen.classLabel !== ''
                            ? chosen.classLabel
                            : t('timetable.bulkClassUnselected')}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Button
              title={t('timetable.bulkRegister', { n: selectedCount })}
              icon="add-circle-outline"
              disabled={selectedCount === 0}
              onPress={onRegister}
            />
          </View>
        </>
      )}

      <SelectModal
        visible={classModal !== undefined}
        title={t('timetable.bulkSelectClass')}
        options={(classModal?.courses ?? []).map((c) => ({
          label: c.classLabel !== undefined && c.classLabel !== '' ? c.classLabel : c.id,
          value: c.id,
          subtitle: [c.instructors.join('、'), slotsLabel(t, c), c.room]
            .filter((s): s is string => s !== undefined && s !== '')
            .join(' ・ '),
        }))}
        onSelect={(value) => {
          if (classModal !== undefined) {
            setSelectedClass((prev) => ({ ...prev, [classModal.name]: value }));
            setOverrides((prev) => ({ ...prev, [classModal.name]: true }));
          }
          setClassModalGroup(null);
        }}
        onClose={() => setClassModalGroup(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: 13.5,
    lineHeight: 19,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: 12.5,
  },
  rowBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  classText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    marginTop: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
