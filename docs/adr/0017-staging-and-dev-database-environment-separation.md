# ADR-0017: staging / dev / 本番のDB・ストレージ環境分離

- **ステータス**: 採用
- **決定日**: 2026-06-18

## 背景

開発中に本番DBを直撃する事故が起きた。ローカルでテスト用のなふだを削除したところ、なふだ削除のカスケード（コネクション・SNSリンク・ギャラリー写真などを連鎖削除する設計）が本番DBの実データにまで及び、テスト用でない実なふだまで消えた（復元済み）。

原因はDB接続の配線にあった。事故当時、3つの経路がすべて同一の本番 Neon DB（`neondb`）を向いていた。

| 経路 | 読む設定 | 向き先 |
|---|---|---|
| アプリ実行（`pnpm dev`） | `.dev.vars` | 本番 Neon |
| マイグレーション（`drizzle-kit`） | `.env.local` | 同じ本番 Neon |
| 本番（Cloudflare Pages） | ダッシュボード変数 | 同じ本番 Neon |

調査の過程で、当初「ローカルの削除が本番R2画像も物理削除している」と想定したが、これは誤りと判明した。`vite.config.ts` の `@cloudflare/vite-plugin` は `serve` 時に R2 バインディングを Miniflare のローカル擬似ストレージで動かすため、ローカルの R2 操作は最初からリモート本番バケットに到達していなかった。「開発環境で画像をアップロードしても表示されない」のは、アップロード先がローカル Miniflare なのに `<img>` の URL は `R2_PUBLIC_URL`（リモート `r2.dev`）を指すという不一致が理由であり、本番直撃ではない。**つまり今回の本番直撃は DB のみが経路だった。**

## 問題

再発防止のために本番を検証作業から隔離したい。一方で、画像アップロードのように Miniflare ローカルでは確認しづらい機能を、本番に触れずに実機検証できる場所も欲しい。「単に dev 用DBを作る」だけでなく、検証環境（staging）と日常開発環境（dev）の両方を本番から切り離す構成を決める必要があった。

## 決定

**本番 / staging / dev の3環境に分離する。** 各論は以下。

### 1. DB は Neon ブランチで3分割
`main`（本番）から `staging` / `dev` ブランチを切る。**一般公開前の今**作成するため、コピーされるデータは自分とテスト協力に同意した友人のみで、第三者PIIの実害はない。Neon ブランチは作成時点のスナップショットで、以後本番へ登録される新規ユーザーは `main` にのみ入り、staging/dev ブランチには流れ込まない。

### 2. ローカル開発を dev ブランチへ向ける（事故対策の核心）
`.dev.vars`（アプリ実行）と `.env.local`（マイグレーション）の `DATABASE_URL` を dev ブランチへ変更する。これにより日常の `pnpm dev` と `pnpm db:migrate` が本番DBを叩かなくなる。

### 3. マイグレーションは環境切替方式・本番は明示のみ
`drizzle-kit` は接続文字列を1つしか読まない。`.env.local` の既定を dev に向け、`db:migrate:dev` / `db:migrate:staging` / `db:migrate:prod` を分け、**dev で確認 → staging → 最後に本番**の順で手動適用する。素の `pnpm db:migrate` は dev を指すため、本番への意図しない適用が構造的に起きない。

### 4. staging は Cloudflare Pages の Preview 環境
`staging` ブランチを push すると `staging.nafuda-dxn.pages.dev` に自動デプロイされる。新規 Pages プロジェクトは作らず、Preview 環境の変数・バインディングで staging 用設定を与える。

### 5. R2 は staging だけ新バケット
本番は `nafuda-avatars` 据え置き。staging 用に `nafuda-avatars-staging` を新設し、Preview 環境の R2 バインディングと `R2_PUBLIC_URL` をそこへ向ける。これで staging が実機の R2 を使いつつ本番画像に触れない。**ローカル dev は Miniflare ローカルのまま**変更しない（既に隔離されており、安全のための新バケットは不要。画像表示はどのみちローカルでは不可）。

### 6. 認証は本番リソースを流用
OAuth アプリ（Google/Facebook）と `BETTER_AUTH_SECRET` は本番と同じものを流用し、OAuth コンソールに staging のリダイレクトURI（`https://staging.nafuda-dxn.pages.dev/api/auth/callback/{google,facebook}`）を追加する。`BETTER_AUTH_URL` は Preview 環境変数で、`VITE_BETTER_AUTH_URL` は**ビルド時変数**として staging URL を焼き込む（未設定だと `auth-client.ts` の fallback `https://nafuda.me` に落ち、staging フロントが本番認証へPOSTしてしまうため）。CSRF（`src/start.ts`）は同一オリジン検証でホスト非依存のため変更不要。

## 検討した代替案

- **dev 用DBだけ作る（当初案）**: 日常開発の本番直撃は防げるが、画像など実機検証の場が無いまま。staging を加えることで「ローカル＝ロジック確認／staging＝実機確認」の役割分担が成立する。
- **staging を別 Pages プロジェクトで新設**: `feature/*` ブランチと完全分離できるが、GitHub連携・変数・バインディングの二重管理になる。個人開発で staging の用途は「master マージ前の確認」に限られるため、Preview 環境1つで足りると判断。代償として `feature/*` も Preview 設定（staging DB）を共有する。
- **Neon を別プロジェクトで分離**: 完全独立だが課金・接続管理が分かれる。ブランチなら無料枠・即時作成・本番スキーマと同期しやすい。
- **ローカル dev にも専用R2バケットを bind**: Miniflare で既に隔離されており安全上は不要。bind 先を変えてもローカル画像表示は実現しないため、変更しない。

## 結果・トレードオフ

- 日常の `pnpm dev` / `pnpm db:migrate` が本番に触れなくなり、今回と同型の事故が構造的に塞がれる。
- マイグレーションは各ブランチへ個別適用が必要になり、ブランチは作成後に親（本番）と独立して drift する。適用順の規律（dev→staging→本番）を運用で守る必要がある。
- `feature/*` ブランチの Preview デプロイは staging の DB・R2・設定を共有する。完全分離が必要になったら別 Pages プロジェクト化を再検討する。
- staging を将来「最新の本番データ」で作り直す（ブランチリセット）場合は、その時点の実ユーザーPIIがコピーされるため、PII の扱いを改めて意識する。
- 画像アップロードの実機確認はローカルでは行えず staging に依存する。ローカルは Miniflare のローカル擬似R2のまま。
