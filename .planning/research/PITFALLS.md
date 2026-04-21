# PITFALLS — なふだ

> Research Type: Pitfalls — QR-based event networking / fan community web app
> Date: 2026-04-21
> Project: なふだ (fan activity digital business card web app)

---

## Overview

This document captures the most critical mistakes teams make when building QR-based event networking apps, anonymous social profile systems, and fan community platforms — with specific attention to Japanese fan culture (推し活), iOS PWA limitations, Cloudflare Workers constraints, and anonymous auth systems.

Each pitfall includes: warning signs, prevention strategy, and which phase should address it.

---

## Category 1: Japanese Fan Community Cultural Pitfalls

### PITFALL-001: Ignoring 同担拒否 (Dōtan Kyohi) as a first-class feature

**What goes wrong:** Teams treat "same-oshi rejection" as a minor edge case — a checkbox hidden in settings. When a 同担拒否 user appears in the "people at this event" list for another user who shares the same oshi, the experience feels violating. The 同担拒否 user feels exposed and unsafe. This is not a niche edge case; it is common enough to be a cultural norm with its own terminology.

**Warning signs:**
- "We'll add a hide option later" is said during planning
- The feature list puts 同担拒否 in Phase 2 or later
- The "people at this event" list query does not filter by this flag by default
- UI design shows all event attendees without any consent-gating

**Prevention strategy:**
- Treat 同担拒否 as a visibility filter that gates ALL social graph exposure, not just a profile label
- The flag must be evaluated server-side before any user appears in any list — never filter only on the frontend
- Default behavior for new accounts: opt-out of discoverability (show only after explicit opt-in)
- Display the flag visibly on profiles so other users understand before approaching

**Phase:** Phase 1 (must be in place before any real user data is stored)

---

### PITFALL-002: Using "real name" or "formal" language in the UI

**What goes wrong:** Forms that say "お名前" (your name), "プロフィール名", or any language that implies real identity cause friction and distrust. Fans who built identity around a handle (ハンドルネーム) for years read "name" fields as a demand for real identity. Conversion rates for sign-up drop sharply.

**Warning signs:**
- Form labels use "名前" without qualifying as "ハンドル名" or "表示名"
- Profile pages show an "about me" field labeled "自己紹介" with no example of handle-first content
- Placeholder text uses realistic-looking Japanese names

**Prevention strategy:**
- Use "ハンドル名 / 表示名" as the primary label everywhere
- Placeholder text: "例：さくらP / 花見推し勢 / 双葉オタク"
- Never ask for email upfront — X OAuth or anonymous auth first, email as optional later
- Add "本名は不要です" copy near any name field to explicitly reassure

**Phase:** Phase 0 (copy and field labeling must be correct from the first prototype)

---

### PITFALL-003: Mishandling the social graph around sensitive oshi tags

**What goes wrong:** A user who tags oshi "A" becomes searchable and discoverable to everyone who follows oshi "A". In toxic fandom situations (shipping wars, anti-fan harassment), this creates a vector for targeted harassment: an anti-fan checks into the same event, sees a list of fans who tagged a certain character, and has a ready-made target list.

**Warning signs:**
- "People at this event who share your oshi" list is publicly visible without login
- Oshi tags are indexable by search engines
- No rate limiting on "who else is here" queries
- Event check-in lists can be scraped without authentication

**Prevention strategy:**
- "People at this event" lists require a logged-in, checked-in user — never anonymous access
- Oshi tags on profiles are only revealed after the viewer has also checked into the same event (mutual context requirement)
- Rate-limit the attendee list API: max N requests per hour per user
- noindex all profile pages by default; opt-in to search indexing

**Phase:** Phase 1 (server-side enforcement required; cannot be done in Phase 0 frontend-only)

---

### PITFALL-004: Treating VTuber / 2D fandoms the same as idol fandoms

**What goes wrong:** Idol fan culture has different norms from VTuber, anime, or 2.5D fandoms. For example: in VTuber fan culture, the fan persona ("Listener name") is often as important as the VTuber's name. Tagging system and UI that only accommodate real performer names miss a significant share of the target audience.

**Warning signs:**
- Oshi tag autocomplete only suggests real-name celebrities
- No support for fictional character names as oshi
- Tag fields have character limits that cut off long VTuber group names

**Prevention strategy:**
- Free-text oshi tags with a broad suggestion system — do not curate or gate what counts as a valid oshi
- Allow both "推し" (the performer/character) and "ジャンル" as separate axes
- Tag character limit: at least 50 characters to handle full group/character names
- Test tag input with real VTuber names (e.g., "にじさんじ所属〇〇ライバー") and anime character full names

**Phase:** Phase 0 (tag system design must accommodate this from prototype)

---

## Category 2: Privacy and Safety Pitfalls

### PITFALL-005: QR code encodes too much static information

**What goes wrong:** The QR code encodes a full profile URL with a stable user ID (e.g., `nafuda.app/u/123456`). Once someone photographs or saves your QR code, they have permanent access to your profile even after you want to cut contact. There is no revocation mechanism. Stalkers or unwanted contacts bookmark the QR link and return indefinitely.

**Warning signs:**
- QR code URL contains a predictable numeric or UUID user ID
- No "regenerate QR" feature in the user settings
- Profile URL is permanent and tied to the account forever
- QR shared on social media cannot be invalidated

**Prevention strategy:**
- Use a short, opaque, revocable token in the QR URL (e.g., `nafuda.app/c/[random-token]`) separate from the internal user ID
- Allow users to regenerate their QR token with one tap, invalidating all previously shared QR codes
- QR tokens should have no relation to user IDs in the URL path
- Rate-limit QR regeneration to prevent abuse (e.g., max 5 per day)

**Phase:** Phase 1 (must be designed into the data model before any QR codes go live)

---

### PITFALL-006: Location data retained longer than users expect

**What goes wrong:** Event check-in stores venue name, date, and optionally geolocation. Users think of this as "showing I was at this event" but the app accumulates a detailed physical location history. If the database is breached, or if the app is acquired, this history is a privacy risk. In Japan, location history is particularly sensitive given stalking laws and concerns.

**Warning signs:**
- Check-in stores lat/lng coordinates
- Check-in history is not deletable by the user
- Check-in data is retained indefinitely with no TTL
- Privacy policy does not address location data retention

**Prevention strategy:**
- Store only the event name and date — never precise geolocation coordinates in user profiles
- Allow users to delete individual check-ins or their entire check-in history
- Set a retention policy: automatically purge check-ins older than N months unless the user opts into permanent storage
- Privacy policy must explicitly state: "We do not store GPS coordinates"

**Phase:** Phase 1 (data model design)

---

### PITFALL-007: Anonymous account to real identity linkage via X OAuth

**What goes wrong:** User creates an account anonymously, then links their X account for convenience. The app now silently stores the X user ID alongside the anonymous account. If the X profile is public and uses a real name or distinct handle, the "anonymous" account is trivially deanonymized in the database. The user does not realize this has happened.

**Warning signs:**
- X OAuth token is stored directly in the user record alongside anonymous profile data
- No explicit UI warning when linking X account: "Your X handle will be stored in our database"
- Internal user records show both the anonymous handle and the X user ID in the same row
- Admin panel can cross-reference anonymous profiles to X accounts

**Prevention strategy:**
- Keep OAuth identity data in a separate table from the display profile; join only when necessary
- Show explicit consent UI when linking social account: "Your X username (@xxx) will be linked to this profile for login purposes only. It will not be displayed publicly."
- Allow users to unlink their X account and revert to email/anonymous auth
- Admin tooling should not expose the social account linkage in standard profile views

**Phase:** Phase 1 (auth system design)

---

### PITFALL-008: "People at this event" feature becomes a real-time surveillance tool

**What goes wrong:** The event attendee list refreshes in near-real-time, showing who just checked in. A stalker or harasser can sit near the venue entrance and refresh the list to see exactly when their target checks in, effectively turning the app into a real-time tracking tool.

**Warning signs:**
- Attendee list updates within seconds of check-in
- No delay or batching on check-in visibility
- Check-in timestamps are shown with minute-level precision
- No mechanism for a user to leave an event list after the fact

**Prevention strategy:**
- Delay check-in visibility by a configurable window (minimum 15-30 minutes) — checked-in users appear in the list only after the delay
- Show check-in date but never check-in time at minute-level precision publicly
- Allow users to check out of an event, removing them from the current attendee list
- Implement a block/report system before the attendee list feature goes live

**Phase:** Phase 1

---

## Category 3: QR Code UX Pitfalls

### PITFALL-009: QR code not scannable in dark event venues

**What goes wrong:** Live concert venues, nightclubs, and event halls are often dimly lit. A dark-background QR code (common in aesthetically styled apps) becomes unscannable under venue lighting. Native camera apps struggle with low-contrast QR on screens. Users are forced into awkward "hold your phone under my phone's flashlight" interactions that undermine the "one tap" promise.

**Warning signs:**
- QR code uses a dark or colored background
- QR design uses thin modules (the black squares)
- Error correction level is set to L (lowest, 7% recovery)
- QR is displayed in a card design that has the QR at a small size (< 200x200px rendered)

**Prevention strategy:**
- Default QR: white background, black modules, minimum 250x250px rendered size
- Error correction level: Q (25% recovery) or H (30%) to handle screen glare and partial obstruction
- Provide a "brightness boost" mode that cranks the screen to maximum brightness when the QR is displayed
- Test QR scanability in actual low-light conditions, not just bright office environments
- Allow the QR to be saved as an image to the camera roll so users can share via LINE, X DM, etc. without needing face-to-face scanning

**Phase:** Phase 0 (prototype must test this)

---

### PITFALL-010: Profile URL is too long to share verbally or type

**What goes wrong:** When QR scanning fails (dead phone battery, bad lighting), users fall back to sharing the profile URL verbally. A URL like `nafuda.app/profile/8f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c` cannot be typed or communicated. The fallback experience is broken.

**Warning signs:**
- Profile URL contains a UUID or long token
- No short URL or username-based URL option
- The "share profile" button only offers QR, not a copyable short link

**Prevention strategy:**
- Support optional custom short handles: `nafuda.app/@sakura` (user-chosen, unique)
- For users without a custom handle: generate a short 6-8 character alphanumeric token (e.g., `nafuda.app/c/xk9p2m`)
- "Share profile" offers: QR code, copy short link, share to X, share to LINE
- Short link must be ≤ 20 characters total for easy verbal communication

**Phase:** Phase 1

---

### PITFALL-011: QR scanning requires the target to also have the app open

**What goes wrong:** User A opens their QR code. User B tries to scan it with their phone's native camera. The camera scans the QR but the destination page requires login to see anything meaningful. User B, who doesn't have the app, sees a login wall and abandons. The "one tap" experience requires both parties to have accounts.

**Warning signs:**
- Profile page shows "Login to view this profile" to unauthenticated visitors
- The landing page after QR scan has no public content
- "Register to see this person's SNS links" gate before showing any value

**Prevention strategy:**
- Profile pages must show core content (display name, oshi tags, SNS links) to unauthenticated visitors — this is the value proposition
- Only features requiring reciprocity (saving to contacts, viewing mutual events) require login
- After an unauthenticated user views a profile, show a subtle "Create your own なふだ" CTA — not a gate
- The QR scan → profile view flow must work end-to-end without any account

**Phase:** Phase 0 (this is a core UX requirement, must be validated in prototype)

---

### PITFALL-012: Poor QR display in PWA home screen context

**What goes wrong:** When the PWA is installed as a home screen app, some OS-level share sheets and camera integrations behave differently than in browser. The QR display screen may not work correctly because the PWA's display mode (`standalone`) removes the browser chrome, and iOS may handle deep links from QR scans differently — opening in Safari instead of the installed PWA.

**Warning signs:**
- QR destination URL opens in Safari instead of the installed PWA on iOS
- Share sheet from PWA standalone mode is missing expected options
- Screen brightness API unavailable in standalone PWA mode

**Prevention strategy:**
- Test the full QR → scan → profile view flow on iOS in both browser and installed PWA modes
- For iOS: universal links or well-known association files are needed to make scanned URLs open in the installed PWA (complex; evaluate if worth the effort vs. accepting Safari fallback)
- Document which features degrade gracefully in browser mode vs. installed PWA mode
- The profile view page must be fully functional in browser fallback mode

**Phase:** Phase 0 (must discover PWA behavior gaps in prototype)

---

## Category 4: PWA Pitfalls (iOS-Specific)

### PITFALL-013: iOS Safari PWA storage limitations cause data loss

**What goes wrong:** iOS Safari imposes a 7-day expiration on unvisited PWA storage (cookies, localStorage, IndexedDB, Cache API). If a user installs the PWA but doesn't open it for a week, their session token and cached data are deleted. They return to a logged-out state with no warning. For a fan community app used around infrequent events (monthly concerts), this is a very common scenario.

**Warning signs:**
- Authentication relies solely on localStorage or sessionStorage for token persistence
- No server-side session validation that can refresh storage on visit
- PWA service worker cache is not rebuilt on reactivation
- Users report "being logged out randomly"

**Prevention strategy:**
- Use HttpOnly cookies for auth tokens where possible — cookie storage on iOS is also subject to 7-day TTL for non-user-interacted domains, but is more reliable than localStorage for PWA
- Implement transparent re-authentication: when the app detects an expired session, prompt re-login with X OAuth in a non-disruptive way
- Show users a clear "you've been logged out, tap to re-login" screen rather than a broken state
- For Phase 0 (no auth): document that any localStorage state will be lost after 7 days of inactivity
- Consider push notifications (Phase 2) to re-engage users and reset the 7-day timer

**Phase:** Phase 1 (must design around this from the start)

---

### PITFALL-014: PWA install prompt does not appear on iOS

**What goes wrong:** On Android, Chrome shows an automatic "Add to Home Screen" banner. On iOS Safari, there is no automatic install prompt — users must manually tap Share → Add to Home Screen. The "PWA 1タップインストール" promise in the roadmap cannot be fulfilled on iOS without explicit onboarding UX.

**Warning signs:**
- Roadmap says "PWA 1タップインストール" without iOS-specific workaround planned
- No "how to install" instructional UI in the app
- `beforeinstallprompt` event is used as the sole install mechanism (this event does not fire on iOS)
- User testing only done on Android

**Prevention strategy:**
- Build an iOS-specific install instruction overlay that detects iOS Safari and shows a step-by-step: "Tap Share → Add to Home Screen"
- Trigger this overlay contextually (e.g., after the user's second visit, or after they create a profile)
- Use `navigator.standalone` to detect if already installed and suppress the prompt
- Android: use `beforeinstallprompt` for native install button
- Acceptance criterion: installation flow tested on real iPhone device

**Phase:** Phase 0 (if "PWA install" is a Phase 0 goal, iOS workaround must be in scope)

---

### PITFALL-015: iOS PWA does not support Web Push Notifications (pre-iOS 16.4)

**What goes wrong:** Push notifications are a planned engagement mechanism for Phase 2. iOS did not support Web Push in PWA (home screen app) mode until iOS 16.4 (March 2023), and even then it requires the app to be installed as a PWA — not opened in browser. Users on older iOS or in browser mode get no notifications. Planning assumes push will work universally.

**Warning signs:**
- Push notification feature is listed without iOS version caveat
- No fallback notification mechanism planned for unsupported environments
- Push notification permission is requested immediately on first visit (common pattern that iOS rejects)

**Prevention strategy:**
- Document minimum supported iOS version: 16.4+ for push notifications
- Never request push permission on first visit — request only after user has demonstrated engagement (e.g., after creating a profile, or after first event check-in)
- Plan in-app notification fallback (notification bell in UI) for environments where Web Push is unavailable
- Phase 2 push notifications must include graceful degradation

**Phase:** Phase 2 (document the constraint now, design around it when building)

---

### PITFALL-016: Camera and QR scan permissions in iOS PWA context

**What goes wrong:** The roadmap defers in-app QR scanning to Phase 2. When it is built, iOS PWA standalone mode has inconsistent camera permission behavior. Camera access must be re-requested for each PWA install in some iOS versions. getUserMedia may work in browser but fail in PWA standalone mode on older iOS.

**Warning signs:**
- In-app QR scanner planned without iOS testing
- Camera permission assumed to carry over from browser to installed PWA
- No fallback for when camera permission is denied

**Prevention strategy:**
- For Phase 0-1: rely on native camera (no in-app scanner) — this is already the correct decision
- When building Phase 2 in-app scanner: test on iOS 15, 16, and 17 in both Safari and PWA modes
- Provide a "use native camera instead" fallback button on the in-app scanner screen
- Request camera permission contextually, not at app launch

**Phase:** Phase 2 (note now, implement correctly then)

---

## Category 5: Social Graph Abuse Patterns

### PITFALL-017: Fake check-in to event for social engineering

**What goes wrong:** The "people at this event" feature requires no verification that a user was physically present. Anyone can check in to any event from anywhere. A bad actor can check in to an event they didn't attend, appear in the attendee list, and approach fans who believe they share a context ("we were at the same concert!"). The shared context is the trust signal — fake check-in undermines the entire value proposition.

**Warning signs:**
- Check-in requires only an event name and date — no verification
- Check-in can be done at any time, not just during the event window
- No limit on simultaneous event check-ins per user
- Event IDs are predictable or guessable

**Prevention strategy:**
- Time-window check-in: check-in is only valid during an event (e.g., from 2 hours before event start to 2 hours after end). Requires known event schedule, or user-reported event window
- Limit simultaneous active check-ins per user: a user cannot be "at" 5 events simultaneously
- Show check-in timestamp (date only) so other attendees can evaluate plausibility
- Long-term: event organizer verification (organizer-issued check-in codes) for high-trust events
- Phase 1 launch: accept that verification is soft; document this limitation and build reporting tools

**Phase:** Phase 1 (design the time-window constraint from the start; full verification is Phase 2+)

---

### PITFALL-018: Social graph enumeration via the attendee list

**What goes wrong:** An attacker creates multiple accounts, checks each one into an event, and scrapes the attendee list API to build a complete social graph of which fans attend which events. This data can be used for stalking, targeted advertising, or sold. The API has no rate limiting and returns full user profiles.

**Warning signs:**
- Attendee list API returns full profile objects without pagination
- No rate limiting on attendee list endpoints
- Multiple accounts from the same IP can all check into events
- Attendee list is accessible without being checked into the event yourself

**Prevention strategy:**
- Require the requesting user to also be checked into the event to view its attendee list (mutual context)
- Rate-limit attendee list API: max 10 requests per minute per authenticated user
- Return only minimal profile data in the list (display name, oshi tags, avatar) — not full profile
- Implement cursor-based pagination on attendee lists; limit page size to 20
- On Cloudflare Workers: use KV or Durable Objects for rate limiting per user ID

**Phase:** Phase 1

---

### PITFALL-019: Block/report system absent at launch

**What goes wrong:** Social features (attendee lists, profile views) ship without block or report functionality. First harassment incident requires a manual admin response. In fan communities, harassment between rival fandoms or from "antis" is not hypothetical — it is expected. Launching without block/report means the first harassment incident creates a crisis and may require taking features offline.

**Warning signs:**
- Block/report is listed as Phase 2 or "nice to have"
- No moderation tooling for admins at launch
- No content reporting flow in the UI
- Terms of Service exist but there is no enforcement mechanism

**Prevention strategy:**
- Block: user A blocks user B → B cannot view A's profile, A does not appear in B's lists, B does not appear in A's lists. Must be bidirectional in effect.
- Report: one-tap report on any profile with reason categories (harassment, impersonation, spam, other)
- Admin view: reported profiles queue with basic moderation actions (suspend, warn, dismiss report)
- These features must ship with the first public-facing social features in Phase 1

**Phase:** Phase 1 (non-negotiable for social feature launch)

---

## Category 6: Cloudflare Workers Limitations

### PITFALL-020: CPU time limit causes timeout on complex operations

**What goes wrong:** Cloudflare Workers has a CPU time limit (10ms on the free tier, 30ms on Paid, with burst). Complex operations — generating QR codes server-side, resizing avatar images, running database queries with many joins — can exceed this limit and return a 1015 error. Teams discover this under load in production.

**Warning signs:**
- Server-side QR code generation planned (e.g., using a library that runs entirely in the Worker)
- Image processing (resize, crop) planned to run in the Worker
- Database queries use multiple JOINs without query planning consideration
- No CPU time profiling done during development

**Prevention strategy:**
- Generate QR codes client-side using a JavaScript library (e.g., `qrcode.js`, `qr-creator`) — do not generate server-side in the Worker
- Image upload: use Cloudflare R2 with a pre-signed URL upload directly from the client; transform via Cloudflare Images or a separate service
- Database: keep queries simple; use indexed lookups; avoid N+1 patterns with Neon/Supabase
- Profile the Worker's CPU usage during development using Wrangler's local dev tools
- For TanStack Start on Workers: ensure SSR routes do not do heavy computation

**Phase:** Phase 1 (architecture decision before Workers code is written)

---

### PITFALL-021: Durable Objects and KV limitations misunderstood

**What goes wrong:** Teams use Cloudflare KV for data that requires strong consistency (e.g., "is this user checked into this event?") without knowing that KV is eventually consistent. A user checks in to an event; the write goes to one region; a read from another region returns "not checked in" for up to 60 seconds. The "people at this event" list shows inconsistent state.

**Warning signs:**
- KV is used for any data that requires immediate read-after-write consistency
- Real-time attendee list built on KV reads
- Session tokens stored in KV without considering eventual consistency
- No awareness of KV's ~60 second global propagation delay

**Prevention strategy:**
- Use the PostgreSQL database (Neon/Supabase) as the source of truth for all user data and check-ins — not KV
- Use KV only for: caching, rate limit counters (where approximate is OK), feature flags
- For rate limiting with strong consistency: use Durable Objects (single-instance, strongly consistent)
- Document the consistency model for each data store used in the architecture

**Phase:** Phase 1 (architecture decision)

---

### PITFALL-022: Workers cold start latency degrades QR scan experience

**What goes wrong:** The QR scan to profile view flow is the most latency-sensitive path in the entire app. If the Worker is cold (not recently invoked), the cold start adds 200-500ms to the first request. In a busy event venue with many people scanning QRs simultaneously, the first user to scan after idle gets a noticeably slow response.

**Warning signs:**
- No monitoring of Worker cold start frequency
- Profile view endpoint does a full database query on every request without caching
- No edge caching for public profile data
- SSR on every request without considering caching strategy

**Prevention strategy:**
- Cache public profile data at the edge using Cloudflare's Cache API with a short TTL (e.g., 30 seconds)
- Profile pages that are public (no personalization) can be served from cache without hitting the database
- Use Cloudflare's `waitUntil` to update caches asynchronously after serving the response
- Monitor Worker invocation frequency; Workers warm up faster under sustained load
- Consider Workers Paid plan for lower cold start rates at events

**Phase:** Phase 1

---

## Category 7: Authentication System Pitfalls

### PITFALL-023: X OAuth flow broken on mobile in-app browsers

**What goes wrong:** Many users open the QR-scanned profile link inside X's in-app browser (X app → tap link → opens in X's WebView). When these users then try to log in via X OAuth, the OAuth redirect flow breaks because X's in-app browser does not support the full OAuth redirect dance — it may block the redirect, open a new browser, or lose the state parameter. The user is stuck.

**Warning signs:**
- X OAuth tested only in Safari and Chrome, not in X app's in-app browser
- OAuth redirect URI is not allowlisted for the in-app browser context
- State parameter is stored in sessionStorage (which may not persist across the in-app browser → external browser transition)

**Prevention strategy:**
- Detect in-app browser at the OAuth initiation point and show a "Open in Safari/Chrome" prompt before starting the OAuth flow
- Store OAuth state in a short-lived server-side token (not sessionStorage) to survive browser context switches
- Test X OAuth flow end-to-end inside the X app on both iOS and Android
- Add LINE app in-app browser to the test matrix (LINE is heavily used in Japanese fan communities)

**Phase:** Phase 1

---

### PITFALL-024: Anonymous sessions become permanently orphaned

**What goes wrong:** Phase 0 allows unauthenticated profile creation (or in Phase 1, anonymous auth). A user creates a profile, gets their QR, and then loses access (clears browser data, switches devices, the 7-day iOS storage expiry). The profile still exists in the database, but the user has no way to claim it. They create a new profile. The old profile accumulates check-ins and connections that the user cannot access. Over time, the database fills with orphaned anonymous profiles.

**Warning signs:**
- No account recovery mechanism for anonymous users
- Anonymous profiles have no expiry or activity-based cleanup
- Multiple profiles per person are allowed without detection
- No "link this anonymous profile to my X account" flow

**Prevention strategy:**
- Anonymous auth: generate a device-bound recovery token shown to the user immediately after profile creation ("Save this code to recover your profile on a new device")
- Allow anonymous profiles to be claimed by logging in with X OAuth — merge the anonymous profile into the authenticated account
- Set an inactivity TTL on anonymous profiles (e.g., delete after 90 days of no login)
- Phase 0 (no DB): not applicable. Phase 1: design the anonymous-to-authenticated merge flow from day one.

**Phase:** Phase 1

---

### PITFALL-025: X OAuth exposes more user data than expected

**What goes wrong:** X OAuth v2 scopes can expose email, follower lists, and private data depending on which scopes are requested. If the app requests broad scopes "for future features," this data is accessible in the backend and may be logged or stored unintentionally. In Japan, collecting data beyond what is necessary triggers APPI (Act on the Protection of Personal Information) compliance obligations.

**Warning signs:**
- OAuth scopes include `email`, `follows.read`, or `dm.read` without immediate product need
- Access tokens are stored in plaintext in the database
- No scope review process in the auth system design
- Privacy policy does not list which OAuth data is collected and why

**Prevention strategy:**
- Request minimal OAuth scopes: only `tweet.read users.read offline.access` (for basic identity + refresh token)
- Do not request email via OAuth unless email is a product requirement
- Store only: X user ID (for identity matching), display name, avatar URL — not the full OAuth response object
- Refresh tokens must be encrypted at rest
- Privacy policy must enumerate every OAuth data point collected and its purpose

**Phase:** Phase 1

---

## Category 8: Cross-Cutting Technical Pitfalls

### PITFALL-026: Profile page is not shareable via LINE or X (OGP missing)

**What goes wrong:** Fans heavily use LINE groups and X to share content. When a profile URL is pasted into LINE or X, the preview shows no image, no title, no description — just the raw URL. The "share your なふだ" use case is broken. Fans stop sharing because the link looks like spam.

**Warning signs:**
- OGP meta tags not implemented
- Profile pages are rendered entirely client-side with no SSR (React SPA without SSR means OGP crawlers see an empty shell)
- Twitter Card / OG image not generated per profile
- Testing only done in browser, not by pasting URL into LINE

**Prevention strategy:**
- SSR is required for OGP — this is a strong argument for TanStack Start (SSR) over pure Vite SPA even in Phase 1
- Generate OGP data server-side for each profile: `og:title` = display name, `og:description` = oshi tags, `og:image` = avatar or generated card
- Test OGP rendering with: LINE URL preview, X Card Validator, Facebook Debugger
- For Phase 0 (no SSR): accept OGP is broken, but document it as a Phase 1 must-fix before launch

**Phase:** Phase 1 (before any real user launch; OGP is required for viral growth)

---

### PITFALL-027: Tag system becomes unusable due to fan community name conflicts

**What goes wrong:** Multiple fandoms use the same shorthand. "桜" could be a character name, a singer's nickname, a group name, or a venue name. A flat tag system causes confusion: users who tag "桜" for different meanings end up in the same search results and "same event" matching produces false positives.

**Warning signs:**
- Tag system is a flat string match with no namespace or category
- Oshi tags and genre tags are stored in the same field
- Autocomplete suggests based on tag frequency without context
- Users see "people who like the same thing" based on exact string match

**Prevention strategy:**
- Separate "推し" (specific performer/character) and "ジャンル" (genre/fandom) as distinct tag types
- Autocomplete shows the tag category alongside the suggestion: "さくら — アイドル (〇〇グループ)"
- When displaying profiles, show the tag category context
- Do not use oshi tags alone as the basis for "shared interest" matching; require event co-attendance as the primary matching signal

**Phase:** Phase 0 (data model design must support tag categories from prototype)

---

### PITFALL-028: Relying on browser-side QR generation breaks in offline/low-connectivity venues

**What goes wrong:** Live venue WiFi is notoriously poor, and mobile data is congested during events. If the QR code is generated dynamically from a server (or if the profile page must load to display the QR), users cannot show their QR in the venue. "Show your QR to connect" is the entire core interaction — it must work offline.

**Warning signs:**
- QR code URL is fetched from an API on page load
- QR code is rendered on a page that requires login validation on each load
- No service worker caching for the "my QR" page
- No option to save QR as image to camera roll

**Prevention strategy:**
- The "my QR code" screen must be cached aggressively in the service worker — available offline after first load
- QR code is generated entirely client-side from the profile URL token (which is stored locally after login)
- Add a "Save QR to Camera Roll" button so users can have a backup that works without the app
- Test the entire "show my QR" flow with airplane mode enabled

**Phase:** Phase 0 (offline QR display must be validated in prototype)

---

## Summary Matrix

| # | Pitfall | Category | Severity | Phase |
|---|---------|----------|----------|-------|
| 001 | 同担拒否 as first-class feature | Cultural | Critical | Ph1 |
| 002 | Real-name language in UI | Cultural | High | Ph0 |
| 003 | Oshi tag social graph harassment vector | Privacy | Critical | Ph1 |
| 004 | VTuber/2D fandom tag limitations | Cultural | Medium | Ph0 |
| 005 | Static QR code without revocation | Privacy | Critical | Ph1 |
| 006 | Location data over-retention | Privacy | High | Ph1 |
| 007 | Anonymous-to-X linkage deanonymization | Privacy | High | Ph1 |
| 008 | Real-time attendee list as stalking tool | Safety | Critical | Ph1 |
| 009 | QR unscannable in dark venues | QR UX | High | Ph0 |
| 010 | Profile URL too long to share verbally | QR UX | Medium | Ph1 |
| 011 | QR requires both parties to have accounts | QR UX | Critical | Ph0 |
| 012 | PWA QR display issues on iOS | QR UX | Medium | Ph0 |
| 013 | iOS 7-day storage expiry data loss | PWA/iOS | High | Ph1 |
| 014 | iOS has no automatic PWA install prompt | PWA/iOS | High | Ph0 |
| 015 | Web Push not supported on old iOS | PWA/iOS | Medium | Ph2 |
| 016 | Camera permission in iOS PWA | PWA/iOS | Low | Ph2 |
| 017 | Fake check-in for social engineering | Social Graph | High | Ph1 |
| 018 | Attendee list scraping/enumeration | Social Graph | High | Ph1 |
| 019 | No block/report at launch | Social Graph | Critical | Ph1 |
| 020 | Worker CPU limit exceeded | CF Workers | High | Ph1 |
| 021 | KV eventual consistency misuse | CF Workers | High | Ph1 |
| 022 | Worker cold start on QR scan path | CF Workers | Medium | Ph1 |
| 023 | X OAuth broken in X in-app browser | Auth | High | Ph1 |
| 024 | Orphaned anonymous sessions | Auth | Medium | Ph1 |
| 025 | Excess X OAuth scope collection | Auth | High | Ph1 |
| 026 | OGP missing — links look broken in LINE/X | Technical | High | Ph1 |
| 027 | Tag namespace conflicts between fandoms | Technical | Medium | Ph0 |
| 028 | QR display fails offline in event venue | Technical | Critical | Ph0 |

---

*Generated: 2026-04-21*
*Project: なふだ — fan activity digital business card web app*
