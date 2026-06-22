import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import {
  NAFUDA_VIEWBOX,
  NAFUDA_BRAND_COLOR,
  NAFUDA_EAR_PATHS,
  NAFUDA_BODY_RECT,
  NAFUDA_SLOT_RECT,
} from "../src/brand/nafuda-mark.js";

// 形状の正本は src/brand/nafuda-mark.js（UI の NafudaIcon と共有）。
// ここではブランド配色（本体ピンク＋名刺スロット白）で塗る。

function rect(r, fill, extra = "") {
  return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.rx}" fill="${fill}"${extra}/>`;
}

// size 指定で固定px（ラスタ元）、未指定でレスポンシブ（favicon.svg 用）。
function makeSvg({ size } = {}) {
  const dims = size ? `width="${size}" height="${size}" ` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" ${dims}viewBox="${NAFUDA_VIEWBOX}">
${NAFUDA_EAR_PATHS.map((d) => `  <path d="${d}" fill="${NAFUDA_BRAND_COLOR}"/>`).join("\n")}
  ${rect(NAFUDA_BODY_RECT, NAFUDA_BRAND_COLOR)}
  ${rect(NAFUDA_SLOT_RECT, "white", ' opacity="0.92"')}
</svg>`;
}

await mkdir("public/icons", { recursive: true });

// PWA アイコン
await sharp(Buffer.from(makeSvg({ size: 512 })))
  .png()
  .toFile("public/icons/icon-512.png");

await sharp(Buffer.from(makeSvg({ size: 192 })))
  .png()
  .toFile("public/icons/icon-192.png");

// 32x32 favicon.ico (PNG形式)
await sharp(Buffer.from(makeSvg({ size: 32 })))
  .png()
  .toFile("public/favicon.ico");

// SVG favicon（高解像・ブランド形）。スターター由来の紫の残骸を置き換える。
await writeFile("public/favicon.svg", makeSvg() + "\n");

console.log("Icons generated.");
