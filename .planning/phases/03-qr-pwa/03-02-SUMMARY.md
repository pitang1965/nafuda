---
phase: 03-qr-pwa
plan: "02"
subsystem: connections
tags: [drizzle, schema, server-functions, connections, event-context]
dependency_graph:
  requires: []
  provides: [connections-table, createConnection, getMyConnections]
  affects: [src/server/db/schema.ts, src/server/functions/connection.ts]
tech_stack:
  added: []
  patterns: [createServerFn, getRequest, auth.api.getSession, 23505-unique-violation-catch]
key_files:
  created:
    - src/server/functions/connection.ts
  modified:
    - src/server/db/schema.ts
decisions:
  - "connections テーブルは一方向（from/to）設計で、同一ペアの UNIQUE 制約により重複防止"
  - "イベントコンテキストは非正規化保存（eventName, venueName, eventDate を直接カラムに）"
  - "23505 UNIQUE 違反は alreadyConnected: true として正常応答で返す（エラーにしない）"
  - "getMyConnections は urlIds に innerJoin — urlId 未設定ユーザーはコネクション一覧に表示されない"
metrics:
  duration: 10
  completed: 2026-04-26
  tasks_completed: 2
  files_modified: 2
requirements_satisfied:
  - CONN-02
  - CONN-03
---

# Phase 03 Plan 02: Connections Schema and Server Functions Summary

**One-liner:** connections テーブル（Drizzle pgTable）と createConnection / getMyConnections サーバー関数を実装し、チェックイン中のイベントコンテキスト自動付与を含む

## What Was Built

- `src/server/db/schema.ts`: `connections` テーブルを追加。`unique` を drizzle-orm/pg-core からインポートし、`(fromPersonaId, toPersonaId)` ペアに UNIQUE 制約を定義
- `src/server/functions/connection.ts`: `createConnection` と `getMyConnections` の2つのサーバー関数を新規作成

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | connections テーブルを schema.ts に追加 | adfd339 | src/server/db/schema.ts |
| 2 | createConnection / getMyConnections サーバー関数を実装 | 2c37505 | src/server/functions/connection.ts |

## Decisions Made

1. **一方向コネクション設計**: `fromPersonaId + toPersonaId` の UNIQUE 制約で重複防止。双方向でなく一方向なので、AがBに、BがAにもつながれる。
2. **非正規化イベントコンテキスト**: `eventName`, `venueName`, `eventDate` を connections テーブルに直接保存し、JOIN 不要で表示できる。
3. **UNIQUE 違反の graceful handling**: PostgreSQL 23505 エラーをキャッチし、`{ connection: null, alreadyConnected: true }` を返す（Phase 02-01 の checkinToEvent と同じパターン）。
4. **getMyConnections の urlIds innerJoin**: urlId 未設定ユーザーはコネクション一覧に含まれない（既存設計との整合性）。

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/server/db/schema.ts` — connections テーブル定義が存在する（line 112）
- [x] `src/server/functions/connection.ts` — createConnection と getMyConnections がエクスポートされている
- [x] TypeScript type check passes (`pnpm tsc --noEmit` — no errors)
- [x] Commits: adfd339 (schema), 2c37505 (server functions)

## Self-Check: PASSED
