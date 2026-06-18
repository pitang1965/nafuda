# ADR-0016: server function の CSRF 防御に TanStack Start 組み込みの createCsrfMiddleware を採用する

- **ステータス**: 採用
- **決定日**: 2026-06-18

## 背景

TanStack Start (`@tanstack/react-start` 1.168.x) の dev サーバー起動時に、次の警告が出るようになった。

```
TanStack Start server functions are not protected by the CSRF middleware.
```

このプロジェクトには既に `src/start.ts` に自作の CSRF ミドルウェアがあった。`createMiddleware()` で実装し、非GET/HEAD リクエストの `Origin` ヘッダがリクエスト自身の origin と一致するか検証する方式である（コミット `e6ff2ae`）。実装上、この自作ミドルウェアは `requestMiddleware` として登録されており、server function 実行時（`createStartHandler` 内、serverFnHandler の直前）にも確実に走ることをソースで確認した。**つまり server function は実際には保護されていた。**

警告は `hasCsrfMiddleware()` が「`csrfSymbol` を持つミドルウェアが存在するか」だけを判定しているために出る。`csrfSymbol` は組み込みの `createCsrfMiddleware` だけが付与するため、自作版では保護の有無に関わらず警告が出る。よって警告自体は **誤検知** である。

## 問題

誤検知だからと警告を抑制（`disableCsrfMiddlewareWarning: true`）して自作版を維持するか、組み込み版へ移行するかを決める必要があった。両者を読み比べると、防御力に実質的な差があった。

| 観点 | 自作（Origin一致のみ） | 組み込み `createCsrfMiddleware` |
|---|---|---|
| Sec-Fetch-Site | 見ない | 最優先でチェック（既定 `same-origin`） |
| Origin | チェック | チェック |
| Referer フォールバック | なし | あり（既定ON） |
| 3シグナルとも欠如 | 素通し | 既定で拒否 |
| 失敗時レスポンス | `throw` → 500 | 403 Forbidden |

組み込み版は Sec-Fetch-Site → Origin → Referer の多段防御で、シグナルが皆無のリクエストも既定で拒否する、一段堅牢な実装である。

カバレッジの差も検討した。自作版は「全非GET/HEAD」を対象とする一方、組み込みは `filter` で対象を絞る（推奨は `handlerType === 'serverFn'`）。しかし本アプリの変更系は**すべて server function 経由**（アバターアップロード `uploadAvatar` 含む）であり、`/api/auth/*` は `server.tsx` で startFetch より前に直接 better-auth がハンドル（独自CSRF）する。よって `filter: serverFn` でも実質的なカバレッジは落ちない。

## 決定

**自作 Origin 検証ミドルウェアを廃し、TanStack Start 組み込みの `createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })` を採用する。**

- より堅牢な多段防御（Sec-Fetch-Site / Origin / Referer）と、シグナル皆無リクエストの既定拒否、適切な 403 応答が得られる。
- `csrfSymbol` が付くため、警告も正規の方法で解消される（抑制フラグは使わない）。
- 全変更系が server function のため、`filter: serverFn` で実害なく置き換えられる。

## 検討した代替案

- **警告抑制 + 自作維持**: 最小変更だが、Sec-Fetch-Site 非対応・Origin 欠如時素通しという弱い防御のまま固定化される。誤検知への対処としては成立するが、より強い標準防御を捨てる理由がない。
- **両方併用**: 自作（500）と組み込み（403）が混在し挙動が読みにくく冗長。却下。

## 結果・トレードオフ

- server function 以外の非GETルートを将来追加した場合、`filter` を広げない限り CSRF 保護対象外になる。現状そのようなルートは無く、追加時に filter を拡張すれば足りる（`start.ts` のコメントに明記済み）。
- 失敗時の応答が 500 から 403 に変わる。意味的により正しい。
