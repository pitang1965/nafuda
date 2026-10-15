import type { Locale } from "./types";

// 日時表示は常に Asia/Tokyo 固定（海外開催イベント対応は別タスク。CONTEXT.md参照）。
// 英語表示では "JST" を明記し、これが日本時間であることを明示する（曜日・月名の言い回しのみ言語で変える）。
const TIME_ZONE = "Asia/Tokyo";

function intlLocale(locale: Locale): string {
  return locale === "ja" ? "ja-JP" : "en-US";
}

export function formatJstDate(
  date: Date | string | number,
  locale: Locale,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(intlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TIME_ZONE,
  });
}

export function formatJstDateTime(
  date: Date | string | number,
  locale: Locale,
): string {
  const d = date instanceof Date ? date : new Date(date);
  const formatted = d.toLocaleString(intlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
  return locale === "en" ? `${formatted} JST` : formatted;
}

export function formatJstTime(
  date: Date | string | number,
  locale: Locale,
): string {
  const d = date instanceof Date ? date : new Date(date);
  const formatted = d.toLocaleTimeString(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
  return locale === "en" ? `${formatted} JST` : formatted;
}
