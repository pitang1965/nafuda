// ブランドマーク（ネコ耳なふだホルダー形シルエット）の単一ソース。
// ラスタ／favicon を生成する scripts/gen-icons.mjs と、UI 用の
// src/components/NafudaIcon.tsx の両方がこの幾何を読む。
// マークを作り直すときはこの 1 ファイルだけを編集し、
//   node scripts/gen-icons.mjs
// を再実行すれば、PWA アイコン・favicon・UI 内のアイコンすべてに伝播する。
//
// 色はここでは定義しない（ピンク／currentColor の使い分けは各呼び出し側の責務）。
// node から ESM import するためプレーン .js（型は隣の nafuda-mark.d.ts が提供）。

export const NAFUDA_VIEWBOX = "0 0 100 100";

/** ブランドのピンク（manifest の theme_color と一致）。ラスタ／favicon の本体色。 */
export const NAFUDA_BRAND_COLOR = "#ec4899";

/** 本体上部のネコ耳×2。塗りは呼び出し側が決める。 */
export const NAFUDA_EAR_PATHS = [
  "M 14 35 C 17 15 27 3 32 2 C 37 3 47 15 50 35 Z", // 左ネコ耳
  "M 50 35 C 53 15 63 3 68 2 C 73 3 83 15 86 35 Z", // 右ネコ耳
];

/** 胴体。 */
export const NAFUDA_BODY_RECT = { x: 7, y: 31, width: 86, height: 64, rx: 18 };

/** 名刺スロット（ラスタでは白枠、UI ではくり抜き）。 */
export const NAFUDA_SLOT_RECT = { x: 22, y: 46, width: 56, height: 38, rx: 5 };
