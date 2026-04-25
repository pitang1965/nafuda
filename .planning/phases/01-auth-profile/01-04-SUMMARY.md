---
phase: 01-auth-profile
plan: "04"
subsystem: profile
tags: [emblor, react-hook-form, drizzle-orm, tanstack-start, oshi-tags, dojin-reject, autocomplete, sns-links, bio]

# Dependency graph
requires:
  - phase: "01-01"
    provides: "TanStack Start framework, Drizzle schema (personas table with oshi_tags + dojin_reject columns), neon-http DB client"
  - phase: "01-02"
    provides: "Better Auth session, _protected layout route, getRequest() pattern for server functions"
  - phase: "01-03"
    provides: "Profile server functions, wizard, edit page, public profile routes, FormProvider context"
provides:
  - Oshi server functions: getOshiSuggestions (UNNEST autocomplete), updateOshiTags, updateDojinReject
  - OshiTagInput component: Emblor chip input with RHF integration and 300ms debounced autocomplete
  - Wizard step 3: oshi tag entry (1+ required), "推し・趣味・ジャンル" heading
  - Profile edit: oshi tag section with save button + dojin_reject radio toggle (instant save)
  - Bio field (max 200 chars) on persona with visibility toggle, displayed on home + public profile
  - SnsLinkButton component: platform icon + extracted handle (@username) for display
  - SNS hybrid URL input: bare username auto-prefixed with platform base URL
  - getOwnProfile fix: snsLinks now correctly fetched per persona
affects: [02-qr, 02-connections]

# Tech tracking
tech-stack:
  added:
    - "emblor — chip/tag input component for oshi tag entry (added to vite.config.ts ssr.noExternal)"
  patterns:
    - "OshiTagInput: enableAutocomplete gated on suggestions.length > 0 — prevents spurious No results found UI"
    - "useRef for debounce timer in OshiTagInput — avoids stale closure and re-render issues (same pattern as wizard URL-ID check)"
    - "getOshiSuggestions: Postgres UNNEST() to flatten text arrays, GROUP BY + COUNT for frequency ranking"
    - "dojin_reject radio toggle: immediate onChange calls updateDojinReject() server function, no save button"
    - "SNS hybrid input: detect if value starts with http(s):// — if not, prepend platform base URL on save"
    - "emblor SSR fix: add 'emblor' to vite.config.ts ssr.noExternal array"

key-files:
  created:
    - src/server/functions/oshi.ts
    - src/components/OshiTagInput.tsx
    - src/components/SnsLinkButton.tsx
    - drizzle/0002_lovely_paper_doll.sql
  modified:
    - src/routes/_protected/profile/wizard.tsx
    - src/routes/_protected/profile/edit.tsx
    - src/server/functions/profile.ts
    - src/routes/_protected/home.tsx
    - src/routes/u/$urlId.tsx
    - src/server/db/schema.ts
    - vite.config.ts

key-decisions:
  - "OshiTagInput: enableAutocomplete gated on suggestions.length > 0 to suppress empty No results UI"
  - "dojin_reject saves instantly on radio change (no save button) — toggle should feel immediate per CONTEXT.md"
  - "emblor added to ssr.noExternal to resolve SSR bundle error"
  - "Wizard/edit heading changed to 推し・趣味・ジャンル — welcomes non-oshi users (anime fans, hobbyists, etc.)"
  - "Bio field added to persona (max 200 chars) — enables richer public profile display"
  - "SnsLinkButton: extracts handle from full URL for display — shows @username not full URL"
  - "SNS hybrid input: accepts bare username (auto-prefixed) or full URL — reduces user friction"

patterns-established:
  - "Oshi tag autocomplete: UNNEST-based frequency ranking query against public personas"
  - "Chip input with RHF: convert string[] to Tag[] for Emblor, convert back in handleSetTags"
  - "SNS display vs input separation: SnsLinkButton for display, hybrid input for editing"

requirements-completed: [OSHI-01, OSHI-02]

# Metrics
duration: ~60min (including interactive UX polish session)
completed: 2026-04-25
---

# Phase 01 Plan 04: Oshi Tags + Dojin Reject Summary

**Oshi tag chip input with server-side autocomplete (OSHI-01) and dojin_reject instant radio toggle (OSHI-02), plus bio field, SnsLinkButton display component, and SNS hybrid URL input — all integrated into wizard step 3 and profile edit**

## Performance

- **Duration:** ~60 min (including interactive UX polish)
- **Completed:** 2026-04-25
- **Tasks:** 2 auto tasks + 1 checkpoint (approved by user)
- **Files modified:** 12

## Accomplishments

- Implemented `src/server/functions/oshi.ts` with three server functions: `getOshiSuggestions` (Postgres UNNEST autocomplete by frequency), `updateOshiTags` (saves tags array to personas), and `updateDojinReject` (instant toggle save)
- Built `OshiTagInput` component using Emblor's TagInput: RHF-integrated (watch/setValue), 300ms debounced autocomplete, `enableAutocomplete` gated on `suggestions.length > 0` to suppress empty-state popover
- Expanded wizard from 4 to 5 steps: URL-ID → 表示名 → 推し・趣味・ジャンル (new, 1+ tag required) → アバター → 完了; entire wizard wrapped in `FormProvider`
- Added oshi tags section to profile edit with save button, and dojin_reject radio toggle (saves instantly on change) with neutral Japanese copy: "同担の方にも表示される" vs "同担の方の一覧に表示されたくない"
- Added bio field (max 200 chars) to persona schema + edit form with visibility toggle; displayed on /home and /u/:urlId
- Fixed `getOwnProfile`: `snsLinks` was returning empty array — corrected to fetch per-persona
- Created `SnsLinkButton` component that extracts handle from full URL for display (@username)
- SNS input upgraded to hybrid mode: bare username auto-prefixed with platform base URL; placeholder adapts per platform
- Fixed emblor SSR bundle error by adding to `vite.config.ts` `ssr.noExternal`

## Task Commits

Each task was committed atomically:

1. **Task 1: Oshi server functions + OshiTagInput component** - `e998818` (feat)
2. **Task 2: Integrate oshi tags + dojin_reject into wizard and edit page** - `7d00349` (feat)
3. **Task 3 (checkpoint verified + UX polish)** - `f9241bf` (feat) — OshiTagInput fixes, bio field, SnsLinkButton, SNS hybrid input

**Plan metadata:** (see final docs commit)

## Files Created/Modified

- `src/server/functions/oshi.ts` — getOshiSuggestions, updateOshiTags, updateDojinReject with getRequest() auth
- `src/components/OshiTagInput.tsx` — Emblor chip input: RHF integration, debounced autocomplete, popover z-index fix
- `src/components/SnsLinkButton.tsx` — Platform icon button with handle extraction for profile display
- `src/routes/_protected/profile/wizard.tsx` — 5-step wizard, FormProvider, step 3 oshi tags (1+ required)
- `src/routes/_protected/profile/edit.tsx` — Oshi tag section, dojin_reject radio, bio field, SNS hybrid input
- `src/server/functions/profile.ts` — createPersona saves oshiTags; getOwnProfile fetches snsLinks correctly
- `src/server/db/schema.ts` — bio column added to personas table
- `src/routes/_protected/home.tsx` — Displays bio field
- `src/routes/u/$urlId.tsx` — Displays bio + oshi tags via SnsLinkButton
- `vite.config.ts` — emblor added to ssr.noExternal
- `drizzle/0002_lovely_paper_doll.sql` — Migration: bio column on personas

## Decisions Made

- Gated `enableAutocomplete` on `suggestions.length > 0` to hide empty "No results found" popover (better UX than always showing autocomplete container)
- `dojin_reject` saves immediately on radio change — a toggle should feel instant, no save button needed
- Heading updated to "推し・趣味・ジャンル" to be inclusive for non-oshi users (game fans, creators, hobbyists)
- Bio field added (not in original plan) — necessary for a useful public profile; it was a natural extension during the edit page polish
- SnsLinkButton extracts handle from URL for compact display (`@username` not full URL)
- SNS hybrid input accepts bare username or full URL — reduces friction for common case

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] emblor SSR bundle error**
- **Found during:** Task 1 integration
- **Issue:** emblor was not in `ssr.noExternal` in vite.config.ts, causing SSR bundle resolution failure
- **Fix:** Added `'emblor'` to `vite.config.ts` `ssr.noExternal` array
- **Files modified:** vite.config.ts
- **Committed in:** f9241bf

**2. [Rule 1 - Bug] getOwnProfile returned empty snsLinks array**
- **Found during:** Task 2 / interactive session
- **Issue:** Profile edit page showed no existing SNS links due to query not joining snsLinks per persona
- **Fix:** Updated getOwnProfile to correctly fetch snsLinks for the active persona
- **Files modified:** src/server/functions/profile.ts
- **Committed in:** f9241bf

**3. [Rule 2 - Missing Functionality] OshiTagInput popover z-index overlap**
- **Found during:** Checkpoint verification session
- **Issue:** Autocomplete popover rendered behind interactive buttons in the edit form
- **Fix:** Applied z-index fix to popover container in OshiTagInput
- **Files modified:** src/components/OshiTagInput.tsx
- **Committed in:** f9241bf

### Enhancements Added (within scope)

- **Bio field** — added to persona schema + edit form + public display. Natural extension of profile completeness for Phase 2 event context.
- **SnsLinkButton** — display component for SNS links showing platform icon + extracted handle. Needed for clean public profile display.
- **SNS hybrid URL input** — accepts username or full URL. Reduces friction and input errors.

---

**Total deviations:** 2 auto-fixed bugs, 1 missing infrastructure fix, 3 in-scope enhancements
**Impact on plan:** All fixes required for correct operation. Enhancements improve profile completeness for Phase 2.

## Issues Encountered

- None beyond the auto-fixed items above

## User Setup Required

Run `pnpm db:migrate` to apply the bio column migration (`drizzle/0002_lovely_paper_doll.sql`). Requires Neon DATABASE_URL in `.env.local`.

## Next Phase Readiness

- OSHI-01: Complete — OshiTagInput with autocomplete, wizard + edit integration
- OSHI-02: Complete — dojin_reject radio toggle, instant save, neutral Japanese copy
- Phase 1 fully complete — auth, profile, wizard, edit, public routes, oshi tags, dojin_reject all implemented
- **Phase 2 prerequisite:** dojin_reject flag is in personas table, ready for event participant filtering logic

---
*Phase: 01-auth-profile*
*Completed: 2026-04-25*
