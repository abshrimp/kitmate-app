import type { IoniconsName } from '@/components/ui';

/**
 * デフォルトリンク定義。
 * id はグループ + タイトルの slug による安定キー。
 * 表示名は i18n キー `links.groups.<groupId>` / `links.items.<linkId>` で解決する。
 */

export interface DefaultLink {
  /** 安定キー (グループ + タイトルの slug) */
  id: string;
  url: string;
  icon: IoniconsName;
}

export interface DefaultLinkGroup {
  /** 安定キー (グループ名の slug) */
  id: string;
  links: DefaultLink[];
}

const GAKUMU_BASE =
  'https://vpnv.cis.kit.ac.jp/+CSCO+0h75676763663A2F2F636265676E792E666768717261672E7876672E6E702E7763++/ead/';

export const DEFAULT_LINK_GROUPS: DefaultLinkGroup[] = [
  {
    id: 'coursework',
    links: [
      {
        id: 'coursework-moodle-app',
        url: 'moodlemobile://https//moodle.cis.kit.ac.jp',
        icon: 'book-outline',
      },
      {
        id: 'coursework-moodle',
        url: 'https://moodle.cis.kit.ac.jp/',
        icon: 'book-outline',
      },
      {
        id: 'coursework-m-reader',
        url: 'https://mreader.org/',
        icon: 'book-outline',
      },
      {
        id: 'coursework-academic-express',
        url: 'https://supereigo.campus.kit.ac.jp/',
        icon: 'school-outline',
      },
    ],
  },
  {
    id: 'gakumu',
    links: [
      {
        id: 'gakumu-home',
        url: GAKUMU_BASE,
        icon: 'business-outline',
      },
      {
        id: 'gakumu-cancellation',
        url: `${GAKUMU_BASE}?c=lecture_cancellation`,
        icon: 'notifications-outline',
      },
      {
        id: 'gakumu-lecture-info',
        url: `${GAKUMU_BASE}?c=lecture_information`,
        icon: 'document-text-outline',
      },
      {
        id: 'gakumu-class-schedule',
        url: `${GAKUMU_BASE}?c=class_schedule`,
        icon: 'calendar-outline',
      },
      {
        id: 'gakumu-curriculum',
        url: `${GAKUMU_BASE}?c=subject_program`,
        icon: 'document-text-outline',
      },
    ],
  },
  {
    id: 'academic-other',
    links: [
      {
        id: 'academic-other-syllabus',
        url: 'https://vpnv.cis.kit.ac.jp/+CSCO+0h75676763663A2F2F6A6A6A2E666C79796E6F68662E7876672E6E702E7763++/',
        icon: 'document-text-outline',
      },
      {
        id: 'academic-other-portal',
        url: 'https://vpnv.cis.kit.ac.jp/+CSCO+0075676763663A2F2F6A6A6A2E746E78687A682E7876672E6E702E7763++/ead/ead_portal/',
        icon: 'globe-outline',
      },
      {
        id: 'academic-other-registration',
        url: 'https://vpnv.cis.kit.ac.jp/+CSCO+0h75676763663A2F2F776878622E746E78687A682E7876672E6E702E7763++/AttendCourse/',
        icon: 'school-outline',
      },
    ],
  },
  {
    id: 'cis',
    links: [
      {
        id: 'cis-portal',
        url: 'https://cis.kit.ac.jp/portal/',
        icon: 'globe-outline',
      },
      {
        id: 'cis-webmail',
        url: 'https://webmail.cis.kit.ac.jp/',
        icon: 'mail-outline',
      },
      {
        id: 'cis-fortigate',
        url: 'https://vpns.cis.kit.ac.jp/',
        icon: 'shield-checkmark-outline',
      },
      {
        id: 'cis-asav',
        url: 'https://vpnv.cis.kit.ac.jp/',
        icon: 'shield-checkmark-outline',
      },
      {
        id: 'cis-wifi-usage',
        url: 'https://cis.kit.ac.jp/status/wifiusage/',
        icon: 'wifi-outline',
      },
    ],
  },
  {
    id: 'university',
    links: [
      {
        id: 'university-calendar',
        url: 'https://www.kit.ac.jp/campus_index/academic_calendar/',
        icon: 'calendar-outline',
      },
      {
        id: 'university-grad-requirements',
        url: 'https://www.kit.ac.jp/campus_index/sotsugyo_yoken/',
        icon: 'document-text-outline',
      },
      {
        id: 'university-staff-directory',
        url: 'https://vpnv.cis.kit.ac.jp/+CSCO+0h75676763663A2F2F6A6A6A2E7876672E6E702E7763++/private/kyoushokuin_index/',
        icon: 'people-outline',
      },
    ],
  },
  {
    id: 'coop',
    links: [
      {
        id: 'coop-app',
        url: 'univ-coop://',
        icon: 'bag-outline',
      },
      {
        id: 'coop-menu',
        url: 'https://west2-univ.jp/sp/index.php?t=650711',
        icon: 'restaurant-outline',
      },
      {
        id: 'coop-hours',
        url: 'https://kitucoop.prime.univ-go.net/',
        icon: 'time-outline',
      },
    ],
  },
  {
    id: 'library',
    links: [
      {
        id: 'library-loans',
        url: 'https://opac.lib.kit.ac.jp/opac/odr_stat/?lang=0',
        icon: 'library-outline',
      },
      {
        id: 'library-search',
        url: 'https://opac.lib.kit.ac.jp/opac/opac_search/',
        icon: 'book-outline',
      },
    ],
  },
];

/** カスタムリンク追加モーダルのアイコン候補 */
export const LINK_ICON_CHOICES: IoniconsName[] = [
  'link-outline',
  'book-outline',
  'school-outline',
  'business-outline',
  'notifications-outline',
  'document-text-outline',
  'calendar-outline',
  'globe-outline',
  'mail-outline',
  'shield-checkmark-outline',
  'wifi-outline',
  'people-outline',
  'bag-outline',
  'restaurant-outline',
  'time-outline',
  'library-outline',
];
