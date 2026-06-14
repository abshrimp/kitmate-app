import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export interface ScreenProps {
  title?: string;
  children?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  right?: ReactNode;
  /**
   * 戻るボタンの表示。未指定なら「自分が属するスタックを戻れるとき」だけ自動表示する。
   * タブのルート画面 (最寄りのナビゲータがタブ) では出ない。
   */
  back?: boolean;
}

/**
 * 最寄りのナビゲータがスタックで、かつ戻れる履歴があるかを返す。
 * タブのルート画面は最寄りが Tabs ナビゲータなので false になる。
 * ナビゲーション状態の変化に追従するため state リスナで再評価する。
 */
function useCanGoBackInStack(): boolean {
  const navigation = useNavigation();
  const compute = () => navigation.getState()?.type === 'stack' && navigation.canGoBack();
  const [canGoBack, setCanGoBack] = useState(compute);

  useEffect(() => {
    // フォーカス・state 変化のたびに再評価 (タブ切替や push/pop に追従)
    const update = () => setCanGoBack(navigation.getState()?.type === 'stack' && navigation.canGoBack());
    const unsubState = navigation.addListener('state', update);
    const unsubFocus = navigation.addListener('focus', update);
    return () => {
      unsubState();
      unsubFocus();
    };
  }, [navigation]);

  return canGoBack;
}

/** SafeArea + 大見出しヘッダ付きの画面コンテナ */
export function Screen({ title, children, scroll = true, padded = true, right, back }: ScreenProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const canGoBack = useCanGoBackInStack();
  const showBack = back ?? canGoBack;
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {title !== undefined && (
        <View style={styles.header}>
          {showBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={() => navigation.goBack()}
              hitSlop={8}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={26} color={colors.primary} />
            </Pressable>
          )}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {right != null && <View style={styles.headerRight}>{right}</View>}
        </View>
      )}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, padded && styles.padded]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padded && styles.padded]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  backButton: {
    marginLeft: -8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  padded: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});
