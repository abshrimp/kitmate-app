import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, EmptyState, Screen, SelectModal } from '@/components/ui';
import { notify } from '@/features/timetable/confirm';
import { useTimetable } from '@/features/timetable/store';
import { TimetableGrid } from '@/features/timetable/TimetableGrid';
import { useCourseMap } from '@/features/timetable/useCourseMap';
import { useLoad } from '@/features/timetable/useLoad';
import { useI18n } from '@/i18n';
import { fetchShare } from '@/lib/api';
import { useTheme } from '@/theme';

export default function SharedTimetableScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const importEntries = useTimetable((s) => s.importEntries);
  const setView = useTimetable((s) => s.setView);

  const [importModal, setImportModal] = useState(false);

  const loadShared = useCallback(() => {
    if (id === undefined || id === '') {
      return Promise.reject(new Error('share id is missing'));
    }
    return fetchShare(id);
  }, [id]);
  const { data: shared, failed: loadError, reload } = useLoad(loadShared);

  const { courseMap } = useCourseMap(shared?.year ?? 0, shared?.entries ?? []);

  const onImport = (mode: 'merge' | 'replace') => {
    if (shared === null) return;
    importEntries(shared.entries, mode);
    setView(shared.year, shared.term);
    setImportModal(false);
    notify(t('timetable.sharedTitle'), t('timetable.sharedImported'));
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const semesterLabel =
    shared?.term === 'first' ? t('common.semesterFirst') : t('common.semesterSecond');

  return (
    <Screen title={shared?.title ?? t('timetable.sharedTitle')}>
      {shared === null && !loadError && (
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
          title={t('timetable.sharedLoadError')}
          action={<Button title={t('common.retry')} variant="secondary" onPress={reload} />}
        />
      )}
      {shared !== null && !loadError && (
        <>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.text }]}>
              {t('common.year', { y: shared.year })} {semesterLabel}
            </Text>
            <Badge
              label={t('timetable.sharedEntriesCount', { n: shared.entries.length })}
              color={colors.accent}
            />
          </View>

          {/* 読み取り専用プレビュー */}
          <TimetableGrid entries={shared.entries} quarter="all" courseMap={courseMap} />

          <View style={styles.actions}>
            <Button
              title={t('timetable.sharedImport')}
              icon="download-outline"
              onPress={() => setImportModal(true)}
            />
          </View>
        </>
      )}

      <SelectModal
        visible={importModal}
        title={t('timetable.sharedImportTitle')}
        options={[
          {
            label: t('timetable.sharedImportMerge'),
            value: 'merge',
            subtitle: t('timetable.sharedImportMergeSubtitle'),
          },
          {
            label: t('timetable.sharedImportReplace'),
            value: 'replace',
            subtitle: t('timetable.sharedImportReplaceSubtitle'),
          },
        ]}
        onSelect={(value) => onImport(value as 'merge' | 'replace')}
        onClose={() => setImportModal(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    marginTop: 20,
  },
});
