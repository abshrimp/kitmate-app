import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

import {
  Card,
  ListItem,
  Screen,
  Section,
  SegmentedControl,
  SelectModal,
  SettingRow,
  type SelectModalOption,
} from '@/components/ui';
import { cancelAssignmentNotifications } from '@/features/assignments/notifications';
import { showAlert } from '@/features/settings/dialogs';
import { NotifyTimingPicker } from '@/features/settings/NotifyTimingPicker';
import { PushSetupError, updatePushSubscription } from '@/features/settings/push';
import { useI18n } from '@/i18n';
import { currentAcademicYear, gradeOf } from '@/lib/terms';
import { useSettings, type TabKey } from '@/store/settings';
import { useTheme } from '@/theme';
import type { ChemCourseId, DesignArchCourseId, ProgramId } from '@/types';

const FIRST_ADMISSION_YEAR = 2018;

const TERMS_URL = 'https://docs.kitmate.jp/terms';
const PRIVACY_URL = 'https://docs.kitmate.jp/privacy';
const FEEDBACK_URL = 'https://docs.kitmate.jp/feedback';

function openUrl(url: string): void {
  Linking.openURL(url).catch((e) => {
    console.error('Failed to open URL', url, e);
  });
}

const PROGRAMS: { id: ProgramId; labelKey: string }[] = [
  { id: 'bio', labelKey: 'settings.programBio' },
  { id: 'chem', labelKey: 'settings.programChem' },
  { id: 'elec', labelKey: 'settings.programElec' },
  { id: 'info', labelKey: 'settings.programInfo' },
  { id: 'mech', labelKey: 'settings.programMech' },
  { id: 'design_arch', labelKey: 'settings.programDesignArch' },
];

const CHEM_COURSES: { id: ChemCourseId; labelKey: string }[] = [
  { id: 'A', labelKey: 'settings.chemCourseA' },
  { id: 'B', labelKey: 'settings.chemCourseB' },
  { id: 'C', labelKey: 'settings.chemCourseC' },
  { id: 'D', labelKey: 'settings.chemCourseD' },
];

const DA_COURSES: { id: DesignArchCourseId; labelKey: string }[] = [
  { id: 'design', labelKey: 'settings.daCourseDesign' },
  { id: 'architecture', labelKey: 'settings.daCourseArchitecture' },
];

type ModalKind = 'year' | 'program' | 'chem' | 'da' | 'startupTab' | null;

const STARTUP_TAB_OPTIONS: { value: 'last' | TabKey; labelKey: string }[] = [
  { value: 'last', labelKey: 'settings.startupTabLast' },
  { value: 'index', labelKey: 'common.tabHome' },
  { value: 'timetable', labelKey: 'common.tabTimetable' },
  { value: 'assignments', labelKey: 'common.tabAssignments' },
  { value: 'info', labelKey: 'common.tabInfo' },
  { value: 'links', labelKey: 'common.tabLinks' },
];

/** 現在値 + シェブロンを右側に表示する選択行 */
function SelectRow({ title, value, onPress }: { title: string; value: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <ListItem
      title={title}
      onPress={onPress}
      right={
        <>
          <Text style={[styles.valueText, { color: colors.textSecondary }]} numberOfLines={1}>
            {value}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </>
      }
    />
  );
}

export default function SettingsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const settings = useSettings();

  const [modal, setModal] = useState<ModalKind>(null);
  const [pushBusy, setPushBusy] = useState(false);

  const academicYear = currentAcademicYear();
  const selection = settings.programSelection;

  const switchColors = { trackColor: { false: colors.border, true: colors.primary } };

  // ===== 選択肢 =====

  const yearOptions: SelectModalOption[] = [];
  for (let y = academicYear; y >= FIRST_ADMISSION_YEAR; y -= 1) {
    yearOptions.push({ label: t('common.year', { y }), value: String(y) });
  }

  const programOptions: SelectModalOption[] = PROGRAMS.map((p) => ({
    label: t(p.labelKey),
    value: p.id,
  }));
  const chemOptions: SelectModalOption[] = CHEM_COURSES.map((c) => ({
    label: t(c.labelKey),
    value: c.id,
  }));
  const daOptions: SelectModalOption[] = DA_COURSES.map((c) => ({
    label: t(c.labelKey),
    value: c.id,
  }));
  // ===== 表示値 =====

  function chemCourseLabel(id: ChemCourseId): string {
    return t(CHEM_COURSES.find((c) => c.id === id)?.labelKey ?? 'settings.notSet');
  }
  function daCourseLabel(id: DesignArchCourseId): string {
    return t(DA_COURSES.find((c) => c.id === id)?.labelKey ?? 'settings.notSet');
  }
  function programValueLabel(): string {
    if (selection === null) return t('settings.notSet');
    return t(PROGRAMS.find((p) => p.id === selection.program)?.labelKey ?? 'settings.notSet');
  }
  function startupTabLabel(): string {
    const opt = STARTUP_TAB_OPTIONS.find((o) => o.value === settings.startupTab);
    return t(opt?.labelKey ?? 'common.tabHome');
  }

  // ===== ハンドラ =====

  function handleProgramSelect(program: ProgramId): void {
    const tech = selection?.tech ?? false;
    if (program === 'chem') {
      settings.set('programSelection', {
        program,
        chemCourse: selection?.chemCourse ?? 'A',
        tech,
      });
      setModal('chem');
    } else if (program === 'design_arch') {
      settings.set('programSelection', {
        program,
        daCourse: selection?.daCourse ?? 'design',
        tech,
      });
      setModal('da');
    } else {
      settings.set('programSelection', { program, tech });
      setModal(null);
    }
  }

  function handleAssignmentToggle(value: boolean): void {
    settings.set('assignmentNotifications', value);
    if (!value) {
      void cancelAssignmentNotifications();
    }
  }

  // 休講通知・授業関連連絡は 1 デバイス購読を共有し、フラグだけを切り替える。
  async function handlePushToggle(
    kind: 'cancellationNotifications' | 'lectureInfoNotifications',
    value: boolean,
  ): Promise<void> {
    if (pushBusy) return;
    setPushBusy(true);
    const prev = {
      cancellation: settings.cancellationNotifications,
      lectureInfo: settings.lectureInfoNotifications,
    };
    const next = {
      cancellation: kind === 'cancellationNotifications' ? value : prev.cancellation,
      lectureInfo: kind === 'lectureInfoNotifications' ? value : prev.lectureInfo,
    };
    settings.set('cancellationNotifications', next.cancellation);
    settings.set('lectureInfoNotifications', next.lectureInfo);
    try {
      await updatePushSubscription(next);
    } catch (e) {
      // 登録失敗時は両トグルを元に戻して理由を表示
      settings.set('cancellationNotifications', prev.cancellation);
      settings.set('lectureInfoNotifications', prev.lectureInfo);
      const message = e instanceof PushSetupError ? e.message : t('common.error');
      showAlert(t('settings.pushErrorTitle'), message);
    }
    setPushBusy(false);
  }


  return (
    <Screen title={t('common.settings')}>
      {/* ===== プロフィール ===== */}
      <Section title={t('settings.sectionProfile')}>
        <Card>
          <SelectRow
            title={t('settings.admissionYear')}
            value={
              settings.admissionYear !== null
                ? t('common.year', { y: settings.admissionYear })
                : t('settings.notSet')
            }
            onPress={() => setModal('year')}
          />
          {settings.admissionYear !== null && (
            <SettingRow
              title={t('settings.currentGrade')}
              right={
                <Text style={[styles.valueText, { color: colors.textSecondary }]}>
                  {t('common.grade', { n: gradeOf(settings.admissionYear, academicYear) })}
                </Text>
              }
            />
          )}
          <SelectRow
            title={t('settings.program')}
            value={programValueLabel()}
            onPress={() => setModal('program')}
          />
          {selection?.program === 'chem' && (
            <SelectRow
              title={t('settings.selectChemCourse')}
              value={chemCourseLabel(selection.chemCourse ?? 'A')}
              onPress={() => setModal('chem')}
            />
          )}
          {selection?.program === 'design_arch' && (
            <SelectRow
              title={t('settings.selectDaCourse')}
              value={daCourseLabel(selection.daCourse ?? 'design')}
              onPress={() => setModal('da')}
            />
          )}
          <SettingRow
            title={t('settings.techProgram')}
            subtitle={selection === null ? t('settings.techProgramNote') : undefined}
            right={
              <Switch
                {...switchColors}
                value={selection?.tech ?? false}
                disabled={selection === null}
                onValueChange={(v) => {
                  if (selection !== null) settings.set('programSelection', { ...selection, tech: v });
                }}
              />
            }
          />
        </Card>
      </Section>

      {/* ===== 表示 ===== */}
      <Section title={t('settings.sectionDisplay')}>
        <Card>
          <SelectRow
            title={t('settings.startupTab')}
            value={startupTabLabel()}
            onPress={() => setModal('startupTab')}
          />
        </Card>
      </Section>

      {/* ===== 通知 ===== */}
      <Section title={t('settings.sectionNotifications')}>
        <Card>
          <SettingRow
            title={t('settings.assignmentNotifications')}
            subtitle={
              Platform.OS === 'web'
                ? t('settings.nativeOnly')
                : t('settings.assignmentNotificationsNote')
            }
            right={
              <Switch
                {...switchColors}
                value={settings.assignmentNotifications}
                onValueChange={handleAssignmentToggle}
              />
            }
          />
          {settings.assignmentNotifications && (
            <NotifyTimingPicker
              value={settings.assignmentNotifyHoursBefore}
              onChange={(v) => settings.set('assignmentNotifyHoursBefore', v)}
            />
          )}
          <SettingRow
            title={t('settings.cancellationNotifications')}
            subtitle={t('settings.cancellationNotificationsNote')}
            right={
              <Switch
                {...switchColors}
                value={settings.cancellationNotifications}
                disabled={pushBusy}
                onValueChange={(v) => {
                  void handlePushToggle('cancellationNotifications', v);
                }}
              />
            }
          />
          <SettingRow
            title={t('settings.lectureInfoNotifications')}
            subtitle={t('settings.lectureInfoNotificationsNote')}
            right={
              <Switch
                {...switchColors}
                value={settings.lectureInfoNotifications}
                disabled={pushBusy}
                onValueChange={(v) => {
                  void handlePushToggle('lectureInfoNotifications', v);
                }}
              />
            }
          />
        </Card>
      </Section>

      {/* ===== 外観 ===== */}
      <Section title={t('settings.sectionAppearance')}>
        <Card>
          <View style={styles.segmentBlock}>
            <Text style={[styles.segmentLabel, { color: colors.text }]}>{t('settings.theme')}</Text>
            <SegmentedControl
              options={[
                { label: t('settings.themeSystem'), value: 'system' },
                { label: t('settings.themeLight'), value: 'light' },
                { label: t('settings.themeDark'), value: 'dark' },
              ]}
              value={settings.themeMode}
              onChange={(v) => settings.set('themeMode', v as 'system' | 'light' | 'dark')}
            />
          </View>
          <View style={styles.segmentBlock}>
            <Text style={[styles.segmentLabel, { color: colors.text }]}>
              {t('settings.language')}
            </Text>
            <SegmentedControl
              options={[
                { label: t('settings.langSystem'), value: 'system' },
                { label: t('settings.langJa'), value: 'ja' },
                { label: t('settings.langEn'), value: 'en' },
              ]}
              value={settings.language}
              onChange={(v) => settings.set('language', v as 'system' | 'ja' | 'en')}
            />
          </View>
        </Card>
      </Section>

      {/* ===== 情報 ===== */}
      <Section title={t('settings.sectionAbout')}>
        <Card>
          <ListItem
            icon="document-text-outline"
            title={t('settings.termsOfService')}
            right={<Ionicons name="open-outline" size={18} color={colors.textSecondary} />}
            onPress={() => openUrl(TERMS_URL)}
          />
          <ListItem
            icon="shield-checkmark-outline"
            title={t('settings.privacyPolicy')}
            right={<Ionicons name="open-outline" size={18} color={colors.textSecondary} />}
            onPress={() => openUrl(PRIVACY_URL)}
          />
          <ListItem
            icon="chatbox-ellipses-outline"
            title={t('settings.feedback')}
            right={<Ionicons name="open-outline" size={18} color={colors.textSecondary} />}
            onPress={() => openUrl(FEEDBACK_URL)}
          />
        </Card>
      </Section>

      {/* ===== モーダル ===== */}
      <SelectModal
        visible={modal === 'year'}
        title={t('settings.selectAdmissionYear')}
        options={yearOptions}
        onSelect={(v) => {
          settings.set('admissionYear', Number(v));
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />
      <SelectModal
        visible={modal === 'program'}
        title={t('settings.selectProgram')}
        options={programOptions}
        onSelect={(v) => handleProgramSelect(v as ProgramId)}
        onClose={() => setModal(null)}
      />
      <SelectModal
        visible={modal === 'chem'}
        title={t('settings.selectChemCourse')}
        options={chemOptions}
        onSelect={(v) => {
          settings.set('programSelection', {
            program: 'chem',
            chemCourse: v as ChemCourseId,
            tech: selection?.tech ?? false,
          });
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />
      <SelectModal
        visible={modal === 'da'}
        title={t('settings.selectDaCourse')}
        options={daOptions}
        onSelect={(v) => {
          settings.set('programSelection', {
            program: 'design_arch',
            daCourse: v as DesignArchCourseId,
            tech: selection?.tech ?? false,
          });
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />
      <SelectModal
        visible={modal === 'startupTab'}
        title={t('settings.startupTab')}
        options={STARTUP_TAB_OPTIONS.map((o) => ({ label: t(o.labelKey), value: o.value }))}
        onSelect={(v) => {
          settings.set('startupTab', v as 'last' | TabKey);
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  valueText: {
    fontSize: 15,
    maxWidth: 180,
  },
  segmentBlock: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  segmentLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});
