import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';

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
  const appliedStartup = useRef(false);

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
      <Tabs.Screen
        name="timetable"
        options={{
          title: t('common.tabTimetable'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: t('common.tabAssignments'),
          tabBarIcon: ({ color, size }) => <Ionicons name="checkbox-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: t('common.tabInfo'),
          tabBarIcon: ({ color, size }) => <Ionicons name="megaphone-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="links"
        options={{
          title: t('common.tabLinks'),
          tabBarIcon: ({ color, size }) => <Ionicons name="link-outline" size={size} color={color} />,
        }}
      />
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
