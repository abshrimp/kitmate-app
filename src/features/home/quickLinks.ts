import type { IoniconsName } from '@/components/ui';

/** ホームのクイックリンクで選べる遷移先カタログ */
export interface QuickLinkDef {
  key: string;
  route: '/timetable' | '/syllabus' | '/requirements' | '/map' | '/assignments' | '/info' | '/links';
  icon: IoniconsName;
  labelKey: string;
}

export const QUICK_LINK_CATALOG: QuickLinkDef[] = [
  { key: 'timetable', route: '/timetable', icon: 'calendar-outline', labelKey: 'home.quickTimetable' },
  { key: 'syllabus', route: '/syllabus', icon: 'document-text-outline', labelKey: 'home.quickSyllabus' },
  { key: 'requirements', route: '/requirements', icon: 'school-outline', labelKey: 'home.quickRequirements' },
  { key: 'map', route: '/map', icon: 'map-outline', labelKey: 'home.quickMap' },
  { key: 'assignments', route: '/assignments', icon: 'checkbox-outline', labelKey: 'common.tabAssignments' },
  { key: 'info', route: '/info', icon: 'megaphone-outline', labelKey: 'common.tabInfo' },
  { key: 'links', route: '/links', icon: 'link-outline', labelKey: 'common.tabLinks' },
];

/** 初期表示するクイックリンク (順序) */
export const DEFAULT_QUICK_LINKS = ['timetable', 'syllabus', 'requirements', 'map'];

export function quickLinkDef(key: string): QuickLinkDef | undefined {
  return QUICK_LINK_CATALOG.find((d) => d.key === key);
}
