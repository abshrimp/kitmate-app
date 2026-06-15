import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';

import { REORDERABLE_TABS, REORDERABLE_TAB_KEYS } from '@/features/settings/tabsConfig';
import { useI18n } from '@/i18n';
import { useSettings, type TabKey } from '@/store/settings';
import { useTheme } from '@/theme';

const MAIN_TABS: TabKey[] = ['index', 'timetable', 'assignments', 'info', 'links'];
const TAB_HREF: Record<TabKey, string> = {
  index: '/',
  timetable: '/timetable',
  assignments: '/assignments',
  info: '/info',
  links: '/links',
};

export default function TabsLayout() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const tabOrder = useSettings((s) => s.tabOrder);
  const appliedStartup = useRef(false);

  // 表示中の並び替えタブ (設定順) → 非表示の並び替えタブ (href:null で隠す)
  const visibleMiddle = tabOrder.filter((k) => REORDERABLE_TAB_KEYS.includes(k));
  const hiddenMiddle = REORDERABLE_TAB_KEYS.filter((k) => !tabOrder.includes(k));

  // 起動時に一度だけ、設定された起動タブ (or 最後のタブ) へ切り替える
  useEffect(() => {
    if (appliedStartup.current) return;
    appliedStartup.current = true;
    const { startupTab, lastTab } = useSettings.getState();
    const target = startupTab === 'last' ? lastTab : startupTab;
    if (target !== 'index' && MAIN_TABS.includes(target)) {
      router.replace(TAB_HREF[target] as never);
    }
  }, []);

  return (
    <Tabs
      screenListeners={{
        // 表示中のタブを記録 (startupTab='last' 用)。target は `${routeName}-${key}` 形式
        focus: (e) => {
          const name = e.target?.split('-')[0];
          if (name !== undefined && MAIN_TABS.includes(name as TabKey)) {
            useSettings.getState().set('lastTab', name as TabKey);
          }
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('common.tabHome'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      {/* 並び替え可能なタブ: 設定順に表示、非表示のものは href:null で隠す (ホームと「その他」は固定) */}
      {[...visibleMiddle, ...hiddenMiddle].map((key) => {
        const def = REORDERABLE_TABS.find((tab) => tab.key === key);
        if (def === undefined) return null;
        const hidden = !visibleMiddle.includes(key);
        return (
          <Tabs.Screen
            key={key}
            name={key}
            options={{
              title: t(def.titleKey),
              href: hidden ? null : undefined,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={def.icon} size={size} color={color} />
              ),
            }}
          />
        );
      })}
      <Tabs.Screen
        name="more"
        options={{
          title: t('common.tabMore'),
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
