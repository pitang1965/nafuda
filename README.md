# なふだ

QRコードを見せるだけでSNSつながりができる、イベント特化型デジタル名刺アプリ。

アーキテクチャ的には、Cloudflare Pages 上の TanStack Start (React SSR) を基盤とし、リアルタイムな状態同期に Cloudflare Durable Objects を使用しています（Cloudflare Workers への移行は将来的に検討中。経緯は [ADR-0022](docs/adr/0022-realtime-via-durable-objects.md) を参照）。

## 技術スタック

- **フレームワーク:** TanStack Start v1 (React SSR)
- **デプロイ:** Cloudflare Pages + Workers
- **リアルタイム:** Cloudflare Durable Objects（コンパニオン Worker・WebSocket）
- **DB:** Neon Postgres + Drizzle ORM
- **認証:** Better Auth (Google / Facebook OAuth)
- **スタイル:** Tailwind CSS + shadcn/ui
- **アナリティクス:** PostHog（本番のみ・IP匿名化）

---

## セットアップ手順

### 1. パッケージインストール

```bash
pnpm install
```

### 2. 外部サービスの準備

#### Neon (データベース)

1. [Neon Console](https://console.neon.tech) でプロジェクトを作成
   - リージョン: **AWS Asia Pacific 1 (Singapore)**
2. 接続文字列を取得し `.env.local` の `DATABASE_URL` に記入する (pooler、`?sslmode=require` 付き)

#### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → 認証情報 → 認証情報を作成 → OAuth クライアントID
   - アプリケーションの種類: **ウェブアプリケーション**
2. 承認済みリダイレクトURIに以下を追加:
   - `http://localhost:3000/api/auth/callback/google` (開発環境)
   - `https://<your-project>.pages.dev/api/auth/callback/google` (本番環境)
3. クライアントIDとシークレットを `.env.local` の該当箇所に記入する

#### Facebook OAuth

1. [Facebook for Developers](https://developers.facebook.com/apps) → アプリを作成
   - アプリ名 (例: `nafuda`) を入力して [次へ]
   - 「ユースケースを追加」画面で **「Facebookログインでの承認及びユーザーデータのリクエスト」** をチェックして [次へ]
2. ユースケース → 「カスタマイズ」→ 有効なOAuthリダイレクトURIに追加:
   - `http://localhost:3000/api/auth/callback/facebook` (開発環境)
   - `https://<your-project>.pages.dev/api/auth/callback/facebook` (本番環境)
3. アプリの設定 → ベーシック の「アプリID」と「app secret」を `.env.local` の該当箇所に記入する
4. 公開前にアプリを**ライブモード**へ切り替え（開発モードはテストユーザーのみ有効）

#### LINE OAuth

better-auth ビルトインの social ではなく `genericOAuth` で実装しているため、**コールバックのパスに `oauth2` が入る**点に注意（Google/Facebook とは異なる）。

1. [LINE Developers Console](https://developers.line.biz/console/) で **LINE Login チャンネル**を作成（プロバイダー配下）
2. チャンネルの **「LINE Login」タブ → Callback URL** に以下を登録（1チャンネルに改行区切りでまとめて登録可）:
   - `http://localhost:5173/api/auth/oauth2/callback/line` (開発環境)
   - `https://staging.nafuda-dxn.pages.dev/api/auth/oauth2/callback/line` (ステージング)
   - `https://nafuda.me/api/auth/oauth2/callback/line` (本番環境)
3. **email を取得するには「Email address permission」の審査通過が必須**（チャンネル設定から申請）。未通過だと `email_is_missing` でログイン失敗する。
4. Channel ID と Channel secret を `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` に設定（設置先は `.env.example` 参照）

#### PostHog (アナリティクス)

1. [posthog.com](https://posthog.com) でプロジェクトを作成（US Cloud を選択）
2. Project Settings → Project API Key で `phc_...` で始まるキーを取得
3. `wrangler.toml` の `[vars]` セクションの `VITE_POSTHOG_KEY` に記入
   - `*.pages.dev` ドメイン（Preview/Staging）では自動的に無効になります

#### Cloudflare Pages (デプロイ時)

1. Cloudflare Dashboard → Workers & Pages → プロジェクトを作成 → GitHub リポジトリと連携
2. 本番環境変数（Production）を Settings → Environment Variables で設定
3. ステージング環境は `staging` ブランチへのプッシュで自動生成される Preview URL を使用

### 3. 環境変数の設定

`.env.local` をプロジェクトルートに作成:

```env
# Neon Postgres
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=<openssl rand -base64 32 で生成>
BETTER_AUTH_URL=http://localhost:3000
VITE_BETTER_AUTH_URL=http://localhost:3000  # ローカル開発のみ。本番は auth-client.ts の fallback を使用

# Google OAuth
GOOGLE_CLIENT_ID=<Google Cloud Consoleで取得>
GOOGLE_CLIENT_SECRET=<Google Cloud Consoleで取得>

# Facebook OAuth
FACEBOOK_CLIENT_ID=<Facebook for Developersで取得>
FACEBOOK_CLIENT_SECRET=<Facebook for Developersで取得>

# LINE OAuth (LINE Login チャンネルの Channel ID / secret)
LINE_CLIENT_ID=<LINE Developers Consoleで取得>
LINE_CLIENT_SECRET=<LINE Developers Consoleで取得>

# PostHog (wrangler.toml の [vars] に記載するため .env.local は不要)
# VITE_POSTHOG_KEY=phc_<PostHogで取得>
```

> `.env.local` はGit管理外です。シークレットをコミットしないでください。
>
> **どの変数を・どこに設定するかの正本は [`.env.example`](./.env.example) を参照。** ローカル開発のアプリ実行時の秘密は workerd が読む `.dev.vars` に、staging/本番の実行時の変数は Cloudflare Pages ダッシュボード（Preview/Production）に設定する。`.env.staging` / `.env.production` は drizzle マイグレーション用に `DATABASE_URL` のみを保持する。

### 4. データベースのセットアップ

マイグレーションとは「どんなテーブルを作るか」をSQLファイルに書き出し、それをDBに適用する作業です。
このプロジェクトでは Better Auth 用のテーブルとアプリ独自のテーブルを別々に生成してから、まとめて Neon に適用します。

```bash
# Better Auth が必要とするテーブル (user, session, account など) の
# マイグレーションSQLファイルを drizzle/ フォルダに生成する
pnpm auth:generate

# アプリ独自のテーブル (personas, url_ids, sns_links) の
# マイグレーションSQLファイルを drizzle/ フォルダに生成する
pnpm db:generate

# 上で生成したすべてのSQLファイルを Neon に実行し、実際にテーブルを作成する
# (DATABASE_URL が正しく設定されている必要があります)
pnpm db:migrate
```

> `auth:generate` と `db:generate` はローカルにファイルを生成するだけで、DBには何も変更しません。
> `db:migrate` を実行して初めて Neon 上にテーブルが作成されます。

---

## 開発コマンド

```bash
pnpm dev          # 開発サーバー起動 (localhost:3000)
pnpm build        # 本番ビルド
pnpm db:generate  # Drizzleマイグレーションファイルを生成
pnpm db:migrate   # マイグレーションをNeonに適用
pnpm db:studio    # Drizzle Studio (DBブラウザ) を起動

pnpm realtime:deploy:staging  # realtime コンパニオンWorkerを staging へデプロイ
pnpm realtime:deploy:prod     # realtime コンパニオンWorkerを本番へデプロイ
pnpm realtime:tail:staging    # realtime Worker (staging) のログを表示
pnpm realtime:tail:prod       # realtime Worker (本番) のログを表示
```

> realtime コマンドは `node_modules` のローカル `wrangler` を使うため npx 不要です。
> wrangler を直接叩く場合は `pnpm exec wrangler ...` を使ってください（グローバルインストールは不要）。

---

## デプロイ

### 本番（master ブランチ）

GitHub の `master` ブランチへのプッシュで Cloudflare Pages が自動デプロイします。

### ステージング（staging ブランチ）

`staging` ブランチへのプッシュで Cloudflare Pages Preview URL（`https://staging.nafuda-dxn.pages.dev`）に自動デプロイします。

- アナリティクスは `*.pages.dev` ドメインでは自動無効
- OAuth コールバック URL を Google / Facebook に登録する必要あり

### 環境変数の管理

| 変数 | 管理場所 |
|---|---|
| `VITE_POSTHOG_KEY` | `wrangler.toml` の `[vars]`（クライアント公開鍵のためコミット可） |
| `VITE_REALTIME_URL` / Service Binding `REALTIME` | `wrangler.toml`（下記「リアルタイム通信」参照） |
| `REALTIME_SECRET` / `INTERNAL_PUSH_SECRET` | Cloudflare Dashboard（Pages）＋ コンパニオンWorker（secret） |
| その他のシークレット | Cloudflare Dashboard → Environment Variables |

---

## リアルタイム通信 (Durable Objects)

QR接続検知（「つながりました」通知）とイベント参加者一覧の更新を WebSocket でリアルタイム化しています。設計の経緯と判断は [ADR-0022](docs/adr/0022-realtime-via-durable-objects.md) を参照。

### 構成

- **コンパニオン Worker**（`realtime/`）— Durable Object を持つ、本体（Pages）とは別デプロイの Worker。Cloudflare Pages からは Durable Object クラスを定義（export）できないため、独立した Worker として上げ、Service Binding で連携する。
  - `PersonaChannel`（room=`persona:<id>`）— 本人宛の通知（QR接続成立など）
  - `EventRoom`（room=`event:<id>`）— イベント参加者一覧の更新通知（presence）
  - 中継ロジックは共通基底 `BroadcastRoom`（標準 WebSocket API）に集約。
- **認証** — 本体が HMAC 署名した短命チケットを発行し、Worker は署名を検証するだけ（DB・セッションを持たない）。サーバー→Worker の push は Service Binding（内部シークレット）経由。
- **正本は Postgres** — Worker は状態を持たない中継で、クライアントは (再)接続のたびに正本を読み直して収束する（reconcile-on-connect）。`VITE_REALTIME_URL` 未設定の環境では realtime を使わず**従来のポーリングへ自動縮退**する。

### 環境変数・シークレット

| 変数 | 役割 | 設定場所 |
|---|---|---|
| `VITE_REALTIME_URL` | クライアントの WS 接続先（`wss://...workers.dev`・ビルド時変数） | `wrangler.toml`（本番=top-level `[vars]` / staging=`[env.preview.vars]`） |
| Service Binding `REALTIME` | 本体→Worker の内部呼び出し | `wrangler.toml`（本番=top-level `[[services]]` / staging=`[env.preview]`） |
| `REALTIME_SECRET` | チケットの署名・検証（本体とWorkerで共有） | **Pages**（Production/Preview の secret）＋ **コンパニオンWorker**（secret） |
| `INTERNAL_PUSH_SECRET` | push の内部呼び出し検証 | 同上 |

> `REALTIME_SECRET` / `INTERNAL_PUSH_SECRET` は本体とWorkerで**同じ値**を設定する。staging と本番は**別の値**にする。

### デプロイ手順

```bash
# 1. コンパニオンWorkerをデプロイ（Durable Object と migration が作られる）
pnpm realtime:deploy:staging   # staging: nafuda-realtime-staging
pnpm realtime:deploy:prod      # 本番:    nafuda-realtime

# 2. Worker にシークレットを投入（対話式・同じ値を Pages 側にも設定する）
pnpm exec wrangler secret put REALTIME_SECRET --config realtime/wrangler.toml --env=""            # staging
pnpm exec wrangler secret put INTERNAL_PUSH_SECRET --config realtime/wrangler.toml --env=""        # staging
pnpm exec wrangler secret put REALTIME_SECRET --config realtime/wrangler.toml --env production      # 本番
pnpm exec wrangler secret put INTERNAL_PUSH_SECRET --config realtime/wrangler.toml --env production # 本番

# 3. Pages 側のシークレットをダッシュボードで設定
#    Pages → 設定 → 変数とシークレット → Production / Preview に
#    REALTIME_SECRET と INTERNAL_PUSH_SECRET を上と同じ値で設定

# ログ確認
pnpm realtime:tail:prod
```

> ⚠️ デプロイ後の動作確認は **シークレットウィンドウ**で行う（PWA の Service Worker が旧JSをキャッシュし、通常ウィンドウでは realtime が有効化されないことがあるため）。
>
> 後戻りが必要な場合は `wrangler.toml` の top-level realtime 設定（`[[services]]` と `VITE_REALTIME_URL`）を外して再デプロイすれば、本番は従来のポーリングへ戻ります（DB変更はありません）。
