# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** QRを読んだらその場でSNSリンクが見えてつながれる——口頭でID交換する手間・気まずさをゼロにする
**Current focus:** Phase 1 — 認証・プロフィール基盤

## Current Position

Phase: 1 of 4 (認証・プロフィール基盤)
Plan: 3 of 4 in current phase
Status: In Progress — 01-02 auto tasks complete; awaiting checkpoint verification for OAuth flows
Last activity: 2026-04-24 — 01-02 Better Auth OAuth setup + login page + protected routes

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 5 min
- Total execution time: 5 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-auth-profile | 1/4 | 5 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (5 min)
- Trend: baseline

*Updated after each plan completion*
| Phase 01-auth-profile P01 | 5 min | 2 tasks | 35 files |
| Phase 01-auth-profile P02 | 11 min | 2 tasks | 8 files |

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
- [01-01]: verbatimModuleSyntax removed from tsconfigs; isolatedModules used instead — required for TanStack Start server/client bundle isolation
- [01-01]: Phase 0 code archived to src/legacy/ (excluded from TS compilation) — preserves reference implementation
- [01-01]: router.tsx exports both createRouter and getRouter — TanStack Router Vite plugin auto-generates routeTree.gen.ts which imports getRouter
- [01-01]: zod pinned to v3 not v4 — @hookform/resolvers v5 does not support zod v4
- [01-01]: Hyperdrive commented out in wrangler.toml — requires Cloudflare Workers Paid plan; neon-http is dev/free-tier path
- [Phase 01-02]: createAPIFileRoute from @tanstack/react-start/api does not exist in v1.167 — used createFileRoute with server.handlers instead
- [Phase 01-02]: createServerFn handler does not receive context.request — getRequest() from @tanstack/react-start/server is the correct API
- [Phase 01-02]: No cookieCache in auth.ts — prevents Better Auth bug #4203 on Cloudflare Workers

### Pending Todos

- [01-01]: Run `pnpm db:migrate` after configuring Neon DATABASE_URL in .env.local
- [01-02]: Run `pnpm auth:generate && pnpm db:migrate` after setting up Google/Facebook OAuth credentials

### Blockers/Concerns

- [01-01]: Neon DATABASE_URL not configured — `pnpm db:migrate` will fail with placeholder URL. User must create Neon project (ap-northeast-1) and set DATABASE_URL in .env.local before migrations can run.
- [Phase 1]: vite-plugin-pwa が TanStack Start + SSR 環境で非互換あり → カスタムWorkboxスクリプトで対応 (Phase 3)
- [Phase 3]: QRトークンはユーザーIDを直接露出しない設計にする（失効可能なスキームを検討）

## Session Continuity

Last session: 2026-04-24
Stopped at: Checkpoint 01-02 — awaiting human OAuth end-to-end verification (Task 3)
Resume file: None
