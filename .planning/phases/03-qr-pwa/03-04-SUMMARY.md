---
phase: 03-qr-pwa
plan: "04"
subsystem: connections
tags: [connections, routing, ui, tanstack-router]
dependency_graph:
  requires: [connections-table, createConnection, getMyConnections]
  provides: [/connections-page]
  affects: [src/routes/_protected/connections.tsx]
tech_stack:
  added: []
  patterns: [createFileRoute, useLoaderData, Link-navigation, type-inference-from-serverFn]
key_files:
  created:
    - src/routes/_protected/connections.tsx
  modified: []
decisions:
  - "/connections は _protected レイアウト配下のため認証は自動保証される（別途 redirect 不要）"
  - "Connection 型は Awaited<ReturnType<typeof getMyConnections>>[number] で型推論 — 手動型定義不要"
  - "InitialsAvatar はアバター画像がない場合のフォールバックとして使用"
metrics:
  duration: 3
  completed: 2026-04-27
  tasks_completed: 1
  files_modified: 1
requirements_satisfied:
  - CONN-02
  - CONN-03
---

# Phase 03 Plan 04: /connections Page Summary

**One-liner:** TanStack Router の /_protected/connections ルートとして、コネクション一覧をカード形式（アバター・表示名・日時・イベントコンテキスト）で表示するページを実装した

## What Was Built

- `src/routes/_protected/connections.tsx`: `/connections` ルートを新規作成。`getMyConnections` をローダーとして使用し、コネクション一覧をカード形式で表示する。

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | /connections ページ実装 | a27d982 | src/routes/_protected/connections.tsx |

## Decisions Made

1. **認証自動保証**: `_protected` レイアウト配下のため、個別の認証チェックや redirect は不要。
2. **型推論**: `Connection` 型は `Awaited<ReturnType<typeof getMyConnections>>[number]` で自動推論。手動型定義は不要でサーバー関数の変更に追従できる。
3. **イベントコンテキスト表示**: `conn.eventName` が存在する場合のみピンク色バッジを表示（eventName/venueName/eventDate を非正規化保存した 03-02 の設計を活用）。
4. **空状態メッセージ**: `connections.length === 0` のとき `EmptyState` コンポーネントを表示。QRコードを読み取る操作へのガイダンスを含む。

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/routes/_protected/connections.tsx` — ファイル存在確認済み
- [x] `createFileRoute('/_protected/connections')` — ルート定義あり
- [x] `ConnectionCard` — カードコンポーネント実装あり
- [x] `getMyConnections` — ローダーで呼び出し済み
- [x] `EmptyState` — 空状態コンポーネント実装あり
- [x] `/u/$urlId` — カードクリックで遷移するリンクあり
- [x] TypeScript エラーなし (`pnpm tsc --noEmit` — no output = no errors)
- [x] Commit: a27d982

## Self-Check: PASSED
