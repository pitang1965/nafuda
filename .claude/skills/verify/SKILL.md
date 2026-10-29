# verify — nafuda の動作検証レシピ

ログイン必須画面（`_protected` 配下）を含む UI 変更を、実際にブラウザで動かして検証する手順。

## 起動

```bash
pnpm db:migrate   # ローカル D1 にマイグレーション適用（"No migrations to apply" なら最新）
pnpm dev          # http://localhost:5173（wrangler-dev.toml の DB = ローカル D1 / miniflare）
```

- DB は `.wrangler/state/v3/d1/` のローカル SQLite。SQL は
  `npx wrangler d1 execute nafuda-db-dev --local --config wrangler-dev.toml --command "..."`（`--file x.sql` / `--json` も可）
- dev サーバーは `run_in_background` で起動し、終わったら停止する

## 認証の突破（OAuth専用のため通常ログイン不可）

better-auth はセッションを DB 格納し、Cookie は
`better-auth.session_token = encodeURIComponent("{token}.{base64(HMAC-SHA256(BETTER_AUTH_SECRET, token))}")`。
つまりローカル D1 の `session` テーブルに行を挿し、`.dev.vars` の `BETTER_AUTH_SECRET` で署名すれば有効な Cookie を自作できる。

- `.dev.vars` / `.env*` は hook で出力がブロックされる。シークレットは Node スクリプト内で `fs.readFileSync` して使い、値は表示しない
  （変数名の確認は `grep -oE "^[A-Z_]+=" .dev.vars` を**単独コマンドで**。他コマンドと連結すると hook に弾かれる）
- 検証用データは `_test_` 等の分かるプレフィックスを付けた合成ユーザー一式で作る（実ユーザーの行は触らない）
- タイムスタンプ列は**エポック秒**（drizzle `mode: "timestamp"`）。最小シード（NOT NULL 列を満たす形）:

```sql
INSERT INTO user (id,name,email,email_verified,created_at,updated_at) VALUES ('_test_u','_test_','_test_@example.invalid',1,NOW,NOW);
INSERT INTO session (id,expires_at,token,created_at,updated_at,user_id) VALUES ('_test_s',NOW+3600,'TOKEN',NOW,NOW,'_test_u');
INSERT INTO url_ids (url_id,user_id,created_at) VALUES ('testxxxxxx','_test_u',NOW);
INSERT INTO personas (id,user_id,display_name,share_token,is_default,oshi_tags,dojin_reject,field_visibility,created_at,updated_at)
  VALUES ('UUID','_test_u','_test_なふだ','HEX32',1,'[]',0,'{}',NOW,NOW);
```

- Node 側で `token = randomBytes(24).hex`、`sig = createHmac("sha256", secret).update(token).digest("base64")`、
  Cookie 値 = `encodeURIComponent(token + "." + sig)`。SQL をファイルに書き出して `--file` で流す
- **終了後に FK 順（connections → event_checkins → events → personas → session → url_ids → user）で削除**し、
  `SELECT (SELECT COUNT(*) ...)+... AS left` で残数 0 を確認する

## ブラウザ駆動

Playwright 未導入。**puppeteer-core（scratchpad に npm i）＋ システム Edge** を使う:

```js
puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" })
page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })  // モバイル基準（PC幅 1280 も確認）
page.setCookie({ name: "better-auth.session_token", value: cookieValue, url: "http://localhost:5173" })
```

- Cookie なしで保護ルート → 307 `/login?redirect=...`、あり → 200 が認証確認のスモーク
- 初回の `page.goto` は Vite の依存最適化で遅い。`timeout: 120000` 程度を付ける
- `<input type="date">` は `page.type` が効かない。ネイティブ value setter で値を入れて `input`/`change` を dispatch する
  （react-hook-form の `register` が拾える）
- 送信後の結果は遷移先 URL（例 `/e/{32hex}`）で待つ。直後の DOM 読み取りは遷移前の画面を拾うことがある
- PNG ダウンロード系（`a.click()`＋`toBlob`）の検証は CDP の download 捕捉が headless Edge で不安定。
  `HTMLAnchorElement.prototype.click` を横取り＋`URL.revokeObjectURL` を no-op にして blob を fetch → バイト列を保存して目視するのが確実
  （プロダクトコードは click 直後の同期 revoke で正しい。横取りで click を無効化した分の補正）

## 注意

- ローカル D1 でもシードは必ず消す（後の検証や `db:studio` の目視を汚さない）
- staging / 本番 D1（`--remote`）には検証データを入れない
- `prefers-reduced-motion` は本プロジェクトでは特別扱いしない（アニメは常時動く）
