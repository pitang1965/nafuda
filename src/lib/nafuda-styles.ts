export type NafudaStyleId =
  | "purple"
  | "sakura"
  | "moon"
  | "ocean"
  | "sunset"
  | "stardust"
  | "rainbow";
export type FrameId = "sakura" | "moon" | "stardust";

export interface NafudaStyleDef {
  id: NafudaStyleId;
  name: string;
  background: string;
  textColor: string;
  subtextColor: string;
  tagBg: string;
  tagText: string;
  fontFamily: string;
  fontUrl: string | null;
  frameId: FrameId | null;
  isFree: boolean;
  holographic?: boolean;
  petalsFall?: boolean;
  rainbowBorder?: boolean;
}

export const NAFUDA_STYLES: NafudaStyleDef[] = [
  {
    id: "purple",
    name: "パープル",
    background: "linear-gradient(135deg, #9333ea 0%, #c026d3 100%)",
    textColor: "#ffffff",
    subtextColor: "rgba(255,255,255,0.75)",
    tagBg: "rgba(255,255,255,0.2)",
    tagText: "#ffffff",
    fontFamily: '"Noto Sans JP", sans-serif',
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap",
    frameId: null,
    isFree: true,
  },
  {
    id: "sakura",
    name: "さくら",
    background: "linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)",
    textColor: "#831843",
    subtextColor: "#9d174d",
    tagBg: "#fce7f3",
    tagText: "#9d174d",
    fontFamily: '"Zen Maru Gothic", sans-serif',
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;700&display=swap",
    frameId: "sakura",
    isFree: true,
    petalsFall: true,
  },
  {
    id: "moon",
    name: "ムーン",
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    textColor: "#e0e7ff",
    subtextColor: "rgba(199,210,254,0.8)",
    tagBg: "rgba(199,210,254,0.15)",
    tagText: "#c7d2fe",
    fontFamily: '"Noto Serif JP", serif',
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap",
    frameId: "moon",
    isFree: true,
  },
  {
    id: "ocean",
    name: "オーシャン",
    background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
    textColor: "#ffffff",
    subtextColor: "rgba(255,255,255,0.8)",
    tagBg: "rgba(255,255,255,0.2)",
    tagText: "#ffffff",
    fontFamily: '"Noto Sans JP", sans-serif',
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap",
    frameId: null,
    isFree: true,
  },
  {
    id: "sunset",
    name: "サンセット",
    background: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
    textColor: "#ffffff",
    subtextColor: "rgba(255,255,255,0.8)",
    tagBg: "rgba(255,255,255,0.2)",
    tagText: "#ffffff",
    fontFamily: '"Zen Maru Gothic", sans-serif',
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;700&display=swap",
    frameId: null,
    isFree: true,
  },
  {
    id: "stardust",
    name: "スターダスト",
    background:
      "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    textColor: "#e8e0ff",
    subtextColor: "rgba(210,190,255,0.75)",
    tagBg: "rgba(180,150,255,0.18)",
    tagText: "#e8e0ff",
    fontFamily: '"Noto Sans JP", sans-serif',
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap",
    frameId: "stardust",
    isFree: true,
    holographic: true,
  },
  {
    id: "rainbow",
    name: "虹",
    background: "linear-gradient(135deg, #0a0a0f 0%, #14141c 100%)",
    textColor: "#ffffff",
    subtextColor: "rgba(255,255,255,0.78)",
    tagBg: "rgba(255,255,255,0.16)",
    tagText: "#ffffff",
    fontFamily: '"Noto Sans JP", sans-serif',
    fontUrl:
      "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap",
    frameId: null,
    isFree: true,
    rainbowBorder: true,
  },
];

export function getNafudaStyle(
  styleId: string | null | undefined,
): NafudaStyleDef | null {
  if (!styleId) return null;
  return NAFUDA_STYLES.find((s) => s.id === styleId) ?? null;
}
