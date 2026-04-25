---
phase: 01-auth-profile
plan: "05"
subsystem: auth, ui
tags: [tanstack-router, better-auth, react, staleTime, signOut, navigate]

# Dependency graph
requires:
  - phase: 01-auth-profile/01-04
    provides: プロフィール編集ページ・SNSリンク・OshiTagInput (which this plan patches)
provides:
  - ログインページの「ログインせずに見る」リンクが / へ正常遷移
  - ホームページにログアウトボタン（authClient.signOut()）
  - 「新しいペルソナを作成」ボタンが /profile/wizard へ遷移
  - プロフィール編集ページのローダーキャッシュ無効化（staleTime: 0）
affects:
  - 01-UAT (all 4 UAT failures now resolved)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "staleTime: 0 on TanStack Router route to force loader re-run on every SPA navigation"
    - "authClient.signOut() followed by navigate() for clean logout flow"

key-files:
  created: []
  modified:
    - src/routes/login.tsx
    - src/routes/_protected/home.tsx
    - src/routes/_protected/profile/edit.tsx

key-decisions:
  - "Redirect 'ログインせずに見る' to / instead of /u/demo — demo persona does not exist in DB"
  - "staleTime: 0 on /profile/edit route — ensures fieldVisibility is always fresh after SPA navigation"

patterns-established:
  - "Route-level staleTime: 0 pattern for pages that must reflect latest DB state on every navigation"

requirements-completed:
  - AUTH-03
  - AUTH-04
  - PROF-04

# Metrics
duration: 10min
completed: 2026-04-25
---

# Phase 01 Plan 05: Gap-Closure UAT Fixes Summary

**4 UAT failures resolved: login link to /, logout button with authClient.signOut(), wizard navigation, and staleTime: 0 preventing stale fieldVisibility after SPA navigation**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-25T00:00:00Z
- **Completed:** 2026-04-25T00:10:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Fixed broken "ログインせずに見る" link (was /u/demo, now /) — eliminates "プロフィールが見つかりません" error
- Added ログアウト button in home top bar calling authClient.signOut() then navigating to /login
- Fixed empty stub onCreateNew handler to navigate({ to: '/profile/wizard' })
- Added staleTime: 0 to /profile/edit route — loader always re-runs on SPA navigation, preventing stale fieldVisibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix 'ログインせずに見る' link destination** - `5cdfb68` (fix)
2. **Task 2: Add logout button and fix 'new persona' navigation** - `be085c2` (feat)
3. **Task 3: Fix stale loader cache with staleTime: 0** - `6294797` (fix)

## Files Created/Modified
- `src/routes/login.tsx` - Changed href from "/u/demo" to "/"
- `src/routes/_protected/home.tsx` - Added useNavigate, authClient import, handleLogout function, logout button JSX, fixed onCreateNew handler
- `src/routes/_protected/profile/edit.tsx` - Added staleTime: 0 to route definition

## Decisions Made
- Redirecting to / (not /u/demo) because demo persona does not exist in the database and seeding one is out of scope for this phase
- staleTime: 0 chosen over alternative (invalidate cache on save) because it guarantees freshness regardless of navigation path

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all 3 files had clear root causes documented in the plan; changes were minimal and TypeScript compiled clean after each task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 UAT gaps from 01-UAT.md are now resolved (gaps 1–4 closed)
- Phase 1 re-UAT should yield 13/13 pass (was 10/13 before this plan)
- Phase 2 (QRコード・公開プロフィール) can proceed once UAT is re-confirmed

---
*Phase: 01-auth-profile*
*Completed: 2026-04-25*
