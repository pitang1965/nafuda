# Phase 3: QR・コネクション・PWA - Research

**Researched:** 2026-04-26
**Domain:** QR display, connection recording, PWA / Service Worker (TanStack Start + Cloudflare Workers)
**Confidence:** MEDIUM — Core stack verified, PWA workaround confirmed from multiple sources

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- `/home` ルートを `/me` にリネーム（プロトタイプ https://nafuda-dxn.pages.dev/me と同一スキーム）
- `/me` はシンプルな名刺画面（プロフィール表示 ＋ α にとどめる）
- 「QRコードを表示」ボタンを配置 → タップで下からスライドアップするダイアログ（react-modal-sheet 使用、Phase 0 と同パターン）
- 「イベントにチェックイン」ボタンは廃止
- トップバーに「イベント」リンクを追加（「編集」「イベント」「ログアウト」の3リンク構成）
- 「つながる」ボタンは相手の公開プロフィールページ（`/u/$urlId`）に配置
- ログイン必須：未ログインユーザーはログイン画面に誘導
- 一方通行：ボタンを押した側のみが記録され、QRを見せた側の承認は不要
- チェックイン中の場合はイベントコンテキスト（イベント名・会場・日付）を自動付与
- コネクション一覧は専用ページ `/connections` に独立（`/me` には表示しない）
- コネクションカード表示項目: アバター・表示名・つながった日時（イベントコンテキストがあれば: イベント名・会場名・日付も表示）
- カードをクリック → 相手の公開プロフィールページに遷移
- QRオフライン表示: `/me` 画面（プロフィールQR含む）を Service Worker でキャッシュ
- QRダイアログは react-modal-sheet（Phase 0 で使用済みのライブラリ）でボトムシート形式

### Claude's Discretion

- PWAインストールプロンプトの具体的なタイミングと UI デザイン
- Service Worker のキャッシュ戦略詳細（キャッシュする範囲）
- 「つながる」後のフィードバック表示（トースト等）
- `/connections` ページのソート順・空状態デザイン

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONN-01 | ユーザーは自分のプロフィールQRコードを表示できる（オフラインでも表示可能） | qrcode.react v4 (already installed) + react-modal-sheet + Service Worker cache |
| CONN-02 | QRを読み取ってプロフィールを閲覧した後、明示的に「つながる」を選択した場合のみコネクションが記録される（スキャン自動記録なし） | New `connections` DB table + createServerFn pattern (established in codebase) |
| CONN-03 | コネクション記録にはイベント・日付・会場のコンテキストが付与される（チェックイン中の場合） | `getActiveCheckin` already returns event context; pass eventId on connection insert |
| PWA-01 | ユーザーはアプリをホーム画面に追加できる（PWAインストール） | manifest.webmanifest already exists in dist; `beforeinstallprompt` hook needed |
| PWA-02 | QRコード表示はオフラインでも動作する（Service Workerキャッシュ） | Custom Vite plugin / Workbox manual approach — vite-plugin-pwa incompatible with TanStack Start |
</phase_requirements>

---

## Summary

Phase 3 has three distinct technical areas: (1) QR表示 — mostly done (qrcode.react already installed, legacy QRBottomSheet component exists in `src/legacy/`), needs only to install react-modal-sheet and wire to new `/me` route; (2) コネクション記録 — new DB table + server function following established patterns; (3) PWA — the hardest part because `vite-plugin-pwa` is incompatible with TanStack Start's Vite 6 environment API.

The PWA challenge is confirmed by multiple sources (GitHub issue #4988, Discussion #4770). The project already has Workbox packages installed (`workbox-build`, `workbox-precaching`, etc. visible in `node_modules/`) and a working `dist/sw.js` from Phase 0. The correct approach is a **custom Vite plugin** that uses `workbox-build`'s `generateSW` or `injectManifest` API directly, bypassing `vite-plugin-pwa` entirely. The manifest and icons already exist in `public/` (`icon-192.png`, `icon-512.png`, `manifest.webmanifest`).

The `beforeinstallprompt` PWA install prompt is a browser API — no library needed. A simple hook captures the event and exposes a `promptInstall()` function. iOS Safari requires a manual "share → Add to Home Screen" instruction since `beforeinstallprompt` does not fire on iOS.

**Primary recommendation:** Install `react-modal-sheet`, write custom SW Vite plugin using existing Workbox packages, add `connections` table to schema.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qrcode.react | 4.2.0 | QR code SVG generation | Already installed; established SSR guard pattern in codebase (`src/routes/e/$slug.tsx`) |
| react-modal-sheet | 5.6.0 | Bottom sheet for QR dialog | Required by CONTEXT.md; legacy component `src/legacy/QRBottomSheet.tsx` exists as reference |
| motion | 12.x | Peer dependency of react-modal-sheet | Already installed in project |
| workbox-build | (installed) | Service worker generation | Already in node_modules; used by custom Vite plugin approach |
| workbox-precaching | (installed) | Precache static assets in SW | Already in node_modules |
| workbox-routing | (installed) | Route-based caching strategies in SW | Already in node_modules |
| drizzle-orm | 0.45.2 | Add `connections` table | Already in use; same generate/migrate workflow |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| workbox-strategies | (installed) | NetworkFirst/CacheFirst strategies | SW route caching for dynamic content |
| workbox-navigation-preload | (installed) | Navigation request optimization | Optional — speeds up SW navigation requests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Workbox SW plugin | vite-plugin-pwa | vite-plugin-pwa is confirmed incompatible with TanStack Start + Vite 6; custom plugin is the only working path |
| Custom Workbox SW plugin | Serwist | Serwist also had issues post-TanStack Start v1.121; custom Workbox approach uses already-installed packages |
| `beforeinstallprompt` hook (custom) | react-use-pwa | No library needed; standard Web API hook is 15 lines |

**Installation (new packages only):**
```bash
pnpm add react-modal-sheet
```
> Note: `motion` is already installed. Workbox packages are already in `node_modules`. No additional installs needed for PWA.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── routes/
│   ├── _protected/
│   │   ├── me.tsx           # RENAME from home.tsx (was /home → now /me)
│   │   └── connections.tsx  # NEW: /connections route
│   └── u/
│       └── $urlId.tsx       # MODIFY: add "つながる" button
├── server/
│   ├── db/
│   │   └── schema.ts        # ADD: connections table
│   └── functions/
│       └── connection.ts    # NEW: createConnection, getMyConnections
├── components/
│   ├── QRBottomSheet.tsx    # COPY from legacy/ (already working)
│   └── PwaInstallBanner.tsx # NEW: install prompt UI
└── hooks/
    └── usePwaInstall.ts     # NEW: beforeinstallprompt hook

sw.ts                        # NEW: Service Worker source (project root or src/)
vite.config.ts               # MODIFY: add custom PWA Vite plugin
```

### Pattern 1: Route Rename `/home` → `/me`
**What:** Rename `src/routes/_protected/home.tsx` to `src/routes/_protected/me.tsx`. TanStack Router file-based routing maps filename to URL path within the layout segment.
**When to use:** Required per CONTEXT.md locked decision.
**Key detail:** The route ID in `routeTree.gen.ts` is auto-regenerated by Vite plugin — do NOT manually edit `routeTree.gen.ts`. After rename, the route becomes `/_protected/me` with path `/me`.

### Pattern 2: QR Bottom Sheet (reuse legacy pattern)
**What:** `src/legacy/QRBottomSheet.tsx` is a complete, tested implementation. Copy to `src/components/QRBottomSheet.tsx`.
**When to use:** Triggered by "QRコードを表示" button on `/me` page.
**Example:**
```typescript
// Source: src/legacy/QRBottomSheet.tsx (verified working in Phase 0)
import { Sheet } from 'react-modal-sheet'
import { QRCodeSVG } from 'qrcode.react'

// CRITICAL: SSR guard — qrcode.react requires browser environment
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])

// QR URL pattern: /u/{urlId} (default persona public profile)
const qrUrl = `${window.location.origin}/u/${urlId}`
```

### Pattern 3: Connection Recording Server Function
**What:** `createServerFn` that records a connection. Checks if caller is authenticated, retrieves caller's active checkin for event context, inserts to `connections` table.
**When to use:** Called from "つながる" button on `/u/$urlId` public profile page.
**Example:**
```typescript
// Source: established pattern from src/server/functions/event.ts
export const createConnection = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    targetUrlId: z.string(),  // profile being viewed (connection target)
  }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // Resolve target persona from urlId
    // Get caller's active checkin for event context (getActiveCheckin pattern)
    // Insert to connections table (idempotent: ignore 23505 unique violation)
    // Return connection record
  })
```

### Pattern 4: Custom PWA Vite Plugin (Service Worker)
**What:** A Vite plugin using `workbox-build`'s `generateSW` API, called in the `writeBundle` hook (post-build). The plugin generates `sw.js` in the output directory with precached assets and a NetworkFirst strategy for navigation.
**When to use:** Required because `vite-plugin-pwa` is incompatible with TanStack Start + Vite 6.

```typescript
// Source: Community pattern from TanStack/router Discussion #4770
// vite.config.ts
import { generateSW } from 'workbox-build'

function pwaPlugin(): Plugin {
  return {
    name: 'nafuda-pwa',
    apply: 'build',
    async writeBundle() {
      await generateSW({
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        swDest: 'dist/sw.js',
        skipWaiting: true,
        clientsClaim: true,
        // Cache /me page + its assets for offline QR display
        runtimeCaching: [
          {
            urlPattern: /^\/me/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nafuda-pages',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      })
    },
  }
}
```

### Pattern 5: PWA Install Prompt Hook
**What:** Captures `beforeinstallprompt` event, stores it, exposes `promptInstall()`.
**When to use:** Show install banner on QR display (per CONTEXT.md suggestion).
```typescript
// Source: MDN Web Docs beforeinstallprompt + common React hook pattern
function usePwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const promptInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    setPrompt(null)
  }

  return { canInstall: !!prompt, promptInstall }
}
```

### Pattern 6: `connections` Table Schema
**What:** New Drizzle table. `fromPersonaId` is the connector (button presser). `toPersonaId` is the target (QR owner). Optional FK to `eventCheckins` for context.
```typescript
// Drizzle schema pattern (follows existing schema.ts conventions)
export const connections = pgTable('connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromPersonaId: uuid('from_persona_id').notNull().references(() => personas.id),
  toPersonaId: uuid('to_persona_id').notNull().references(() => personas.id),
  fromUserId: text('from_user_id').notNull(),  // for auth verification
  // Event context (nullable — only set if fromUser was checked in)
  eventId: uuid('event_id').references(() => events.id),
  eventName: text('event_name'),    // denormalized for display without JOIN
  venueName: text('venue_name'),    // denormalized
  eventDate: timestamp('event_date', { withTimezone: true }),
  connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate connections: one direction per persona pair
  uniqueConn: unique().on(table.fromPersonaId, table.toPersonaId),
}))
```

### Anti-Patterns to Avoid
- **Editing `routeTree.gen.ts` manually:** Auto-generated; Vite plugin regenerates on save. Rename the file, let the plugin do the rest.
- **Registering SW in server-rendered HTML head only:** SW registration must be client-side; use `useEffect` in a client-only component or `registerSW.js` pattern (already in `dev-dist/registerSW.js`).
- **Recording connection on QR scan:** CONN-02 explicitly requires explicit button press. Never record on page load or URL visit.
- **Storing private session data in SW cache:** Only cache public `/me` HTML/assets. Do NOT cache API responses that include private persona data.
- **Using `vite-plugin-pwa` directly:** Confirmed incompatible. Use custom plugin.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code SVG generation | Custom SVG pixel grid | qrcode.react `QRCodeSVG` | Error correction, encoding modes, version selection — very complex |
| Bottom sheet animation | CSS + touch events | react-modal-sheet | Scroll locking, rubber band, accessibility, iOS safe area — 1000+ lines |
| Workbox manifest injection | Custom file hash builder | `workbox-build` generateSW API | Cache busting, revision hashing, glob pattern matching |
| Duplicate connection prevention | Application-level dedup check | DB UNIQUE constraint + 23505 catch | Race conditions between concurrent requests |

**Key insight:** The Workbox packages are already installed. The only "new" work is wiring them together in a Vite plugin, not implementing caching algorithms from scratch.

---

## Common Pitfalls

### Pitfall 1: vite-plugin-pwa Incompatibility
**What goes wrong:** Adding `vite-plugin-pwa` to `vite.config.ts` alongside `tanstackStart()` results in the SW not being generated in the production build (build steps are silently skipped).
**Why it happens:** vite-plugin-pwa does not support Vite 6's multi-environment build API that TanStack Start relies on.
**How to avoid:** Use the custom `workbox-build` Vite plugin approach documented in Architecture Pattern 4. Never add `vite-plugin-pwa` to this project.
**Warning signs:** `dist/sw.js` is missing or unchanged after `pnpm build`. Check `dist/` contents after build.

### Pitfall 2: qrcode.react SSR Error
**What goes wrong:** `QRCodeSVG` throws during server-side render because it accesses browser APIs.
**Why it happens:** TanStack Start renders on the server; qrcode.react is browser-only.
**How to avoid:** Always wrap in `mounted` state guard — this pattern is already established in `src/routes/e/$slug.tsx`:
```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])
if (!mounted) return <div className="w-48 h-48 bg-gray-100 rounded-lg animate-pulse" />
```
**Warning signs:** Hydration mismatch errors in console, SSR crash.

### Pitfall 3: window.location in Server Context
**What goes wrong:** `window.location.origin` used to build QR URL throws `ReferenceError: window is not defined` on server.
**Why it happens:** Loader and server functions run on the server.
**How to avoid:** Fetch `window.location.href` only in `useEffect` (post-mount), as demonstrated in `src/routes/e/$slug.tsx` (`setCurrentUrl(window.location.href)`).
**Warning signs:** Build or runtime error mentioning `window is not defined`.

### Pitfall 4: react-modal-sheet Not Installed
**What goes wrong:** Import fails because `react-modal-sheet` is not in `node_modules` (confirmed absent from current install).
**Why it happens:** It was used in Phase 0 legacy code but never added to the production package.json.
**How to avoid:** `pnpm add react-modal-sheet` as first task. Verify `motion` peer dep is satisfied (already installed).
**Warning signs:** Module not found error on import.

### Pitfall 5: Connection Self-Referencing
**What goes wrong:** User navigates to their own public profile and presses "つながる" — creates a self-connection.
**Why it happens:** The `/u/$urlId` page doesn't know if viewer == profile owner without session check.
**How to avoid:** In the `createConnection` server function AND in the UI, check if `session.user.id === targetUser.id` and throw/hide button accordingly.
**Warning signs:** Connection record where `fromPersonaId === toPersonaId`.

### Pitfall 6: iOS PWA Install Prompt
**What goes wrong:** `beforeinstallprompt` event never fires on iOS Safari. Install banner never shows.
**Why it happens:** iOS Safari does not implement `beforeinstallprompt`. PWA installation is via Share menu → Add to Home Screen.
**How to avoid:** Detect iOS user agent and show a different manual instruction banner ("Safariのシェアボタン → ホーム画面に追加"). This is Claude's discretion per CONTEXT.md.
**Warning signs:** `canInstall` is always `false` on iOS despite valid manifest.

### Pitfall 7: SW Registration Timing
**What goes wrong:** Service worker is registered before the page is interactive, slowing first load.
**Why it happens:** SW registration in `<head>` or top of body.
**How to avoid:** Register SW after load event or in a `useEffect` with low priority. The existing `registerSW.js` pattern from Phase 0 defers registration.
**Warning signs:** Lighthouse performance score drops.

---

## Code Examples

Verified patterns from official sources:

### QRCodeSVG with SSR guard (established project pattern)
```typescript
// Source: src/routes/e/$slug.tsx (verified in Phase 2)
function QRCodeDisplay({ url }: { url: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <div className="w-48 h-48 bg-gray-100 rounded-lg animate-pulse" />
  return (
    <QRCodeSVG
      value={url}
      size={220}
      level="M"        // Medium error correction — good balance of density vs. readability
      marginSize={4}
      bgColor="#FFFFFF"
      fgColor="#000000"
    />
  )
}
```

### react-modal-sheet bottom sheet (from legacy reference)
```typescript
// Source: src/legacy/QRBottomSheet.tsx (Phase 0 reference — verified working)
// IMPORTANT: Named export { Sheet }, NOT default export
import { Sheet } from 'react-modal-sheet'

<Sheet isOpen={isOpen} onClose={onClose} detent="content">
  <Sheet.Container>
    <Sheet.Header />
    <Sheet.Content>
      {/* content */}
    </Sheet.Content>
  </Sheet.Container>
  <Sheet.Backdrop onTap={onClose} />
</Sheet>
```

### Drizzle unique constraint pattern (from schema.ts conventions)
```typescript
// Source: drizzle-orm docs + existing schema.ts patterns
import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const connections = pgTable('connections', {
  // ... fields
}, (table) => ({
  uniqueConn: unique().on(table.fromPersonaId, table.toPersonaId),
}))
```

### Workbox generateSW API (for custom Vite plugin)
```typescript
// Source: workbox-build package (already installed)
import { generateSW } from 'workbox-build'

await generateSW({
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
  swDest: 'dist/sw.js',
  skipWaiting: true,
  clientsClaim: true,
  navigateFallback: '/index.html',  // SPA fallback
  runtimeCaching: [{
    urlPattern: /^\/me/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'nafuda-pages',
      networkTimeoutSeconds: 3,
    },
  }],
})
```

### Optional session check in public route (established pattern)
```typescript
// Source: src/routes/e/$slug.tsx (Phase 2 verified pattern)
// Returns null instead of throwing redirect — used on public pages that need auth awareness
const getOptionalSession = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    return await auth.api.getSession({ headers: request.headers })
  })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `vite-plugin-pwa` auto-integration | Custom `workbox-build` Vite plugin | TanStack Start v1 + Vite 6 (~2025) | Must write 30-line plugin instead of config object |
| `react-router-dom` | `react-router` (unified) | Phase 0 established | Already in use — no change needed |
| `framer-motion` | `motion` | Phase 0 established | `motion` is already installed; react-modal-sheet uses it as peer dep |
| Default export `Sheet` | Named export `{ Sheet }` | Phase 0 established | `import { Sheet } from 'react-modal-sheet'` only |

**Deprecated/outdated:**
- `framer-motion`: Merged into `motion` package. This project already uses `motion` — do not install `framer-motion`.
- `vite-plugin-pwa` in this project: Confirmed incompatible. Do not use.

---

## Open Questions

1. **SW registration in TanStack Start SSR context**
   - What we know: `registerSW.js` already exists in `dev-dist/` from Phase 0 prototype build. Pattern works in static SPA.
   - What's unclear: Where exactly to call `navigator.serviceWorker.register('/sw.js')` in a TanStack Start SSR app without causing hydration issues.
   - Recommendation: Register in `__root.tsx`'s client-side `useEffect`, or use a dedicated `RegisterSW` client component that checks `typeof window !== 'undefined'`.

2. **`generateSW` vs `injectManifest` for TanStack Start SSR**
   - What we know: `generateSW` creates a complete SW; `injectManifest` requires writing a custom `sw.ts` source file.
   - What's unclear: TanStack Start SSR doesn't have a single `index.html` — it renders HTML on the server. The `navigateFallback` option in `generateSW` may not apply.
   - Recommendation: Use `injectManifest` with a minimal `sw.ts` that handles navigation requests with NetworkFirst to serve the SSR-rendered HTML. This is the approach that succeeded in the community (Discussion #4770).

3. **QR URL scheme — default persona vs. share token**
   - What we know: Current `/me` shows `currentPersona` (persona switcher). `/u/$urlId` shows default persona.
   - What's unclear: If user has multiple personas and switches to non-default on `/me`, the QR should show the share token URL (`/u/$urlId/p/$shareToken`) not just `/u/$urlId`.
   - Recommendation: QR value = `${origin}/u/${urlId}/p/${currentPersona.shareToken}` — always resolves to the currently displayed persona, not just the default.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/routes/e/$slug.tsx` — QRCodeSVG SSR guard pattern (verified in Phase 2)
- Codebase inspection: `src/legacy/QRBottomSheet.tsx` — react-modal-sheet reference implementation
- Codebase inspection: `src/server/db/schema.ts` — Drizzle table patterns
- Codebase inspection: `node_modules/` listing — confirmed Workbox packages installed, react-modal-sheet NOT installed
- Codebase inspection: `dist/manifest.webmanifest` + `dist/sw.js` — existing PWA artifacts from Phase 0

### Secondary (MEDIUM confidence)
- GitHub issue TanStack/router #4988 — vite-plugin-pwa incompatibility confirmed open, no fix
- GitHub Discussion TanStack/router #4770 — custom Serwist/Workbox plugin approach working
- github.com/Temzasse/react-modal-sheet README (fetched) — v5.6.0, named export `{ Sheet }`, SSR example exists
- npmjs.com/package/qrcode.react — v4.2.0 current, `QRCodeSVG` named export
- MDN Web Docs `beforeinstallprompt` — browser API, iOS does not support

### Tertiary (LOW confidence)
- robelest.com/journal/pwa-tanstack-start — 403 response, could not verify article content
- deepwiki.com TanStack Start PWA configuration — basic manifest setup only, no SW details

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase or npm registry
- Architecture: MEDIUM — route patterns and DB patterns from existing code; PWA custom plugin confirmed by community but specific `injectManifest` implementation needs validation
- Pitfalls: HIGH — most are confirmed by codebase inspection (SSR guard, window.location) or official issue trackers (vite-plugin-pwa)

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (PWA workaround may improve sooner if vite-plugin-pwa merges Vite 6 support)
