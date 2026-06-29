import { useId, type SVGProps } from "react";
import {
  NAFUDA_VIEWBOX,
  NAFUDA_EAR_PATHS,
  NAFUDA_BODY_RECT,
  NAFUDA_SLOT_RECT,
} from "../brand/nafuda-mark.js";

type NafudaIconProps = SVGProps<SVGSVGElement>;

// ブランドマーク（ネコ耳なふだ）の単色アイコン。本体は currentColor、名刺スロットは
// くり抜き（背景が透ける）。既定 1em 四方なので、絵文字 📛 のドロップイン代替として
// 親の font-size／text 色にそのまま追従する（例: text-4xl・text-pink-500）。
// サイズ・色を固定したいときは className で上書きする（例: size-5・text-gray-400）。
// 形状の正本は src/brand/nafuda-mark.js（gen-icons.mjs と共有）。
export function NafudaIcon({ className, ...props }: NafudaIconProps) {
  const maskId = useId();
  return (
    <svg
      viewBox={NAFUDA_VIEWBOX}
      width="1em"
      height="1em"
      className={className}
      aria-hidden
      {...props}
    >
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="100"
        height="100"
      >
        {/* 白 = 表示、黒 = くり抜き */}
        <rect {...NAFUDA_BODY_RECT} fill="white" />
        {NAFUDA_EAR_PATHS.map((d) => (
          <path key={d} d={d} fill="white" />
        ))}
        <rect {...NAFUDA_SLOT_RECT} fill="black" />
      </mask>
      <rect
        width="100"
        height="100"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
