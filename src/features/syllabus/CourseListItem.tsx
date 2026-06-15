import { StyleSheet, Text, View } from 'react-native';

import { categoryLabel, slotsLabel, termLabel } from './lib';
import { Badge, Card, Chip } from '@/components/ui';
import { categoryColor as categoryCellColor } from '@/features/timetable/labels';
import { useI18n } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import { categoryFor, programVariantKey, type Course } from '@/types';

export interface CourseListItemProps {
  course: Course;
  onPress: () => void;
}

/** 検索結果 1 件分のカード */
export function CourseListItem({ course, onPress }: CourseListItemProps) {
  const { t } = useI18n();
  const { colors, category: catColors } = useTheme();
  const admissionYear = useSettings((s) => s.admissionYear);
  const programSelection = useSettings((s) => s.programSelection);

  const category =
    admissionYear !== null && programSelection !== null
      ? categoryFor(course, admissionYear, programVariantKey(programSelection))
      : null;

  const title = course.classLabel !== undefined ? `${course.name} ${course.classLabel}` : course.name;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        {category !== null && (
          <Badge label={categoryLabel(t, category)} color={categoryCellColor(category, catColors)} />
        )}
      </View>
      <Text style={[styles.instructors, { color: colors.textSecondary }]} numberOfLines={1}>
        {course.instructors.join(t('syllabus.instructorSeparator'))}
      </Text>
      <View style={styles.metaRow}>
        <Chip icon="calendar-outline" label={termLabel(t, course.term)} />
        <Chip icon="time-outline" label={slotsLabel(t, course)} />
        <Chip icon="ribbon-outline" label={t('common.credits', { n: course.credits })} />
        <Chip icon="school-outline" label={t('common.grade', { n: course.targetGrade })} />
        {!course.offeredThisYear && (
          <Badge label={t('syllabus.notOffered')} color={colors.warning} />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  instructors: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
});
