# Stack Research — なふだ (Nafuda)

**Project:** なふだ — 推し活デジタル名刺アプリ (Fan Activity Digital Business Card Web App)
**Research Date:** 2026-04-21
**Research Type:** Stack dimension — Greenfield PWA with QR exchange, event check-in, social graph
**Milestone Context:** Greenfield — standard 2025 stack for the full project arc (Phase 0 prototype → Phase 1+ production)

---

## Summary

This document prescribes the technology stack for なふだ across two distinct phases:

- **Phase 0 (Prototype):** React + Vite SPA, no backend, mock data only. Goal: validate UX hypotheses as fast as possible.
- **Phase 1+ (Production):** TanStack Start SSR framework, Better Auth, Neon Postgres + Drizzle ORM, deployed on Cloudflare Workers.

The primary constraint is Cloudflare Workers as the deployment target for production. This eliminates Node.js-native packages that require `createRequire` and long-running servers. Every library choice is filtered through edge-compatibility first.

---

## Phase 0 Stack (Prototype — Frontend Only)

| Layer | Choice | Version | Confidence |
|-------|--------|---------|------------|
| Framework | React + Vite | React 19, Vite 6 | HIGH |
| Routing | React Router | v7 | HIGH |
| PWA | vite-plugin-pwa | ^0.21 | HIGH |
| QR Generation | qrcode.react | ^4.2.0 | HIGH |
| State | React Context / useState | built-in | HIGH |
| Styling | Tailwind CSS | v4 | HIGH |
| Package manager | pnpm | v9+ | HIGH |
| Deploy | Cloudflare Pages | — | HIGH |
| Data | TypeScript mock constants | — | HIGH |

### Phase 0 Rationale

**React + Vite (React 19, Vite 6):** TanStack Start is Vite-based, so all component code written in Phase 0 migrates to Phase 1 with zero framework churn. Vite 6 is the latest stable release and is the engine under TanStack Start's hood. React 19 is the current stable release and is required by the latest shadcn/ui components.

**React Router v7:** Simple SPA routing for the prototype. In Phase 1 this is replaced by TanStack Router (bundled with TanStack Start), but route structure should mirror each other to reduce migration friction.

**vite-plugin-pwa ^0.21:** The standard Vite PWA integration. Handles manifest generation, service worker injection (Workbox), and install prompts automatically. In Phase 0 the prototype runs as a static Cloudflare Pages site, so this works without issues. Note: in Phase 1 (TanStack Start + SSR), vite-plugin-pwa has documented compatibility friction with Vite 6 environment API — see Phase 1 PWA section below.

**qrcode.react ^4.2.0:** 1.77M weekly downloads, well-maintained, supports SVG and Canvas output, supports logo embedding (useful for なふだ's branded QR codes). Competing option `react-qr-code` (v2.0.18) is simpler but does not support canvas or logo embedding. `qrcode.react` wins for future flexibility.

**Tailwind CSS v4:** shadcn/ui is now fully compatible with Tailwind v4 (as of March 2025). CSS-first configuration replaces tailwind.config.js. Starting on v4 avoids a migration later.

**Cloudflare Pages:** Static hosting, zero config for SPAs, free tier is generous. Phase 0 has no SSR need.

---

## Phase 1+ Stack (Production — Full-Stack)

| Layer | Choice | Version | Confidence |
|-------|--------|---------|------------|
| Framework | TanStack Start | ^1.154.0 (RC→GA) | HIGH |
| Router | TanStack Router | ^1 (bundled with Start) | HIGH |
| Data fetching | TanStack Query | ^5 | HIGH |
| Auth | Better Auth | ^1.2+ | MEDIUM-HIGH |
| DB | Neon (serverless Postgres) | latest | HIGH |
| ORM | Drizzle ORM | ^0.40+ | HIGH |
| Connection pooling | Cloudflare Hyperdrive | — | HIGH |
| QR Generation | qrcode.react | ^4.2.0 | HIGH |
| QR Scanning | Native camera (Phase 1), html5-qrcode or qr-scanner (Phase 2) | — | MEDIUM |
| Styling | Tailwind CSS v4 + shadcn/ui | Tailwind ^4, shadcn latest | HIGH |
| Forms | React Hook Form + Zod | RHF ^7, Zod ^3.x | HIGH |
| PWA | Custom post-build Workbox + manual manifest | — | MEDIUM |
| Real-time | TanStack Query polling + Cloudflare Durable Objects (event rooms) | — | MEDIUM |
| Deploy | Cloudflare Workers | via @cloudflare/vite-plugin | HIGH |
| Package manager | pnpm | v9+ | HIGH |

---

## Detailed Rationale — Phase 1+

### TanStack Start ^1.154.0

**Why:** TanStack Start reached v1 Release Candidate status. Cloudflare's official documentation lists it as a first-class supported framework alongside Next.js and Remix. The `@cloudflare/vite-plugin` is the mechanism: running `wrangler deploy` on a TanStack Start project auto-detects the framework and emits the Worker bundle. TanStack Start uses Vite 6 internally, so Phase 0 component code is reusable without modification.

**Vs. Next.js:** Next.js is heavier, not natively Cloudflare-first (requires OpenNext adapter), and the migration from Vite-based Phase 0 adds friction. TanStack Start's Vite lineage is the decisive advantage.

**Vs. Remix:** Remix has a larger ecosystem but adds weight and its own conventions. TanStack Router's end-to-end type safety (route params, search params, loader data) is better than Remix's for a TypeScript-first project.

**Risk:** Still RC as of research date. Monitor the GA release before starting Phase 1. The RC milestone has stated "no API-breaking changes before 1.0."

**Confidence:** HIGH (official Cloudflare support confirmed, RC→GA imminent)

---

### TanStack Router ^1

**Why:** Bundled with TanStack Start. File-based routing with full TypeScript type inference for params, search params, and loader return types. This eliminates entire categories of runtime errors common in string-based routing.

**Confidence:** HIGH

---

### TanStack Query ^5

**Why:** Server-state management for all data fetching, caching, and background refetching. In Phase 1, event check-in lists use `refetchInterval` polling (e.g., 5s) to show "people at this event" lists in near-real-time without requiring a WebSocket infra layer. For the initial release this is sufficient — WebSocket upgrade can be done in Phase 2 using Cloudflare Durable Objects.

Pattern:
```ts
useQuery({
  queryKey: ['event', eventId, 'attendees'],
  queryFn: () => fetchAttendees(eventId),
  refetchInterval: 5000, // poll every 5s when component is mounted
})
```

**Confidence:** HIGH

---

### Better Auth ^1.2+

**Why:** Open-source auth library with first-class Cloudflare Workers support (no Node.js APIs), X (Twitter) OAuth 2.0 provider built in, anonymous session support (critical for "register-later" UX in なふだ), and session storage compatible with Cloudflare KV or D1.

**Known Issue:** Better Auth v1.3.0-beta9+ had a regression with X OAuth (`Missing required parameter [client_id]`). Use a stable 1.2.x release until the bug is confirmed fixed upstream, or pin to a version prior to the regression.

**Vs. Clerk:** Clerk has a generous free tier but is a SaaS vendor with pricing risk at scale, and its Cloudflare Workers support is via Edge middleware (not native Workers execution). Better Auth keeps auth logic in-repo, zero vendor lock-in.

**Vs. Auth.js (NextAuth):** Auth.js v5 supports Workers but is primarily Next.js-oriented and has limited support for TanStack Start. Better Auth has a community TanStack Start + Cloudflare D1/KV template demonstrating production-ready patterns.

**Key feature for なふだ:** Anonymous auth (no account required to share QR / view profile), upgradeable to X OAuth on opt-in. Better Auth's anonymous plugin handles this pattern natively.

**Confidence:** MEDIUM-HIGH (X OAuth regression is a known risk — pin version carefully)

---

### Neon (Serverless Postgres) + Cloudflare Hyperdrive

**Why Neon over Cloudflare D1:**

D1 is SQLite-at-the-edge. For なふだ's social graph (users ↔ connections ↔ events ↔ checkins), the relational complexity quickly hits SQLite's practical limits:
- No full-text search (FTS5 not available in D1) — needed for tag/handle search
- No `pgvector` extension — needed if AI-based recommendations added later
- Write throughput limits — checkin storms at popular live events could saturate D1
- Complex multi-table joins for "who else was at this event" risk Cartesian product explosion without Postgres query planner

Neon Postgres gives the full PostgreSQL feature set (jsonb, arrays, row-level security, pgvector future option) with a serverless autoscaling model and a generous free tier (100 projects, 0.5 GB storage per branch).

**Why Cloudflare Hyperdrive:** Postgres connections are expensive to establish per-Worker-invocation. Hyperdrive maintains a global pool of persistent connections to Neon and routes Workers to the nearest pool, eliminating cold-connection overhead. This is Cloudflare's official recommended pattern for Workers + external Postgres.

```
Worker (Cloudflare edge) → Hyperdrive (connection pool, global) → Neon Postgres (regional)
```

Latency characteristics: Worker-to-Hyperdrive is in-network (<10ms). Hyperdrive-to-Neon adds 150–200ms for cold queries from distant regions but cached read queries are served from Hyperdrive's edge cache.

**Confidence:** HIGH

---

### Drizzle ORM ^0.40+

**Why:** TypeScript-first ORM with first-class Cloudflare D1 and Neon drivers. Schema is defined in TypeScript, migrations are SQL files (inspectable/reviewable), and the Drizzle Kit CLI handles migration generation, push, and the Drizzle Studio GUI.

**Vs. Prisma:** Prisma requires a Rust-based query engine that does not run in Cloudflare Workers. This alone eliminates Prisma from consideration.

**Vs. Kysely:** Kysely is excellent but requires manual schema typing. Drizzle infers types from the schema definition, reducing boilerplate.

```ts
// Drizzle schema example
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  handle: text('handle').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
})
```

**Confidence:** HIGH

---

### Tailwind CSS v4 + shadcn/ui

**Why Tailwind v4:** CSS-first configuration (`@theme` directive in CSS, no `tailwind.config.js`). Full support confirmed in TanStack Start via `@cloudflare/vite-plugin`. shadcn/ui's March 2025 update makes all components v4-compatible with React 19.

**Why shadcn/ui:** Copy-paste component model means no runtime dependency on a component library. Components live in `src/components/ui/` and are fully customizable — essential for なふだ's "推しカラー / themed" aesthetic. Tailwind v4 + shadcn is the de-facto standard for 2025 React projects.

**What NOT to use — MUI / Chakra UI:** These are runtime CSS-in-JS libraries that add bundle weight and complicate SSR hydration. Not suitable for Cloudflare Workers deployment.

**Confidence:** HIGH

---

### Forms: React Hook Form ^7 + Zod ^3.x

**Why React Hook Form over TanStack Form:** shadcn/ui has first-class RHF integration. TanStack Form is newer, promising, but shadcn/ui's TanStack Form adapter was in early stages as of research date. For profile creation forms and tag input, RHF is production-proven.

**Why Zod v3 (not v4):** Zod v4 is faster but as of May 2025 RHF's `@hookform/resolvers` had incomplete v4 support. TanStack Form's Zod 4 support was also still in progress. Pin Zod ^3.23 until resolver compatibility is confirmed in stable RHF releases.

**Upgrade path:** When RHF resolvers ship Zod v4 support (watch `@hookform/resolvers` releases), upgrade then.

**Confidence:** HIGH (Zod v3 pin), MEDIUM (Zod v4 readiness timeline uncertain)

---

### QR Code Generation: qrcode.react ^4.2.0

**Why:** 1.77M weekly downloads, SVG output (scalable, screen-reader accessible), Canvas output (for download-as-PNG), built-in logo/image embedding. Phase 1 feature: なふだ branded QR codes with a custom center logo.

**QR Scanning (Phase 0–1):** Mobile native camera (iOS/Android system QR scanner reads URLs natively). No in-app scanner needed. This is explicitly "Out of Scope" per PROJECT.md until Phase 2.

**QR Scanning (Phase 2):** Evaluate `html5-qrcode` (^2.3) or `qr-scanner` (^1.4). Both are actively maintained and use the browser's `getUserMedia` API. Decision deferred to Phase 2 planning.

**Confidence:** HIGH (generation), MEDIUM (Phase 2 scanner choice — deferred)

---

### PWA: Custom Post-Build Workbox

**Why not vite-plugin-pwa directly:** `vite-plugin-pwa` has a documented incompatibility with TanStack Start's production builds as of late 2025 — the plugin's build steps (service worker bundling, asset precaching) do not execute correctly when TanStack Start's Vite environment API is active. Issues are tracked in TanStack/router#4988.

**Recommended approach:** Use `vite-plugin-pwa` in manifest-generation-only mode (no service worker injection from the plugin), then generate the service worker post-build via a Workbox CLI script. Alternatively, use `serwist` with a custom Vite plugin — community members have working examples.

**PWA manifest minimum for なふだ:**
```json
{
  "name": "なふだ",
  "short_name": "なふだ",
  "display": "standalone",
  "theme_color": "#[推しカラー — configurable]",
  "background_color": "#ffffff",
  "start_url": "/",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Confidence:** MEDIUM (workaround required — integration not plug-and-play with TanStack Start)

---

### Real-Time Event Check-In: Polling (Phase 1) → Durable Objects (Phase 2)

**Phase 1 approach — TanStack Query polling:**
- "同じ現場にいた人" list polls every 5–10 seconds
- Acceptable UX at event scale: a few hundred attendees, list updates feel live
- No additional infrastructure beyond existing Workers + Neon

**Phase 2 upgrade — Cloudflare Durable Objects:**
When real-time feels too slow or concurrent event rooms need sub-second updates, Cloudflare Durable Objects are the correct solution:
- Each event room = one Durable Object instance (globally unique, persistent state)
- WebSocket connections per event: Durable Objects support thousands of concurrent WS connections per instance
- Built-in SQLite storage private to each Durable Object — check-in state lives in the DO, not the main DB

**What NOT to use — Pusher / Ably:** Third-party WebSocket SaaS adds latency, cost, and a dependency outside Cloudflare's network. Cloudflare Durable Objects are the native alternative.

**What NOT to use — Supabase Realtime:** Supabase Realtime requires connecting to a Supabase instance. なふだ uses Neon for Postgres; mixing Supabase Realtime with Neon adds operational complexity for no benefit.

**Confidence:** HIGH (polling approach is correct for Phase 1), MEDIUM (Durable Objects are the right Phase 2 direction but implementation details need a dedicated research phase)

---

## What NOT to Use — Summary

| Technology | Why Excluded |
|-----------|--------------|
| Next.js | Requires OpenNext adapter for Cloudflare Workers, not natively edge-first |
| Prisma | Rust query engine incompatible with Cloudflare Workers |
| Cloudflare D1 (as primary DB) | SQLite limitations for social graph complexity, no FTS5, write throughput limits |
| Supabase Auth | Ties auth to Supabase infra; なふだ uses Neon not Supabase Postgres |
| Clerk | SaaS vendor lock-in, not native Workers execution |
| MUI / Chakra UI | CSS-in-JS runtime weight, SSR hydration complexity |
| Firebase / Firestore | NoSQL impedance mismatch for relational social graph, no Cloudflare edge integration |
| Pusher / Ably | Third-party WebSocket SaaS — Cloudflare Durable Objects are the correct native alternative |
| Zod v4 (now) | RHF resolver and TanStack Form support incomplete as of research date |
| NFC | Per PROJECT.md: device-dependency too high, QR covers the same use case |

---

## Dependency Version Table

| Package | Pinned Version | Notes |
|---------|---------------|-------|
| react | ^19.0.0 | Required for latest shadcn/ui |
| react-dom | ^19.0.0 | — |
| vite | ^6.0.0 | Base bundler |
| @tanstack/react-start | ^1.154.0 | Phase 1; monitor GA |
| @tanstack/react-router | ^1.0.0 | Bundled with Start |
| @tanstack/react-query | ^5.0.0 | Server state |
| better-auth | ^1.2.x | Pin below 1.3.0-beta9 regression |
| drizzle-orm | ^0.40.0 | — |
| drizzle-kit | ^0.30.0 | CLI companion |
| @neondatabase/serverless | ^0.10.0 | Neon http driver |
| tailwindcss | ^4.0.0 | CSS-first config |
| qrcode.react | ^4.2.0 | QR generation |
| react-hook-form | ^7.50.0 | Forms |
| @hookform/resolvers | ^3.9.0 | RHF + Zod integration |
| zod | ^3.23.0 | Validation (pin v3) |
| vite-plugin-pwa | ^0.21.0 | Manifest only in Phase 1 |
| @cloudflare/vite-plugin | latest | Workers deploy plugin |
| wrangler | ^3.0.0 | Cloudflare CLI |
| pnpm | ^9.0.0 | Package manager |

---

## Open Questions for Phase 1 Planning

1. **Better Auth X OAuth regression** — Verify fix status before Phase 1 auth implementation. Test against X OAuth sandbox before committing to version.
2. **PWA + TanStack Start integration** — Spike needed in Phase 1 to verify post-build Workbox approach works end-to-end on Cloudflare Pages/Workers.
3. **Hyperdrive setup** — Cloudflare Hyperdrive is available on all Workers paid plans. Confirm free tier / prototype budget constraints before Phase 1.
4. **Neon region selection** — Neon databases are regional. For a Japan-focused app (推し活), consider `ap-northeast-1` (Tokyo) as the primary Neon region for lowest latency from Japanese users.
5. **同担拒否 filtering in SQL** — Design the "people at this event" query to respect the `dojin_reject` flag at the DB query level (not application layer) to avoid leaking handles even in client-side logic.

---

## Sources

- [TanStack Start · Cloudflare Workers docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
- [TanStack Start v1 Release Candidate | TanStack Blog](https://tanstack.com/blog/announcing-tanstack-start-v1)
- [Cloudflare for TanStack](https://tanstack.com/partners/cloudflare)
- [Better Auth Twitter/X OAuth docs](https://better-auth.com/docs/authentication/twitter)
- [Better Auth + Cloudflare Workers integration guide (Feb 2026)](https://medium.com/@senioro.valentino/better-auth-cloudflare-workers-the-integration-guide-nobody-wrote-8480331d805f)
- [better-auth-cloudflare GitHub](https://github.com/zpg6/better-auth-cloudflare)
- [Use Neon with Cloudflare Hyperdrive — Neon Docs](https://neon.com/docs/guides/cloudflare-hyperdrive)
- [Use Neon with Cloudflare Workers — Neon Docs](https://neon.com/docs/guides/cloudflare-workers)
- [Neon · Cloudflare Hyperdrive docs](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/)
- [Drizzle ORM — Cloudflare D1](https://orm.drizzle.team/docs/connect-cloudflare-d1)
- [Drizzle ORM — Neon](https://orm.drizzle.team/docs/connect-neon)
- [Cloudflare D1 vs Neon vs Supabase Postgres in 2026 | DevToolReviews](https://www.devtoolreviews.com/reviews/cloudflare-d1-vs-neon-vs-supabase-postgres-2026)
- [Cloudflare D1 — Limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Cloudflare Durable Objects — Overview](https://developers.cloudflare.com/durable-objects/)
- [Tailwind v4 — shadcn/ui](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui Changelog](https://ui.shadcn.com/docs/changelog)
- [qrcode.react — npm](https://www.npmjs.com/package/qrcode.react)
- [react-qr-code — GitHub](https://github.com/rosskhanas/react-qr-code)
- [vite-plugin-pwa incompatible with TanStack Start production builds · Issue #4988](https://github.com/TanStack/router/issues/4988)
- [PWA Offline Support with TanStack Start — Robel Estifanos](https://robelest.com/journal/pwa-tanstack-start)
- [TanStack Query — Polling docs](https://tanstack.com/query/latest/docs/framework/react/guides/polling)
- [TanStack Form vs React Hook Form — LogRocket](https://blog.logrocket.com/tanstack-form-vs-react-hook-form/)
- [Does TanStack Form support Zod 4? · Issue #1529](https://github.com/TanStack/form/issues/1529)
- [Cloudflare D1: SQLite at the Edge After 6 Months in Production — DEV Community](https://dev.to/whoffagents/cloudflare-d1-sqlite-at-the-edge-after-6-months-in-production-551j)
