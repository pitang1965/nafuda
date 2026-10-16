import type { Locale } from "./types";
import { getBrowserTimeZone } from "../timezone";
import { dictionaries } from "./dictionaries";
import { translate } from "./translate";

function intlLocale(locale: Locale): string {
  return locale === "ja" ? "ja-JP" : "en-US";
}

// イベント自体の開催タイムゾーンで表示する（ADR-0030）。時刻を含む表示は常にタイムゾーンの
// 略称（JST・GMT+1等）を日英どちらでも明記する（時刻を含まない日付のみの表示には付けない）。

export function formatEventDate(
  date: Date | string | number,
  locale: Locale,
  timeZone: string,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(intlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  });
}

// showZone=false は、同日開催の期間表示（例:「12:00〜13:00 JST」）で開始側の略称を
// 省略するために使う（終了側にだけ付けて、同じ略称が2回並ぶ重複表示を避ける）。
export function formatEventDateTime(
  date: Date | string | number,
  locale: Locale,
  timeZone: string,
  showZone = true,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(intlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    ...(showZone ? { timeZoneName: "short" as const } : {}),
  });
}

export function formatEventTime(
  date: Date | string | number,
  locale: Locale,
  timeZone: string,
  showZone = true,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    ...(showZone ? { timeZoneName: "short" as const } : {}),
  });
}

function formatEventDateOrDateTime(
  date: Date | string | number,
  showTime: boolean,
  locale: Locale,
  timeZone: string,
  showZone = true,
): string {
  return showTime
    ? formatEventDateTime(date, locale, timeZone, showZone)
    : formatEventDate(date, locale, timeZone);
}

// 開催タイムゾーンでの「同一カレンダー日」判定（タイムゾーンをまたぐ比較を避ける）。
function isSameCalendarDay(a: Date, b: Date, timeZone: string): boolean {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  return fmt(a) === fmt(b);
}

// イベントの開催期間 [開始, 終了] を1本の文字列にまとめる。同日・時刻ありの場合は
// タイムゾーン略称を終了側にだけ付ける（開始・終了の両方に付けると
// 「12:00 JST〜13:00 JST」のように重複して見えるため）。この重複回避ロジックは
// ここに一元化し、呼び出し元が formatEventDateTime/formatEventTime を直接組み合わせて
// 期間表示を再現する必要がないようにする。
export function formatEventPeriod(
  start: Date | string,
  end: Date | string | null,
  showTime: boolean,
  locale: Locale,
  timeZone: string,
): string {
  if (!end) return formatEventDateOrDateTime(start, showTime, locale, timeZone);
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = isSameCalendarDay(s, e, timeZone);
  const separator = translate(dictionaries[locale], "eventDetail.periodSeparator");
  if (sameDay) {
    if (!showTime) return formatEventDateOrDateTime(start, showTime, locale, timeZone);
    const startStr = formatEventDateOrDateTime(
      start,
      showTime,
      locale,
      timeZone,
      false,
    );
    const endTime = formatEventTime(end, locale, timeZone);
    return `${startStr}${separator}${endTime}`;
  }
  const startStr = formatEventDateOrDateTime(start, showTime, locale, timeZone);
  return `${startStr}${separator}${formatEventDateOrDateTime(end, showTime, locale, timeZone)}`;
}

// イベントと無関係な個人の記録（いつつながったか・いつお気に入りにしたか等）は、閲覧者の
// ブラウザのローカルタイムゾーンで表示する。SSR時はサーバーの実行タイムゾーン（Workersは
// UTC）で仮描画され、クライアントでのhydration時にブラウザの実タイムゾーンへ自己修正される
// （`typeof window !== 'undefined'` と同じ、値がサーバー/クライアントで異なる既知のケース）。

export function formatLocalDate(
  date: Date | string | number,
  locale: Locale,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(intlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: getBrowserTimeZone(),
  });
}

export function formatLocalDateTime(
  date: Date | string | number,
  locale: Locale,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(intlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: getBrowserTimeZone(),
    timeZoneName: "short",
  });
}

export function formatLocalTime(
  date: Date | string | number,
  locale: Locale,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: getBrowserTimeZone(),
    timeZoneName: "short",
  });
}
