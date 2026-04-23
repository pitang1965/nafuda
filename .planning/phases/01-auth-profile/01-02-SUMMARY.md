---
phase: 01-auth-profile
plan: "02"
subsystem: auth
tags: [better-auth, google-oauth, facebook-oauth, tanstack-start, drizzle-orm, neon-postgres, session]

# Dependency graph
requires:
  - phase: "01-01"
    provides: "TanStack Start framework, Drizzle schema, neon-http DB client"
provides:
  - Better Auth instance with Google + Facebook OAuth, 30-day sessions, no cookieCache
  - /api/auth/* catch-all handler via createFileRoute server.handlers
  - Browser-side auth client (authClient, useSession, signIn, signOut)
  - Login page with Google/Facebook buttons and 'ログインせずに見る' link
  - _protected pathless layout route (redirects unauthenticated to /login)
  - /u/:urlId public profile stub (no auth required)
affects: [01-03, 01-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TanStack Start v1 server routes: createFileRoute with server.handlers for raw HTTP handling (not createAPIFileRoute)"
    - "createServerFn uses getRequest() from @tanstack/react-start/server — not context.request.headers"
    - "Better Auth session check in beforeLoad via createServerFn + auth.api.getSession()"
    - "_protected pathless layout for auth-gated pages, public routes outside _protected tree"

key-files:
  created:
    - src/server/auth.ts
    - src/routes/api/auth/$.ts
    - src/lib/auth-client.ts
    - src/routes/login.tsx
    - src/routes/_protected.tsx
    - src/routes/_protected/home.tsx
    - src/routes/u/$urlId.tsx
  modified:
    - .env.local

key-decisions:
  - "createAPIFileRoute from @tanstack/react-start/api does not exist in v1.167 — used createFileRoute with server.handlers instead (the correct TanStack Start v1 server routes API per SKILL.md)"
  - "createServerFn handler does not receive context.request.headers — getRequest() from @tanstack/react-start/server is the correct API per TanStack Start v1 skill docs"
  - "tanstackStartCookies() plugin handles cookie propagation from Better Auth to TanStack Start responses via setCookie from @tanstack/react-start/server"
  - "No cookieCache in auth.ts — prevents Better Auth bug #4203 on Cloudflare Workers"

patterns-established:
  - "Server routes: createFileRoute with server: { handlers: { GET, POST } } for raw Request→Response handling"
  - "Server functions: use getRequest() from @tanstack/react-start/server for request/header access"
  - "Auth gating: _protected.tsx pathless layout with beforeLoad getSession() check"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

# Metrics
duration: 11min
completed: 2026-04-24
---

# Phase 01 Plan 02: OAuth Authentication Summary

**Better Auth with Google/Facebook OAuth (30-day sessions, no cookieCache) + _protected layout route + public /u/:urlId profile route — full auth flow ready for end-to-end verification**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-04-23T17:13:12Z
- **Completed:** 2026-04-23T17:25:10Z
- **Tasks:** 2 auto tasks complete (checkpoint awaiting human verification)
- **Files modified:** 8

## Accomplishments
- Created Better Auth server instance with Google + Facebook OAuth, 30-day sessions, and no cookieCache (iOS ITP safe)
- Implemented /api/auth/* catch-all route using TanStack Start v1's createFileRoute server.handlers API
- Built login page with both OAuth provider buttons and prominent "ログインせずに見る →" link per CONTEXT.md locked decisions
- Created _protected pathless layout route that redirects unauthenticated users to /login via server function + auth.api.getSession()
- Created public /u/:urlId profile stub accessible without authentication

## Task Commits

Each task was committed atomically:

1. **Task 1: Better Auth server setup + catch-all API route** - `dfa4efc` (feat)
2. **Task 2: Login page + _protected layout route + home stub** - `ce30a3c` (feat)

**Plan metadata:** (pending — see final commit below)

## Files Created/Modified
- `src/server/auth.ts` — Better Auth instance: Google + Facebook OAuth, 30-day sessions, no cookieCache, tanstackStartCookies plugin
- `src/routes/api/auth/$.ts` — Catch-all /api/auth/* handler using createFileRoute server.handlers
- `src/lib/auth-client.ts` — Browser client: createAuthClient + useSession/signIn/signOut re-exports
- `src/routes/login.tsx` — Login page: Google/Facebook OAuth buttons + "ログインせずに見る →" link + OAuthErrorMessage component
- `src/routes/_protected.tsx` — Pathless layout: getSession() via createServerFn + getRequest() + auth.api.getSession() + beforeLoad redirect
- `src/routes/_protected/home.tsx` — Protected home stub (expanded in Plan 01-03)
- `src/routes/u/$urlId.tsx` — Public profile stub, no auth check
- `.env.local` — Added placeholder entries for GOOGLE_CLIENT_ID/SECRET, FACEBOOK_CLIENT_ID/SECRET

## Decisions Made
- Used `createFileRoute` with `server.handlers` instead of `createAPIFileRoute` — the latter doesn't exist in @tanstack/react-start v1.167; server routes via `createFileRoute` is the documented TanStack Start v1 pattern
- Used `getRequest()` from `@tanstack/react-start/server` in `createServerFn` handler instead of `context.request.headers` — the plan's approach doesn't match TanStack Start v1 API; `getRequest()` is the correct method per official SKILL.md
- No cookieCache setting in auth.ts — avoids Better Auth bug #4203 on Cloudflare Workers (session loss when cookieCache + secondaryStorage both enabled)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] createAPIFileRoute not available in @tanstack/react-start v1.167**
- **Found during:** Task 1 (Better Auth API route setup)
- **Issue:** Plan specified `import { createAPIFileRoute } from '@tanstack/react-start/api'` but the `./api` subpath export does not exist in the installed version (v1.167). The function is referenced only in an internal skills example, not exported.
- **Fix:** Used `createFileRoute` with `server: { handlers: { GET, POST } }` — the correct TanStack Start v1 server routes pattern per official SKILL.md (start-core/server-routes)
- **Files modified:** src/routes/api/auth/$.ts
- **Verification:** TypeScript compiles cleanly; server.handlers is the documented API
- **Committed in:** dfa4efc (Task 1 commit)

**2. [Rule 1 - Bug] createServerFn handler receives no context.request property**
- **Found during:** Task 2 (_protected.tsx layout route)
- **Issue:** Plan specified `.handler(async ({ context }) => { auth.api.getSession({ headers: context.request.headers }) })` but `ServerFnCtx` type has `context` for middleware-provided context, not request object
- **Fix:** Used `getRequest()` from `@tanstack/react-start/server` — the documented API per official server-functions SKILL.md
- **Files modified:** src/routes/_protected.tsx
- **Verification:** TypeScript compiles cleanly; getRequest() is the documented API
- **Committed in:** ce30a3c (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 API bugs — TanStack Start v1.167 API mismatch with plan)
**Impact on plan:** Both fixes maintain identical behavior intent. No scope creep. Server routes and server functions work as specified.

## Issues Encountered
- None beyond the two API deviations above (auto-fixed per Rule 1)

## User Setup Required

Before end-to-end OAuth testing, complete these steps:

1. **Generate Better Auth schema migration:**
   ```bash
   pnpm auth:generate
   pnpm db:migrate
   ```
   Expected: Tables `user`, `session`, `account`, `verification` created in Neon

2. **Configure Google OAuth (AUTH-01):**
   - Go to https://console.cloud.google.com → APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (dev)
     - `https://nafuda.pages.dev/api/auth/callback/google` (prod)
   - Copy Client ID and Client secret to `.env.local`:
     ```
     GOOGLE_CLIENT_ID=<your-client-id>
     GOOGLE_CLIENT_SECRET=<your-client-secret>
     ```

3. **Configure Facebook OAuth (AUTH-02):**
   - Go to https://developers.facebook.com/apps → Create App → Consumer
   - Add Facebook Login product → Settings → Valid OAuth Redirect URIs:
     - `http://localhost:3000/api/auth/callback/facebook`
   - Copy App ID and App secret to `.env.local`:
     ```
     FACEBOOK_CLIENT_ID=<your-app-id>
     FACEBOOK_CLIENT_SECRET=<your-app-secret>
     ```

4. **Set BETTER_AUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   # Paste output into .env.local: BETTER_AUTH_SECRET=<value>
   ```

5. **Run dev server and verify:**
   ```bash
   pnpm dev
   ```
   - http://localhost:3000/home → should redirect to /login
   - http://localhost:3000/u/testuser → should show stub (no redirect)
   - http://localhost:3000/login → Google + Facebook buttons + "ログインせずに見る →" link
   - Google OAuth flow → completes → lands on /home

## Next Phase Readiness
- Auth infrastructure: ready — Better Auth wired to DB, OAuth providers configured in code, sessions stored in Neon
- Route protection: ready — _protected layout prevents unauthenticated access to /home
- Public routes: ready — /u/:urlId accessible without auth
- **Pending:** End-to-end OAuth verification (checkpoint awaiting human approval)
- **Pending:** auth:generate + db:migrate to create Better Auth tables in Neon

---
*Phase: 01-auth-profile*
*Completed: 2026-04-24*
