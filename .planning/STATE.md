# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** QRを読んだらその場でSNSリンクが見えてつながれる——口頭でID交換する手間・気まずさをゼロにする
**Current focus:** Phase 0 — プロトタイプ

## Current Position

Phase: 0 of 4 (プロトタイプ)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-04-22 — 00-02 モックUI画面実装完了

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Phase 0はフロントエンドのみ（DB・認証なし）。v1要件はPhase 1以降にすべて割り当て
- [Roadmap]: 同担拒否（OSHI-02）はPhase 1に含める（文化的必須要件）
- [Roadmap]: PWA要件（PWA-01, PWA-02）はPhase 3（QR・コネクション）に割り当て。QRオフライン表示と一体で実装
- [Arch]: QR URLスキームはPhase 0で概念確立し、Phase 3で本番実装
- [Auth]: Google / Facebook OAuthのみ。X OAuthは有料APIのため除外
- [Auth]: iOS 7日間ストレージ失効問題はPhase 1実装時に対策が必要
- [00-01]: vite-plugin-pwa 1.2.0 は Vite 8 未対応のため --legacy-peer-deps インストール。動作正常。
- [00-01]: motion パッケージ使用（framer-motion は motion に統合済みのため不使用）
- [00-01]: react-router v7 から react-router パッケージのみ使用（react-router-dom 廃止）
- [00-02]: verbatimModuleSyntax: true 設定のため型専用インポートはすべて import type を使用する
- [00-02]: Phase 0 では URL パラメータを受け取るが MOCK データに固定表示する方針（DB なし）

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Better Auth + TanStack Start の統合実装例が少ない → plan-phase時に詳細リサーチ推奨
- [Phase 1]: vite-plugin-pwa が TanStack Start + SSR 環境で非互換あり → カスタムWorkboxスクリプトで対応
- [Phase 3]: QRトークンはユーザーIDを直接露出しない設計にする（失効可能なスキームを検討）

## Session Continuity

Last session: 2026-04-22
Stopped at: Completed 00-prototype/00-02-PLAN.md — モックUI画面実装（ProfileCard・ParticipantCard・LoginMockPage）
Resume file: None
