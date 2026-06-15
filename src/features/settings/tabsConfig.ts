import type { IoniconsName } from '@/components/ui';
import type { TabKey } from '@/store/settings';

/** 並び替え・非表示が可能なメインタブ (ホームと「その他」は固定)。 */
export interface ReorderableTab {
  key: Exclude<TabKey, 'index'>;
  icon: IoniconsName;
  titleKey: string;
}

export const REORDERABLE_TABS: ReorderableTab[] = [
  { key: 'timetable', icon: 'calendar-outline', titleKey: 'common.tabTimetable' },
  { key: 'assignments', icon: 'checkbox-outline', titleKey: 'common.tabAssignments' },
  { key: 'info', icon: 'megaphone-outline', titleKey: 'common.tabInfo' },
  { key: 'links', icon: 'link-outline', titleKey: 'common.tabLinks' },
];

export const REORDERABLE_TAB_KEYS: TabKey[] = REORDERABLE_TABS.map((t) => t.key);

export function reorderableTab(key: string): ReorderableTab | undefined {
  return REORDERABLE_TABS.find((t) => t.key === key);
}
