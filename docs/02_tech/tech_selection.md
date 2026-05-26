# 技術選定

## 確定スタック（v1.0時点）

| 項目 | 選定 | 備考 |
|------|------|------|
| フレームワーク | TanStack Start v1 | React SSR・型安全なルーティング・Server Functions |
| パッケージマネージャー | pnpm | |
| デプロイ | Cloudflare Pages（Workers ランタイム） | SSR は Workers で動作。`wrangler.toml` は Pages設定、dev時は `wrangler-dev.toml`（Workers設定）を使う |
| DB | Neon Postgres + Drizzle ORM | HTTP モード。`point({ mode: 'xy' })` でGPS保存（x=経度, y=緯度） |
| 認証 | Better Auth | Google / Facebook OAuth。X OAuth は有料APIのため除外 |
| スタイリング | Tailwind CSS + shadcn/ui | |
| PWA | バニラJS Service Worker | `vite-plugin-pwa` は Workbox バンドル問題があったため不採用 |
| QRコード生成 | qrcode.react | フロントで生成。スキャンはデバイスのネイティブカメラを使用 |
| タグ入力 | emblor | |
| ボトムシート | react-modal-sheet | |
| バリデーション | Zod v4 | better-auth の要件 |
| フォーム | react-hook-form + @hookform/resolvers | Zod v4 対応済み |

---

## 重要な実装上の制約

**Cloudflare Workers / Pages**
- `nodejs_compat` フラグだけでは Cloudflare ダッシュボードの環境変数が `process.env` に入らない。`worker-entry.js` の fetch ハンドラ先頭で手動注入が必要。

**TanStack Start v1**
- `createAPIFileRoute` は存在しない。`createFileRoute` + `server.handlers` を使う。
- catch-all ルート（`$.ts`）では `server.handlers` が実行されない（`isExactMatch=false`）。`/api/auth/*` は `src/server.tsx` でインターセプトして `auth.handler()` に直接渡す。

**Better Auth**
- `tanstackStartCookies()` プラグインは TanStack Start コンテキスト外では使用不可。`server.tsx` から直接 `auth.handler()` を呼ぶ場合は `plugins: []` にする。
- `BETTER_AUTH_URL` には `https://` プレフィックスが必須。
- cookieCache は使用しない（Better Auth bug #4203 回避）。

---

## 今後の検討事項

- アプリ内 QR スキャン（現在はネイティブカメラ任せ）
- Cloudflare Hyperdrive（Workers 有料プラン時の DB 接続最適化）
- リアルタイム参加者更新（現在はポーリングまたは手動リロード）
