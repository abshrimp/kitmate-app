import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, EmptyState, Screen } from '@/components/ui';
import { calendarDaysFrom, formatTime, startOfDay, stripHtml } from '@/features/assignments/format';
import { formatRemaining } from '@/features/assignments/remaining';
import { useAssignments } from '@/features/assignments/useAssignments';
import { useI18n, type I18n } from '@/i18n';
import { useNowMinute } from '@/lib/useNow';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme';
import type { AssignmentEvent } from '@/types';

interface AssignmentSection {
  key: string;
  title: string;
  data: AssignmentEvent[];
}

function dateLabel(d: Date, t: I18n['t']): string {
  return t('assignments.dateFormat', {
    m: d.getMonth() + 1,
    d: d.getDate(),
    w: t(`assignments.weekday${d.getDay()}`),
  });
}

export default function AssignmentsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const hydrated = useAuth((s) => s.hydrated);
  const wstoken = useAuth((s) => s.wstoken);
  const { events, status, reload, refresh } = useAssignments();
  const [selected, setSelected] = useState<AssignmentEvent | null>(null);
  const now = useNowMinute(); // 残り時間をリアルタイム(分ごと)に更新

  const sections = useMemo<AssignmentSection[]>(() => {
    const todayStart = startOfDay(new Date());
    const map = new Map<string, AssignmentSection>();
    for (const event of events) {
      const due = new Date(event.timesort * 1000);
      const key = `${due.getFullYear()}-${due.getMonth()}-${due.getDate()}`;
      let section = map.get(key);
      if (section === undefined) {
        const dayDiff = calendarDaysFrom(todayStart, due);
        const date = dateLabel(due, t);
        const relative =
          dayDiff <= 0 ? t('assignments.today') :
          dayDiff === 1 ? t('assignments.tomorrow') :
          dayDiff < 7 ? t('assignments.thisWeek') :
          null;
        section = { key, title: relative === null ? date : `${relative} · ${date}`, data: [] };
        map.set(key, section);
      }
      section.data.push(event);
    }
    return [...map.values()];
  }, [events, t]);

  const openInMoodle = (event: AssignmentEvent) => {
    Linking.openURL(event.actionUrl ?? event.url).catch((e) => {
      console.error('Failed to open Moodle URL', e);
    });
  };

  // ----- web: ログイン機能なし → 案内のみ -----
  if (Platform.OS === 'web') {
    return (
      <Screen title={t('assignments.title')}>
        <EmptyState
          icon="phone-portrait-outline"
          title={t('assignments.webOnlyTitle')}
          message={`${t('assignments.webOnlyMessage')}\n${t('assignments.webNotificationNote')}`}
        />
      </Screen>
    );
  }

  // ----- 起動直後 (SecureStore 復元待ち) -----
  if (!hydrated) {
    return (
      <Screen title={t('assignments.title')} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  // ----- トークン失効: 再ログイン案内 -----
  if (status === 'invalidToken') {
    return (
      <Screen title={t('assignments.title')}>
        <EmptyState
          icon="key-outline"
          title={t('assignments.sessionExpiredTitle')}
          message={t('assignments.sessionExpiredMessage')}
          action={
            <Button
              title={t('assignments.relogin')}
              icon="log-in-outline"
              onPress={() => router.push('/login')}
            />
          }
        />
      </Screen>
    );
  }

  // ----- 未ログイン -----
  if (wstoken === null) {
    return (
      <Screen title={t('assignments.title')}>
        <EmptyState
          icon="log-in-outline"
          title={t('assignments.loginRequiredTitle')}
          message={t('assignments.loginRequiredMessage')}
          action={
            <Button
              title={t('assignments.goToLogin')}
              icon="log-in-outline"
              onPress={() => router.push('/login')}
            />
          }
        />
      </Screen>
    );
  }

  // ----- 初回ロード -----
  if (status === 'loading' && events.length === 0) {
    return (
      <Screen title={t('assignments.title')} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  // ----- 取得エラー (表示できるデータなし) -----
  if (status === 'error' && events.length === 0) {
    return (
      <Screen title={t('assignments.title')}>
        <EmptyState
          icon="cloud-offline-outline"
          title={t('common.error')}
          message={t('assignments.errorMessage')}
          action={<Button title={t('common.retry')} icon="refresh-outline" onPress={reload} />}
        />
      </Screen>
    );
  }

  // ----- 一覧 -----
  return (
    <Screen title={t('assignments.title')} scroll={false} padded={false}>
      <SectionList<AssignmentEvent, AssignmentSection>
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={status === 'refreshing'}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const dueColor = item.overdue ? colors.danger : colors.textSecondary;
          const remainColor = item.overdue ? colors.danger : colors.primary;
          return (
            <Pressable
              onPress={() => setSelected(item)}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                {item.activityname}
              </Text>
              <Text style={[styles.itemCourse, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.courseFullname}
              </Text>
              <View style={styles.itemMeta}>
                <Text style={[styles.itemDue, { color: dueColor }]}>
                  {t('assignments.dueAt', { time: formatTime(item.timesort) })}
                </Text>
                <Text style={[styles.itemRemaining, { color: remainColor }]}>
                  {formatRemaining(item.timesort, now, t, 'assignments.overdue')}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-outline"
            title={t('assignments.emptyTitle')}
            message={t('assignments.emptyMessage')}
          />
        }
      />

      {/* ----- 詳細モーダル ----- */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setSelected(null)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
            onPress={() => undefined}
          >
            {selected !== null && (
              <>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selected.activityname}
                </Text>
                <Text style={[styles.modalCourse, { color: colors.textSecondary }]}>
                  {selected.courseFullname}
                </Text>
                <View style={styles.modalMeta}>
                  <Text
                    style={[
                      styles.modalDue,
                      { color: selected.overdue ? colors.danger : colors.text },
                    ]}
                  >
                    {t('assignments.dueOn', {
                      date: dateLabel(new Date(selected.timesort * 1000), t),
                      time: formatTime(selected.timesort),
                    })}
                  </Text>
                  <Text
                    style={[
                      styles.modalRemaining,
                      { color: selected.overdue ? colors.danger : colors.primary },
                    ]}
                  >
                    {formatRemaining(selected.timesort, now, t, 'assignments.overdue')}
                  </Text>
                </View>
                <ScrollView style={styles.modalBody}>
                  <Text style={[styles.modalDescription, { color: colors.text }]}>
                    {selected.description !== undefined && stripHtml(selected.description) !== ''
                      ? stripHtml(selected.description)
                      : t('assignments.noDescription')}
                  </Text>
                </ScrollView>
                <View style={styles.modalActions}>
                  <Button
                    title={t('assignments.openInMoodle')}
                    icon="open-outline"
                    onPress={() => openInMoodle(selected)}
                  />
                  <Button
                    title={t('common.close')}
                    variant="ghost"
                    onPress={() => setSelected(null)}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  item: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 8,
    gap: 4,
  },
  pressed: {
    opacity: 0.85,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  itemCourse: {
    fontSize: 13,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  itemDue: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemRemaining: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 25,
  },
  modalCourse: {
    fontSize: 14,
  },
  modalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  modalDue: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalRemaining: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalBody: {
    marginTop: 8,
    maxHeight: 260,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 21,
  },
  modalActions: {
    marginTop: 12,
    gap: 8,
  },
});
