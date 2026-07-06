# verify — nafuda の動作検証レシピ

ログイン必須画面（`_protected` 配下）を含む UI 変更を、実際にブラウザで動かして検証する手順。

## 起動

```bash
pnpm dev   # http://localhost:5173（.env.local の dev DB = Neon に接続）
```

## 認証の突破（OAuth専用のため通常ログイン不可）

better-auth はセッションを DB 格納し、Cookie は
`better-auth.session_token = encodeURIComponent("{token}.{base64(HMAC-SHA256(BETTER_AUTH_SECRET, token))}")`。
つまり dev DB の `session` テーブルに行を挿し、`.env.local` の `BETTER_AUTH_SECRET` で署名すれば有効な Cookie を自作できる。

- 検証用データは `skytest_`/`_test_` 等の分かるプレフィックスを付けた合成ユーザー一式で作る（実ユーザーの行は触らない）
- 作成した ID はすべて JSON に控え、**終了後に FK 順（connections → events → personas → session → url_ids → user）で削除**し、残数 0 を確認する
- 動くシード/クリーンアップ例: 過去セッションのスクラッチパッド `seed-sky.mjs` / `cleanup-sky.mjs`（要点: `createRequire(REPO+"/package.json")` で repo の `@neondatabase/serverless` を借りて `neon(DATABASE_URL)` で直接 SQL）

## ブラウザ駆動

Playwright 未導入。**puppeteer-core（scratchpad に npm i）＋ システム Edge** を使う:

```js
puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" })
page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })  // モバイル基準（PC幅 1280 も確認）
page.setCookie({ name: "better-auth.session_token", value: cookieValue, url: "http://localhost:5173" })
```

- Cookie なしで保護ルート → 307 `/login?redirect=...`、あり → 200 が認証確認のスモーク
- PNG ダウンロード系（`a.click()`＋`toBlob`）の検証は CDP の download 捕捉が headless Edge で不安定。
  `HTMLAnchorElement.prototype.click` を横取り＋`URL.revokeObjectURL` を no-op にして blob を fetch → バイト列を保存して目視するのが確実
  （プロダクトコードは click 直後の同期 revoke で正しい。横取りで click を無効化した分の補正）

## 注意

- dev DB は共用（ADR-0017 の dev 環境）。シードは必ず消す
- `prefers-reduced-motion` は本プロジェクトでは特別扱いしない（アニメは常時動く）
