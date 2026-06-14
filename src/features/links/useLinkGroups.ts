import { useMemo } from 'react';

import { DEFAULT_LINK_GROUPS } from './defaultLinks';
import { useLinks } from './store';
import type { IoniconsName } from '@/components/ui';
import { useI18n } from '@/i18n';

/** 表示用に解決済みのリンク */
export interface ResolvedLink {
  id: string;
  title: string;
  url: string;
  icon: IoniconsName;
  isCustom: boolean;
  hidden: boolean;
}

/** 表示用に解決済みのグループ */
export interface ResolvedGroup {
  key: string;
  title: string;
  links: ResolvedLink[];
}

/**
 * デフォルトリンク + カスタムリンクを i18n / 非表示 / 並び替え設定を反映して
 * 表示用グループ一覧に解決する。hidden なリンクも含めて返す (呼び出し側でフィルタ)。
 */
export function useLinkGroups(): ResolvedGroup[] {
  const { t } = useI18n();
  const hiddenIds = useLinks((s) => s.hiddenIds);
  const orderOverrides = useLinks((s) => s.orderOverrides);
  const customLinks = useLinks((s) => s.customLinks);

  return useMemo(() => {
    const hidden = new Set(hiddenIds);

    const groups: ResolvedGroup[] = DEFAULT_LINK_GROUPS.map((g) => ({
      key: g.id,
      title: t(`links.groups.${g.id}`),
      links: g.links.map((l) => ({
        id: l.id,
        title: t(`links.items.${l.id}`),
        url: l.url,
        icon: l.icon,
        isCustom: false,
        hidden: hidden.has(l.id),
      })),
    }));
    const byKey = new Map(groups.map((g) => [g.key, g]));

    for (const c of customLinks) {
      let group = byKey.get(c.group);
      if (group === undefined) {
        group = { key: c.group, title: c.group, links: [] };
        byKey.set(c.group, group);
        groups.push(group);
      }
      group.links.push({
        id: c.id,
        title: c.title,
        url: c.url,
        icon: c.icon,
        isCustom: true,
        hidden: hidden.has(c.id),
      });
    }

    // 並び替え: orderOverrides に載っている id を指定順で先頭に、未知の id は元の順で後ろに
    for (const group of groups) {
      const order = orderOverrides[group.key];
      if (order === undefined) continue;
      const pos = new Map(order.map((id, i) => [id, i] as const));
      const known = group.links
        .filter((l) => pos.has(l.id))
        .sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
      const unknown = group.links.filter((l) => !pos.has(l.id));
      group.links = [...known, ...unknown];
    }

    return groups;
  }, [hiddenIds, orderOverrides, customLinks, t]);
}
