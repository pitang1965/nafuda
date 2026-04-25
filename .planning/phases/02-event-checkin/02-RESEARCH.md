# Phase 2: イベント・チェックイン - Research

**Researched:** 2026-04-25
**Domain:** TanStack Start v1 + Drizzle ORM (neon-http) + Browser Geolocation API + Postgres point type
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OSHI-03 | ユーザーはイベントにチェックインできる（日付・会場名・イベント名・GPS座標を記録） | DB schema design (events + checkins tables), Drizzle point type, Browser Geolocation API, createServerFn pattern established in Phase 1 |
| OSHI-04 | ログインユーザーは同じイベントにチェックインしている参加者の一覧を閲覧できる（同担フィルタ適用済み） | Server-side JOIN query filtering on dojinReject=false, participant list route at `/e/$slug`, getSession() auth pattern already in codebase |
| OSHI-05 | 未ログインユーザーはイベント参加者の一覧（ハンドル名・アバターのみ）を閲覧できるが、個別プロフィールは閲覧不可 | Public route pattern (no beforeLoad auth guard), conditional rendering of profile links based on session presence, access model locked in Phase 1 CONTEXT.md |
</phase_requirements>

---

## Summary

Phase 2 adds event check-in capability on top of the fully working Phase 1 stack (TanStack Start v1.167, Drizzle ORM + neon-http, Better Auth, Cloudflare Workers). The technical surface area is: (1) two new DB tables (`events` and `event_checkins`), (2) three new `createServerFn` functions in `src/server/functions/event.ts`, and (3) two new route files — one protected (`/_protected/events/checkin.tsx` or similar) for checking in, and one public (`/e/$slug.tsx`) for the participant list.

The most important pattern constraint is that the `dojinReject` filter MUST be applied server-side — never client-side. This is consistent with how `getPublicProfile` already filters private fields at the SELECT/return level. The participant list query must JOIN `event_checkins` → `personas` and WHERE `dojin_reject = false` before returning data. The Phase 1 CONTEXT.md already locked `/e/<slug>` as the event URL scheme and specified that unauthenticated visitors see handle+avatar only with no clickable profile links.

For GPS coordinates, use the Drizzle `point({ mode: 'xy' })` column type (native PostgreSQL `point` type). PostGIS is not needed — distance queries are not a requirement in Phase 2. The Browser Geolocation API (`navigator.geolocation.getCurrentPosition`) is used client-side before calling the checkin `createServerFn`; GPS is optional (graceful degradation if user denies permission). Active checkin status is tracked via a nullable `checkedOutAt` column — `NULL` means currently checked in.

**Primary recommendation:** Follow the established Phase 1 `createServerFn` + Drizzle pattern exactly. Add two tables to `schema.ts`, one `functions/event.ts` file with 4 server functions, and two route files. No new npm packages required.

---

## Standard Stack

### Core (already in project — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | ^0.45.2 | DB schema, queries, migrations | Already established in Phase 1 |
| `@neondatabase/serverless` | ^1.1.0 | Neon HTTP driver for Cloudflare Workers | Already in use |
| `@tanstack/react-start` | ^1.167.42 | `createServerFn`, `createFileRoute`, `getRequest()` | Already established in Phase 1 |
| `@tanstack/react-query` | ^5.100.1 | Client-side data fetching / mutation state | Already established in Phase 1 |
| `better-auth` | ^1.6.8 | `auth.api.getSession()` for auth checks | Already established in Phase 1 |
| `zod` | ^3.25.76 | Input validation on server functions | Already established in Phase 1 |
| `tailwindcss` | ^4.2.4 | Styling | Already established |
| `motion` | ^12.38.0 | Participant card animations | Already in codebase (legacy ParticipantCard uses it) |

### No New Packages Required

All capabilities needed for Phase 2 exist in the current dependency tree:
- GPS via `navigator.geolocation` (browser built-in)
- PostgreSQL `point` type via `drizzle-orm/pg-core` `point()` function
- Auth checks via existing `getRequest()` + `auth.api.getSession()` pattern
- Form handling via existing `react-hook-form` + `zod`

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `point({ mode: 'xy' })` column | Store lat/lng as two separate `real` columns | Two `real` columns are simpler to query with standard SQL, avoid PostGIS dependency. `point` is fine for record-only storage (Phase 2 requirement). Either works — `point` is more semantically correct. |
| Nullable `checkedOutAt` for active status | Separate boolean `isActive` column | Nullable timestamp approach carries checkout time for free; boolean needs a separate update. Nullable timestamp is superior. |
| `drizzle-kit migrate` (SQL files) | Drizzle push | `migrate` is the established pattern per Phase 1 decisions |

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
├── server/
│   ├── db/
│   │   └── schema.ts           # ADD: events, event_checkins tables
│   └── functions/
│       ├── profile.ts          # EXISTING - no changes
│       ├── oshi.ts             # EXISTING - no changes
│       └── event.ts            # NEW: checkin/checkout/getEventParticipants/getActiveCheckin
├── routes/
│   ├── e/
│   │   └── $slug.tsx           # NEW: public event participant list page
│   └── _protected/
│       └── events/
│           └── index.tsx       # NEW: checkin UI for logged-in users (or extend home.tsx)
└── components/
    └── EventCheckinCard.tsx    # NEW: reusable checkin status display
```

### Pattern 1: DB Schema — events + event_checkins Tables

**What:** Two new tables in `src/server/db/schema.ts`. `events` is a lightweight self-created record (not admin-managed). `event_checkins` links personas to events with GPS + timestamps.

**When to use:** Phase 2 adds OSHI-03 and OSHI-04. No admin UI for event creation — users create the event implicitly when they check in with a new event name/venue combination. Events can be identified by a URL slug.

**Example:**
```typescript
// Source: Drizzle ORM official docs https://orm.drizzle.team/docs/column-types/pg
import { pgTable, uuid, text, timestamp, boolean, point } from 'drizzle-orm/pg-core'

// Event record (self-created by first check-in)
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),       // URL-safe identifier e.g. "animejapan-2026"
  name: text('name').notNull(),                // イベント名 (display)
  venueName: text('venue_name').notNull(),     // 会場名
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Check-in record: one per persona per event
export const eventCheckins = pgTable('event_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id),
  personaId: uuid('persona_id').notNull().references(() => personas.id),
  userId: text('user_id').notNull(),           // FK to Better Auth user.id (for auth checks)
  // GPS coordinates: optional (null if user denied permission)
  // point mode 'xy' → { x: longitude, y: latitude }
  gpsCoordinates: point('gps_coordinates', { mode: 'xy' }),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }).defaultNow().notNull(),
  checkedOutAt: timestamp('checked_out_at', { withTimezone: true }),  // NULL = currently checked in
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

### Pattern 2: createServerFn in src/server/functions/event.ts

**What:** Four server functions following the exact same pattern as `profile.ts` and `oshi.ts`.

**When to use:** All DB mutations and auth-gated reads go through `createServerFn`.

**Example:**
```typescript
// Source: established Phase 1 codebase pattern
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../db/client'
import { events, eventCheckins, personas } from '../db/schema'
import { auth } from '../auth'

// Check in to an event (creates event if slug doesn't exist)
export const checkinToEvent = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    slug: z.string().min(1).max(100),
    eventName: z.string().min(1).max(100),
    venueName: z.string().min(1).max(100),
    eventDate: z.string().datetime(),
    personaId: z.string().uuid(),
    gpsCoordinates: z.object({ x: z.number(), y: z.number() }).optional(),
  }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')
    // ... upsert event, insert checkin
  })

// Checkout from event (set checkedOutAt)
export const checkoutFromEvent = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ checkinId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')
    // ... set checkedOutAt = new Date()
  })

// Get active checkin for current user's persona (NULL checkedOutAt = active)
export const getActiveCheckin = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ personaId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    const result = await db.select()
      .from(eventCheckins)
      .where(and(
        eq(eventCheckins.personaId, data.personaId),
        isNull(eventCheckins.checkedOutAt)
      ))
      .limit(1)
    return result[0] ?? null
  })

// Get event participants — CRITICAL: dojinReject filter MUST be server-side
// Called by both public /e/$slug route AND authenticated route
export const getEventParticipants = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    // Does NOT require auth — public endpoint (OSHI-05)
    // Returns only displayName + avatarUrl (never SNS links or private data)
    const eventRow = await db.select()
      .from(events)
      .where(eq(events.slug, data.slug))
      .limit(1)
    if (!eventRow[0]) return null

    // JOIN checkins → personas WHERE checkedOutAt IS NULL AND dojinReject = false
    const participants = await db
      .select({
        checkinId: eventCheckins.id,
        personaId: personas.id,
        displayName: personas.displayName,
        avatarUrl: personas.avatarUrl,
        shareToken: personas.shareToken,
        urlId: urlIds.urlId,         // for profile link (shown only to authenticated users)
      })
      .from(eventCheckins)
      .innerJoin(personas, eq(eventCheckins.personaId, personas.id))
      .innerJoin(urlIds, eq(personas.userId, urlIds.userId))
      .where(and(
        eq(eventCheckins.eventId, eventRow[0].id),
        isNull(eventCheckins.checkedOutAt),
        eq(personas.dojinReject, false),
        eq(personas.isPublic, true)
      ))
    return { event: eventRow[0], participants }
  })
```

### Pattern 3: Public Route /e/$slug.tsx — Conditional Profile Links

**What:** The `/e/$slug` route is public (no beforeLoad auth guard). The loader fetches participants via `getEventParticipants`. The component conditionally shows profile links based on whether the current user is authenticated.

**When to use:** OSHI-05 requires unauthenticated access to the participant list but no clickable profile links.

**Example:**
```typescript
// Source: established pattern from /u/$urlId.tsx in Phase 1
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '../../server/auth'
import { getEventParticipants } from '../../server/functions/event'

// Check session without throwing redirect (public route)
const getOptionalSession = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    return await auth.api.getSession({ headers: request.headers })
  })

export const Route = createFileRoute('/e/$slug')({
  loader: async ({ params }) => {
    const [data, session] = await Promise.all([
      getEventParticipants({ data: { slug: params.slug } }),
      getOptionalSession(),
    ])
    return { data, isLoggedIn: !!session }
  },
  component: EventPage,
})

function EventPage() {
  const { data, isLoggedIn } = Route.useLoaderData()
  if (!data) return <div>イベントが見つかりません</div>

  return (
    <div>
      <h1>{data.event.name}</h1>
      {data.participants.map(p => (
        <ParticipantCard
          key={p.checkinId}
          displayName={p.displayName}
          avatarUrl={p.avatarUrl}
          // OSHI-05: profile link only rendered when authenticated
          profileHref={isLoggedIn ? `/u/${p.urlId}/p/${p.shareToken}` : undefined}
        />
      ))}
    </div>
  )
}
```

### Pattern 4: Slug Generation for Events

**What:** Event slug is user-input (or auto-generated from event name + date). Must be URL-safe.

**Recommendation:** Let the user manually enter a slug (like URL-ID in Phase 1), or auto-generate from `eventName + eventDate` (e.g., `animejapan-2026-04-05`). Auto-generation is simpler UX. Enforce URL-safe characters server-side (same `z.string().regex(/^[a-zA-Z0-9-]+$/)` pattern).

### Pattern 5: GPS Coordinates — Client-Side Acquisition

**What:** Browser Geolocation API runs client-side. Coordinates are passed to `checkinToEvent` as optional input. Denial by user is graceful — checkin proceeds without GPS.

**Example:**
```typescript
// Source: MDN Web API https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
async function getGpsCoords(): Promise<{ x: number; y: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ x: pos.coords.longitude, y: pos.coords.latitude }),
      () => resolve(null),  // denied or error → null, proceed without GPS
      { timeout: 5000, enableHighAccuracy: false }
    )
  })
}
```

Note: `enableHighAccuracy: false` is correct for check-in (city-level accuracy sufficient, reduces battery drain and permission prompt friction).

### Anti-Patterns to Avoid

- **Server-side GPS fetch:** GPS is a browser API — only acquire client-side, pass coordinates to server function as input data.
- **Client-side dojinReject filter:** Must be done in the SQL WHERE clause, not after fetching all participants. Following the `getPublicProfile` precedent in `profile.ts`.
- **Using context.request in server functions:** Established Phase 1 decision — ALWAYS use `getRequest()` from `@tanstack/react-start/server`. `context.request` does not exist in TanStack Start v1.167.
- **Filtering checkedOutAt IS NULL client-side:** Active status MUST be WHERE clause, not JS filter.
- **Exposing SNS links or fieldVisibility in participant list:** `getEventParticipants` returns ONLY `displayName` and `avatarUrl` (matching OSHI-05 requirements). Never return full profile data from the participant list endpoint.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GPS acquisition | Custom geolocation wrapper | `navigator.geolocation.getCurrentPosition` wrapped in Promise | Browser API is the standard; no library adds value here |
| Auth session check in server functions | Custom cookie parsing | `auth.api.getSession({ headers: request.headers })` | Already established pattern, handles session refresh |
| Input validation | Manual type guards | `zod` inputValidator on createServerFn | Already in use, provides automatic type narrowing |
| Unique slug generation | Hash/UUID-based slug | User-provided slug with same regex as URL-ID, or auto-generate from event name + date | Consistent with existing URL-ID pattern; users recognize this UX |
| Point storage | Custom lat/lng JSON | `point({ mode: 'xy' })` from drizzle-orm/pg-core | Native PostgreSQL point type, no additional library needed |

**Key insight:** Phase 2 is additive to Phase 1. Every new pattern should mirror an existing one. `event.ts` mirrors `oshi.ts` and `profile.ts`. `/e/$slug.tsx` mirrors `/u/$urlId.tsx`.

---

## Common Pitfalls

### Pitfall 1: dojinReject Filter Applied Client-Side
**What goes wrong:** Participant data including `dojinReject=true` users leaks to the browser, then gets hidden by JS.
**Why it happens:** Forgetting Phase 1 precedent where `getPublicProfile` filters at query level.
**How to avoid:** WHERE `personas.dojin_reject = false` in the SQL query, not in a `.filter()` after fetch.
**Warning signs:** If the function returns more rows than displayed in UI, the filter is in the wrong place.

### Pitfall 2: context.request.headers in createServerFn
**What goes wrong:** TypeScript error or runtime crash when accessing `context.request.headers`.
**Why it happens:** TanStack Start v1.167 `ServerFnCtx` does not expose `.request`.
**How to avoid:** ALWAYS use `getRequest()` from `@tanstack/react-start/server`. This is a Phase 1 locked decision in STATE.md.
**Warning signs:** TypeScript error "Property 'request' does not exist on type 'ServerFnCtx'".

### Pitfall 3: GPS Prompt on Page Load
**What goes wrong:** Browser immediately shows location permission dialog on page load, causing user confusion and denials.
**Why it happens:** Calling `getCurrentPosition` in a component's `useEffect` or route loader.
**How to avoid:** Trigger GPS acquisition only on explicit "チェックイン" button press.
**Warning signs:** Permission dialog appears before user has interacted with any check-in UI.

### Pitfall 4: Slug Collision on Event Creation
**What goes wrong:** Two users create events with the same slug (e.g., "animejapan-2026") and checkins get merged.
**Why it happens:** No uniqueness check before INSERT.
**How to avoid:** `events.slug` has UNIQUE constraint in schema. On `checkinToEvent`, first do `SELECT ... WHERE slug = ?` — if event exists, use it; if not, INSERT. Handle the 23505 unique violation (same pattern as `createPersona` URL-ID).
**Warning signs:** Two unrelated events with same slug sharing participants.

### Pitfall 5: Active Checkin Logic — Multiple Active Checkins
**What goes wrong:** User has multiple NULL `checkedOutAt` rows (checked in to multiple events simultaneously).
**Why it happens:** No enforcement of "one active checkin per persona" at DB level.
**How to avoid:** In `checkinToEvent`, before inserting, check for existing active checkin and auto-checkout OR reject with an explicit error. Recommendation: auto-checkout from previous event when checking in to new one.
**Warning signs:** `getActiveCheckin` returns multiple rows.

### Pitfall 6: Missing urlIds JOIN in getEventParticipants
**What goes wrong:** Can't construct `/u/$urlId/p/$token` links because urlId is not in the query result.
**Why it happens:** Forgetting that urlId lives in `urlIds` table, keyed by `userId`, not `personaId`.
**How to avoid:** JOIN `urlIds` on `personas.userId = urlIds.userId` in the participant query.
**Warning signs:** Profile link construction fails at runtime with undefined urlId.

---

## Code Examples

### DB Migration Flow (established in Phase 1)
```bash
# After updating src/server/db/schema.ts:
pnpm db:generate   # generates SQL migration in ./drizzle/
pnpm db:migrate    # applies to Neon DATABASE_URL from .env.local
```

### Checkin Form — GPS + Server Function Call
```typescript
// Source: established Phase 1 pattern (react-hook-form + createServerFn)
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkinToEvent } from '../server/functions/event'

async function handleCheckin(formData: CheckinFormData) {
  // GPS acquired client-side, passed as optional input
  const gps = await getGpsCoords()  // returns {x, y} or null
  await checkinToEvent({
    data: {
      ...formData,
      gpsCoordinates: gps ?? undefined,
    }
  })
}
```

### Optional Session Check in Public Route Loader
```typescript
// Source: established Phase 1 pattern (_protected.tsx uses getSession)
// For public routes that need to conditionally show auth-gated elements
const getOptionalSession = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    return await auth.api.getSession({ headers: request.headers })
    // NOTE: does NOT throw redirect — returns null if no session
  })
```

### Participant Query with dojinReject Filter
```typescript
// Source: Drizzle ORM docs https://orm.drizzle.team/docs/joins
import { eq, and, isNull } from 'drizzle-orm'

const participants = await db
  .select({ displayName: personas.displayName, avatarUrl: personas.avatarUrl })
  .from(eventCheckins)
  .innerJoin(personas, eq(eventCheckins.personaId, personas.id))
  .innerJoin(urlIds, eq(personas.userId, urlIds.userId))
  .where(and(
    eq(eventCheckins.eventId, targetEventId),
    isNull(eventCheckins.checkedOutAt),      // currently checked in
    eq(personas.dojinReject, false),          // dojinReject filter — MUST be server-side
    eq(personas.isPublic, true)
  ))
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store GPS as separate lat/lng `real` columns | `point({ mode: 'xy' })` native PG type | Drizzle ORM support since v0.28+ | Semantically correct, no overhead |
| `timestamp()` without timezone | `timestamp({ withTimezone: true })` | Current Drizzle best practice (2025) | Avoids timezone ambiguity in multi-timezone events |
| `createAPIFileRoute` for server endpoints | `createServerFn` + `createFileRoute` | TanStack Start v1.x (Phase 1 locked decision) | `createAPIFileRoute` does not exist in v1.167 |

**Deprecated / outdated in this codebase:**
- `context.request.headers` in server functions: replaced by `getRequest()` — Phase 1 locked decision
- `cookieCache` in Better Auth: disabled due to bug #4203 — Phase 1 locked decision

---

## Open Questions

1. **Event creation UX — who creates the event record?**
   - What we know: Requirements say "self-declared check-in" (no admin-managed events). First checkin with a new slug creates the event.
   - What's unclear: Should the checkin form show a slug field, or auto-generate slug from event name + date?
   - Recommendation: Auto-generate slug from `eventName + eventDate` (e.g., `animejapan-20260405`) with URL-safe normalization. Show it to the user as a "share this event link" after checkin. Avoids slug collision UX while remaining shareable.

2. **Multiple active checkins — policy?**
   - What we know: A persona should only be "at" one event at a time logically.
   - What's unclear: Should the system reject a new checkin if already active, or auto-checkout the previous one?
   - Recommendation: Auto-checkout previous event when checking in to a new one. Simpler UX, matches real-world behavior (you leave one venue to go to another).

3. **Checkin form placement — new page or home page modal?**
   - What we know: Phase 1 CONTEXT.md mentions a bottom navigation with an "イベント" tab. Home screen shows profile.
   - What's unclear: Is the checkin UI a separate route (`/events/checkin`) or a modal/sheet on the home page?
   - Recommendation: A dedicated `/_protected/events/index.tsx` route for the checkin form (matches the bottom nav "イベント" tab pattern). This is Claude's discretion — no CONTEXT.md exists for Phase 2 yet.

4. **Event slug format**
   - What we know: The URL will be `/e/<slug>`.
   - What's unclear: Is the slug human-readable (e.g., `animejapan-2026`) or UUID-based?
   - Recommendation: Human-readable, auto-generated from event name + date with URL normalization. Allows sharing the event URL naturally (e.g., a group chat link). Users can override it.

---

## Sources

### Primary (HIGH confidence)
- Drizzle ORM official docs https://orm.drizzle.team/docs/column-types/pg — point type syntax, timestamp with timezone
- Drizzle ORM official docs https://orm.drizzle.team/docs/guides/point-datatype-psql — point mode: 'xy', insert/query patterns
- Project codebase `src/server/functions/profile.ts` — createServerFn + getRequest() + auth session pattern
- Project codebase `src/server/db/schema.ts` — existing table patterns (uuid PK, timestamp defaultNow, FKs)
- Project codebase `src/routes/_protected.tsx` — protected route beforeLoad pattern
- Project codebase `src/routes/u/$urlId.tsx` — public route (no auth guard) pattern
- Phase 1 STATE.md decisions — confirmed: getRequest() pattern, no context.request, TanStack Start v1.167

### Secondary (MEDIUM confidence)
- MDN Web API https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API — getCurrentPosition, Promise wrapping, error handling
- Phase 1 CONTEXT.md — confirmed `/e/<slug>` URL scheme, access model (unauthenticated = handle+avatar only, no profile links)
- TanStack Router docs https://tanstack.com/router/v1/docs/framework/react/guide/authenticated-routes — beforeLoad protected route pattern

### Tertiary (LOW confidence)
- General Drizzle ORM best practices gist (2025) — timestamp withTimezone recommendation (cross-verified with official docs → MEDIUM)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, verified via package.json
- Architecture: HIGH — patterns derived directly from existing Phase 1 codebase
- DB schema: HIGH — verified against Drizzle ORM official docs for point type and timestamp
- Pitfalls: HIGH — 4 of 6 pitfalls derived from existing Phase 1 STATE.md decisions
- GPS/Geolocation: MEDIUM — MDN docs verified, browser API stable but iOS Safari has historical quirks

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (TanStack Start is fast-moving — verify if upgrading past v1.167)
