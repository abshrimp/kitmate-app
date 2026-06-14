/**
 * セル色のプリセット (TimetableEntry.color として永続化される「データ」であり、
 * UI テーマ色ではないためここで定義する。描画時は透過を掛けて両テーマで馴染ませる)
 */
// 講義ごとのユーザー選択色。工繊カラー (藍/真鍮) を含めつつ、
// やや彩度を抑えた落ち着いた色で揃え、透過を掛けて両テーマで描画する。
export const ENTRY_COLOR_PRESETS: readonly string[] = [
  '#286883', // 工繊 藍
  '#4F8C6B', // sage green
  '#C2503C', // terracotta
  '#6E7CB0', // muted periwinkle
  '#BB8F51', // 工繊 真鍮
  '#B06A8A', // dusty rose
];

/** #RRGGBB に 0-255 のアルファを付与 */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(255, Math.round(alpha)))
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
