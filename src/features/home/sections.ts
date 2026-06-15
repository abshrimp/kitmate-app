/** ホームで並び替え/非表示できるセクションのカタログ */
export const HOME_SECTION_CATALOG: { key: string; labelKey: string }[] = [
  { key: 'weather', labelKey: 'home.secWeather' },
  { key: 'assignments', labelKey: 'home.secAssignments' },
  { key: 'notices', labelKey: 'home.secNotices' },
  { key: 'schedule', labelKey: 'home.secSchedule' },
  { key: 'quickLinks', labelKey: 'home.secQuickLinks' },
];

export const DEFAULT_HOME_SECTIONS = ['weather', 'assignments', 'notices', 'schedule', 'quickLinks'];
