---
phase: 02-event-checkin
plan: "01"
subsystem: database
tags: [drizzle-orm, postgres, point-type, server-functions, tanstack-start, better-auth, zod]

# Dependency graph
requires:
  - phase: 01-auth-profile
    provides: personas table, urlIds table, Better Auth session, createServerFn + getRequest() pattern

provides:
  - events table with slug UNIQUE constraint and withTimezone timestamps
  - event_checkins table with point GPS coordinates and nullable checkedOutAt
  - Drizzle migration 0003_dry_zeigeist.sql applied to Neon DB
  - checkinToEvent server function (auth, ownership, auto-checkout, upsert event, insert checkin)
  - checkoutFromEvent server function (auth, ownership, set checkedOutAt)
  - getActiveCheckin server function (auth, JOIN events, returns active checkin or null)
  - getEventParticipants server function (public, SQL dojinReject filter, no SNS links exposed)

affects:
  - 02-event-checkin/02-02 (checkin UI route depends on checkinToEvent/checkoutFromEvent/getActiveCheckin)
  - 02-event-checkin/02-03 (participant list route depends on getEventParticipants)

# Tech tracking
tech-stack:
  added: [point type from drizzle-orm/pg-core]
  patterns:
    - createServerFn with getRequest() auth pattern (established in Phase 1, extended here)
    - upsert-by-slug: SELECT first then INSERT with 23505 unique_violation fallback
    - auto-checkout previous active checkin on new checkin (one active checkin per persona invariant)
    - dojinReject filter exclusively in SQL WHERE clause (never client-side)
    - public server function returning limited fields (no SNS links, no fieldVisibility)

key-files:
  created:
    - src/server/functions/event.ts
    - drizzle/0003_dry_zeigeist.sql
    - drizzle/meta/0003_snapshot.json
  modified:
    - src/server/db/schema.ts

key-decisions:
  - "events table slug has UNIQUE constraint — slug collision on checkinToEvent uses existing event (SELECT first, INSERT with 23505 fallback)"
  - "auto-checkout enforced in checkinToEvent: existing NULL checkedOutAt rows updated before new INSERT"
  - "getEventParticipants is a public endpoint (no auth required) — returns only displayName, avatarUrl, shareToken, urlId"
  - "point({ mode: 'xy' }) used for GPS storage — { x: longitude, y: latitude } — no PostGIS needed"

patterns-established:
  - "Pattern: upsert event by slug — SELECT → INSERT with unique_violation catch → re-SELECT"
  - "Pattern: one-active-checkin invariant — auto-checkout in checkinToEvent before INSERT"
  - "Pattern: public server function with restricted SELECT — never expose SNS links or fieldVisibility from participant list"

requirements-completed: [OSHI-03, OSHI-04, OSHI-05]

# Metrics
duration: 3min
completed: 2026-04-25
---

# Phase 2 Plan 01: DB Schema and Server Functions Summary

**Drizzle events + event_checkins tables with point GPS, migration applied, and 4 server functions (checkin/checkout/getActiveCheckin/getEventParticipants) with SQL-level dojinReject filter**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-25T13:01:38Z
- **Completed:** 2026-04-25T13:04:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `events` table (slug UNIQUE, withTimezone timestamps) and `event_checkins` table (point GPS, nullable checkedOutAt) to schema.ts
- Generated and applied migration 0003_dry_zeigeist.sql to Neon database
- Created `src/server/functions/event.ts` with 4 fully typed server functions following Phase 1 patterns
- Enforced all security invariants: auth check, persona ownership, dojinReject SQL filter, no private data exposure

## Task Commits

Each task was committed atomically:

1. **Task 1: DB スキーマ追加 — events + event_checkins テーブル** - `2411679` (feat)
2. **Task 2: イベントサーバー関数 — event.ts（4関数）** - `009ebbd` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/server/db/schema.ts` - Added point import, events table, event_checkins table
- `drizzle/0003_dry_zeigeist.sql` - Migration SQL with CREATE TABLE for events and event_checkins
- `drizzle/meta/0003_snapshot.json` - Drizzle schema snapshot
- `drizzle/meta/_journal.json` - Updated migration journal
- `src/server/functions/event.ts` - 4 server functions: checkinToEvent, checkoutFromEvent, getActiveCheckin, getEventParticipants

## Decisions Made
- Event slug has UNIQUE constraint — on collision, `checkinToEvent` catches PostgreSQL error code 23505 and falls back to the existing event
- Auto-checkout enforced: `checkinToEvent` UPDATEs all NULL `checkedOutAt` rows for the persona before INSERT — maintains one-active-checkin invariant
- `getEventParticipants` is public (no auth guard) and returns only `displayName`, `avatarUrl`, `shareToken`, `urlId` — SNS links and `fieldVisibility` never included
- `point({ mode: 'xy' })` used for GPS — x=longitude, y=latitude — no PostGIS extension needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all patterns directly mirrored from Phase 1 codebase.

## User Setup Required
None - DATABASE_URL was already configured in .env.local from Phase 1. Migration applied successfully.

## Next Phase Readiness
- `events` and `event_checkins` tables exist in Neon DB
- All 4 server functions TypeScript-error-free and ready for use by route files
- Phase 2 Plan 02 (checkin UI route) can import `checkinToEvent`, `checkoutFromEvent`, `getActiveCheckin` immediately
- Phase 2 Plan 03 (participant list route) can import `getEventParticipants` immediately

## Self-Check: PASSED

All files present and all commits verified.

---
*Phase: 02-event-checkin*
*Completed: 2026-04-25*
