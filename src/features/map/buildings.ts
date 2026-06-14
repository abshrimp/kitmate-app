import type { Palette } from '@/theme';

/** 建物種別 (講義棟 / 研究棟 / 厚生施設 / 運動施設) */
export type BuildingKind = 'lecture' | 'research' | 'welfare' | 'sports';

export interface BuildingName {
  ja: string;
  en: string;
}

export interface Building {
  id: string;
  name: BuildingName;
  /** 地図上に描く短縮ラベル (省略時は name を表示) */
  short?: BuildingName;
  kind: BuildingKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 地図キャンバスの論理サイズ (SVG viewBox)。縮尺は概略であり実寸とは無関係 */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 750;

/** 今出川通 (南側・横方向) */
export const ROAD_H = { x: 0, y: 680, w: 1000, h: 48 } as const;
/** 松ヶ崎通り (東西キャンパスの間・縦方向) */
export const ROAD_V = { x: 600, y: 0, w: 40, h: 680 } as const;

/** キャンパス敷地ブロック (西構内 / 東構内) */
export const CAMPUS_BLOCKS = [
  { x: 8, y: 8, w: 584, h: 664 },
  { x: 648, y: 8, w: 344, h: 664 },
] as const;

/** 建物種別 → パレットキー (色は必ず useTheme() で解決する) */
export const KIND_COLOR_KEY: Record<BuildingKind, keyof Palette> = {
  lecture: 'primary',
  research: 'accent',
  welfare: 'warning',
  sports: 'success',
};

/**
 * 講義室の表記 (例「E1-501」「西1号館 101」「3号館」「0323講義室」) から建物 id を推定する。
 * 判別できなければ null (= マップ遷移ボタンを出さない)。配置/命名は概略のためベストエフォート。
 */
export function resolveBuildingFromRoom(room: string): string | null {
  const r = room.trim();
  if (r === '') return null;
  if (/E1\b|Ｅ1|東\s*1\s*号館|東1/i.test(r)) return 'east1';
  if (/E2\b|Ｅ2|東\s*2\s*号館|東2/i.test(r)) return 'east2';
  const west = r.match(/西\s*([1-9])\s*号館|西\s*([1-9])|W\s*([1-9])/i);
  if (west) return `west${west[1] ?? west[2] ?? west[3]}`;
  if (/図書館/.test(r)) return 'library';
  if (/情報科学|情科/.test(r)) return 'isc';
  if (/センターホール/.test(r)) return 'centerhall';
  if (/生協|福利/.test(r)) return 'coop';
  if (/60\s*周年/.test(r)) return 'anniv60';
  if (/KIT\s*HOUSE/i.test(r)) return 'kithouse';
  if (/体育館/.test(r)) return 'gym';
  const bldg = r.match(/(?:^|[^西東])([123])\s*号館/);
  if (bldg) return `bldg${bldg[1]}`;
  return null;
}

/**
 * 松ヶ崎キャンパスの主要建物 (配置は概略。正確な縮尺・位置ではない)
 */
export const BUILDINGS: Building[] = [
  // ===== 西構内: 運動施設 =====
  {
    id: 'ground',
    name: { ja: 'グラウンド', en: 'Athletic Field' },
    kind: 'sports',
    x: 20, y: 20, w: 250, h: 160,
  },
  {
    id: 'gym',
    name: { ja: '体育館', en: 'Gymnasium' },
    kind: 'sports',
    x: 290, y: 40, w: 140, h: 90,
  },
  // ===== 西構内: 西1〜西9号館 =====
  {
    id: 'west9',
    name: { ja: '西9号館', en: 'West Bldg. 9' },
    short: { ja: '西9', en: 'W9' },
    kind: 'research',
    x: 450, y: 40, w: 110, h: 70,
  },
  {
    id: 'west1',
    name: { ja: '西1号館', en: 'West Bldg. 1' },
    short: { ja: '西1', en: 'W1' },
    kind: 'lecture',
    x: 20, y: 210, w: 120, h: 70,
  },
  {
    id: 'west2',
    name: { ja: '西2号館', en: 'West Bldg. 2' },
    short: { ja: '西2', en: 'W2' },
    kind: 'lecture',
    x: 160, y: 210, w: 120, h: 70,
  },
  {
    id: 'west3',
    name: { ja: '西3号館', en: 'West Bldg. 3' },
    short: { ja: '西3', en: 'W3' },
    kind: 'research',
    x: 300, y: 210, w: 120, h: 70,
  },
  {
    id: 'west4',
    name: { ja: '西4号館', en: 'West Bldg. 4' },
    short: { ja: '西4', en: 'W4' },
    kind: 'research',
    x: 440, y: 210, w: 120, h: 70,
  },
  {
    id: 'west5',
    name: { ja: '西5号館', en: 'West Bldg. 5' },
    short: { ja: '西5', en: 'W5' },
    kind: 'research',
    x: 20, y: 310, w: 120, h: 70,
  },
  {
    id: 'west6',
    name: { ja: '西6号館', en: 'West Bldg. 6' },
    short: { ja: '西6', en: 'W6' },
    kind: 'research',
    x: 160, y: 310, w: 120, h: 70,
  },
  {
    id: 'west7',
    name: { ja: '西7号館', en: 'West Bldg. 7' },
    short: { ja: '西7', en: 'W7' },
    kind: 'research',
    x: 300, y: 310, w: 120, h: 70,
  },
  {
    id: 'west8',
    name: { ja: '西8号館', en: 'West Bldg. 8' },
    short: { ja: '西8', en: 'W8' },
    kind: 'research',
    x: 440, y: 310, w: 120, h: 70,
  },
  // ===== 西構内: 共用施設 =====
  {
    id: 'library',
    name: { ja: '附属図書館', en: 'University Library' },
    short: { ja: '図書館', en: 'Library' },
    kind: 'welfare',
    x: 80, y: 420, w: 160, h: 90,
  },
  {
    id: 'anniv60',
    name: { ja: '60周年記念館', en: '60th Anniversary Hall' },
    short: { ja: '60周年記念館', en: '60th Anniv.' },
    kind: 'lecture',
    x: 280, y: 420, w: 150, h: 90,
  },
  {
    id: 'isc',
    name: { ja: '情報科学センター', en: 'Information Science Center' },
    short: { ja: '情科センター', en: 'Info. Sci.' },
    kind: 'research',
    x: 450, y: 420, w: 110, h: 90,
  },
  {
    id: 'coop',
    name: { ja: '福利厚生会館(生協)', en: 'Welfare Building (Co-op)' },
    short: { ja: '生協会館', en: 'Co-op' },
    kind: 'welfare',
    x: 80, y: 550, w: 150, h: 90,
  },
  {
    id: 'kithouse',
    name: { ja: 'KIT HOUSE', en: 'KIT HOUSE' },
    kind: 'welfare',
    x: 280, y: 550, w: 130, h: 90,
  },
  {
    id: 'centerhall',
    name: { ja: '大学センターホール', en: 'University Center Hall' },
    short: { ja: 'センターホール', en: 'Center Hall' },
    kind: 'welfare',
    x: 440, y: 550, w: 120, h: 90,
  },
  // ===== 東構内 =====
  {
    id: 'bldg1',
    name: { ja: '1号館', en: 'Building 1' },
    kind: 'lecture',
    x: 660, y: 40, w: 150, h: 80,
  },
  {
    id: 'bldg2',
    name: { ja: '2号館', en: 'Building 2' },
    kind: 'lecture',
    x: 830, y: 40, w: 150, h: 80,
  },
  {
    id: 'bldg3',
    name: { ja: '3号館', en: 'Building 3' },
    kind: 'lecture',
    x: 660, y: 160, w: 150, h: 80,
  },
  {
    id: 'east1',
    name: { ja: '東1号館(E1)', en: 'East Bldg. 1 (E1)' },
    short: { ja: '東1 (E1)', en: 'E1' },
    kind: 'research',
    x: 830, y: 160, w: 150, h: 80,
  },
  {
    id: 'east2',
    name: { ja: '東2号館', en: 'East Bldg. 2' },
    short: { ja: '東2', en: 'E2' },
    kind: 'research',
    x: 660, y: 280, w: 150, h: 80,
  },
];
