# なふだ

QRコードを見せるだけでSNSつながりができる、イベント特化型デジタル名刺アプリ。

## 技術スタック

- **フレームワーク:** TanStack Start v1 (React SSR)
- **デプロイ:** Cloudflare Workers
- **DB:** Neon Postgres + Drizzle ORM
- **認証:** Better Auth (Google / Facebook OAuth)
- **スタイル:** Tailwind CSS + shadcn/ui

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

#### Cloudflare Workers (デプロイ時)

1. Cloudflare Dashboard → マイプロフィール → APIトークン → トークンを作成 (Workers:Edit権限)
2. (Workers有料プランの場合) Workers & Pages → Hyperdrive → 設定を作成 → NeonのPostgresに向ける
   - HyperdriveのIDを `wrangler.toml` の `[[hyperdrive]]` セクションに記入

### 3. 環境変数の設定

`.env.local` をプロジェクトルートに作成:

```env
# Neon Postgres
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=<openssl rand -base64 32 で生成>
BETTER_AUTH_URL=http://localhost:3000
VITE_BETTER_AUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=<Google Cloud Consoleで取得>
GOOGLE_CLIENT_SECRET=<Google Cloud Consoleで取得>

# Facebook OAuth
FACEBOOK_CLIENT_ID=<Facebook for Developersで取得>
FACEBOOK_CLIENT_SECRET=<Facebook for Developersで取得>
```

> `.env.local` はGit管理外です。シークレットをコミットしないでください。

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
```

---

## デプロイ

```bash
pnpm build
npx wrangler deploy
```

本番環境の環境変数は Cloudflare Dashboard → Workers & Pages → 設定 → 環境変数 で設定してください。
