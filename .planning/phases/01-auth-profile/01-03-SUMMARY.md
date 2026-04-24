---
phase: 01-auth-profile
plan: "03"
subsystem: profile
tags: [react-hook-form, drizzle-orm, tanstack-start, zod, server-functions, persona, visibility, sns-links]

# Dependency graph
requires:
  - phase: "01-01"
    provides: "TanStack Start framework, Drizzle schema (personas, urlIds, snsLinks tables), neon-http DB client"
  - phase: "01-02"
    provides: "Better Auth session, _protected layout route, getRequest() pattern for server functions"
provides:
  - Profile server functions: getOwnProfile, createPersona, updatePersona, checkUrlIdAvailability, getPublicProfile, upsertSnsLink, deleteSnsLink
  - First-run wizard: 4-step URL-ID → 表示名 → アバター → 完了 with realtime URL-ID debounce check
  - InitialsAvatar component: deterministic hash-based color palette, emoji-safe spread iteration
  - PersonaSwitcher dropdown: shows current persona, switch between personas, create new
  - Profile edit page: per-field visibility toggles (eye=public / lock=private) + SNS link manager
  - /home route: loads own profile via loader, PersonaSwitcher + avatar + oshi tags display
  - /u/:urlId: public profile page, server-side field filtering via getPublicProfile
  - /u/:urlId/p/:token: specific persona by share token, same server-side filtering
affects: [01-04, 02-qr, 02-connections]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "createServerFn with getRequest() from @tanstack/react-start/server — required for session auth in all server functions"
    - "inputValidator with Zod schema on createServerFn — validated via execValidator which checks '~standard' and 'parse' on the validator"
    - "Server-side field filtering: getPublicProfile queries DB selectively based on fieldVisibility JSON — private fields never fetched or returned"
    - "Flat-file TanStack Router: $urlId.p.$token.tsx in u/ directory maps to /u/$urlId/p/$token route"
    - "useRef for debounce timer in React — avoids stale closure and infinite re-render from useCallback deps array"

key-files:
  created:
    - src/server/functions/profile.ts
    - src/routes/_protected/profile/wizard.tsx
    - src/routes/_protected/profile/edit.tsx
    - src/routes/u/$urlId.p.$token.tsx
    - src/components/InitialsAvatar.tsx
    - src/components/PersonaSwitcher.tsx
  modified:
    - src/routes/_protected/home.tsx
    - src/routes/u/$urlId.tsx

key-decisions:
  - "Plan's context.request.headers → fixed to getRequest() per TanStack Start v1 API pattern (Rule 1 Bug)"
  - "Plan's useState debounce timer → fixed to useRef to avoid stale closure in useCallback (Rule 1 Bug)"
  - "getPublicProfile: private field filtering at SELECT/return level, never fetched and filtered client-side"
  - "SNS link manager in edit page uses local state (not server-synced inline) — submitted on Save"

patterns-established:
  - "Server function auth: always use getRequest() + auth.api.getSession({ headers: request.headers })"
  - "Field visibility: fieldVisibility JSONB column checked server-side in getPublicProfile before any data is returned"
  - "Route loaders call server functions directly: loader: () => getOwnProfile() or loader: ({ params }) => getPublicProfile({ data: {...} })"

requirements-completed: [PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, AUTH-03, AUTH-04]

# Metrics
duration: 16min
completed: 2026-04-25
---

# Phase 01 Plan 03: Profile System Summary

**Full profile CRUD with first-run wizard, persona switching, per-field public/private visibility control, SNS link management, and server-side filtered public routes at /u/:urlId and /u/:urlId/p/:token**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-04-24T16:43:19Z
- **Completed:** 2026-04-24T16:59:00Z
- **Tasks:** 2 auto tasks complete
- **Files modified:** 8

## Accomplishments
- Implemented all profile server functions with proper auth via getRequest() pattern (getOwnProfile, createPersona, updatePersona, checkUrlIdAvailability, getPublicProfile, upsertSnsLink, deleteSnsLink)
- Built 4-step first-run wizard with realtime URL-ID availability check (debounced 400ms), "本名は不要です" copy on 表示名 step, and InitialsAvatar preview on アバター step
- Created server-side field filtering: private fields are absent from getPublicProfile's JSON response, not merely hidden in UI — queried selectively at SELECT time
- Built profile edit page with per-field visibility toggles (eye icon = public, lock = private) and SNS link manager (9 platforms, up/down reorder, add/delete)
- PersonaSwitcher dropdown at top of /home shows current persona name, switches between personas, and offers "新しいペルソナを作成" option

## Task Commits

Each task was committed atomically:

1. **Task 1: Profile server functions + first-run wizard + InitialsAvatar** - `dec885d` (feat)
2. **Task 2: Profile edit page + persona switcher + public profile routes** - `5382e12` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `src/server/functions/profile.ts` — All profile server functions with getRequest() auth pattern
- `src/components/InitialsAvatar.tsx` — Deterministic initials avatar with hash-based color palette
- `src/routes/_protected/profile/wizard.tsx` — 4-step first-run wizard with debounced URL-ID check
- `src/components/PersonaSwitcher.tsx` — Persona dropdown with switch and create new actions
- `src/routes/_protected/profile/edit.tsx` — Edit form with per-field visibility toggles and SNS link manager
- `src/routes/_protected/home.tsx` — Home page with PersonaSwitcher + profile card + wizard redirect
- `src/routes/u/$urlId.tsx` — Full public profile page with server-side filtered data
- `src/routes/u/$urlId.p.$token.tsx` — Specific persona by share token, same filtering

## Decisions Made
- Used `getRequest()` pattern consistently in all server functions (plan used `context.request.headers` which doesn't exist in TanStack Start v1)
- Used `useRef` for debounce timer in wizard (plan used `useState` which causes stale closure in `useCallback` dependencies)
- SNS link manager uses local component state, submitted in batch on Save — avoids partial saves and network round-trips per keystroke
- Field visibility defaults: empty `{}` in fieldVisibility = all public (per CONTEXT.md design decision: QRを渡す行為自体が公開の意思表示)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getRequest() instead of context.request.headers in all server functions**
- **Found during:** Task 1 (profile server functions)
- **Issue:** Plan specified `.handler(async ({ context }) => { auth.api.getSession({ headers: context.request.headers }) })` — `ServerFnCtx` has no `context.request` property in TanStack Start v1.167. Confirmed by reading `createServerFn.ts` source: handler receives `{ data, serverFnMeta, context, method }`.
- **Fix:** All server functions use `const request = getRequest()` from `@tanstack/react-start/server` — the established pattern per 01-02 SUMMARY
- **Files modified:** src/server/functions/profile.ts
- **Verification:** TypeScript compiles with no errors (`pnpm exec tsc --noEmit` exits 0)
- **Committed in:** dec885d (Task 1 commit)

**2. [Rule 1 - Bug] useRef for debounce timer instead of useState**
- **Found during:** Task 1 (wizard implementation)
- **Issue:** Plan's `const [debounceTimer, setDebounceTimer] = useState<...>()` with `debounceTimer` in `useCallback` deps array creates stale closure — every timer update triggers useCallback recreation, which would cause infinite renders and incorrect debounce behavior
- **Fix:** `const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` — refs don't trigger re-renders and don't need to be in deps arrays
- **Files modified:** src/routes/_protected/profile/wizard.tsx
- **Verification:** TypeScript compiles cleanly; useCallback has empty deps array (correct — handleUrlIdChange is stable)
- **Committed in:** dec885d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs — TanStack Start v1 API mismatch + React hooks correctness)
**Impact on plan:** Both fixes required for correct behavior. No scope creep. getRequest() pattern was already established in 01-02.

## Issues Encountered
- None beyond the two API deviations above (auto-fixed per Rule 1)

## User Setup Required
None — profile system uses the same Neon DB configured in Plan 01-01. Requires:
1. `pnpm db:migrate` to ensure personas, urlIds, snsLinks tables exist (migration file present from Plan 01-01)
2. OAuth credentials and BETTER_AUTH_SECRET in .env.local (from Plan 01-02 user setup)
3. `pnpm dev` to start dev server (route tree is auto-generated by Vite plugin on first run)

## Next Phase Readiness
- Profile system: complete — wizard, edit, public routes, field visibility all implemented
- Server-side privacy enforcement: ready — private fields absent from getPublicProfile response
- Persona switching: ready — PersonaSwitcher renders on /home
- Public URLs: ready — /u/:urlId and /u/:urlId/p/:token serve filtered profiles
- **Pending Plan 01-04:** QR code generation, setDefaultPersona, oshi tags editing (OSHI-01, OSHI-02)

---
*Phase: 01-auth-profile*
*Completed: 2026-04-25*
