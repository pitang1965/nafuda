---
plan: 03-03
phase: 03-qr-pwa
status: complete
completed_at: 2026-04-27
---

# Summary: DBマイグレーション + つながるボタン

## What was built

- `pnpm db:generate` → `drizzle/0005_flowery_skullbuster.sql` 生成
- `pnpm db:migrate` → Neon DB に connections テーブル適用
- `src/routes/u/$urlId.tsx` を更新:
  - `getSessionWithUrlId` サーバー関数を追加（セッション + urlId を1回のDBクエリで解決）
  - `isOwnProfile` をloader でセッションユーザーのurlIdとparams.urlIdの比較により算出
  - 自分のプロフィールでは「つながる」ボタン非表示
  - 未ログイン → `/login` リダイレクト
  - ログイン済み → `createConnection` 呼び出し
  - 成功後 → 「つながり済み ✓」表示

## Key files

### modified
- `src/routes/u/$urlId.tsx` — 「つながる」ボタン追加

### created (auto-generated)
- `drizzle/0005_flowery_skullbuster.sql` — connections テーブル migration
- `drizzle/meta/0005_snapshot.json`

## Commits

| Hash | Message |
|------|---------|
| 14a9ba3 | feat(03-03): generate and apply connections table migration |
| 5565e05 | feat(03-03): add つながる button to /u/$urlId public profile page |

## Self-Check: PASSED

- DB migration applied ✓
- isOwnProfile がセッションurlId比較で算出される ✓ (false ハードコードなし)
- 自分のプロフィールでつながるボタン非表示 ✓
- TypeScript エラーなし ✓
