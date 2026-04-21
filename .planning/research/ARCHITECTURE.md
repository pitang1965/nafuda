# Architecture Research — なふだ

**Research type**: Project Research — Architecture dimension
**Date**: 2026-04-21
**App**: なふだ (Nafuda) — Fan activity digital business card web app

---

## Research Question

How should a QR-based event networking app be structured? Key concerns: QR code URL scheme design, event check-in and participant list architecture, social graph (connections between users), anonymous/pseudonymous profiles with multiple personas, Cloudflare Workers + Postgres deployment.

---

## Summary

A QR-based event networking app for fan communities (推し活) is best structured as a **context-aware social graph** where the primary entity is not the user, but the *encounter* — the intersection of a person, an event, and a moment in time. The architecture separates cleanly into: profile identity, event participation, and connection graph layers. Each layer has distinct read/write patterns, privacy requirements, and can be built incrementally from Phase 0 (frontend-only mock) through Phase 1+ (full-stack).

---

## Component Architecture

### Phase 0 — Frontend-Only (Cloudflare Pages)

```
┌─────────────────────────────────────────┐
│            Browser / PWA                │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │  Profile     │  │  Event Room     │  │
│  │  Card View   │  │  (mock checkin) │  │
│  └──────────────┘  └─────────────────┘  │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │  QR Display  │  │  Participant    │  │
│  │  (static URL)│  │  List (mock)    │  │
│  └──────────────┘  └─────────────────┘  │
│                                         │
│  src/mock/data.ts  (all state here)     │
└─────────────────────────────────────────┘
         │ deploy
         ▼
   Cloudflare Pages (static)
```

**Component boundaries (Phase 0)**:
- `ProfileCardView` — renders a single persona's public-facing card. No auth needed; URL-addressable.
- `EventRoomView` — shows animated participant card grid. Driven entirely by mock data.
- `QRDisplay` — generates a static QR image encoding a profile URL. Uses a library like `qrcode` on the client; no server round-trip.
- `MockAuthContext` — React Context simulating login state with a tap. Sets "current persona" in memory.
- `src/mock/data.ts` — single source of truth for all mock users, events, checkins, connections.

---

### Phase 1+ — Full-Stack (Cloudflare Workers + Postgres)

```
Browser / PWA
     │
     │ HTTPS
     ▼
┌─────────────────────────────────────────────────┐
│         TanStack Start (Cloudflare Workers)      │
│                                                  │
│  ┌──────────────────┐  ┌───────────────────────┐ │
│  │  Route Handlers  │  │  Server Functions     │ │
│  │  (SSR pages)     │  │  (RPC-style API)      │ │
│  └──────────────────┘  └───────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │            Auth Layer                      │  │
│  │  (Better Auth / Clerk — X OAuth primary)   │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │         Data Access Layer (DAL)            │  │
│  │  Drizzle ORM → connection pool → Postgres  │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      │
                      │ connection pool (TCP / HTTP)
                      ▼
             ┌─────────────────┐
             │   Postgres      │
             │ (Neon / Supabase│
             │  serverless PG) │
             └─────────────────┘
```

**Component boundaries (Phase 1+)**:
- **Route Handlers** — SSR pages for profile view (`/u/:handle`), event room (`/e/:eventId`), own dashboard. Public profile pages are server-rendered for shareability (OGP meta tags).
- **Server Functions** — thin RPC handlers for mutations: checkin to event, update profile, generate/revoke connection. Called from client components via TanStack Start's `createServerFn`.
- **Auth Layer** — session management, X OAuth flow, persona-to-account binding. Issues a session cookie; never exposes OAuth provider's real name to other users.
- **DAL (Data Access Layer)** — all Postgres queries live here. Enforces row-level visibility rules (public/private field flags, 同担拒否 filter). No raw SQL escapes this layer.
- **Postgres** — Neon or Supabase recommended (serverless-friendly, HTTP-based driver works in Workers environment where raw TCP is restricted).

---

## Data Model

### Core Entities

```
Account                    (1 real identity — may be anonymous)
  └── Persona (1..n)       (named profile — e.g. "推し活用" vs "本業用")
        ├── Tags (oshi/genre)
        ├── SnsLinks
        ├── VisibilitySettings
        └── Checkins → Event (n..n via EventParticipant)

Event
  ├── EventParticipant     (join table: persona + event + checkin_at)
  └── created_by (Account)

Connection
  ├── persona_a_id
  ├── persona_b_id
  ├── context_event_id     (★ the event where they met — core differentiator)
  └── created_at

```

### Key Schema Decisions

| Entity | Notes |
|--------|-------|
| `Account` | Holds auth credentials only. No display name. `is_anonymous` flag for guest-mode users. |
| `Persona` | The unit of identity shown to others. A single Account can own multiple Personas. Each has its own handle, tags, SNS links. |
| `Event` | Has a short `slug` (used in QR URLs). Can be user-created or system-seeded. |
| `EventParticipant` | The checkin record. Has `visible_in_list` bool (オプトイン制). `同担拒否` stored as `allow_same_oshi_contact` bool on Persona. |
| `Connection` | Directed or undirected depending on UX. Storing `context_event_id` is what makes なふだ different from generic contact apps. |
| `FieldVisibility` | JSONB or separate table mapping `persona_id + field_name → public|private|connections_only`. |

---

## Data Flow

### QR Exchange Flow

```
User A displays QR
        │
        │  encodes URL: https://nafuda.app/u/<persona_handle>?ref=qr
        ▼
User B scans with native camera
        │
        │  HTTP GET /u/<persona_handle>
        ▼
Server renders ProfileCardView (SSR, public fields only)
        │
        │  User B optionally taps "つながる" (connect)
        ▼
Server Function: createConnection(personaA, personaB, contextEventId?)
        │
        ▼
Connection row inserted in Postgres
```

**Key**: The `?ref=qr` query param (and optionally `?event=<eventId>`) lets the server pre-populate the connection's `context_event_id` automatically — no extra user step.

### Event Check-in Flow

```
User opens Event Room URL: /e/<event_slug>
        │
        │  GET /e/<event_slug>  (SSR)
        ▼
Server loads event metadata + participant list
(filtered: only EventParticipants where visible_in_list = true
           and allow_same_oshi_contact = true for requester's oshi overlap)
        │
        ▼
Client renders animated participant card grid
        │
        │  User taps "チェックイン"
        ▼
Server Function: checkin(personaId, eventId)
  → inserts EventParticipant row
  → returns updated participant list
        │
        ▼
Client updates grid (optimistic UI or server re-fetch)
```

### Profile Visibility Flow

```
Request for /u/<handle>
        │
        ├── No session → show only public fields
        ├── Session = connection → show connections_only fields
        └── Session = owner → show all fields + edit controls

DAL enforces this: query always joins FieldVisibility,
never leaks private fields regardless of client request.
```

---

## QR URL Scheme Design

### Recommended Scheme

| URL | Purpose |
|-----|---------|
| `/u/<handle>` | Public profile page for a Persona. The primary QR target. Handle is user-chosen, URL-safe. |
| `/u/<handle>?event=<slug>` | Profile viewed in event context. Server pre-fills connection's context_event_id. |
| `/e/<slug>` | Event room — check-in page and participant list. |
| `/e/<slug>/qr` | Dedicated QR display for an event (for organizers to post on screen/poster). |
| `/join/<token>` | One-time or time-limited invite link. Useful for private events or 1:1 exchange without revealing handle. |

### Design Principles

1. **Handles, not UUIDs** — `/u/yuki_fan` scans better than `/u/a3f8c2d1`. UUIDs leak nothing but break UX. Use handles with UUID as internal key.
2. **Event context in the URL** — Pass `?event=<slug>` so the app knows *where* the scan happened without extra user interaction.
3. **No auth required to view** — Public profiles render server-side without session. This is critical: QR must work for anyone with a camera.
4. **Short slugs for events** — Event slugs should be human-readable and short (e.g., `/e/animejapan-2026`). System-generated fallback: `/e/<8-char-nanoid>`.

---

## Social Graph Architecture

### Graph Shape

なふだ's social graph is a **contextual edge graph**: connections carry metadata about *where* and *when* they were formed.

```
Persona A ──[met at AnimJapan 2026]── Persona B
          ──[met at 聖地 渋谷]──────── Persona C
```

- Connections are stored per-Persona, not per-Account. Switching personas does not merge social graphs.
- For Phase 1: undirected connections (mutual). Both personas see the connection in their list.
- For Phase 2: consider directed follows (Twitter-style) for larger events.

### Privacy Filters on the Graph

1. **同担拒否 filter**: If Persona B has `allow_same_oshi_contact = false`, they are hidden from "同じ現場にいた人" lists when the viewer shares an oshi tag with them.
2. **visible_in_list**: EventParticipant-level opt-in. A persona can be checked-in (for their own record) without appearing in the public participant list.
3. **connection_only fields**: SNS links can be set to show only to confirmed connections, not to anonymous QR scanners.

---

## Cloudflare Workers + Postgres Deployment

### Architecture Constraints

| Constraint | Impact |
|-----------|--------|
| Workers are stateless (no persistent TCP) | Cannot use standard `pg` / `node-postgres` driver. Must use HTTP-based driver. |
| Workers have CPU time limits | Keep DB queries fast; avoid N+1. Batch participant list queries. |
| Workers can have D1 (SQLite) | Not recommended here — schema complexity and connection graph queries suit Postgres. |
| Cloudflare Pages → Workers migration | TanStack Start deploys as a Worker. Phase 0 (Pages) and Phase 1 (Workers) are separate deployments. |

### Recommended Postgres Connection Strategy

**Neon** (preferred): Provides an HTTP-based `@neondatabase/serverless` driver designed for Workers. No connection pool management needed — each request gets a connection via HTTP.

**Supabase**: Also supports `supabase-js` with REST/PostgREST, but direct SQL via Drizzle ORM requires the `postgres.js` driver with `?connection_limit=1` — works but adds latency.

### Environment Topology

```
Phase 0 (now)
  Cloudflare Pages (static)
  ← mock data in TS files, no Workers needed

Phase 1 (production)
  Cloudflare Workers (TanStack Start)
    ├── Worker script (SSR + Server Functions)
    ├── KV: session storage (or use auth library's session)
    ├── R2: avatar image storage
    └── → Neon Postgres (HTTP driver)
         ├── users / personas / tags
         ├── events / event_participants
         └── connections
```

### Key Configuration Points

- Use `wrangler.toml` to bind KV namespaces, R2 buckets, and environment secrets (DB URL, OAuth secrets).
- Neon's `@neondatabase/serverless` works in the Workers environment without any polyfills.
- TanStack Start's Cloudflare Vite plugin (`@cloudflare/vite-plugin`) handles the build pipeline — one `vite build` produces the Worker bundle.
- Session: Better Auth (if chosen) supports Cloudflare Workers with KV as session store.

---

## Suggested Build Order

### Phase 0 Build Order (frontend-only, validate UX)

```
1. Mock data schema (src/mock/data.ts)
   └── Defines: Profile, Event, Participant, Connection shapes
       Reason: All Phase 0 components consume this. Build first.

2. ProfileCardView (/u/:handle)
   └── Depends on: mock Profile data
       Reason: Core QR target. Must work before QR generation is meaningful.

3. QRDisplay component
   └── Depends on: ProfileCardView exists at a known URL
       Reason: QR encodes the profile URL; need URL structure first.

4. EventRoomView (/e/:eventId)
   └── Depends on: mock Event + Participant data
       Reason: The "animated participant grid" UX hypothesis to validate.

5. MockAuthContext + persona switcher
   └── Depends on: ProfileCardView (to show "own" vs "other" view)
       Reason: Simulates multi-persona without real auth.

6. PWA manifest + Cloudflare Pages deploy
   └── Depends on: all above
       Reason: 1-tap install only meaningful with real content.
```

### Phase 1 Build Order (full-stack, incremental)

```
1. DB schema (Drizzle migrations)
   └── Tables: accounts, personas, tags, sns_links, events,
               event_participants, connections, field_visibility
       Reason: Everything else depends on schema. Run migrations first.

2. Auth integration (X OAuth + session)
   └── Depends on: accounts table
       Reason: All write operations require authenticated persona.

3. Persona CRUD + profile page (SSR)
   └── Depends on: auth, personas/tags/sns_links tables
       Reason: Profile page is the QR target — must exist before QR is live.

4. Event creation + check-in
   └── Depends on: personas, events, event_participants tables
       Reason: Check-in is the core social mechanic.

5. Participant list (filtered by visibility + 同担拒否)
   └── Depends on: event_participants + field_visibility
       Reason: Privacy filters must be correct before making list public.

6. Connection creation (from QR scan + event context)
   └── Depends on: personas, connections, events tables
       Reason: Connections need both personas to exist and event context available.

7. Own connection list (who I've met, where)
   └── Depends on: connections + events
       Reason: Context-enriched connection history — the "timeline" view.

8. Field-level visibility controls (UI)
   └── Depends on: field_visibility table + DAL enforcement
       Reason: Privacy controls should be user-facing once data is real.
```

---

## Architecture Decision Records (ADRs)

### ADR-1: Persona as primary identity unit (not Account)

**Decision**: The public-facing unit of identity is `Persona`, not `Account`. QR codes, profile URLs, and connections all reference Persona IDs/handles.

**Rationale**: A single fan may participate in multiple communities with separate identities (anime fan persona vs. idol fan persona). Merging them under one Account surface would break the anonymity promise. Personas are isolated social graphs.

**Implication**: Auth session maps `Account → current Persona`. Switching personas is a session-level operation, not a logout.

### ADR-2: Connection context is first-class data

**Decision**: `connections` table stores `context_event_id` (nullable, filled when connection formed via event QR).

**Rationale**: The core differentiator of なふだ over generic contact apps is "I know *where* we met." This must be in the data model from day one, not retrofit later.

**Implication**: Phase 0 mock data should already model this field (even if always null in mock). DAL query for "connections timeline" groups by event.

### ADR-3: HTTP-based Postgres driver for Workers

**Decision**: Use `@neondatabase/serverless` (Neon's HTTP driver) rather than standard `pg` or `node-postgres`.

**Rationale**: Cloudflare Workers do not support raw TCP connections that traditional Postgres drivers require. Neon's HTTP driver is designed for this environment and adds minimal latency for simple queries.

**Implication**: Must use Neon as Postgres provider, or use Supabase's REST layer. Drizzle ORM supports both via adapter configuration.

### ADR-4: QR codes target profile URLs, not invite tokens (Phase 1 default)

**Decision**: The default QR on a user's profile card encodes `/u/<handle>`. No one-time tokens by default.

**Rationale**: A reusable QR is the right default — you show your phone once at an event, many people scan. One-time tokens are an opt-in feature for high-privacy use cases (Phase 2+).

**Implication**: `/u/<handle>` must render without auth. The handle is semi-public by design. Users who want more privacy can use the `?event=<slug>` context link or a rotating token (future).

### ADR-5: 同担拒否 is a Persona-level flag, not Account-level

**Decision**: `allow_same_oshi_contact` lives on `Persona`, not `Account`.

**Rationale**: A fan may have multiple personas with different social preferences. Their idol fandom persona might be 同担拒否 while their general anime persona is open to all.

**Implication**: Participant list query must join `Persona.allow_same_oshi_contact` and `Persona.tags` (oshi tags) for each viewer to filter correctly. This is a per-viewer, per-event query — cache carefully.

---

## Open Questions

| # | Question | Impact | When to resolve |
|---|----------|--------|-----------------|
| 1 | Auth library: Better Auth vs. Clerk vs. Auth.js? | Session management, Workers compatibility, cost | Before Phase 1 auth implementation |
| 2 | Postgres provider: Neon vs. Supabase? | Driver choice, connection model, pricing | Before Phase 1 DB setup |
| 3 | Connection model: mutual vs. directed (follow)? | Social graph UX, query complexity | Phase 1 design — start mutual, migrate if needed |
| 4 | Participant list update: polling vs. SSE vs. WebSocket? | Real-time UX in event rooms | Phase 1 — polling is fine for MVP |
| 5 | Handle uniqueness scope: global vs. per-event? | URL scheme, collision handling | Before Phase 1 DB schema migration |
| 6 | QR rotation for high-privacy users? | Security, UX complexity | Phase 2 — not needed for Phase 1 |
| 7 | 同担拒否 filter performance: index strategy? | Query latency for large events | Phase 1 — add GIN index on tags JSONB |

---

## Sources & References

- TanStack Start Cloudflare deployment: https://tanstack.com/start/latest/docs/framework/react/hosting/cloudflare
- Neon serverless driver for Workers: https://neon.tech/docs/serverless/serverless-driver
- Cloudflare Workers limits (CPU, TCP): https://developers.cloudflare.com/workers/platform/limits/
- General event-based social graph patterns: LinkedIn's "People You May Know" architecture (contextual edge metadata), Eventbrite's participant model
- QR URL scheme best practices: short handles + context query params (common in conference badge apps like Whova, Grip)
- 同担拒否 culture context: standard privacy practice in Japanese idol/anime fan communities; blocking same-oshi contact is a common social norm
