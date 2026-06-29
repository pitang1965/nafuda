// nafuda-mark.js の型宣言（allowJs を有効にせず .tsx から型付きで import するため）。

export const NAFUDA_VIEWBOX: string;
export const NAFUDA_BRAND_COLOR: string;
export const NAFUDA_EAR_PATHS: readonly string[];

export interface NafudaRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

export const NAFUDA_BODY_RECT: NafudaRect;
export const NAFUDA_SLOT_RECT: NafudaRect;
