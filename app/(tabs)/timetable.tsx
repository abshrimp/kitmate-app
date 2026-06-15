import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, ListItem, Screen, SegmentedControl } from '@/components/ui';
import { confirmAsync, notify } from '@/features/timetable/confirm';
import { EntryDetailSheet } from '@/features/timetable/EntryDetailSheet';
import { quarterLabel } from '@/features/timetable/labels';
import { entriesFor, useTimetable } from '@/features/timetable/store';
import { useTimetableSync } from '@/features/timetable/sync';
import { TimetableGrid } from '@/features/timetable/TimetableGrid';
import { useCourseMap } from '@/features/timetable/useCourseMap';
import { useCourseYears } from '@/features/timetable/useCourseYears';
import { useI18n } from '@/i18n';
import { API_BASE_URL, createShare } from '@/lib/api';
import { quarterBelongsTo } from '@/lib/terms';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import type { Day, Period, Quarter, Semester } from '@/types';

type ShareState =
  | { phase: 'closed' }
  | { phase: 'creating' }
  | { phase: 'ready'; url: string }
  | { phase: 'error' };

/** ヘッダ右の同期インジケータ (ログイン時のみ表示) */
function SyncIndicator() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const status = useTimetableSync();

  if (status === 'loggedOut') return null;
  if (status === 'syncing') {
    return (
      <View accessibilityLabel={t('timetable.syncSyncing')} style={styles.syncWrap}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }
  const ok = status === 'synced';
  return (
    <View
      accessibilityLabel={ok ? t('timetable.syncSynced') : t('timetable.syncError')}
      style={styles.syncWrap}
    >
      <Ionicons
        name={ok ? 'cloud-done-outline' : 'cloud-offline-outline'}
        size={20}
        color={ok ? colors.success : colors.danger}
      />
    </View>
  );
}

export default function TimetableScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const entries = useTimetable((s) => s.entries);
  const viewYear = useTimetable((s) => s.viewYear);
  const viewTerm = useTimetable((s) => s.viewTerm);
  const quarterFilter = useTimetable((s) => s.quarterFilter);
  const setView = useTimetable((s) => s.setView);
  const setQuarterFilter = useTimetable((s) => s.setQuarterFilter);
  const replaceAll = useTimetable((s) => s.replaceAll);

  // データ無し年度の代用: データのある年度一覧 + 代用警告/作り直し
  const availableYears = useCourseYears();
  const hideMissingYearWarning = useSettings((s) => s.hideMissingYearWarning);
  const substitutedYears = useSettings((s) => s.substitutedYears);
  const setSetting = useSettings((s) => s.set);
  const warnedYearRef = useRef<number | null>(null);
  const rebuildCheckedRef = useRef(false);

  // 代用データで作成した年度を記録 (データ追加後の作り直し検出用)
  useEffect(() => {
    if (availableYears === null) return;
    const yearsWithEntries = [...new Set(entries.map((e) => e.year))];
    const newly = yearsWithEntries.filter(
      (y) => !availableYears.includes(y) && !substitutedYears.includes(y),
    );
    if (newly.length > 0) setSetting('substitutedYears', [...substitutedYears, ...newly]);
  }, [entries, availableYears, substitutedYears, setSetting]);

  // 表示中の年度にデータが無ければ警告 (今後表示しない可)
  useEffect(() => {
    if (availableYears === null || hideMissingYearWarning) return;
    if (availableYears.includes(viewYear) || warnedYearRef.current === viewYear) return;
    warnedYearRef.current = viewYear;
    void (async () => {
      const ok = await confirmAsync({
        title: t('timetable.missingYearTitle', { y: viewYear }),
        message: t('timetable.missingYearMessage'),
        confirmLabel: t('timetable.missingYearOk'),
        cancelLabel: t('timetable.missingYearDontShow'),
      });
      if (!ok) setSetting('hideMissingYearWarning', true);
    })();
  }, [viewYear, availableYears, hideMissingYearWarning, t, setSetting]);

  // 代用した年度のデータが後から追加されたら、その年度の時間割を作り直すか確認
  useEffect(() => {
    if (availableYears === null || rebuildCheckedRef.current) return;
    const ready = substitutedYears.filter((y) => availableYears.includes(y));
    if (ready.length === 0) return;
    rebuildCheckedRef.current = true;
    void (async () => {
      for (const y of ready) {
        if (useTimetable.getState().entries.some((e) => e.year === y)) {
          const ok = await confirmAsync({
            title: t('timetable.yearDataAddedTitle', { y }),
            message: t('timetable.yearDataAddedMessage', { y }),
            confirmLabel: t('timetable.yearDataRebuild'),
            cancelLabel: t('common.cancel'),
            destructive: true,
          });
          if (ok) replaceAll(useTimetable.getState().entries.filter((e) => e.year !== y));
        }
        setSetting(
          'substitutedYears',
          useSettings.getState().substitutedYears.filter((x) => x !== y),
        );
      }
    })();
  }, [availableYears, substitutedYears, t, replaceAll, setSetting]);

  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [share, setShare] = useState<ShareState>({ phase: 'closed' });
  const [copied, setCopied] = useState(false);

  const termEntries = useMemo(
    () => entriesFor(entries, viewYear, viewTerm),
    [entries, viewYear, viewTerm],
  );
  const { courseMap } = useCourseMap(viewYear, termEntries);

  const selectedEntry = termEntries.find((e) => e.id === selectedId) ?? null;
  const selectedCourse =
    selectedEntry?.courseId !== undefined ? courseMap[selectedEntry.courseId] : undefined;

  const changeTerm = (value: string) => {
    const term = value as Semester;
    setView(viewYear, term);
    if (quarterFilter !== 'all' && quarterBelongsTo(quarterFilter) !== term) {
      setQuarterFilter('all');
    }
  };

  const quarterOptions = useMemo(() => {
    const qs: Quarter[] = viewTerm === 'first' ? ['1Q', '2Q'] : ['3Q', '4Q'];
    return [
      { label: t('timetable.allQuarters'), value: 'all' },
      ...qs.map((q) => ({ label: quarterLabel(t, q), value: q })),
    ];
  }, [viewTerm, t]);

  const openPicker = (day: Day, period: Period) => {
    router.push({ pathname: '/timetable/picker', params: { day, period: String(period) } });
  };

  const openIntensivePicker = () => {
    router.push({ pathname: '/timetable/picker', params: { intensive: '1' } });
  };

  const startShare = async () => {
    const current = entriesFor(useTimetable.getState().entries, viewYear, viewTerm);
    if (current.length === 0) {
      notify(t('timetable.shareSheetTitle'), t('timetable.shareEmpty'));
      return;
    }
    setCopied(false);
    setShare({ phase: 'creating' });
    try {
      const { id } = await createShare({
        version: 1,
        year: viewYear,
        term: viewTerm,
        entries: current,
      });
      setShare({ phase: 'ready', url: `${API_BASE_URL}/share/${id}` });
    } catch (e) {
      console.error('createShare failed', e);
      setShare({ phase: 'error' });
    }
  };

  const copyUrl = async (url: string) => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
  };

  const systemShare = async (url: string) => {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as
        | (Navigator & { share?: (data: { url: string }) => Promise<void> })
        | undefined;
      if (nav !== undefined && typeof nav.share === 'function') {
        try {
          await nav.share({ url });
        } catch {
          // ユーザーキャンセル等は無視
        }
      } else {
        await copyUrl(url);
      }
      return;
    }
    try {
      await Share.share({ message: url });
    } catch (e) {
      console.error('Share.share failed', e);
    }
  };

  return (
    <Screen
      title={t('timetable.title')}
      right={
        <>
          <SyncIndicator />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('timetable.menuTitle')}
            onPress={() => setMenuVisible(true)}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={colors.primary} />
          </Pressable>
        </>
      }
    >
      {/* 年度・学期・クォーター切替 */}
      <View style={styles.controls}>
        <View style={styles.yearRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setView(viewYear - 1, viewTerm)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.yearButton,
              { backgroundColor: colors.cardAlt },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
          </Pressable>
          <Text style={[styles.yearText, { color: colors.text }]}>
            {t('common.year', { y: viewYear })}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setView(viewYear + 1, viewTerm)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.yearButton,
              { backgroundColor: colors.cardAlt },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.segmentRow}>
          <View style={styles.segmentItem}>
            <SegmentedControl
              options={[
                { label: t('common.semesterFirst'), value: 'first' },
                { label: t('common.semesterSecond'), value: 'second' },
              ]}
              value={viewTerm}
              onChange={changeTerm}
            />
          </View>
          <View style={styles.segmentItem}>
            <SegmentedControl
              options={quarterOptions}
              value={quarterFilter}
              onChange={(v) => setQuarterFilter(v as 'all' | Quarter)}
            />
          </View>
        </View>
      </View>

      <TimetableGrid
        entries={termEntries}
        quarter={quarterFilter}
        courseMap={courseMap}
        onPressEntry={(entry) => setSelectedId(entry.id)}
        onPressEmptyCell={openPicker}
        onPressAddIntensive={openIntensivePicker}
      />

      {/* 講義詳細ボトムシート */}
      <EntryDetailSheet
        entry={selectedEntry}
        course={selectedCourse}
        onClose={() => setSelectedId(null)}
      />

      {/* アクションメニュー */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={() => setMenuVisible(false)}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={() => undefined}
          >
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {t('timetable.menuTitle')}
            </Text>
            <ListItem
              icon="albums-outline"
              title={t('timetable.menuBulk')}
              subtitle={t('timetable.menuBulkSubtitle')}
              onPress={() => {
                setMenuVisible(false);
                router.push('/timetable/bulk');
              }}
            />
            <ListItem
              icon="create-outline"
              title={t('timetable.menuCustom')}
              subtitle={t('timetable.menuCustomSubtitle')}
              onPress={() => {
                setMenuVisible(false);
                router.push('/timetable/custom');
              }}
            />
            <ListItem
              icon="share-outline"
              title={t('timetable.menuShare')}
              subtitle={t('timetable.menuShareSubtitle')}
              onPress={() => {
                setMenuVisible(false);
                void startShare();
              }}
            />
            <ListItem
              icon="settings-outline"
              title={t('timetable.menuSettings')}
              subtitle={t('timetable.menuSettingsSubtitle')}
              onPress={() => {
                setMenuVisible(false);
                router.push('/timetable/settings');
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 共有シート */}
      <Modal
        visible={share.phase !== 'closed'}
        transparent
        animationType="fade"
        onRequestClose={() => setShare({ phase: 'closed' })}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={() => setShare({ phase: 'closed' })}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={() => undefined}
          >
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {t('timetable.shareSheetTitle')}
            </Text>
            {share.phase === 'creating' && (
              <View style={styles.shareStatus}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.shareStatusText, { color: colors.textSecondary }]}>
                  {t('timetable.shareCreating')}
                </Text>
              </View>
            )}
            {share.phase === 'error' && (
              <View style={styles.shareStatus}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                <Text style={[styles.shareStatusText, { color: colors.danger }]}>
                  {t('timetable.shareFailed')}
                </Text>
              </View>
            )}
            {share.phase === 'ready' && (
              <View style={styles.shareBody}>
                <Text style={[styles.shareStatusText, { color: colors.textSecondary }]}>
                  {t('timetable.shareReady')}
                </Text>
                <View
                  style={[
                    styles.shareUrlBox,
                    { backgroundColor: colors.cardAlt, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.shareUrl, { color: colors.text }]} numberOfLines={2}>
                    {share.url}
                  </Text>
                </View>
                <Button
                  title={copied ? t('timetable.shareCopied') : t('timetable.shareCopy')}
                  icon={copied ? 'checkmark-outline' : 'copy-outline'}
                  variant="secondary"
                  onPress={() => void copyUrl(share.url)}
                />
                <Button
                  title={t('timetable.shareOpen')}
                  icon="share-outline"
                  onPress={() => void systemShare(share.url)}
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    marginBottom: 12,
    gap: 8,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  yearButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 96,
    textAlign: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentItem: {
    flex: 1,
  },
  syncWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  shareStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  shareStatusText: {
    fontSize: 14,
  },
  shareBody: {
    gap: 10,
    paddingTop: 4,
  },
  shareUrlBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  shareUrl: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
