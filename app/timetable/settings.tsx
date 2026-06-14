import { Switch } from 'react-native';

import { Card, ListItem, Screen, Section, SettingRow } from '@/components/ui';
import { confirmAsync, showAlert } from '@/features/settings/dialogs';
import { useTimetable } from '@/features/timetable/store';
import { useI18n } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

/** 時間割タブの設定 (講義選択の表示オプション + 時間割データ操作) */
export default function TimetableSettingsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const settings = useSettings();
  const switchColors = { trackColor: { false: colors.border, true: colors.primary } };

  async function handleDeleteAll(): Promise<void> {
    const first = await confirmAsync({
      title: t('settings.deleteConfirmTitle1'),
      message: t('settings.deleteConfirmMessage1'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!first) return;
    const second = await confirmAsync({
      title: t('settings.deleteConfirmTitle2'),
      message: t('settings.deleteConfirmMessage2'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!second) return;
    useTimetable.getState().replaceAll([]);
    showAlert(t('settings.deletedTitle'), t('settings.deletedMessage'));
  }

  return (
    <Screen title={t('timetable.settingsTitle')} close>
      {/* ===== 講義選択の表示 ===== */}
      <Section title={t('settings.sectionDisplay')}>
        <Card>
          <SettingRow
            title={t('settings.showOtherProgram')}
            right={
              <Switch
                {...switchColors}
                value={settings.showOtherProgram}
                onValueChange={(v) => settings.set('showOtherProgram', v)}
              />
            }
          />
          <SettingRow
            title={t('settings.showNotAllowed')}
            right={
              <Switch
                {...switchColors}
                value={settings.showNotAllowed}
                onValueChange={(v) => settings.set('showNotAllowed', v)}
              />
            }
          />
          <SettingRow
            title={t('settings.showHigherGrades')}
            subtitle={t('settings.showHigherGradesNote')}
            right={
              <Switch
                {...switchColors}
                value={settings.showHigherGrades}
                onValueChange={(v) => settings.set('showHigherGrades', v)}
              />
            }
          />
        </Card>
      </Section>

      {/* ===== データ ===== */}
      <Section title={t('settings.sectionData')}>
        <Card>
          <ListItem
            icon="trash-outline"
            destructive
            title={t('settings.deleteAllTimetable')}
            onPress={() => {
              void handleDeleteAll();
            }}
          />
        </Card>
      </Section>
    </Screen>
  );
}
