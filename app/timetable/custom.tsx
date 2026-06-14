import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Screen, SegmentedControl, SelectModal, SettingRow, TextField } from '@/components/ui';
import { notify } from '@/features/timetable/confirm';
import { categoryLabel, dayLabel, quarterLabel } from '@/features/timetable/labels';
import { generateId, useTimetable } from '@/features/timetable/store';
import { useI18n } from '@/i18n';
import { DAYS } from '@/lib/terms';
import { useTheme } from '@/theme';
import type { CustomCourse, Day, Period, Quarter, Semester, SubjectCategory } from '@/types';

const ALL_CATEGORIES: SubjectCategory[] = [
  'english',
  'liberal_foundation',
  'liberal_practical',
  'liberal_senior',
  'intro_required',
  'intro_elective_required',
  'intro_elective',
  'basic_required',
  'basic_elective_required',
  'basic_elective',
  'program_required',
  'program_elective_required',
  'program_elective',
  'program_elective_A',
  'program_elective_B',
  'program_elective_C',
  'program_elective_ABC',
  'program_elective_D',
  'program_elective_other_course',
  'graduation_research',
  'other_program',
  'out_of_scope',
  'not_allowed',
];

const PERIODS: Period[] = [1, 2, 3, 4, 5];

export default function TimetableCustomScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const viewYear = useTimetable((s) => s.viewYear);
  const viewTerm = useTimetable((s) => s.viewTerm);
  const addEntry = useTimetable((s) => s.addEntry);

  const [name, setName] = useState('');
  const [instructorsText, setInstructorsText] = useState('');
  const [creditsText, setCreditsText] = useState('2');
  const [category, setCategory] = useState<SubjectCategory>('out_of_scope');
  const [categoryModal, setCategoryModal] = useState(false);
  const [room, setRoom] = useState('');
  const [memo, setMemo] = useState('');
  const [isIntensive, setIsIntensive] = useState(false);
  const [day, setDay] = useState<Day>('mon');
  const [period, setPeriod] = useState<Period>(1);
  const [term, setTerm] = useState<Semester>(viewTerm);
  const [span, setSpan] = useState<'full' | Quarter>('full');

  const changeTerm = (value: string) => {
    const next = value as Semester;
    setTerm(next);
    setSpan('full');
  };

  const spanOptions = useMemo(() => {
    const qs: Quarter[] = term === 'first' ? ['1Q', '2Q'] : ['3Q', '4Q'];
    return [
      { label: t('timetable.fullSemester'), value: 'full' },
      ...qs.map((q) => ({ label: quarterLabel(t, q), value: q })),
    ];
  }, [term, t]);

  const onSave = () => {
    const trimmedName = name.trim();
    if (trimmedName === '') {
      notify(t('timetable.customTitle'), t('timetable.customNameRequired'));
      return;
    }
    const credits = creditsText.trim() === '' ? 0 : Number(creditsText.trim());
    if (!Number.isFinite(credits) || credits < 0) {
      notify(t('timetable.customTitle'), t('timetable.customCreditsInvalid'));
      return;
    }
    const instructors = instructorsText
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter((s) => s !== '');
    const custom: CustomCourse = {
      name: trimmedName,
      credits,
      category,
      ...(instructors.length > 0 ? { instructors } : {}),
      ...(room.trim() !== '' ? { room: room.trim() } : {}),
      ...(memo.trim() !== '' ? { memo: memo.trim() } : {}),
    };
    addEntry({
      id: generateId(),
      year: viewYear,
      term,
      ...(span !== 'full' ? { quarters: [span] } : {}),
      ...(!isIntensive ? { day, period } : {}),
      custom,
    });
    router.back();
  };

  return (
    <Screen title={t('timetable.customTitle')} close>
      <TextField
        label={t('timetable.customName')}
        value={name}
        onChangeText={setName}
        placeholder={t('timetable.customNamePlaceholder')}
      />
      <TextField
        label={t('timetable.customInstructors')}
        value={instructorsText}
        onChangeText={setInstructorsText}
      />
      <TextField
        label={t('timetable.customCredits')}
        value={creditsText}
        onChangeText={setCreditsText}
        keyboardType="numeric"
      />

      {/* 科目区分 */}
      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {t('timetable.customCategory')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setCategoryModal(true)}
          style={({ pressed }) => [
            styles.selectField,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.selectValue, { color: colors.text }]}>
            {categoryLabel(t, category)}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <TextField label={t('timetable.customRoom')} value={room} onChangeText={setRoom} />
      <TextField label={t('timetable.customMemo')} value={memo} onChangeText={setMemo} multiline />

      {/* 開講期間 */}
      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {t('timetable.customTermSpan')}
        </Text>
        <SegmentedControl
          options={[
            { label: t('common.semesterFirst'), value: 'first' },
            { label: t('common.semesterSecond'), value: 'second' },
          ]}
          value={term}
          onChange={changeTerm}
        />
        <View style={styles.segmentSpacing}>
          <SegmentedControl
            options={spanOptions}
            value={span}
            onChange={(v) => setSpan(v as 'full' | Quarter)}
          />
        </View>
      </View>

      {/* 曜日・時限 */}
      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {t('timetable.customSchedule')}
        </Text>
        <SettingRow
          title={t('timetable.customIntensiveToggle')}
          right={
            <Switch
              value={isIntensive}
              onValueChange={setIsIntensive}
              trackColor={{ true: colors.primary, false: colors.cardAlt }}
              thumbColor={colors.card}
            />
          }
        />
        {!isIntensive && (
          <>
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
              {t('timetable.customDay')}
            </Text>
            <SegmentedControl
              options={DAYS.map((d) => ({ label: dayLabel(t, d), value: d }))}
              value={day}
              onChange={(v) => setDay(v as Day)}
            />
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
              {t('timetable.customPeriod')}
            </Text>
            <SegmentedControl
              options={PERIODS.map((p) => ({ label: String(p), value: String(p) }))}
              value={String(period)}
              onChange={(v) => setPeriod(Number(v) as Period)}
            />
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Button title={t('common.save')} icon="checkmark-outline" onPress={onSave} />
        <Button title={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
      </View>

      <SelectModal
        visible={categoryModal}
        title={t('timetable.customCategory')}
        options={ALL_CATEGORIES.map((c) => ({ label: categoryLabel(t, c), value: c }))}
        onSelect={(value) => {
          setCategory(value as SubjectCategory);
          setCategoryModal(false);
        }}
        onClose={() => setCategoryModal(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    marginVertical: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  selectValue: {
    fontSize: 16,
  },
  segmentSpacing: {
    marginTop: 8,
  },
  actions: {
    marginTop: 18,
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
