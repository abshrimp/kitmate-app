import { createElement, type ComponentType } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { useSettings } from '@/store/settings';

// アプリ全体の文字サイズ倍率。
// この RN では Text が「素の関数コンポーネント」で .render を持たないため、react-native の
// Text エクスポートをスケール適用ラッパーへ差し替える (RN は Text を遅延 getter で公開する
// ため Object.defineProperty で getter ごと上書き)。named import はライブ参照のため全 Text が
// ラッパー経由になる。ラッパー自身が fontScale を購読するので、変更時は全 Text が再描画され
// (再マウント不要で) 即時反映される。入れ子 Text の継承を壊さないよう、明示的に fontSize を
// 持つ Text のみスケールする。異常時は元の Text をそのまま描画して安全側に倒す。

let patched = false;

interface TextProps {
  style?: StyleProp<TextStyle>;
  [key: string]: unknown;
}

interface RNModule {
  Text: ComponentType<TextProps>;
}

/** react-native の Text をスケール適用ラッパーへ差し替える (アプリ起動時に一度だけ呼ぶ)。 */
export function installFontScalePatch(): void {
  if (patched) return;
  // require でモジュールの実体 (可変な exports オブジェクト) を取得する
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rn = require('react-native') as RNModule;
  const Original = rn.Text; // getter 経由で実体の Text を取得
  if (typeof Original !== 'function') {
    console.warn('[fontScale] react-native Text is not a function; font scaling disabled');
    return;
  }
  patched = true;

  const ScaledText: ComponentType<TextProps> = (props: TextProps) => {
    const scale = useSettings((s) => s.fontScale); // 各 Text が購読 → 変更時に再描画
    if (scale === 1) return createElement(Original, props);
    try {
      const flat = StyleSheet.flatten(props.style) as TextStyle | undefined;
      // 明示的に fontSize を持つ Text のみスケール (入れ子 Text の継承を壊さない)
      if (flat === undefined || typeof flat.fontSize !== 'number') {
        return createElement(Original, props);
      }
      const scaled: TextStyle = { fontSize: Math.round(flat.fontSize * scale * 100) / 100 };
      if (typeof flat.lineHeight === 'number') scaled.lineHeight = flat.lineHeight * scale;
      return createElement(Original, { ...props, style: [props.style, scaled] });
    } catch {
      return createElement(Original, props);
    }
  };
  (ScaledText as { displayName?: string }).displayName = 'Text';

  try {
    Object.defineProperty(rn, 'Text', {
      configurable: true,
      enumerable: true,
      get: () => ScaledText,
    });
  } catch (e) {
    console.warn('[fontScale] could not replace Text export:', e);
  }
}
