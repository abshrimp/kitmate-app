import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LINK_ICON_CHOICES } from './defaultLinks';
import { useLinks } from './store';
import { Button, SelectModal, TextField, type IoniconsName } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

const NEW_GROUP_VALUE = '__new_group__';

export interface AddLinkModalProps {
  visible: boolean;
  onClose: () => void;
  /** 選択肢に出す既存グループ (デフォルト + カスタム由来) */
  groupOptions: { key: string; title: string }[];
}

/** URL にスキームが無ければ https:// を補う */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function AddLinkModal({ visible, onClose, groupOptions }: AddLinkModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* visible のたびにマウントし直し、フォーム状態をリセットする */}
      {visible && <AddLinkForm onClose={onClose} groupOptions={groupOptions} />}
    </Modal>
  );
}

function AddLinkForm({ onClose, groupOptions }: Omit<AddLinkModalProps, 'visible'>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const addCustomLink = useLinks((s) => s.addCustomLink);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [icon, setIcon] = useState<IoniconsName>('link-outline');
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);

  const isNewGroup = groupKey === NEW_GROUP_VALUE;
  const resolvedGroup = isNewGroup
    ? newGroupName.trim()
    : (groupKey ?? '');
  const canSubmit = title.trim() !== '' && url.trim() !== '' && resolvedGroup !== '';

  const groupLabel = isNewGroup
    ? t('links.newGroup')
    : (groupOptions.find((g) => g.key === groupKey)?.title ?? t('links.selectGroup'));

  const submit = () => {
    if (!canSubmit) return;
    addCustomLink({
      group: resolvedGroup,
      title: title.trim(),
      url: normalizeUrl(url),
      icon,
    });
    onClose();
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={() => undefined}
          >
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {t('links.addLinkTitle')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={onClose}
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              <TextField
                label={t('links.fieldTitle')}
                value={title}
                onChangeText={setTitle}
                placeholder={t('links.fieldTitlePlaceholder')}
              />
              <TextField
                label={t('links.fieldUrl')}
                value={url}
                onChangeText={setUrl}
                placeholder={t('links.fieldUrlPlaceholder')}
                keyboardType="url"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('links.fieldGroup')}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setGroupPickerVisible(true)}
                style={({ pressed }) => [
                  styles.groupSelect,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.groupSelectText,
                    { color: groupKey === null ? colors.textSecondary : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {groupLabel}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </Pressable>
              {isNewGroup && (
                <TextField
                  label={t('links.newGroupName')}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder={t('links.newGroupNamePlaceholder')}
                />
              )}

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('links.fieldIcon')}
              </Text>
              <View style={styles.iconGrid}>
                {LINK_ICON_CHOICES.map((name) => {
                  const selected = name === icon;
                  return (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityLabel={name}
                      onPress={() => setIcon(name)}
                      style={[
                        styles.iconCell,
                        {
                          backgroundColor: selected ? colors.primary : colors.cardAlt,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={name}
                        size={22}
                        color={selected ? colors.onPrimary : colors.text}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.actions}>
                <Button title={t('common.cancel')} variant="secondary" onPress={onClose} />
                <Button title={t('common.add')} onPress={submit} disabled={!canSubmit} icon="add" />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      <SelectModal
        visible={groupPickerVisible}
        title={t('links.selectGroup')}
        options={[
          ...groupOptions.map((g) => ({ label: g.title, value: g.key })),
          { label: t('links.newGroup'), value: NEW_GROUP_VALUE },
        ]}
        onSelect={(value) => {
          setGroupKey(value);
          setGroupPickerVisible(false);
        }}
        onClose={() => setGroupPickerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  groupSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    gap: 8,
  },
  groupSelectText: {
    flex: 1,
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 2,
  },
  iconCell: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
