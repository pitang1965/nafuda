---
phase: 02-event-checkin
plan: "03"
subsystem: ui
tags: [qrcode.react, tanstack-router, tanstack-start, drizzle-orm, server-functions, tailwind]

# Dependency graph
requires:
  - phase: 02-event-checkin/02-01
    provides: getEventParticipants, checkinToEvent server functions, events/event_checkins tables
  - phase: 02-event-checkin/02-02
    provides: ParticipantCard component, events checkin form route

provides:
  - /e/$slug public event page (QR code + checkin button + all participants)
  - checkinToEvent refactored to slug+personaId only (event must exist)
  - createEventAndCheckin for event creation form (preserves old behavior)
  - getEventParticipants without checkedOutAt filter (shows all participants)
  - ActiveCheckinCard inline component in events/index.tsx

affects:
  - Phase 3 QR/connection features (QR URL scheme now fully implemented)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - QRCodeSVG with mounted state guard — SSR safety for qrcode.react (useEffect + useState)
    - window.location.href fetched only after mount (useEffect) — SSR safe
    - Optional session via getOptionalSession + getOwnProfile for defaultPersonaId in public loader
    - checkinToEvent split: slug+personaId (from event page) vs createEventAndCheckin (from form)

key-files:
  created: []
  modified:
    - src/routes/e/$slug.tsx
    - src/server/functions/event.ts
    - src/routes/_protected/events/index.tsx
  deleted:
    - src/components/EventCheckinCard.tsx

key-decisions:
  - "checkinToEvent refactored to slug+personaId only — event page already has event context; createEventAndCheckin added for form-based event creation"
  - "getEventParticipants removes isNull(checkedOutAt) filter — new design shows all participants (not just active)"
  - "EventCheckinCard.tsx deleted — replaced with inline ActiveCheckinCard in events/index.tsx to remove checkout-centric language"

patterns-established:
  - "Pattern: QRCodeSVG SSR guard — always wrap in mounted state + useEffect, provide skeleton placeholder"
  - "Pattern: window globals in useEffect — never access window.location.href outside useEffect in SSR route"
  - "Pattern: public route with optional session — getOptionalSession returns null (no redirect), loader fetches profile only when session exists"

requirements-completed: [OSHI-04, OSHI-05]

# Metrics
duration: 15min
completed: 2026-04-26
---

# Phase 2 Plan 03: /e/$slug Event Page Summary

**QR code event page with SSR-safe QRCodeSVG, one-tap checkin button, and all-participant list — completing the QR scan → participate → browse flow**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-26T00:35:00Z
- **Completed:** 2026-04-26T00:50:50Z
- **Tasks:** 2
- **Files modified:** 4 (3 modified, 1 deleted)

## Accomplishments
- Rebuilt `/e/$slug` with QR code display (SSR-safe), one-tap checkin button, and all-participant grid
- Removed `isNull(checkedOutAt)` filter from `getEventParticipants` — shows every participant who ever attended
- Refactored `checkinToEvent` to accept `{ slug, personaId }` only; added `createEventAndCheckin` for the form-based flow
- Deleted `EventCheckinCard.tsx` and inlined a cleaner `ActiveCheckinCard` directly in `events/index.tsx`

## Task Commits

Each task was committed atomically:

1. **Task 1: /e/$slug.tsx を新設計に更新（QRコード + 参加ボタン + 全参加者）** - `dfc6384` (feat)
2. **Task 2: 旧コンポーネント削除 + ナビゲーションリンク確認** - `cba9072` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/routes/e/$slug.tsx` - Full rewrite: QRCodeDisplay (mounted guard), checkin button, all-participant grid, optional session loader
- `src/server/functions/event.ts` - checkinToEvent simplified (slug+personaId), createEventAndCheckin added, getEventParticipants checkedOutAt filter removed
- `src/routes/_protected/events/index.tsx` - Replaced EventCheckinCard import with inline ActiveCheckinCard; uses createEventAndCheckin
- `src/components/EventCheckinCard.tsx` - DELETED (checkout-centric UI replaced)

## Decisions Made
- Split `checkinToEvent` into two functions: `checkinToEvent` (event must exist, uses slug+personaId from event page) and `createEventAndCheckin` (creates event if needed, used by form). This preserves the form behavior while enabling clean event-page checkin.
- `getEventParticipants` no longer filters by `checkedOutAt IS NULL` — new design shows all participants who ever checked in to represent the community, not just currently active attendees.
- `EventCheckinCard.tsx` deleted and replaced with inline `ActiveCheckinCard` — removes dependency and aligns language with new design (参加中 instead of チェックイン中).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] checkinToEvent API mismatch — refactored to slug+personaId**
- **Found during:** Task 1 (/e/$slug.tsx update)
- **Issue:** Plan specified `checkinToEvent({ data: { slug, personaId } })` but existing implementation required `eventName`, `venueName`, `eventDate` — impossible to call from event page which has no form inputs
- **Fix:** Refactored `checkinToEvent` to slug+personaId only; preserved old behavior as `createEventAndCheckin` for the events form
- **Files modified:** src/server/functions/event.ts, src/routes/_protected/events/index.tsx
- **Verification:** TypeScript passes, both functions compile correctly
- **Committed in:** dfc6384 (Task 1 commit)

**2. [Rule 2 - Missing Critical] EventCheckinCard still imported in events/index.tsx**
- **Found during:** Task 2 (EventCheckinCard.tsx deletion)
- **Issue:** Plan said EventCheckinCard was "removed in 02-02" but it was still imported and used in events/index.tsx — deleting the file would break TypeScript
- **Fix:** Replaced EventCheckinCard with inline ActiveCheckinCard in events/index.tsx before deleting the file
- **Files modified:** src/routes/_protected/events/index.tsx, src/components/EventCheckinCard.tsx (deleted)
- **Verification:** TypeScript passes, no remaining references to EventCheckinCard
- **Committed in:** cba9072 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. The checkinToEvent API split is exactly what the plan intended but wasn't reflected in the existing implementation. No scope creep.

## Issues Encountered
- home.tsx already had the `/events` navigation link ("イベントにチェックイン") from a prior session — no change needed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete QR scan → participate → browse flow is now functional
- `/e/$slug` is a public route accessible without auth (QR scan use case)
- QR code displays the current page URL (SSR-safe via mounted guard)
- All participants (including checked-out) shown in participant grid
- Phase 3 (QR connections) can build on this foundation

## Self-Check: PASSED

All files verified:
- `src/routes/e/$slug.tsx` — FOUND
- `src/server/functions/event.ts` — FOUND
- `src/routes/_protected/events/index.tsx` — FOUND
- `src/components/EventCheckinCard.tsx` — DELETED (confirmed)

Commits verified:
- `dfc6384` — FOUND (feat(02-03): update /e/$slug)
- `cba9072` — FOUND (feat(02-03): remove EventCheckinCard)

---
*Phase: 02-event-checkin*
*Completed: 2026-04-26*
