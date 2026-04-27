---
phase: 03-qr-pwa
plan: "06"
subsystem: ui
tags: [tanstack-start, drizzle, connections, qr, profile]

# Dependency graph
requires:
  - phase: 03-qr-pwa
    provides: createConnection server function and connections table
  - phase: 03-qr-pwa
    provides: getPublicProfile server function
provides:
  - QRスキャン後の遷移先 /u/{urlId}/p/{shareToken} に「つながる」ボタン
  - isOwnProfile 判定による自分自身のQRスキャン時のボタン非表示
  - 未ログインユーザーの /login リダイレクト
affects: [CONN-02, qr-scan, connections]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getSessionWithUrlId server function パターンを $urlId.tsx から $urlId.p.$token.tsx に移植"
    - "loader で Promise.all を使ってプロフィールとセッション情報を並列取得"

key-files:
  created: []
  modified:
    - src/routes/u/$urlId.p.$token.tsx

key-decisions:
  - "$urlId.p.$token.tsx は $urlId.tsx と同一の getSessionWithUrlId パターンを使用 — コードの重複だが、ルートレベルでのサーバー関数分離が TanStack Start の設計原則"
  - "shareToken はプロフィール取得のみに使用し、コネクション記録には urlId を使用 — urlId が公開識別子で shareToken は参照検証用"

patterns-established:
  - "QR URL の $token セグメントはプロフィール取得の検証用のみ — コネクション記録は常に urlId で行う"

requirements-completed: [CONN-02]

# Metrics
duration: 1min
completed: 2026-04-27
---

# Phase 03 Plan 06: QR Profile Connect Button Gap Summary

**QRスキャン後遷移先（/u/{urlId}/p/{shareToken}）に「つながる」ボタンを追加し CONN-02 を達成**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-27T03:42:15Z
- **Completed:** 2026-04-27T03:42:52Z
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments

- `$urlId.p.$token.tsx` に `getSessionWithUrlId` サーバー関数を追加し、ログインユーザーの urlId を取得
- loader を更新して `isOwnProfile` を算出し、自分のQRスキャン時はボタンを非表示
- `createConnection` を `handleConnect` から呼び出し、未ログイン時は `/login` にリダイレクト
- SNSリンク表示を `<a>` タグから `<SnsLinkButton>` コンポーネントに統一
- `bio` フィールドの表示を追加
- 「なふだとは？」リンクを追加

## Task Commits

1. **Task 1: $urlId.p.$token.tsx に「つながる」ボタンを追加** - `9ce6c1b` (feat)

**Plan metadata:** (docs commit following)

## Files Created/Modified

- `src/routes/u/$urlId.p.$token.tsx` - QRスキャン後のプロフィールページ（つながるボタン付き）

## Decisions Made

- `shareToken` はプロフィール取得の検証にのみ使用し、コネクション記録には `urlId` を使用。これは正しい設計（urlId は公開識別子、shareToken は参照検証用）
- `getSessionWithUrlId` サーバー関数は `$urlId.tsx` と同一の実装をコピー — TanStack Start のルートレベル設計によりルート間でのサーバー関数共有が困難なため

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CONN-02「QRを読み取ってプロフィールを閲覧した後、明示的に「つながる」を選択した場合のみコネクションが記録される」を達成
- Phase 03 の残タスクは PWA 関連（Phase 03-05 など）

---
*Phase: 03-qr-pwa*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: src/routes/u/$urlId.p.$token.tsx
- FOUND: .planning/phases/03-qr-pwa/03-06-GAP-SUMMARY.md
- FOUND: commit 9ce6c1b
