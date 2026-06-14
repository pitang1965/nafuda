// 用途タイプ (Purpose) レジストリ
//
// purpose は「アプリが読んで、なふだの見せ方と編集体験を切り替える機械可読な分類」。
// ラベル（自己識別の自由記述）とは役割が別（ADR-0010 / CONTEXT.md 参照）。
// DB 上は personas.purpose（text・null許容）。null = 導入前の既存なふだ（従来表示）。
//
// 値は「開いた集合」で、特化用途（例: car）は後からこのレジストリに追加していく。
// 見せ方の分岐はすべてこのレジストリ参照で行い、null・未知値は default にフォールバックする。

export const PURPOSE_IDS = ["social", "oshi", "car", "other"] as const;
export type PurposeId = (typeof PURPOSE_IDS)[number];

export interface PurposeConfig {
  id: PurposeId;
  /** ウィザード/編集のピッカーに出す表示名 */
  label: string;
  emoji: string;
  /** ピッカーカードの説明文 */
  description: string;
  /** ラベル入力欄に流し込む初期値（空文字 = seed しない） */
  labelSeed: string;
  /** ラベル入力欄のプレースホルダー */
  labelPlaceholder: string;
  /** 公開プロフィールのタグ見出し（null = 見出しを出さない＝従来の見た目） */
  tagHeading: string | null;
  /** SNSリンクのサジェストで前方へ出すプラットフォーム（platform value） */
  snsPriority: string[];
  /** 編集/ウィザードのタグ入力欄の見出し（推しタグ / 興味タグ など） */
  editTagLabel: string;
  /** タグ入力欄の補足説明文 */
  editTagHint: string;
}

const DEFAULT_LABEL_PLACEHOLDER = "例: 推し活用・趣味用";

export const PURPOSE_CONFIGS: Record<PurposeId, PurposeConfig> = {
  social: {
    id: "social",
    label: "イベント・交流",
    emoji: "🥂",
    description: "勉強会・オフ会・飲み会など“仕事じゃない”出会い",
    labelSeed: "交流用",
    labelPlaceholder: "例: オフ会用・交流用",
    tagHeading: null,
    snsPriority: ["instagram", "x", "line_openchat"],
    editTagLabel: "興味タグ",
    editTagHint: "興味のあること・ジャンル・趣味など",
  },
  oshi: {
    id: "oshi",
    label: "推し活",
    emoji: "💜",
    description: "ライブ・ファンミ・同担とつながる",
    labelSeed: "推し活",
    labelPlaceholder: "例: 推し活用",
    tagHeading: "推し",
    snsPriority: ["x", "instagram", "discord", "pixiv", "youtube"],
    editTagLabel: "推しタグ",
    editTagHint: "推しの名前・グループ名・ジャンルなど",
  },
  car: {
    id: "car",
    label: "車",
    emoji: "🚗",
    description: "ドライブ・ミーティング・愛車仲間",
    labelSeed: "車",
    labelPlaceholder: "例: 車用",
    tagHeading: "車",
    snsPriority: ["minkara", "x", "youtube", "instagram"],
    editTagLabel: "興味タグ",
    editTagHint: "車種・走り方・カスタムの方向性など",
  },
  other: {
    id: "other",
    label: "その他",
    emoji: "✨",
    description: "上のどれにも当てはまらない",
    labelSeed: "",
    labelPlaceholder: "例: 婚活用・ゲーム仲間",
    tagHeading: null,
    snsPriority: [],
    editTagLabel: "興味タグ",
    editTagHint: "興味のあること・ジャンル・趣味など",
  },
};

// ピッカーの表示順（ADR-0009: 表の顔=social を先頭に）
export const PURPOSE_PICKER_ORDER: readonly PurposeId[] = [
  "social",
  "oshi",
  "car",
  "other",
];

export function isPurposeId(v: string | null | undefined): v is PurposeId {
  return v != null && (PURPOSE_IDS as readonly string[]).includes(v);
}

/** null/未知値は null（default フォールバック）を返す */
export function getPurposeConfig(
  purpose: string | null | undefined,
): PurposeConfig | null {
  return isPurposeId(purpose) ? PURPOSE_CONFIGS[purpose] : null;
}

export function purposeTagHeading(
  purpose: string | null | undefined,
): string | null {
  return getPurposeConfig(purpose)?.tagHeading ?? null;
}

export function purposeLabelPlaceholder(
  purpose: string | null | undefined,
): string {
  return getPurposeConfig(purpose)?.labelPlaceholder ?? DEFAULT_LABEL_PLACEHOLDER;
}

// null/未知（＝導入前の既存なふだ）は従来表示にフォールバックする。
const LEGACY_TAG_LABEL = "推し / 趣味タグ";
const LEGACY_TAG_HINT = "推しの名前・グループ名・ジャンルなど";

/** 編集/ウィザードのタグ入力欄の見出し（null/未知 → 従来表示） */
export function purposeEditTagLabel(
  purpose: string | null | undefined,
): string {
  return getPurposeConfig(purpose)?.editTagLabel ?? LEGACY_TAG_LABEL;
}

/** タグ入力欄の補足説明文（null/未知 → 従来表示） */
export function purposeEditTagHint(purpose: string | null | undefined): string {
  return getPurposeConfig(purpose)?.editTagHint ?? LEGACY_TAG_HINT;
}

/**
 * 同担拒否（dojinReject）の入力欄を出すか。
 * 同担は推し活固有の概念のため `oshi` でのみ表示する。
 * null/未知（導入前の既存なふだ）は従来表示を守って表示し続ける（ADR-0010）。
 */
export function purposeShowsDojinReject(
  purpose: string | null | undefined,
): boolean {
  const cfg = getPurposeConfig(purpose);
  return cfg ? cfg.id === "oshi" : true;
}

/**
 * purpose の snsPriority に従い、優先プラットフォームを前方へ安定ソートする。
 * 優先指定のないものは元の順序を保つ（Array.prototype.sort は V8 で安定）。
 */
export function orderPlatformsByPurpose<T extends { value: string }>(
  platforms: readonly T[],
  purpose: string | null | undefined,
): T[] {
  const priority = getPurposeConfig(purpose)?.snsPriority ?? [];
  if (priority.length === 0) return [...platforms];
  const rank = (v: string) => {
    const i = priority.indexOf(v);
    return i === -1 ? priority.length : i;
  };
  return [...platforms].sort((a, b) => rank(a.value) - rank(b.value));
}
