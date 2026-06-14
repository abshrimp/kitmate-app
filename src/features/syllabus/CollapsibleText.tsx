import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export interface CollapsibleTextProps {
  text: string;
  /** 折りたたみ時の行数 (default 6) */
  collapsedLines?: number;
}

/** 長文を折りたたみ、「もっと見る/折りたたむ」で開閉するテキスト */
export function CollapsibleText({ text, collapsedLines = 6 }: CollapsibleTextProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  // 計測 API は web で不安定なため、文字量・改行数のヒューリスティクスで判定する
  const collapsible = text.length > 160 || text.split('\n').length > collapsedLines;
  return (
    <View>
      <Text
        style={[styles.body, { color: colors.text }]}
        numberOfLines={collapsible && !expanded ? collapsedLines : undefined}
      >
        {text}
      </Text>
      {collapsible && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          style={styles.toggle}
        >
          <Text style={[styles.toggleLabel, { color: colors.primary }]}>
            {expanded ? t('syllabus.showLess') : t('syllabus.showMore')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  toggle: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
