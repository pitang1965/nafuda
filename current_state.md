# なふだ — 現在の進捗・既知の問題・仕様まとめ

作成日: 2026-04-28

---

## 全体進捗

| フェーズ | 内容 | 状態 |
|---------|------|------|
| Phase 0 | プロトタイプ（モックデータ・認証なし） | 完了 2026-04-22 |
| Phase 1 | 認証・プロフィール基盤 | 完了 2026-04-25 |
| Phase 2 | イベント・チェックイン | 完了 2026-04-26 |
| Phase 3 | QR・コネクション・PWA | 完了 2026-04-27（※本番デプロイの修正は 2026-04-28） |

ロードマップ上の全フェーズが実装済み。

---

## 直近の修正（2026-04-28 本番デプロイ問題の解消）

Phase 3 完了後、本番（`https://nafuda-dxn.pages.dev`）で複数の問題が発生した。すべて解決済み。

### 解決済み問題一覧

| 問題 | 原因 | 修正ファイル・コミット |
|------|------|----------------------|
| `pnpm dev` が HTTP 404 を返す | `wrangler.toml` が Pages 設定のため SSR ミドルウェアが起動しない | `wrangler-dev.toml` 追加、`vite.config.ts` で serve 時のみ使用（`6bedbd5`） |
| ログインボタンを押しても何も起きない | `authClient.signIn.social()` のエラーを無視していた | `login.tsx` にエラーハンドリング追加（デバッグコードは後で削除済み `0440b23`） |
| `process.env` が空（env 変数が読めない） | `nodejs_compat` だけでは Cloudflare ダッシュボードの env が `process.env` に入らない | `worker-entry.js` で `env` オブジェクトを手動注入（`8888792`） |
| `BETTER_AUTH_URL`: Invalid URL | 値に `https://` プレフィックスなし | Cloudflare ダッシュボードで手動修正（ユーザー操作） |
| `/api/auth/*` へのリクエストが 500 | TanStack Router の catch-all ルート（`$.ts`）では `isExactMatch=false` になり `server.handlers` が実行されない | `src/server.tsx` で `/api/auth/*` をインターセプト（`3e96c61`） |
| OAuth コールバックで白紙ページ | `tanstackStartCookies()` プラグインが TanStack Start コンテキスト外（`server.tsx` 直接呼び出し）で動作不可 | `src/server/auth.ts` の `plugins: []` に変更（`1375da1`） |

### 現在の本番状態
- Google ログイン: **動作確認済み**（2026-04-28）
- Facebook ログイン: 未確認（実装済みだが本番テスト未実施）

---

## 未解決・要確認事項

### 1. Facebook ログインの本番確認
- 実装済み（`src/routes/login.tsx`、`src/server/auth.ts`）
- 本番（`https://nafuda-dxn.pages.dev`）でのログインテストが未実施

### 2. PWA 実機検証（人間が必要）
- **PWAインストールバナー**: Chrome/Android で `beforeinstallprompt` が発火してバナーが表示されるか
- **iOS Safari インストール案内**: iPhone Safari でホーム画面追加の案内テキストが表示されるか
- **機内モードでの QR 表示**: Service Worker キャッシュにより `/me` がオフラインで表示されるか

プログラム的な検証が不可能なため、実機での手動確認が必要。

---

## プロトタイプで決めた仕様（実装済み）

### アプリ概要
**なふだ** — 推し活ユーザー向け文脈型デジタル名刺アプリ。QR を見せるだけで SNS リンクが共有でき、イベントの場でのコネクションをコンテキスト付きで記録できる。

### 認証
- Google OAuth / Facebook OAuth のみ（X OAuth は有料 API のため除外）
- セッション: DB 保存、30 日間有効、1 日ごと更新
- cookieCache は使用しない（Better Auth bug #4203 回避）

### プロフィール（ペルソナ）
- 1 ユーザーが複数ペルソナを持てる
- フィールド: ハンドルネーム・表示名・アバター・bio・SNS リンク（X/Instagram/etc）・推し/ジャンルタグ
- フィールド単位で公開/非公開を設定できる
- 同担拒否フラグ: ON にするとイベント参加者一覧から自分が非表示になる

### QR・コネクション
- QR URL: `/u/{urlId}/p/{shareToken}` 形式
- `shareToken` はプロフィール参照用、`urlId` は公開識別子（コネクション記録に使用）
- QR スキャン自体ではコネクションは記録されない。相手が「つながる」ボタンを押した時のみ記録
- チェックイン中に「つながる」を実行するとイベント名・会場・日付がコネクション記録に付与される
- コネクション一覧: `/connections`（`/me` とは独立したページ）

### イベント
- イベント: スラッグ（UNIQUE）・イベント名・会場名・日付
- チェックイン: 1 ペルソナ同時に 1 イベントのみアクティブ（新チェックイン時に前のチェックアウトを自動記録）
- 参加者一覧はアクティブ/過去の両方を表示（`isNull(checkedOutAt)` フィルタなし）

### PWA
- `/me` ルートを Service Worker でキャッシュ（NetworkFirst 戦略）
- 静的アセットは CacheFirst
- Chrome/Android: `beforeinstallprompt` でバナー表示
- iOS Safari: `standalone` 検出でテキスト案内表示

---

## 重要な実装メモ（ハマりやすい箇所）

```
# TanStack Start v1.167 での API ルート
- createAPIFileRoute は存在しない → createFileRoute + server.handlers を使う
- catch-all ルート($.ts)では server.handlers が実行されない（isExactMatch=false）
  → /api/auth/* は src/server.tsx でインターセプトして直接 auth.handler() に渡す

# Cloudflare Workers / Pages
- nodejs_compat では process.env に env バインディングが入らない
  → worker-entry.js の fetch ハンドラ先頭で手動注入
- dev 時は wrangler-dev.toml（Workers 設定）を使う。wrangler.toml は Pages 設定なので SSR が動かない

# better-auth
- tanstackStartCookies() プラグインは TanStack Start コンテキスト外では使用不可
  → server.tsx から直接 auth.handler() を呼ぶ場合は plugins: [] のままにする
- BETTER_AUTH_URL には必ず https:// プレフィックスをつける

# DB
- Drizzle ORM + Neon Postgres（HTTP モード）
- point({ mode: 'xy' }) で GPS 保存（x=経度、y=緯度）
- connections は一方向設計（双方向 = 2 行）
- 23505 UNIQUE 違反は alreadyConnected: true で返す（エラーではない）

# フロントエンド
- zod は v4（better-auth 要件）。ただし @hookform/resolvers は zod v4 に対応済み
- verbatimModuleSyntax 削除済み → isolatedModules を使用
- emblor でタグ入力
- react-modal-sheet でボトムシート
```

---

## ローカル開発環境

```bash
pnpm dev        # http://localhost:5173
pnpm build      # dist/ に出力
pnpm db:migrate # Neon へのマイグレーション実行
```

`.env.local` に必要な変数:
- `DATABASE_URL` — Neon 接続文字列
- `BETTER_AUTH_URL=http://localhost:5173`
- `VITE_BETTER_AUTH_URL=http://localhost:5173`（ローカル開発のみ。本番は auth-client.ts の fallback `https://nafuda.me` を使用）
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`

## 本番環境

- URL: `https://nafuda-dxn.pages.dev`
- ホスティング: Cloudflare Pages
- エントリポイント: `worker-entry.js` → `dist/server/server.js`（TanStack Start SSR）
- 環境変数: Cloudflare Pages ダッシュボードで設定（`BETTER_AUTH_URL=https://nafuda-dxn.pages.dev` など）
