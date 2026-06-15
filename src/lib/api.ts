import Constants from 'expo-constants';

import type {
  CancellationFeed,
  Course,
  CourseTerm,
  Day,
  Period,
  RequirementSet,
  SharedTimetable,
  TimetableEntry,
} from '@/types';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };
export const API_BASE_URL: string = extra.apiBaseUrl ?? 'http://localhost:8787';

/** サーバが non-2xx を返したときに投げるエラー (ネットワーク失敗とは区別する) */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** ベース URL 付き fetch + JSON パース。non-2xx は ApiError を throw。 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `API request failed: ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

// ===== health =====

export async function fetchHealth(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/health');
}

// ===== courses =====

export interface CourseQuery {
  year?: number;
  q?: string;
  day?: Day;
  period?: Period;
  intensive?: boolean;
  grade?: number;
  term?: CourseTerm;
}

function courseQueryString(query: CourseQuery): string {
  const params = new URLSearchParams();
  if (query.year !== undefined) params.set('year', String(query.year));
  if (query.q !== undefined && query.q !== '') params.set('q', query.q);
  if (query.day !== undefined) params.set('day', query.day);
  if (query.period !== undefined) params.set('period', String(query.period));
  if (query.intensive !== undefined) params.set('intensive', String(query.intensive));
  if (query.grade !== undefined) params.set('grade', String(query.grade));
  if (query.term !== undefined) params.set('term', query.term);
  const s = params.toString();
  return s === '' ? '' : `?${s}`;
}

/** 講義検索。取得失敗時はエラーを伝播する (フォールバックなし)。 */
export async function fetchCourses(query: CourseQuery = {}): Promise<Course[]> {
  return apiFetch<Course[]>(`/api/courses${courseQueryString(query)}`);
}

/** 講義詳細。取得失敗時はエラーを伝播する (フォールバックなし)。 */
export async function fetchCourse(id: string): Promise<Course> {
  return apiFetch<Course>(`/api/courses/${encodeURIComponent(id)}`);
}

/** 講義データが存在する年度一覧。 */
export async function fetchCourseYears(): Promise<number[]> {
  const res = await apiFetch<{ years: number[] }>('/api/courses/years');
  return res.years;
}

// ===== requirements =====

export interface RequirementsResponse {
  graduation: RequirementSet;
  research_start: RequirementSet;
}

/** 要件取得。取得失敗時はエラーを伝播する (フォールバックなし)。 */
export async function fetchRequirements(
  admissionYear: number,
  variantKey: string,
): Promise<RequirementsResponse> {
  return apiFetch<RequirementsResponse>(
    `/api/requirements/${encodeURIComponent(String(admissionYear))}/${encodeURIComponent(variantKey)}`,
  );
}

// ===== cancellations =====

export async function fetchCancellations(): Promise<CancellationFeed> {
  return apiFetch<CancellationFeed>('/api/cancellations');
}

// ===== announcements (運営お知らせ) =====

export interface Announcement {
  id: number;
  title: string;
  body: string;
  createdAt: number; // unix ms
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await apiFetch<{ announcements: Announcement[] }>('/api/announcements');
  return res.announcements;
}

// ===== share =====

export async function createShare(timetable: SharedTimetable): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/api/share', {
    method: 'POST',
    body: JSON.stringify(timetable),
  });
}

export async function fetchShare(id: string): Promise<SharedTimetable> {
  return apiFetch<SharedTimetable>(`/api/share/${encodeURIComponent(id)}`);
}

// ===== sync =====

export interface SyncedTimetable {
  entries: TimetableEntry[];
  updatedAt: number;
}

export async function fetchSyncedTimetable(wstoken: string): Promise<SyncedTimetable | null> {
  return apiFetch<SyncedTimetable | null>('/api/sync/timetable', {
    headers: { 'X-Moodle-Token': wstoken },
  });
}

export async function putSyncedTimetable(
  wstoken: string,
  entries: TimetableEntry[],
): Promise<SyncedTimetable> {
  return apiFetch<SyncedTimetable>('/api/sync/timetable', {
    method: 'PUT',
    headers: { 'X-Moodle-Token': wstoken },
    body: JSON.stringify({ entries }),
  });
}

// ===== push =====

export interface PushRegisterBody {
  platform: 'expo' | 'web';
  token?: string;
  subscription?: object;
  cancellationNotifications: boolean;   // 休講通知
  lectureInfoNotifications?: boolean;   // 授業関連連絡 (省略時はサーバ側で休講と同値)
}

export interface PushUnregisterBody {
  platform: 'expo' | 'web';
  token?: string;
  endpoint?: string;
}

export async function registerPush(body: PushRegisterBody): Promise<void> {
  await apiFetch<unknown>('/api/push/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function unregisterPush(body: PushUnregisterBody): Promise<void> {
  await apiFetch<unknown>('/api/push/unregister', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
