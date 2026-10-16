// IANAタイムゾーンの一覧・検証・ウォールクロック⇔UTC変換のユーティリティ。
// クライアント(タイムゾーン選択UI・ブラウザのタイムゾーン自動検出)とサーバー
// (フォーム送信値の検証・壁時計→UTC変換)の両方から使う(ADR-0030)。

// 実行環境のタイムゾーン（サーバーでは常にWorkersの実行タイムゾーン＝実質UTC、
// クライアントでは閲覧者のブラウザのタイムゾーン）。環境内では変わらない値なので
// モジュールスコープでキャッシュする（listTimeZonesと同じ方針）。
let cachedBrowserTimeZone: string | null = null;

export function getBrowserTimeZone(): string {
  if (cachedBrowserTimeZone) return cachedBrowserTimeZone;
  try {
    cachedBrowserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    cachedBrowserTimeZone = "UTC";
  }
  return cachedBrowserTimeZone;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

let cachedTimeZones: string[] | null = null;

export function listTimeZones(): string[] {
  if (cachedTimeZones) return cachedTimeZones;
  try {
    cachedTimeZones = Intl.supportedValuesOf("timeZone").slice().sort();
  } catch {
    // Intl.supportedValuesOf非対応環境向けの最小フォールバック。
    cachedTimeZones = [
      "UTC",
      "Asia/Tokyo",
      "Asia/Seoul",
      "Asia/Shanghai",
      "Asia/Singapore",
      "Asia/Hong_Kong",
      "Asia/Taipei",
      "Asia/Bangkok",
      "Asia/Kolkata",
      "Asia/Dubai",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Moscow",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Sao_Paulo",
      "Australia/Sydney",
      "Pacific/Auckland",
    ];
  }
  return cachedTimeZones;
}

// 指定インスタントにおける、そのタイムゾーンのUTCからのオフセット(ミリ秒)。
function getOffsetMs(utcGuess: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(utcGuess)) map[part.type] = part.value;
  const asIfUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asIfUtc - utcGuess.getTime();
}

// 指定タイムゾーンのウォールクロック(例: "2026-12-25" + "19:00")をUTCのDateに変換する。
// DOM標準のDateパーサーは任意タイムゾーンのロケール時刻を解釈できないため、Intlで実際の
// オフセットを算出してから補正する(date-fns-tz等が使う手法と同じ)。DST境界をまたぐ場合に
// 備えて補正後のオフセットで一度だけ再計算する。
export function zonedWallClockToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): Date {
  const guess = new Date(`${dateStr}T${timeStr}:00Z`);
  const offset = getOffsetMs(guess, timeZone);
  const corrected = new Date(guess.getTime() - offset);
  const offset2 = getOffsetMs(corrected, timeZone);
  return offset2 === offset ? corrected : new Date(guess.getTime() - offset2);
}

// 指定インスタントがそのタイムゾーンで属する日の「翌日0:00」をUTCで返す
// (開催期間の終了未指定フォールバックに使う。ADR-0020)。
export function zonedEndOfDay(d: Date, timeZone: string): Date {
  const dateStr = d.toLocaleDateString("en-CA", { timeZone }); // "YYYY-MM-DD"
  const next = new Date(`${dateStr}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDateStr = next.toISOString().slice(0, 10);
  return zonedWallClockToUtc(nextDateStr, "00:00", timeZone);
}
