import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ENTRY_COLOR_PRESETS, withAlpha } from './colors';
import { confirmAsync } from './confirm';
import { categoryLabel, categoryTint, dayLabel } from './labels';
import { useTimetable } from './store';
import { resolveBuildingFromRoom } from '@/features/map/buildings';
import { Badge, Button } from '@/components/ui';
import type { IoniconsName } from '@/components/ui';
import { useI18n } from '@/i18n';
import { PERIOD_TIMES } from '@/lib/terms';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import type { Course, SubjectCategory, TimetableEntry } from '@/types';
import { categoryFor, programVariantKey } from '@/types';

export interface EntryDetailSheetProps {
  entry: TimetableEntry | null;
  course?: Course;
  onClose: () => void;
}

interface InfoRowProps {
  icon: IoniconsName;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} style={styles.infoIcon} />
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

/** 講義セルタップで開く詳細ボトムシート */
export function EntryDetailSheet({ entry, course, onClose }: EntryDetailSheetProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const updateEntry = useTimetable((s) => s.updateEntry);
  const removeEntry = useTimetable((s) => s.removeEntry);
  const admissionYear = useSettings((s) => s.admissionYear);
  const programSelection = useSettings((s) => s.programSelection);

  if (entry === null) {
    return <Modal visible={false} transparent onRequestClose={onClose} />;
  }

  const isCustom = entry.custom !== undefined;
  const name = isCustom ? (entry.custom?.name ?? '') : (course?.name ?? entry.courseId ?? '');
  const instructors = isCustom ? entry.custom?.instructors : course?.instructors;
  const credits = isCustom ? entry.custom?.credits : course?.credits;
  const room = isCustom ? entry.custom?.room : course?.room;
  const classLabel = entry.classLabel ?? course?.classLabel;
  const memo = entry.custom?.memo;

  let category: SubjectCategory | undefined = entry.custom?.category;
  if (!isCustom && course !== undefined && admissionYear !== null && programSelection !== null) {
    category = categoryFor(course, admissionYear, programVariantKey(programSelection));
  }

  const semesterLabel =
    entry.term === 'first' ? t('common.semesterFirst') : t('common.semesterSecond');
  const quartersLabel =
    entry.quarters !== undefined && entry.quarters.length > 0 ? ` ${entry.quarters.join('/')}` : '';
  const slotLabel =
    entry.day !== undefined && entry.period !== undefined
      ? `${dayLabel(t, entry.day)}${entry.period} (${PERIOD_TIMES[entry.period].start}-${PERIOD_TIMES[entry.period].end})`
      : t('common.intensive');
  const termValue = `${t('common.year', { y: entry.year })} ${semesterLabel}${quartersLabel}・${slotLabel}`;

  const onDelete = async () => {
    const ok = await confirmAsync({
      title: t('timetable.deleteConfirmTitle'),
      message: t('timetable.deleteConfirmMessage', { name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    removeEntry(entry.id);
    onClose();
  };

  const openSyllabus = () => {
    if (entry.courseId === undefined) return;
    onClose();
    router.push(`/syllabus/${entry.courseId}`);
  };

  const mapBuildingId =
    room !== undefined && room !== '' ? resolveBuildingFromRoom(room) : null;
  const openMap = () => {
    if (mapBuildingId === null) return;
    onClose();
    router.push({ pathname: '/map', params: { building: mapBuildingId } });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {name}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.badges}>
              {isCustom && (
                <Badge label={t('timetable.customCourseBadge')} color={colors.accent} />
              )}
              {category !== undefined && (
                <Badge label={categoryLabel(t, category)} color={categoryTint(category, colors)} />
              )}
              {credits !== undefined && <Badge label={t('common.credits', { n: credits })} />}
              {classLabel !== undefined && classLabel !== '' && (
                <Badge label={classLabel} color={colors.textSecondary} />
              )}
            </View>

            <InfoRow icon="time-outline" label={t('timetable.detailTerm')} value={termValue} />
            {instructors !== undefined && instructors.length > 0 && (
              <InfoRow
                icon="person-outline"
                label={t('timetable.detailInstructors')}
                value={instructors.join('、')}
              />
            )}
            {room !== undefined && room !== '' && (
              mapBuildingId !== null ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={openMap}
                  style={({ pressed }) => [styles.infoRow, pressed && styles.pressed]}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={colors.textSecondary}
                    style={styles.infoIcon}
                  />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    {t('timetable.detailRoom')}
                  </Text>
                  <Text
                    style={[styles.infoValue, styles.roomLink, { color: colors.primary }]}
                  >
                    {room}
                  </Text>
                  <Ionicons name="open-outline" size={14} color={colors.primary} />
                </Pressable>
              ) : (
                <InfoRow icon="location-outline" label={t('timetable.detailRoom')} value={room} />
              )
            )}
            {memo !== undefined && memo !== '' && (
              <InfoRow icon="document-text-outline" label={t('timetable.detailMemo')} value={memo} />
            )}

            {/* 単位数に含めない (要件計算から除外) */}
            <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
              <Ionicons
                name="calculator-outline"
                size={16}
                color={colors.textSecondary}
                style={styles.infoIcon}
              />
              <View style={styles.toggleText}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  {t('timetable.excludeFromCredits')}
                </Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                  {t('timetable.excludeFromCreditsNote')}
                </Text>
              </View>
              <Switch
                value={entry.excludeFromCredits ?? false}
                onValueChange={(v) => updateEntry(entry.id, { excludeFromCredits: v })}
                trackColor={{ true: colors.primary, false: colors.cardAlt }}
                thumbColor={colors.card}
              />
            </View>

            {/* 色変更 */}
            <Text style={[styles.colorTitle, { color: colors.textSecondary }]}>
              {t('timetable.cellColor')}
            </Text>
            <View style={styles.swatches}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('timetable.colorNone')}
                onPress={() => updateEntry(entry.id, { color: undefined })}
                style={[
                  styles.swatch,
                  { borderColor: entry.color === undefined ? colors.primary : colors.border },
                ]}
              >
                <Ionicons name="ban-outline" size={18} color={colors.textSecondary} />
              </Pressable>
              {ENTRY_COLOR_PRESETS.map((preset) => {
                const selected = entry.color === preset;
                return (
                  <Pressable
                    key={preset}
                    accessibilityRole="button"
                    onPress={() => updateEntry(entry.id, { color: preset })}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: withAlpha(preset, 200),
                        borderColor: selected ? colors.text : 'transparent',
                      },
                    ]}
                  >
                    {selected && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actions}>
              {entry.courseId !== undefined && (
                <Button
                  title={t('timetable.openSyllabus')}
                  icon="book-outline"
                  variant="secondary"
                  onPress={openSyllabus}
                />
              )}
              <Button
                title={t('timetable.deleteEntry')}
                icon="trash-outline"
                variant="danger"
                onPress={() => void onDelete()}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    gap: 8,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoLabel: {
    width: 64,
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  roomLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSub: {
    fontSize: 12,
  },
  colorTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
});
