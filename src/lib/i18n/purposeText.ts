import type { Locale } from "./types";

// 用途タイプ (Purpose) のUI文言の英語オーバーレイ。
// PURPOSE_CONFIGS（src/lib/purpose.ts）のラベル・説明文・タグ見出し等の構造的な文言のみ対象。
// labelSeed / popularTagSeeds（日本語ファンダム文化に依存した候補）は対象外（/grill-with-docs Q10）。
// PurposeId を import すると purpose.ts との循環 import になるため、キーをリテラルで持つ。
type PurposeIdLiteral = "social" | "oshi" | "car" | "other";

interface PurposeTextOverlay {
  label: string;
  description: string;
  tagHeading: string | null;
  editTagLabel: string;
  editTagHint: string;
  labelPlaceholder: string;
}

const EN_PURPOSE_TEXT: Record<PurposeIdLiteral, PurposeTextOverlay> = {
  social: {
    label: "Events & Socials",
    description:
      'Study groups, meetups, drinks, dog walks — the "not work" kind of meeting',
    tagHeading: null,
    editTagLabel: "Interest Tags",
    editTagHint: "Interests, genres, hobbies, etc.",
    labelPlaceholder: "e.g. For meetups, For socials",
  },
  oshi: {
    label: "Oshi Activities",
    description: "Lives, fan meetups, connecting with fellow fans",
    tagHeading: "Oshi",
    editTagLabel: "Oshi Tags",
    editTagHint: "Name of your oshi, group name, genre, etc.",
    labelPlaceholder: "e.g. For oshi activities",
  },
  car: {
    label: "Cars",
    description: "Drives, meetups, car enthusiasts",
    tagHeading: "Cars",
    editTagLabel: "Interest Tags",
    editTagHint: "Car model, driving style, custom direction, etc.",
    labelPlaceholder: "e.g. For car meetups",
  },
  other: {
    label: "Other",
    description: "None of the above",
    tagHeading: null,
    editTagLabel: "Interest Tags",
    editTagHint: "Interests, genres, hobbies, etc.",
    labelPlaceholder: "e.g. For matchmaking, gaming friends",
  },
};

export const EN_LEGACY_TAG_LABEL = "Oshi / Hobby Tags";
export const EN_LEGACY_TAG_HINT = "Name of your oshi, group name, genre, etc.";
export const EN_DEFAULT_LABEL_PLACEHOLDER = "e.g. For oshi activities, hobbies";

export function purposeTextOverlay(
  locale: Locale,
): Record<PurposeIdLiteral, PurposeTextOverlay> | null {
  return locale === "en" ? EN_PURPOSE_TEXT : null;
}
