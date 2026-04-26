# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** QRを読んだらその場でSNSリンクが見えてつながれる——口頭でID交換する手間・気まずさをゼロにする
**Current focus:** Phase 3 — QR・コネクション・PWA

## Current Position

Phase: 3 of 4 (QR・コネクション・PWA)
Plan: 2 of 5 in current phase
Status: In Progress — 03-02 connections schema and server functions complete
Last activity: 2026-04-26 — 03-02: connections テーブル定義 + createConnection/getMyConnections 実装完了

Progress: [████████░░] 80%

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
| Phase 01-auth-profile P03 | 16 | 2 tasks | 8 files |
| Phase 01-auth-profile P04 | 60 | 3 tasks | 12 files |
| Phase 01-auth-profile P05 | 10 | 3 tasks | 3 files |
| Phase 03-qr-pwa P02 | 10 min | 2 tasks | 2 files |

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
- [Phase 01-03]: createServerFn handlers use getRequest() from @tanstack/react-start/server — context.request.headers does not exist in TanStack Start v1.167 ServerFnCtx
- [Phase 01-03]: useRef for debounce timers in React server function callbacks — useState creates stale closure in useCallback deps array
- [Phase 01-03]: getPublicProfile filters private fields at SELECT/return level server-side — private data never fetched or returned in API response
- [Phase 01-auth-profile]: Redirect 'ログインせずに見る' to / — demo persona does not exist in DB
- [Phase 01-auth-profile]: staleTime: 0 on /profile/edit route — ensures fieldVisibility is always fresh after SPA navigation
- [Phase 02-01]: events.slug UNIQUE — checkinToEvent uses SELECT-then-INSERT with 23505 unique_violation fallback (same pattern as URL-ID)
- [Phase 02-01]: auto-checkout on checkin — existing NULL checkedOutAt rows updated before INSERT to enforce one-active-checkin per persona
- [Phase 02-01]: getEventParticipants is public endpoint — returns only displayName, avatarUrl, shareToken, urlId; SNS links and fieldVisibility never exposed
- [Phase 02-01]: point({ mode: 'xy' }) for GPS storage — x=longitude, y=latitude; no PostGIS needed for Phase 2
- [Phase 02-03]: checkinToEvent refactored to slug+personaId only (event must exist); createEventAndCheckin added for form-based event creation
- [Phase 02-03]: getEventParticipants removes isNull(checkedOutAt) filter — new design shows all participants (not just active)
- [Phase 02-03]: QRCodeSVG requires mounted state guard (useEffect + useState) for SSR safety; window.location.href also fetched only after mount
- [Phase 02-04]: dojinReject saves via onChange (immediate) AND onSubmit (guaranteed fallback); silent catch replaced with error display
- [Phase 03-02]: connections table uses one-way design (fromPersonaId+toPersonaId UNIQUE) — bidirectional connections require two rows
- [Phase 03-02]: event context denormalized in connections table (eventName, venueName, eventDate columns) — avoids JOIN overhead at display time
- [Phase 03-02]: 23505 UNIQUE violation in createConnection returns alreadyConnected:true (not an error) — same pattern as checkinToEvent

### Pending Todos

- [01-01]: Run `pnpm db:migrate` after configuring Neon DATABASE_URL in .env.local
- [01-02]: Run `pnpm auth:generate && pnpm db:migrate` after setting up Google/Facebook OAuth credentials

### Blockers/Concerns

- [01-01]: Neon DATABASE_URL not configured — `pnpm db:migrate` will fail with placeholder URL. User must create Neon project (ap-northeast-1) and set DATABASE_URL in .env.local before migrations can run.
- [Phase 1]: vite-plugin-pwa が TanStack Start + SSR 環境で非互換あり → カスタムWorkboxスクリプトで対応 (Phase 3)
- [Phase 3]: QRトークンはユーザーIDを直接露出しない設計にする（失効可能なスキームを検討）

## Session Continuity

Last session: 2026-04-26
Stopped at: Completed 03-02-PLAN.md — connections schema + server functions implemented
Resume file: None
