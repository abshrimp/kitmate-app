import { cloneElement, isValidElement, type ReactElement } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

// アプリ全体の文字サイズ倍率。RN の Text.render を一度だけパッチし、各 Text の fontSize/
// lineHeight に倍率を掛ける。設定変更時はルートを key で再マウントして全体に反映する。
// (全 Text に介入する処理のため、エラー時は元の要素をそのまま返して安全側に倒す)

let globalFontScale = 1;

export function setGlobalFontScale(scale: number): void {
  globalFontScale = scale;
}

interface PatchableText {
  render?: (...args: unknown[]) => unknown;
  __kitmateFontPatched?: boolean;
}

/** RN の Text をパッチして文字サイズ倍率を適用する (アプリ起動時に一度だけ呼ぶ)。 */
export function installFontScalePatch(): void {
  const TextRef = Text as unknown as PatchableText;
  const original = TextRef.render;
  if (original === undefined || TextRef.__kitmateFontPatched === true) return;
  TextRef.__kitmateFontPatched = true;

  TextRef.render = function patchedRender(this: unknown, ...args: unknown[]): unknown {
    const el = original.apply(this, args);
    if (globalFontScale === 1) return el;
    try {
      if (!isValidElement(el)) return el;
      const element = el as ReactElement<{ style?: StyleProp<TextStyle> }>;
      const flat = (StyleSheet.flatten(element.props.style) ?? {}) as TextStyle;
      const base = typeof flat.fontSize === 'number' ? flat.fontSize : 14;
      const scaled: TextStyle = { fontSize: Math.round(base * globalFontScale * 100) / 100 };
      if (typeof flat.lineHeight === 'number') scaled.lineHeight = flat.lineHeight * globalFontScale;
      return cloneElement(element, { style: [element.props.style, scaled] });
    } catch {
      return el;
    }
  };
}
