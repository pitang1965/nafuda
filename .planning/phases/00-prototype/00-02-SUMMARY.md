---
phase: 00-prototype
plan: "02"
subsystem: ui
tags: [react, tailwind, motion, framer-motion, mock-data]

# Dependency graph
requires:
  - phase: 00-01
    provides: Vite + React + Tailwind v4 + motion パッケージのセットアップ済み環境、mockData.ts の型定義とデータ
provides:
  - ProfileCard コンポーネント（アバター・ハンドル名・推しタグ・SNSリンク表示）
  - SnsLinkList コンポーネント（プラットフォーム別カラーリング）
  - ParticipantCard コンポーネント（motion.div stagger アニメーション付き）
  - ParticipantList コンポーネント（参加者カード一覧）
  - ProfilePage (/p/:userId ルート、MOCK_PROFILE 表示)
  - EventRoomPage (/event/:eventId ルート、MOCK_EVENT 参加者一覧表示)
  - LoginMockPage (useState のみのモックログイン画面)
affects: [00-03, phase-1]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - motion/react の motion.div で stagger アニメーション（delay: index * 0.12）
    - verbatimModuleSyntax 環境では型専用インポートに import type を使用
    - Phase 0 では URL パラメータ (:userId, :eventId) を受け取るが MOCK データを固定表示

key-files:
  created:
    - src/components/profile/ProfileCard.tsx
    - src/components/profile/SnsLinkList.tsx
    - src/components/event/ParticipantCard.tsx
    - src/components/event/ParticipantList.tsx
  modified:
    - src/pages/ProfilePage.tsx
    - src/pages/EventRoomPage.tsx
    - src/pages/LoginMockPage.tsx

key-decisions:
  - "verbatimModuleSyntax 対応: 型インポートはすべて import type を使用する（tsconfig の verbatimModuleSyntax: true が強制）"
  - "Phase 0 は URL パラメータを受け取るが DB を持たないためすべて MOCK データに固定"

patterns-established:
  - "motion stagger: delay: index * 0.12, duration: 0.3, ease: easeOut でカード出現アニメーション"
  - "SNS プラットフォーム別のカラーマップを Record<platform, string> で型安全に管理"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-04-22
---

# Phase 00-02: モックUI画面実装 Summary

**ProfileCard・ParticipantCard（motion stagger アニメーション付き）・LoginMockPage を実装し、mockData.ts のみで全画面が動作するプロトタイプ UI を完成**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-22T01:19:53Z
- **Completed:** 2026-04-22T01:22:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- ProfileCard がハンドル名・アバター・推しタグ・SNSリンク（プラットフォーム別カラー）を表示
- ParticipantCard が motion.div stagger アニメーション（delay: index * 0.12）付きで出現
- LoginMockPage が useState のみでログイン状態をシミュレート（DB・OAuth なし）
- npm run build がエラーなく完了（TypeScript エラーゼロ、PWA ビルド成功）

## Task Commits

Each task was committed atomically:

1. **Task 1: プロフィールカードコンポーネントと ProfilePage の実装** - `d715689` (feat)
2. **Task 2: イベントルーム画面（参加者カードアニメーション付き）の実装** - `5bcfe63` (feat)

## Files Created/Modified

- `src/components/profile/SnsLinkList.tsx` - プラットフォーム別カラーリング付き SNS リンクボタン一覧
- `src/components/profile/ProfileCard.tsx` - アバター・ハンドル名・推しタグ・SNSリンク・QRボタンのプロフィールカード
- `src/components/event/ParticipantCard.tsx` - motion.div stagger アニメーション付き参加者カード
- `src/components/event/ParticipantList.tsx` - 参加者カード一覧（空状態メッセージ付き）
- `src/pages/ProfilePage.tsx` - /p/:userId ルートで MOCK_PROFILE を ProfileCard に渡して表示
- `src/pages/EventRoomPage.tsx` - /event/:eventId ルートで MOCK_EVENT をヘッダー・参加者一覧で表示
- `src/pages/LoginMockPage.tsx` - useState のみのモックログイン画面（DB・OAuth なし）

## Decisions Made

- `verbatimModuleSyntax` 対応: tsconfig の `verbatimModuleSyntax: true` 設定により、型専用インポートはすべて `import type` を使う必要があった。これはビルド時エラーとして発覚し、全コンポーネントで修正した。
- Phase 0 では URL パラメータ (`:userId`, `:eventId`) を受け取るが DB を持たないため MOCK データに固定表示する方針を維持した。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] verbatimModuleSyntax による型インポートエラーの修正**
- **Found during:** Task 2 (npm run build 実行時)
- **Issue:** tsconfig に `verbatimModuleSyntax: true` が設定されており、型専用インポートに `import` を使うと TS1484 エラーが発生
- **Fix:** SnsLinkList.tsx, ProfileCard.tsx, ParticipantCard.tsx, ParticipantList.tsx の型インポートを `import type` に変更
- **Files modified:** src/components/profile/SnsLinkList.tsx, src/components/profile/ProfileCard.tsx, src/components/event/ParticipantCard.tsx, src/components/event/ParticipantList.tsx
- **Verification:** npm run build がエラーなく完了
- **Committed in:** 5bcfe63 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** verbatimModuleSyntax への対応は必須。スコープへの影響なし。

## Issues Encountered

None - ビルドエラーは Rule 1 で自動修正済み。

## User Setup Required

None - 外部サービス設定不要。

## Next Phase Readiness

- 00-03 で QRBottomSheet の追加と ProfileCard への `onQROpen` 接続が可能
- ProfileCard の `onQROpen` prop は未接続のまま残されており、00-03 で接続予定
- mockData.ts の全型とデータは変更なし。Phase 1 以降の実装でそのまま参照可能

---
*Phase: 00-prototype*
*Completed: 2026-04-22*
