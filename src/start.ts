import { createStart, createMiddleware } from "@tanstack/react-start";

// CSRF 防御: 非GET/HEAD リクエストの Origin がアプリ自身の origin と一致するか検証する。
// セッション Cookie は SameSite=Lax のため大半のクロスサイト POST は届かないが、
// 兄弟サブドメイン（例: *.pages.dev）からの POST は Lax を貫通し得るため、ここで塞ぐ
// （auth-server-primitives スキルの推奨）。better-auth の /api/auth/* は server.tsx で
// startFetch より前に直接ハンドルされ、このミドルウェアの対象外（自前の CSRF 防御を持つ）。
//
// 照合先は環境変数ではなくリクエスト自身の origin（new URL(request.url).origin）。
// これで nafuda.me / nafuda-dxn.pages.dev / localhost を設定なしで自動的にカバーする。
// ブラウザはクロスオリジンの非GET fetch に必ず Origin を付け、JS から偽装・除去できない。
// よって「Origin があり、かつ一致しない」場合のみ拒否すれば、正規の同一オリジン操作を
// 一切壊さずに実害のあるクロスサイト POST を遮断できる。
const csrfMiddleware = createMiddleware().server(async ({ next, request }) => {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (origin) {
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).origin;
      } catch {
        originHost = null;
      }
      if (originHost !== new URL(request.url).origin) {
        throw new Error("Origin check failed");
      }
    }
  }
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}));
