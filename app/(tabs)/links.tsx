import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ListItem, Screen, Section } from '@/components/ui';
import { AddLinkModal } from '@/features/links/AddLinkModal';
import { confirmAsync, notify } from '@/features/links/dialogs';
import { useLinks } from '@/features/links/store';
import { useLinkGroups, type ResolvedGroup, type ResolvedLink } from '@/features/links/useLinkGroups';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export default function LinksScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  const groups = useLinkGroups();
  const toggleHidden = useLinks((s) => s.toggleHidden);
  const setGroupOrder = useLinks((s) => s.setGroupOrder);
  const removeCustomLink = useLinks((s) => s.removeCustomLink);

  const groupOptions = useMemo(
    () => groups.map((g) => ({ key: g.key, title: g.title })),
    [groups],
  );

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error('links.openURL failed', url, e);
      notify(t('links.openFailedTitle'), t('links.openFailedMessage'));
    }
  };

  const moveLink = (group: ResolvedGroup, index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= group.links.length) return;
    const ids = group.links.map((l) => l.id);
    const a = ids[index];
    ids[index] = ids[target];
    ids[target] = a;
    setGroupOrder(group.key, ids);
  };

  const deleteLink = async (link: ResolvedLink) => {
    const ok = await confirmAsync({
      title: t('links.deleteLinkTitle'),
      message: t('links.deleteLinkMessage', { title: link.title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (ok) removeCustomLink(link.id);
  };

  const renderEditControls = (group: ResolvedGroup, link: ResolvedLink, index: number) => {
    const isFirst = index === 0;
    const isLast = index === group.links.length - 1;
    return (
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={link.hidden ? t('links.showLink') : t('links.hideLink')}
          onPress={() => toggleHidden(link.id)}
          hitSlop={6}
        >
          <Ionicons
            name={link.hidden ? 'eye-off' : 'eye'}
            size={20}
            color={link.hidden ? colors.textSecondary : colors.primary}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('links.moveUp')}
          onPress={() => moveLink(group, index, -1)}
          disabled={isFirst}
          hitSlop={6}
          style={isFirst && styles.controlDisabled}
        >
          <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('links.moveDown')}
          onPress={() => moveLink(group, index, 1)}
          disabled={isLast}
          hitSlop={6}
          style={isLast && styles.controlDisabled}
        >
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Pressable>
        {link.isCustom ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
            onPress={() => void deleteLink(link)}
            hitSlop={6}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        ) : (
          // カスタムリンクの削除ボタンと幅を揃えるためのスペーサ
          <View style={styles.controlSpacer} />
        )}
      </View>
    );
  };

  const headerRight = (
    <View style={styles.headerRight}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('links.addLink')}
        onPress={() => setAddVisible(true)}
        hitSlop={8}
      >
        <Ionicons name="add" size={28} color={colors.primary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => setEditing((e) => !e)}
        hitSlop={8}
      >
        <Text style={[styles.editToggle, { color: colors.primary }]}>
          {editing ? t('links.done') : t('common.edit')}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Screen title={t('links.title')} right={headerRight}>
      {groups.map((group) => {
        const links = editing ? group.links : group.links.filter((l) => !l.hidden);
        if (links.length === 0) return null;
        return (
          <Section key={group.key} title={group.title}>
            <Card style={styles.groupCard}>
              {links.map((link, index) => (
                <View key={link.id}>
                  {index > 0 && (
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  )}
                  <View style={editing && link.hidden ? styles.hiddenRow : undefined}>
                    <ListItem
                      title={link.title}
                      icon={link.icon}
                      onPress={editing ? undefined : () => void openLink(link.url)}
                      right={
                        editing ? (
                          renderEditControls(group, link, index)
                        ) : (
                          <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
                        )
                      }
                    />
                  </View>
                </View>
              ))}
            </Card>
          </Section>
        );
      })}

      <AddLinkModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        groupOptions={groupOptions}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  editToggle: {
    fontSize: 17,
    fontWeight: '600',
  },
  groupCard: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },
  hiddenRow: {
    opacity: 0.4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  controlDisabled: {
    opacity: 0.3,
  },
  controlSpacer: {
    width: 20,
  },
});
