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
- 未確認: イベントチェックイン関連(`event.ts`は`selectDistinctOn`のJS側重複排除への書き換え、Postgresエラーコード判定のD1エラーメッセージ判定への書き換え、GPS座標のPoint→JSON列変換など、今回の変更の中でもリスクが高い箇所)
