import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./types";

// Cookie ヘッダー文字列（"a=1; b=2" 形式）から単純にキーバリューを取り出す。
// クライアントの document.cookie もサーバーの Cookie ヘッダーも同じ形式なので共用できる。
function parseCookieHeader(
  cookieHeader: string | null | undefined,
): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

// "ja,en-US;q=0.9" のような Accept-Language の先頭言語だけを見る。
// 日本語なら ja、それ以外はデフォルト（英語）にフォールバックする（ADR-0029・Q1参照）。
function localeFromAcceptLanguage(
  header: string | null | undefined,
): Locale {
  const first = header?.split(",")[0]?.trim().toLowerCase();
  if (first?.startsWith("ja")) return "ja";
  return DEFAULT_LOCALE;
}

// ロケール決定の優先順位: Cookie の明示選択 > Accept-Language 自動判定（ADR-0029）。
export function resolveLocale(
  cookieHeader: string | null | undefined,
  acceptLanguageHeader: string | null | undefined,
): Locale {
  const cookies = parseCookieHeader(cookieHeader);
  const fromCookie = cookies[LOCALE_COOKIE];
  if (isLocale(fromCookie)) return fromCookie;
  return localeFromAcceptLanguage(acceptLanguageHeader);
}
