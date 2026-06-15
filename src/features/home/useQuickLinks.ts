import { useCallback, useMemo } from 'react';

import { quickLinkDef, type QuickLinkDef } from './quickLinks';
import type { IoniconsName } from '@/components/ui';
import { useLinkGroups, type ResolvedLink } from '@/features/links/useLinkGroups';
import { useI18n } from '@/i18n';

/** クイックリンクのキーが「リンク集のリンク」を指す場合の接頭辞 (`link:<id>`)。 */
const LINK_PREFIX = 'link:';

/** リンク集リンクの id からクイックリンク用キーを作る。 */
export function linkQuickKey(id: string): string {
  return `${LINK_PREFIX}${id}`;
}

/** 解決済みクイックリンク (内部画面 route か、外部 URL のいずれか)。 */
export type ResolvedQuickLink =
  | { key: string; icon: IoniconsName; title: string; kind: 'route'; route: QuickLinkDef['route'] }
  | { key: string; icon: IoniconsName; title: string; kind: 'url'; url: string };

/**
 * クイックリンクのキーを表示用情報へ解決する関数を返す。
 * カタログ (画面遷移) と リンク集のリンク (URL) の両方に対応する。
 * 解決できないキー (削除済みリンク等) は null。
 */
export function useQuickLinkResolver(): (key: string) => ResolvedQuickLink | null {
  const { t } = useI18n();
  const groups = useLinkGroups();
  const linkById = useMemo(() => {
    const m = new Map<string, ResolvedLink>();
    for (const g of groups) for (const l of g.links) m.set(l.id, l);
    return m;
  }, [groups]);

  return useCallback(
    (key: string): ResolvedQuickLink | null => {
      if (key.startsWith(LINK_PREFIX)) {
        const link = linkById.get(key.slice(LINK_PREFIX.length));
        if (link === undefined) return null;
        return { key, icon: link.icon, title: link.title, kind: 'url', url: link.url };
      }
      const def = quickLinkDef(key);
      if (def === undefined) return null;
      return { key, icon: def.icon, title: t(def.labelKey), kind: 'route', route: def.route };
    },
    [linkById, t],
  );
}
