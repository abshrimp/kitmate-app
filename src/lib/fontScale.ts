import { createElement, type ComponentType } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { useSettings } from '@/store/settings';

// アプリ全体の文字サイズ倍率。
// この RN では Text/TextInput が .render を持たない (素の関数/クラス) ため、react-native の
// エクスポートをスケール適用ラッパーへ差し替える (RN は遅延 getter で公開するため
// Object.defineProperty で getter ごと上書き)。named import はライブ参照のため全箇所が
// ラッパー経由になる。ラッパー自身が fontScale を購読するので変更時は全 Text/TextInput が
// 再描画され (再マウント不要で) 即時反映される。入れ子 Text の継承を壊さないよう、明示的に
// fontSize を持つものだけスケール。異常時は元のまま描画して安全側に倒す。

let patched = false;

interface StyledProps {
  style?: StyleProp<TextStyle>;
  [key: string]: unknown;
}

type RNModule = Record<string, unknown>;

/** Original を包み、明示 fontSize を fontScale 倍にして描画するコンポーネントを作る。 */
function makeScaled(Original: ComponentType<StyledProps>): ComponentType<StyledProps> {
  const Scaled: ComponentType<StyledProps> = (props: StyledProps) => {
    const scale = useSettings((s) => s.fontScale); // 各インスタンスが購読 → 変更時に再描画
    if (scale === 1) return createElement(Original, props);
    try {
      const flat = StyleSheet.flatten(props.style) as TextStyle | undefined;
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
  const orig = Original as { displayName?: string; name?: string };
  (Scaled as { displayName?: string }).displayName = orig.displayName ?? orig.name ?? 'Scaled';
  return Scaled;
}

/** rn[name] を makeScaled で差し替える。 */
function replaceExport(rn: RNModule, name: string): void {
  const Original = rn[name] as ComponentType<StyledProps> | undefined;
  if (typeof Original !== 'function') {
    console.warn(`[fontScale] react-native ${name} is not a function; skipped`);
    return;
  }
  const Scaled = makeScaled(Original);
  try {
    Object.defineProperty(rn, name, { configurable: true, enumerable: true, get: () => Scaled });
  } catch (e) {
    console.warn(`[fontScale] could not replace ${name} export:`, e);
  }
}

/** react-native の Text / TextInput をスケール適用ラッパーへ差し替える (起動時に一度だけ)。 */
export function installFontScalePatch(): void {
  if (patched) return;
  patched = true;
  // require でモジュールの実体 (可変な exports オブジェクト) を取得する
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rn = require('react-native') as RNModule;
  replaceExport(rn, 'Text');
  replaceExport(rn, 'TextInput');
}
