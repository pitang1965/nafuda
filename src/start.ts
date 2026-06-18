import { createStart, createCsrfMiddleware } from "@tanstack/react-start";

// CSRF 防御: server function（同一オリジン RPC）へのクロスサイトリクエストを遮断する。
// TanStack Start 組み込みの createCsrfMiddleware を使用。Sec-Fetch-Site → Origin →
// Referer の多段で検証し、いずれのシグナルも無いリクエストは既定で拒否する（403）。
// 失敗時は 403 Forbidden を返す。
//
// filter で handlerType === 'serverFn' に限定しているのは、ページ遷移などの GET も含む
// 全リクエストに適用すると cross-site なトップレベル遷移（他サイトからの正規リンク流入で
// Sec-Fetch-Site: cross-site）まで弾いてしまうため。アプリの変更系は全て server function
// 経由（アバターアップロード含む）なので、これで実質すべての書き込みが保護される。
// better-auth の /api/auth/* は server.tsx で startFetch より前に直接ハンドルされ、本ミドル
// ウェアの対象外（自前の CSRF 防御を持つ）。将来 server function 以外の非GETルートを追加した
// 場合は、この filter を広げること。
//
// 経緯: 以前は createMiddleware で自作した Origin 一致チェックを使っていたが、Sec-Fetch-Site
// 非対応・Origin ヘッダ欠如時に素通しという弱点があったため、より堅牢な組み込み版へ移行した。
// docs/adr 参照。
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}));
