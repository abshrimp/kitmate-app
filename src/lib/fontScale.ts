import { createElement, type ComponentType } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

// アプリ全体の文字サイズ倍率。
// この RN では Text が「素の関数コンポーネント」なので Text.render はパッチできない。
// 代わりに react-native モジュールの Text エクスポートをスケール適用ラッパーへ差し替える。
// RN の index は Text を遅延 getter で公開しているため、単純代入ではなく
// Object.defineProperty で getter ごと上書きする。
// named import はモジュールのプロパティへのライブ参照のため、各ファイルの Text も差し替わる。
// 全 Text に介入するため、異常時は元の Text をそのまま描画して安全側に倒す。

let globalFontScale = 1;
let patched = false;

export function setGlobalFontScale(scale: number): void {
  globalFontScale = scale;
}

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
    if (globalFontScale === 1) return createElement(Original, props);
    try {
      const flat = (StyleSheet.flatten(props.style) ?? {}) as TextStyle;
      const base = typeof flat.fontSize === 'number' ? flat.fontSize : 14;
      const scaled: TextStyle = { fontSize: Math.round(base * globalFontScale * 100) / 100 };
      if (typeof flat.lineHeight === 'number') scaled.lineHeight = flat.lineHeight * globalFontScale;
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
