# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** QRを読んだらその場でSNSリンクが見えてつながれる——口頭でID交換する手間・気まずさをゼロにする
**Current focus:** Phase 0 — プロトタイプ

## Current Position

Phase: 0 of 4 (プロトタイプ)
Plan: 3 of 3 in current phase
Status: Paused — awaiting Cloudflare API token for deploy
Last activity: 2026-04-22 — 00-03 QRBottomSheet実装・PWAアイコン配置完了。Cloudflareデプロイ待ち

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
| Phase 00-prototype P03 | 12 | 2 tasks | 6 files |

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
- [Phase 00-03]: react-modal-sheet v5.6.0 uses named export { Sheet } not default export
- [Phase 00-03]: Cloudflare Pages deploy requires CLOUDFLARE_API_TOKEN env var in non-interactive shells

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Better Auth + TanStack Start の統合実装例が少ない → plan-phase時に詳細リサーチ推奨
- [Phase 1]: vite-plugin-pwa が TanStack Start + SSR 環境で非互換あり → カスタムWorkboxスクリプトで対応
- [Phase 3]: QRトークンはユーザーIDを直接露出しない設計にする（失効可能なスキームを検討）

## Session Continuity

Last session: 2026-04-22
Stopped at: 00-03 Task 2 deploy — awaiting CLOUDFLARE_API_TOKEN (wrangler pages deploy blocked in non-interactive shell)
Resume file: None
