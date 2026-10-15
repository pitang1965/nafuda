import { getRequest } from "@tanstack/react-start/server";
import { resolveLocale } from "./detect";
import type { Locale } from "./types";

// サーバー関数・ローダーから呼ぶ専用。現在のリクエストの Cookie / Accept-Language から
// ロケールを決定する（ADR-0029: ロケールはURLに持たせずCookie／ヘッダーのみで決まる）。
// クライアントバンドルに混入させないこと（@tanstack/react-start/server はサーバー専用）。
export function getServerLocale(): Locale {
  const req = getRequest();
  return resolveLocale(
    req.headers.get("cookie"),
    req.headers.get("accept-language"),
  );
}
