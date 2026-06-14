import { getLocales } from 'expo-localization';
import { useCallback } from 'react';

import { assignmentsI18n } from '@/features/assignments/i18n';
import { authI18n } from '@/features/auth/i18n';
import { cancellationsI18n } from '@/features/cancellations/i18n';
import { homeI18n } from '@/features/home/i18n';
import { linksI18n } from '@/features/links/i18n';
import { mapI18n } from '@/features/map/i18n';
import { requirementsI18n } from '@/features/requirements/i18n';
import { settingsI18n } from '@/features/settings/i18n';
import { syllabusI18n } from '@/features/syllabus/i18n';
import { timetableI18n } from '@/features/timetable/i18n';
import { commonI18n } from '@/i18n/common';
import { useSettings } from '@/store/settings';

export type LocaleCode = 'ja' | 'en';

/** 辞書の値: 文字列 or ネストした辞書 */
export type Dict = { readonly [key: string]: string | Dict };

const dictionaries: Record<LocaleCode, Record<string, Dict>> = {
  ja: {
    common: commonI18n.ja,
    auth: authI18n.ja,
    home: homeI18n.ja,
    timetable: timetableI18n.ja,
    requirements: requirementsI18n.ja,
    syllabus: syllabusI18n.ja,
    assignments: assignmentsI18n.ja,
    cancellations: cancellationsI18n.ja,
    links: linksI18n.ja,
    map: mapI18n.ja,
    settings: settingsI18n.ja,
  },
  en: {
    common: commonI18n.en,
    auth: authI18n.en,
    home: homeI18n.en,
    timetable: timetableI18n.en,
    requirements: requirementsI18n.en,
    syllabus: syllabusI18n.en,
    assignments: assignmentsI18n.en,
    cancellations: cancellationsI18n.en,
    links: linksI18n.en,
    map: mapI18n.en,
    settings: settingsI18n.en,
  },
};

function systemLocale(): LocaleCode {
  const lang = getLocales()[0]?.languageCode;
  return lang === 'ja' ? 'ja' : 'en';
}

export function resolveLocale(pref: 'system' | 'ja' | 'en'): LocaleCode {
  return pref === 'system' ? systemLocale() : pref;
}

function lookup(locale: LocaleCode, key: string): string | undefined {
  const parts = key.split('.');
  let node: string | Dict | undefined = dictionaries[locale];
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

/** ロケールを明示して翻訳。キーが見つからなければキーをそのまま返す。 */
export function translate(locale: LocaleCode, key: string, vars?: Record<string, string | number>): string {
  const value = lookup(locale, key);
  return value === undefined ? key : format(value, vars);
}

export interface I18n {
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: LocaleCode;
}

/** React コンポーネント用。設定の language ('system' は端末ロケール) に追従する。 */
export function useI18n(): I18n {
  const language = useSettings((s) => s.language);
  const locale = resolveLocale(language);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );
  return { t, locale };
}

/** フック外用の非リアクティブな t()。現在の設定からロケールを解決する。 */
export function t(key: string, vars?: Record<string, string | number>): string {
  return translate(resolveLocale(useSettings.getState().language), key, vars);
}
