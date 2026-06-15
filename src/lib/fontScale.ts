import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

// アプリ全体の文字サイズ倍率。RN の Text.render を一度だけパッチし、入力 style の fontSize/
// lineHeight に倍率を掛けてから本来の render を呼ぶ。設定変更時は ThemeProvider の値更新で
// useTheme 利用コンポーネントが再描画され反映される (ナビゲーションは維持)。
// (全 Text に介入する処理のため、エラー時は元のまま描画して安全側に倒す)

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
    if (globalFontScale === 1) return original.apply(this, args);
    try {
      const props = args[0] as { style?: StyleProp<TextStyle> } | null | undefined;
      if (props === null || props === undefined) return original.apply(this, args);
      const flat = (StyleSheet.flatten(props.style) ?? {}) as TextStyle;
      const base = typeof flat.fontSize === 'number' ? flat.fontSize : 14;
      const scaled: TextStyle = { fontSize: Math.round(base * globalFontScale * 100) / 100 };
      if (typeof flat.lineHeight === 'number') scaled.lineHeight = flat.lineHeight * globalFontScale;
      const nextProps = { ...props, style: [props.style, scaled] };
      return original.apply(this, [nextProps, ...args.slice(1)]);
    } catch {
      return original.apply(this, args);
    }
  };
}
