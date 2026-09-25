# ADR-0028: Neon Postgres → Cloudflare D1 移行

- **ステータス**: 進行中
- **決定日**: 2026-09-24

## 背景

本番の公開なふだページ(`/u/{urlId}/p/{token}`)が不定期に数十秒〜数分応答なしになり、最終的に500エラーになる障害が発生した。調査の結果:

- `neonConfig.pipelineConnect = false` による対処(neondatabase/serverless#209のワークアラウンド)は、なふだが使っている`neon()`のHTTPモードには効果が無いコードパスだったと判明(#209はWebSocket/`Pool`/`Client`経由の話)
- `neon()`の実装は`fetch()`一発の薄いラッパーであり、根本原因はCloudflare WorkersのfetchとNeonのHTTPエンドポイント間通信のハングという、外部から確定させにくい領域にあると判断
- 実測でウォーム状態でも応答が2.7秒〜21.8秒とばらつき、Neonの有料プラン(Launch, $19/月, Always-on)でもこの変動要因(Workers↔Neon間のネットワーク往復・TLSハンドシェイクのコスト)は解消できないと判断

なふだは最近、あらゆる場所で引用していたlinktr.eeのリンクをすべてこのなふだに置き換えており、信頼性が実質的な要件になった。「3秒以内に表示したい」という要件を、課金なしで満たす必要がある。

## 決定

**Cloudflare D1(SQLite)へ移行する。** WorkersとD1は同じCloudflareのエッジ基盤上で動くため、外部DBへのネットワークホップ自体が無くなる。D1の無料枠(1日500万読み取り/10万書き込み/5GB)はなふだの実トラフィックに対して十分すぎる余裕があり、課金は発生しない。

詳細な技術判断(スキーマ型マッピング、Better Authのアダプタ切替、D1の制約と回避策)は移行計画([C:\Users\pitan\.claude\plans\jazzy-crunching-whale.md](C:/Users/pitan/.claude/plans/jazzy-crunching-whale.md)、承認済み)を参照。要点:

- スキーマは`pgTable`→`sqliteTable`。uuid→text+`crypto.randomUUID()`、timestamp→integer(unixepoch)、boolean/jsonb/array→integer or JSON列に変換
- DBクライアントは接続文字列方式(`process.env.DATABASE_URL`)から、Cloudflareの`env.DB`バインディング方式(`getDb()`、リクエストごとに呼ぶ)へ変更。既存の`storage.ts`のR2バインディングパターンを踏襲
- D1にはトランザクションが無い(`db.batch()`のみ)。Better Authには`transaction: false`を渡す
- D1にはNeonのようなブランチ機能が無い。dev/staging/prodは**別々のD1データベース**を作成し、マイグレーションを個別適用する方式にする(ADR-0017の「本番から隔離する」目的は維持するが、「ブランチで本番スキーマと同期しやすい」利点は失う)
- `oshi.ts`のPostgres専用生SQL(`UNNEST`+`ILIKE`)はSQLiteの`json_each()`+`LIKE`に書き換え
- `event.ts`の`selectDistinctOn`(Postgres専用)はJS側の重複排除に、一意制約違反のエラーコード判定(`23505`)はD1のエラーメッセージ判定に書き換え

## 検討した代替案

- **Neon有料プラン(Launch, $19/月, Always-on)**: cold start由来の遅延は消せるが、実測でウォーム状態でも2.7〜21.8秒のばらつきが残っており、Workers↔Neon間のネットワーク往復コスト自体は解消できないため「3秒以内」を保証できないと判断し見送り
- **VPSへの自前DB移行**: tabi.over40web.clubで実施した前例はあるが、なふだはCloudflare Workers上で動くためTCP接続にHyperdriveの再導入が必要になり、Neonのブランチ分離という安全機構も失う。構成変更のコストに対してリターンが小さいと判断し見送り

## 結果・トレードオフ(移行完了後に追記)

- (Phase 1〜3完了後、実際の応答時間・運用上の摩擦をここに記録する)

---

## 実施ログ

### 2026-09-24: Phase 1着手(コード変更)

- `schema.ts`をSQLite/D1向けに全面書き換え
- `client.ts`を`env.DB`バインディング方式(`getDb()`)に再設計
- `auth.ts`のBetter Authアダプタを`provider: 'sqlite', transaction: false`に変更
- `profile.ts` / `event.ts` / `connection.ts` / `gallery.ts` / `avatar.ts` / `realtime.ts` / `favorite.ts` / `oshi.ts` / `server.tsx` の`db`呼び出しをすべて`getDb()`パターンに変更
- `oshi.ts`の`UNNEST`+`ILIKE`を`json_each()`+`LIKE`に書き換え
- `event.ts`の`selectDistinctOn`をJS側重複排除に、Postgresエラーコード判定をD1エラーメッセージ判定に書き換え
- `gallery.ts`の並び替えを`Promise.all`から`db.batch()`に変更
- `drizzle.config.*.ts`をD1(`dialect: 'sqlite'`, `driver: 'd1-http'`)向けに変更
- `wrangler.toml` / `wrangler-dev.toml`に`[[d1_databases]]`バインディングを追加(database_idは作成後に埋める)
- `package.json`の`db:migrate:*`を`wrangler d1 migrations apply`ベースに変更、`@neondatabase/serverless` / `pg` / `@types/pg`を削除
- `npx tsc -b` でエラーなしを確認

### 2026-09-24: dev用D1データベース作成

- `npx wrangler d1 create nafuda-db-dev` 実行、`wrangler-dev.toml`に`database_id`を反映(binding名は`DB`のまま、本番用`wrangler.toml`は未変更のままであることを確認済み)
- ローカル開発でリモートD1に繋ぐかの確認プロンプトは **N(ローカルのミニフレアエミュレーションを使う)** で回答(ADR-0017の「ローカル開発は実クラウドに触れない」方針に合わせる)

### 2026-09-24: 初回マイグレーション生成・適用(dev)

- `drizzle/`配下のPostgres時代のマイグレーション(20ファイル)を`drizzle-postgres-archive/`へ退避(方言がsqliteに変わり流用不可のため)
- `pnpm db:generate` で現行スキーマから初回マイグレーション`0000_overjoyed_vanisher.sql`を生成、15テーブル全てが正しく出力されたことを確認
- `wrangler d1 migrations apply` は既定で`./migrations`を見るため、drizzle-kitの出力先`./drizzle`に合わせて`wrangler.toml`・`wrangler-dev.toml`の`[[d1_databases]]`ブロックに`migrations_dir = "drizzle"`を追加(本番・staging・devの3箇所とも)
- `npx wrangler d1 migrations apply nafuda-db-dev --local --config wrangler-dev.toml` 実行、27コマンド成功・dev用ローカルD1にスキーマ作成完了

### 2026-09-24: ローカルdevでの疎通確認

- `pnpm dev` 起動(http://localhost:5173)。ルート・ログインページは200 OKで正常表示
- 存在しないshareTokenで`/u/test/p/...`にアクセスし、`getPublicProfile`がD1へ実クエリを発行 → 「なふだが見つかりません」を0.86秒で正常返却したことを確認。`getDb()`によるD1バインディング接続がローカルで機能していることを確認できた
- 未確認: 実際のログイン(Google/Facebook/LINE OAuth)を伴うなふだ作成・編集・イベントチェックイン等のCRUD一式。OAuthフローはこちらから自動操作できないため、ブラウザでの手動UATが必要

### 2026-09-25: ローカルdevでの手動UAT(ユーザー実施)

- Google/Facebook/LINEの3種類のSNSログイン、ログアウト、なふだ作成、SNSリンク編集、テーマ変更、なふだリンクを確認 → 全て正常動作
- 未確認: イベントチェックイン関連(`event.ts`は`selectDistinctOn`のJS側重複排除への書き換え、Postgresエラーコード判定のD1エラーメッセージ判定への書き換え、GPS座標のPoint→JSON列変換など、今回の変更の中でもリスクが高い箇所)。GPS・QRスキャンが絡むため実機検証が必要と判断し、staging(実URL)での確認に切り替えることにした

### 2026-09-25: staging反映

- `npx wrangler d1 create nafuda-db-staging` 実行(APACリージョンに作成)、`wrangler.toml`の`env.preview.d1_databases`に反映
- `wrangler d1 migrations apply`が既定で`./migrations`を見るため、`migrations_dir = "drizzle"`を`wrangler.toml`(本番・preview)・`wrangler-dev.toml`の3箇所に追加
- `npx wrangler d1 migrations apply nafuda-db-staging --remote --env preview` 実行、27コマンド成功
- コミット(`fa49901`)・`staging`ブランチにpush → 自動デプロイ成功(`66bc9b41`, Active)
- staging URL(`https://staging.nafuda-dxn.pages.dev`)でルート・ログインページ200 OK、D1経由の公開プロフィールルートも1.74秒で正常応答を確認
- 次: イベントチェックイン・GPS・QRスキャン関連の実機UATをユーザーに依頼

### 2026-09-25: staging実機UAT(ユーザー実施)

- なふだのお気に入り登録、イベント作成→参加、参加の取りやめ、つながり(QR交換)、つながった場所の表示(GPS座標JSON列・MeetingSky)を確認 → 全て正常動作
- これでPhase 1(dev)・Phase 2(staging)のリスクの高い箇所(Better Auth、`selectDistinctOn`書き換え、GPS座標のPoint→JSON変換、D1エラーメッセージ判定)を含めて一通りの動作確認が完了。Phase 3(本番カットオーバー)に進める状態

### 2026-09-25: 本番データでのstagingリハーサル

Phase 3の本番カットオーバー前に、実際のNeon本番データでの変換ロジックを検証するため、まずstagingへ投入するリハーサルを実施(ユーザー判断: 小細工無しで全テーブルそのまま。`session`/`account`の実OAuthトークンもstagingに乗ることを許容)。

- `tmp/export-neon-to-d1.mjs`(使い捨て、`.env.production`のNeon接続情報を使用)でNeon本番の全15テーブルをSELECTし、型変換(boolean→0/1、Date→Unix epoch秒、jsonb/array→JSON文字列)しつつテーブルごとのINSERT文を生成
- 1回目の投入で`user`テーブルが一意制約違反(email)で失敗。原因はPhase 2のstaging UATで同じ実アカウントで既にログイン済みだったため、staging側に重複するuser行が先に存在していたこと。`session`/`account`もFK制約違反で連鎖失敗
- stagingの全15テーブルを一旦DELETEで空にしてから、FK順(user→personas→events→session→account→verification→url_ids→sns_links→nafuda_links→favorite_personas→gallery_photos→event_checkins→connection_qr_tokens→connections→pending_invites)で再投入
- `COUNT(*)`で全テーブルの件数がNeon本番と完全一致することを確認(user 21, personas 23, events 19, session 85, account 22, verification 0, url_ids 20, sns_links 36, nafuda_links 2, favorite_personas 4, gallery_photos 11, event_checkins 21, connection_qr_tokens 8, connections 7, pending_invites 1)
- 実データを含むエクスポート済みSQLファイルは投入後に削除済み(エクスポートスクリプト自体は`tmp/`に残し、本番カットオーバー時に再利用予定。その時点で改めて最新データをエクスポートし直す)
- ユーザーがstagingにログインし、なふだの内容が本番と同一であること、SNSリンクの機能、なふだマップ、つながり、イベントの表示を確認 → 全て正常。型変換ロジック(uuid/timestamp/boolean/jsonb/array/point)が実データで妥当であることが検証できた
- 残タスク: staging初期化の要否判断(未決定、緊急性なし)、Neon本番DBパスワードのローテーション(データ移行完了後に実施予定)
