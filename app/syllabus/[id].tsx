import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Screen, Section } from '@/components/ui';
import { CollapsibleText } from '@/features/syllabus/CollapsibleText';
import {
  buildTimetableEntries,
  categoryColor,
  categoryLabel,
  semesterOf,
  slotsLabel,
  termLabel,
} from '@/features/syllabus/lib';
import { useTimetable } from '@/features/timetable/store';
import { useI18n } from '@/i18n';
import { ApiError, fetchCourse } from '@/lib/api';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import { categoryFor, programVariantKey, type Course } from '@/types';

type LoadStatus = 'loading' | 'error' | 'notFound' | 'ready';

function InfoRow({ label, value, last }: { label: string; value: string; last: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function SyllabusDetailScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const admissionYear = useSettings((s) => s.admissionYear);
  const programSelection = useSettings((s) => s.programSelection);

  const viewYear = useTimetable((s) => s.viewYear);
  const viewTerm = useTimetable((s) => s.viewTerm);
  const entries = useTimetable((s) => s.entries);
  const addEntry = useTimetable((s) => s.addEntry);

  useEffect(() => {
    if (id === undefined || id === '') {
      setStatus('notFound');
      return;
    }
    let alive = true;
    setStatus('loading');
    fetchCourse(id)
      .then((c) => {
        if (!alive) return;
        setCourse(c);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (!alive) return;
        console.error('syllabus detail load failed', e);
        setStatus(e instanceof ApiError && e.status === 404 ? 'notFound' : 'error');
      });
    return () => {
      alive = false;
    };
  }, [id, reloadKey]);

  if (status === 'loading') {
    return (
      <Screen title={t('common.syllabusTitle')} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingLabel, { color: colors.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </View>
      </Screen>
    );
  }

  if (status === 'notFound' || status === 'error' || course === null) {
    return (
      <Screen title={t('common.syllabusTitle')}>
        <EmptyState
          icon={status === 'notFound' ? 'help-circle-outline' : 'cloud-offline-outline'}
          title={status === 'notFound' ? t('syllabus.notFound') : t('syllabus.loadFailed')}
          action={
            status === 'notFound' ? undefined : (
              <Button
                title={t('common.retry')}
                variant="secondary"
                onPress={() => setReloadKey((k) => k + 1)}
              />
            )
          }
        />
      </Screen>
    );
  }

  const category =
    admissionYear !== null && programSelection !== null
      ? categoryFor(course, admissionYear, programVariantKey(programSelection))
      : null;

  const courseSemester = semesterOf(course.term);
  const termMatches = courseSemester === null || courseSemester === viewTerm;
  const alreadyAdded = entries.some(
    (e) => e.courseId === course.id && e.year === viewYear && e.term === viewTerm,
  );

  const onAdd = () => {
    for (const entry of buildTimetableEntries(course, viewYear, viewTerm)) {
      addEntry(entry);
    }
  };

  const infoRows: { label: string; value: string }[] = [
    { label: t('syllabus.subjectNumber'), value: course.subjectNumber },
    { label: t('syllabus.courseCode'), value: course.id },
    { label: t('syllabus.instructors'), value: course.instructors.join(t('syllabus.instructorSeparator')) },
    { label: t('syllabus.faculty'), value: course.faculty },
    { label: t('syllabus.targetGrade'), value: t('common.grade', { n: course.targetGrade }) },
    { label: t('syllabus.term'), value: termLabel(t, course.term) },
    { label: t('syllabus.dayPeriod'), value: slotsLabel(t, course) },
    { label: t('syllabus.creditsLabel'), value: t('common.credits', { n: course.credits }) },
    { label: t('syllabus.classFormat'), value: course.classFormat },
    ...(course.room !== undefined && course.room !== ''
      ? [{ label: t('syllabus.room'), value: course.room }]
      : []),
    ...(course.classLabel !== undefined && course.classLabel !== ''
      ? [{ label: t('syllabus.classLabelRow'), value: course.classLabel }]
      : []),
    ...(course.attributes !== undefined && course.attributes !== null && course.attributes !== ''
      ? [{ label: t('syllabus.attributes'), value: course.attributes }]
      : []),
  ];

  const syllabus = course.syllabus;
  const textSections: { key: string; title: string; text: string }[] = [
    { key: 'outline', title: t('syllabus.outline'), text: syllabus?.outline ?? '' },
    { key: 'goal', title: t('syllabus.goal'), text: syllabus?.goal ?? '' },
    { key: 'prerequisites', title: t('syllabus.prerequisites'), text: syllabus?.prerequisites ?? '' },
    { key: 'outOfClassStudy', title: t('syllabus.outOfClassStudy'), text: syllabus?.outOfClassStudy ?? '' },
    { key: 'grading', title: t('syllabus.grading'), text: syllabus?.grading ?? '' },
    { key: 'notes', title: t('syllabus.notes'), text: syllabus?.notes ?? '' },
  ].filter((s) => s.text !== '');

  const plan = syllabus?.plan ?? [];

  return (
    <Screen title={t('common.syllabusTitle')}>
      <Card style={styles.headerCard}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {course.classLabel !== undefined ? `${course.name} ${course.classLabel}` : course.name}
          </Text>
          {category !== null && (
            <Badge label={categoryLabel(t, category)} color={categoryColor(colors, category)} />
          )}
        </View>
        <Text style={[styles.headerInstructors, { color: colors.textSecondary }]}>
          {course.instructors.join(t('syllabus.instructorSeparator'))}
        </Text>
        {!course.offeredThisYear && (
          <View style={styles.headerBadgeRow}>
            <Badge label={t('syllabus.notOffered')} color={colors.warning} />
          </View>
        )}
        <View style={styles.addArea}>
          {alreadyAdded ? (
            <Button
              title={t('syllabus.addedToTimetable')}
              variant="secondary"
              icon="checkmark-circle-outline"
              disabled
              onPress={() => undefined}
            />
          ) : (
            <Button
              title={t('syllabus.addToTimetable')}
              icon="add-circle-outline"
              disabled={!termMatches}
              onPress={onAdd}
            />
          )}
          {!alreadyAdded && !termMatches && (
            <Text style={[styles.mismatchNote, { color: colors.textSecondary }]}>
              {t('syllabus.termMismatch', {
                year: viewYear,
                term: viewTerm === 'first' ? t('common.semesterFirst') : t('common.semesterSecond'),
              })}
            </Text>
          )}
        </View>
      </Card>

      <Section title={t('syllabus.basicInfo')}>
        <Card style={styles.tableCard}>
          {infoRows.map((row, i) => (
            <InfoRow key={row.label} label={row.label} value={row.value} last={i === infoRows.length - 1} />
          ))}
        </Card>
      </Section>

      {textSections.map((section) => (
        <Section key={section.key} title={section.title}>
          <Card>
            <CollapsibleText text={section.text} />
          </Card>
        </Section>
      ))}

      {plan.length > 0 && (
        <Section title={t('syllabus.plan')}>
          <View style={styles.planList}>
            {plan.map((item) => (
              <Card key={item.round} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Badge label={t('syllabus.planRound', { n: item.round })} />
                  <Text style={[styles.planTopic, { color: colors.text }]}>{item.topic}</Text>
                </View>
                {item.content !== undefined && item.content !== '' && (
                  <Text style={[styles.planText, { color: colors.text }]}>{item.content}</Text>
                )}
                {item.pre !== undefined && item.pre !== '' && (
                  <View style={styles.planStudy}>
                    <Text style={[styles.planStudyLabel, { color: colors.accent }]}>
                      {t('syllabus.planPre')}
                    </Text>
                    <Text style={[styles.planStudyText, { color: colors.textSecondary }]}>
                      {item.pre}
                    </Text>
                  </View>
                )}
                {item.post !== undefined && item.post !== '' && (
                  <View style={styles.planStudy}>
                    <Text style={[styles.planStudyLabel, { color: colors.accent }]}>
                      {t('syllabus.planPost')}
                    </Text>
                    <Text style={[styles.planStudyText, { color: colors.textSecondary }]}>
                      {item.post}
                    </Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        </Section>
      )}

      {syllabus?.materials !== undefined && syllabus.materials !== '' && (
        <Section title={t('syllabus.materials')}>
          <Card>
            <CollapsibleText text={syllabus.materials} />
          </Card>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingLabel: {
    fontSize: 14,
  },
  headerCard: {
    marginTop: 8,
    gap: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 27,
  },
  headerInstructors: {
    fontSize: 14,
  },
  headerBadgeRow: {
    flexDirection: 'row',
  },
  addArea: {
    marginTop: 10,
    gap: 8,
  },
  mismatchNote: {
    fontSize: 12,
    lineHeight: 17,
  },
  tableCard: {
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  infoLabel: {
    width: 92,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  planList: {
    gap: 10,
  },
  planCard: {
    gap: 8,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planTopic: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  planText: {
    fontSize: 14,
    lineHeight: 20,
  },
  planStudy: {
    gap: 2,
  },
  planStudyLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  planStudyText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
