import type { AssignmentEvent, MoodleSiteInfo } from '@/types';

/**
 * Moodle Web Service クライアント (KIT Moodle)。
 * CONVENTIONS §7 の契約に従う。feature:auth 所有。
 */

export const MOODLE_BASE = 'https://moodle.cis.kit.ac.jp';

/** モバイルアプリ用ブラウザログイン URL を組み立てる */
export function buildLaunchUrl(passport: string): string {
  return `${MOODLE_BASE}/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=${passport}&urlscheme=kitmate&lang=ja`;
}

// Hermes には atob が無い環境があるため自前で base64 デコードする
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Decode(input: string): string {
  // URL-safe 変種・空白・パディングを正規化
  const clean = input.replace(/-/g, '+').replace(/_/g, '/').replace(/[\s=]/g, '');
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const idx = B64_ALPHABET.indexOf(ch);
    if (idx === -1) {
      throw new Error(`Invalid base64 character in token payload: ${ch}`);
    }
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

/**
 * `kitmate://token=BASE64` 形式のリダイレクト URL から wstoken を取り出す。
 * BASE64 をデコードすると `signature:::wstoken[:::privatetoken]` 形式。失敗時は throw。
 */
export function parseWstokenFromRedirect(url: string): string {
  const marker = 'token=';
  const idx = url.indexOf(marker);
  if (idx === -1) {
    throw new Error('Redirect URL does not contain a token parameter');
  }
  let encoded = url.slice(idx + marker.length);
  const hashIdx = encoded.indexOf('#');
  if (hashIdx !== -1) encoded = encoded.slice(0, hashIdx);
  const ampIdx = encoded.indexOf('&');
  if (ampIdx !== -1) encoded = encoded.slice(0, ampIdx);
  try {
    encoded = decodeURIComponent(encoded);
  } catch {
    // 既に生の base64 だった場合はそのまま使う
  }
  const decoded = base64Decode(encoded);
  const parts = decoded.split(':::');
  const wstoken = parts[1];
  if (parts.length < 2 || wstoken === undefined || wstoken === '') {
    throw new Error('Malformed token payload in redirect URL');
  }
  return wstoken;
}

/** Moodle API がエラー応答 (exception / errorcode) を返したときに投げる */
export class MoodleApiError extends Error {
  errorcode: string;
  constructor(message: string, errorcode: string) {
    super(message);
    this.name = 'MoodleApiError';
    this.errorcode = errorcode;
  }
}

/** errorcode === 'invalidtoken' (トークン失効) かどうか */
export function isInvalidToken(e: unknown): boolean {
  return e instanceof MoodleApiError && e.errorcode === 'invalidtoken';
}

function formEncode(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

interface MoodleErrorShape {
  exception?: string;
  errorcode?: string;
  message?: string;
  error?: string;
}

/**
 * Moodle REST API 呼び出し。
 * レスポンス JSON に exception / errorcode があれば MoodleApiError を throw。
 */
export async function moodleCall<T>(
  wsfunction: string,
  args: Record<string, string>,
  wstoken: string,
): Promise<T> {
  const endpoint = `${MOODLE_BASE}/webservice/rest/server.php?moodlewsrestformat=json&wsfunction=${encodeURIComponent(wsfunction)}`;
  const body = formEncode({
    moodlewssettingfilter: 'true',
    moodlewssettingfileurl: 'true',
    moodlewssettinglang: 'ja',
    wsfunction,
    wstoken,
    ...args,
  });
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new MoodleApiError(`Moodle HTTP error: ${res.status}`, `http${res.status}`);
  }
  const json: unknown = await res.json();
  if (json !== null && typeof json === 'object' && !Array.isArray(json)) {
    const err = json as MoodleErrorShape;
    if (err.exception !== undefined || err.errorcode !== undefined) {
      throw new MoodleApiError(
        err.message ?? err.error ?? err.exception ?? 'Moodle API error',
        err.errorcode ?? 'unknown',
      );
    }
  }
  return json as T;
}

interface RawSiteInfo {
  sitename?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  fullname?: string;
  lang?: string;
  userid?: number;
  siteurl?: string;
  userpictureurl?: string;
}

/** core_webservice_get_site_info — トークン検証を兼ねる */
export async function getSiteInfo(wstoken: string): Promise<MoodleSiteInfo> {
  const raw = await moodleCall<RawSiteInfo>('core_webservice_get_site_info', {}, wstoken);
  return {
    sitename: raw.sitename ?? '',
    username: raw.username ?? '',
    firstname: raw.firstname ?? '',
    lastname: raw.lastname ?? '',
    fullname: raw.fullname ?? '',
    lang: raw.lang ?? '',
    userid: raw.userid ?? 0,
    siteurl: raw.siteurl ?? MOODLE_BASE,
    userpictureurl: raw.userpictureurl ?? '',
  };
}

interface RawActionEvent {
  id?: number;
  name?: string;
  activityname?: string;
  description?: string;
  timesort?: number;
  overdue?: boolean;
  course?: { id?: number; fullname?: string };
  url?: string;
  action?: { url?: string };
  modulename?: string;
}

interface RawActionEventsResponse {
  events?: RawActionEvent[];
}

/**
 * core_calendar_get_action_events_by_timesort を呼び、
 * events[] を AssignmentEvent に正規化して返す。
 */
export async function getUpcomingEvents(
  wstoken: string,
  fromUnixSec: number,
  limit = 20,
): Promise<AssignmentEvent[]> {
  const raw = await moodleCall<RawActionEventsResponse>(
    'core_calendar_get_action_events_by_timesort',
    {
      timesortfrom: String(fromUnixSec),
      limitnum: String(limit),
      limittononsuspendedevents: '1',
    },
    wstoken,
  );
  return (raw.events ?? []).map((e) => {
    const event: AssignmentEvent = {
      id: e.id ?? 0,
      name: e.name ?? '',
      activityname: e.activityname ?? e.name ?? '',
      timesort: e.timesort ?? 0,
      overdue: e.overdue === true,
      courseFullname: e.course?.fullname ?? '',
      courseId: e.course?.id ?? 0,
      url: e.url ?? '',
      modulename: e.modulename ?? '',
    };
    if (e.description !== undefined && e.description !== '') {
      event.description = e.description;
    }
    const actionUrl = e.action?.url;
    if (actionUrl !== undefined && actionUrl !== '') {
      event.actionUrl = actionUrl;
    }
    return event;
  });
}
