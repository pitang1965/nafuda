# Feature Research — なふだ (Digital Business Card for Fan Communities)

**Research type:** Project Research — Features dimension
**Date:** 2026-04-21
**Downstream use:** Requirements definition — categorized for build/skip decisions

---

## Research Scope

What features do event-based networking / digital business card apps have?
What is table stakes vs differentiating vs anti-features for なふだ specifically —
a context-first digital business card for Japanese fan communities (推し活)?

Comparators studied:
- General digital biz-card: Eight (エイト), Sansan, Meishi Lite, HiHello, Blinq, Popl
- Event networking: Grip, SpotMe, Brella, Whova, Bizzabo
- Fan community / informal exchange: Linktree (SNS link aggregator), Carrd, potofu
- Japanese fan-specific: 推し活手帳 (analog), fan Twitter/X exchange culture, Marshmallow

---

## Category 1 — Table Stakes

> Features users expect by default. Absence causes immediate drop-off or trust failure.

### 1.1 Profile Creation with Handle / Avatar

**What it is:** A named card users can share — minimally a display name, avatar image, and one or more contact/SNS links.

**Fan-culture specifics:** Real name must be OPTIONAL. Handle-name first is non-negotiable. Many users operate pseudonymously across all fan platforms; real-name exposure is a hard blocker for adoption.

**Complexity:** Low (standard form + image upload)
**Dependencies:** Auth system (even lightweight), image storage

---

### 1.2 QR Code Generation and Sharing

**What it is:** Every profile gets a unique URL; a QR code renders from that URL. User can screenshot, display on phone, or print.

**Why table stakes:** QR is the established shorthand in Japan for touchless contact exchange since COVID. Attendees at lives and events already expect it. Without QR, the app has no exchange mechanic.

**Fan-culture specifics:** The phone-to-phone display (not print) is the dominant pattern at concert venues. QR must render instantly, work offline if possible (PWA cache).

**Complexity:** Low (qrcode library on client; no server involvement needed)
**Dependencies:** Stable profile URL (slug or UUID)

---

### 1.3 SNS Link Aggregation

**What it is:** A profile lists multiple SNS handles/links in one place: X (Twitter), Instagram, TikTok, YouTube, Discord server, LINE Open Chat, Threads, Bluesky, etc.

**Why table stakes:** The entire value prop of the card exchange is avoiding having to verbally spell out "@username" for each platform. If the app only holds one link, users revert to X DM exchanges.

**Fan-culture specifics:** X (Twitter) is still primary for oshi-katsu community. Discord and LINE Open Chat are secondary for group coordination. TikTok relevant for younger fandoms (K-pop, VTuber clips). Instagram for photo-sharing fandoms (seichi junrei, cosplay).

**Complexity:** Low (list of URL fields with platform detection for icon rendering)
**Dependencies:** None beyond profile

---

### 1.4 Profile URL / Public View (No Login Required to View)

**What it is:** Scanning a QR leads to a public page readable without account creation. The viewer sees the card owner's profile immediately.

**Why table stakes:** Friction at the receive end kills exchange. If the scanner must sign up before seeing anything, they abandon. This is the #1 failure mode of corporate biz-card apps applied to casual fan contexts.

**Complexity:** Low (public route, no auth middleware)
**Dependencies:** Profile data model, QR

---

### 1.5 Mobile-First Responsive UI

**What it is:** The entire experience is usable one-handed on a 375–430px screen. Key actions (show QR, scan link, view profile) work without desktop.

**Why table stakes:** Fan events are phone-only environments. Laptop or tablet use is essentially zero at live venues.

**Complexity:** Low (design constraint, not a feature)
**Dependencies:** Affects every UI component

---

### 1.6 PWA / Add to Home Screen

**What it is:** Users can install the web app as a home screen icon without going through an app store. Provides offline-capable shell, fast launch.

**Why table stakes for this app:** App stores create friction and gatekeeping. Oshi-katsu users move fast — if it's not instant, it's skipped. PWA removes install barrier while giving native-feel launch.

**Complexity:** Medium (service worker, manifest, cache strategy — but tooling is mature)
**Dependencies:** Vite PWA plugin; affects deployment pipeline

---

### 1.7 Privacy Controls — Field-Level Visibility

**What it is:** Each profile field (name, links, location, etc.) can be toggled public / private individually.

**Why table stakes:** Fan users have a layered identity. They will share X handle freely but not their real name or LINE ID. Without granular control, they either over-share (security concern) or under-fill the profile (value loss).

**Complexity:** Medium (per-field visibility flag in data model; rendering logic)
**Dependencies:** Profile data model; auth for owner vs viewer view

---

## Category 2 — Differentiators

> Features that create competitive advantage specific to なふだ's positioning. Not universal expectations, but meaningful to the target audience.

### 2.1 Oshi / Genre Tags

**What it is:** Structured tags on a profile declaring what/whom the user is a fan of. Two levels: oshi (specific artist/character/team) and genre (idol, anime, VTuber, 2.5D, K-pop, sports, etc.).

**Why differentiating:** No general biz-card or event networking app has this concept. It transforms the profile from a contact card into a shared-interest signal. Two strangers can see overlapping oshi tags and immediately have a conversation hook.

**Fan-culture specifics:**
- Oshi names must support free text (tags are volatile — new units debut, members graduate, characters get added).
- Autocomplete/suggest from a community-maintained tag list reduces typos and normalizes spelling.
- Displaying oshi as a visual badge (not just text) increases the "identity expression" feel.
- Multiple oshi per profile is normal (multi-推し users are common).

**Complexity:** Medium (tag input with suggest, tag storage, display; tag normalization is ongoing ops work)
**Dependencies:** Profile data model; Phase 1 needs tag storage backend

---

### 2.2 Event / Venue Check-In (Context Tagging)

**What it is:** Users can log check-ins: date + venue/location + event name. These appear on the profile as a history of "contexts."

**Why differentiating:** This is the core "context-first" mechanic that separates なふだ from every other app. A profile that says "attended Budokan 2026-03-15, Shibuya Crossing Seichi 2025-11-03" tells a story. When two people exchange cards at an event, the context of *that* event is captured automatically or with one tap.

**Fan-culture specifics:**
- Seichi junrei (pilgrimage to anime filming locations) is a solo or small-group activity — check-in is the primary social signal, not live discovery.
- Concert venue check-ins create a "also attended" record even without real-time same-venue matching.
- Event names are user-generated (no authoritative database needed for MVP).

**Complexity:** Medium (check-in form, list view on profile, optional geolocation for venue suggest)
**Dependencies:** Location data optional; backend needed for persistence (Phase 1+)

---

### 2.3 Same-Venue / Same-Event Discovery ("今ここにいる人")

**What it is:** When a user checks into an active event, they can see (and be seen by) other users who checked in to the same event at the same time — within a configurable time window.

**Why differentiating:** This is the marquee feature. It replicates the "look around at the crowd and see who else is here" feeling, digitally. No fan-specific app does this. General event apps (Grip, Brella) do attendee lists but they are conference-oriented and require organizer setup.

**Fan-culture specifics:**
- Must be opt-in (see doutan settings below). Many users will want to check in for their own history without appearing in the discovery list.
- The discovery list is the Phase 0 prototype's main UX set piece — animated cards appearing as users "arrive."
- Matching should be event-scoped, not just geo-scoped (the same venue hosts multiple events; being at Makuhari Messe for Event A vs Event B matters).

**Complexity:** High (real-time or near-real-time matching; event session model; privacy controls; abuse potential at small events)
**Dependencies:** Backend required (Phase 1+); check-in feature; doutan/privacy settings; auth

---

### 2.4 Doutan (同担) Settings

**What it is:** A user-controlled flag declaring their stance toward fellow fans of the same oshi.

Three common stances in Japanese fan culture:
- **同担歓迎 (doutan kangei):** Welcome fellow fans — happy to connect
- **同担OK:** Neutral, no strong preference
- **同担拒否 (doutan kyohi):** Do not want to interact with fans of the same oshi

**Why differentiating:** This concept does not exist in any Western networking app. It is deeply culturally specific. Implementing it correctly signals that なふだ was built by people who understand the culture. Ignoring it would cause active backlash from doutan-kyohi users who appear in same-oshi discovery lists without consent.

**Fan-culture specifics:**
- Doutan-kyohi users must be excluded from same-oshi discovery / oshi tag search results.
- The flag should be per-oshi or per-profile (some users are doutan-kyohi for one oshi but not another).
- The UI label must use culturally correct terminology — "同担拒否" not an invented English equivalent.
- Do NOT surface the doutan-kyohi flag prominently to viewers in a way that could be read as hostile (it is a personal boundary, not an attack).

**Complexity:** Medium (flag on profile/oshi-tag level; filter logic in discovery and search; UI label sensitivity)
**Dependencies:** Oshi tags; same-venue discovery; profile privacy controls

---

### 2.5 Multiple Profiles per Account

**What it is:** One login can hold and switch between several distinct profiles: e.g., "idol fan persona," "anime fan persona," "tech conference persona."

**Why differentiating:** Oshi-katsu users often have strict separation between fan identity and professional identity. Some also separate by fandom (K-pop fans and anime fans in the same person may not want cross-contamination). General biz-card apps allow only one profile by design.

**Fan-culture specifics:**
- Profile switch must be fast (one tap from home screen).
- QR codes must be profile-specific, not account-specific.
- Each profile has independent oshi tags, SNS links, check-in history, and doutan settings.

**Complexity:** Medium (data model: account 1-to-many profiles; routing by profile slug; UI for profile switcher)
**Dependencies:** Auth (account must exist to hold multiple profiles); profile data model

---

### 2.6 Themed / Expressive Profile Design ("見せたくなるデザイン")

**What it is:** Profile page customization beyond a plain card: oshi-color themes, decorative frame ("痛名刺ホルダー" aesthetic), icon badges for oshi tags.

**Why differentiating:** Fan identity is expressed through visual aesthetic. A plain white card feels corporate and out of place. Users who can make their profile look like their oshi's image color will share it more (social proof / pride).

**Fan-culture specifics:**
- 推しカラー (oshi color) is a well-established concept — each idol/VTuber has a fan-recognized color. Letting users set their profile accent color to their oshi's color is meaningful and low-effort.
- Phase 2 feature in concept doc: lace/ribbon/rhinestone frame overlays ("痛名刺ケース" feel). This is a strong identity feature but high implementation complexity.
- Phase 1 minimum: accent color pick + oshi tag badge icons.

**Complexity:** Low-Medium for color themes; High for decorative frame overlays (Phase 2)
**Dependencies:** Profile data model; oshi tags for color suggestion

---

### 2.7 Social Login (X OAuth Priority)

**What it is:** Sign in with X (Twitter) as the primary auth method, reducing registration friction.

**Why differentiating (for this audience):** The oshi-katsu community lives on X. Their X account IS their fan identity. X OAuth login means: (a) no new password to remember, (b) automatic profile pre-fill (avatar, display name), (c) implicit credibility (bot harder to create). This matters more here than for a general biz-card app.

**Fan-culture specifics:**
- Must NOT force real name exposure from X profile into なふだ profile — user must confirm what to import.
- Anonymous / no-login path must also exist for casual viewers who only receive cards.
- Some users run multiple X accounts per fandom — account picker on OAuth must be surfaced.

**Complexity:** Medium (OAuth flow, token management, profile import with user confirmation)
**Dependencies:** Backend auth (Phase 1); affects profile creation UX

---

## Category 3 — Anti-Features

> Things to deliberately NOT build, with explicit rationale. These are features that seem natural to add but would harm the product.

### 3.1 Real Name / Workplace Fields as Primary / Required

**Why anti-feature:** The entire positioning of なふだ is anonymous-first. Making real name or employer a prominent field (even optional) shifts the mental model toward a corporate tool. It will deter the oshi-katsu audience before they even complete onboarding. Every field on the profile creation screen communicates what kind of app this is.

**Decision:** Real name / employer fields are either absent from MVP or buried in an "optional advanced" section explicitly labeled for non-fan use cases.

---

### 3.2 In-App Direct Messaging (Phase 1)

**Why anti-feature (for now):** DMs require moderation infrastructure, harassment reporting, read receipts, notification management — a product in itself. The fan community already has X DMs, Discord, and LINE for this. なふだ's job is the first-touch exchange; the ongoing relationship happens on existing platforms. Building DMs in Phase 1 would dilute focus and invite safety incidents without the infrastructure to handle them.

**Decision:** Out of scope until Phase 2+. Profile directs to existing SNS for ongoing communication.

---

### 3.3 NFC Exchange

**Why anti-feature:** NFC requires: (a) both devices to support NFC (iPhone support is limited; older Androids vary), (b) physical proximity tap, (c) OS permission dialogs. QR achieves the same result with zero hardware dependency and works across all phones via camera. The added complexity of NFC brings no meaningful UX improvement for this audience.

**Decision:** Explicitly excluded. Document rationale in PROJECT.md for future re-evaluation (NFC landscape may change).

---

### 3.4 In-App QR Scanner (Phase 0–1)

**Why anti-feature (for now):** Building an in-app camera/QR scanner requires camera permission handling, scanning library integration, and cross-browser testing — non-trivial work. The native phone camera already handles QR scanning on all modern iOS and Android devices with no permission friction. Phase 0–1 relies on native camera → URL redirect. Only re-evaluate if user research shows the native camera flow is a failure point.

**Decision:** Out of scope Phase 0–1. Phase 2 candidate if research identifies drop-off at camera handoff.

---

### 3.5 Organizer-Controlled Event Rooms

**Why anti-feature:** Apps like Grip, Brella, and Whova require an event organizer to set up the event room, invite attendees, and manage the participant list. This model assumes B2B: the organizer pays, the attendees are managed. なふだ's same-venue discovery is user-driven: any user can create a check-in for any event. Requiring organizer setup would exclude the vast majority of fan events (unofficial fan gatherings, seichi visits, ticket-holder groups) that have no formal organizer using software.

**Decision:** Same-venue discovery is fully user-created. Organizer-managed event rooms are not built.

---

### 3.6 Follower / Friend Count Visibility

**Why anti-feature:** Displaying follower counts or connection counts creates a social status hierarchy that is toxic in a fan community context. It turns the tool into a popularity contest and discourages new fans or smaller account holders from engaging. なふだ profiles should feel equal regardless of X follower count.

**Decision:** No follower/connection/badge count displays on profiles. If metrics are tracked internally (for analytics), they are never surfaced to users.

---

### 3.7 Algorithmic Feed or Recommendation Engine

**Why anti-feature:** An algorithmic "people you might know" or "trending oshi" feed requires significant infrastructure, creates filter bubbles, and shifts the product toward a social platform (not a card exchange tool). It also creates new content moderation requirements. なふだ is a utility — it connects people at events — not a discovery platform.

**Decision:** No algorithm-driven feeds. Discovery is event/venue scoped (explicit check-in) only.

---

### 3.8 Forced Account Registration to View a Card

**Why anti-feature:** Many apps gate profile viewing behind "sign up first." This is a growth hack that destroys trust and conversion in casual social contexts. A fan at a concert who scans a QR and hits a signup wall will simply not engage. The public profile view must be fully readable without any account.

**Decision:** Public profile view requires zero auth. Registration prompt is optional and deferred.

---

## Feature Dependency Map

```
Auth (X OAuth / anonymous)
  └── Profile (handle, avatar, SNS links, privacy flags)
        ├── QR Generation (depends on stable profile URL)
        ├── Oshi / Genre Tags
        │     ├── Doutan Settings (per-oshi flag)
        │     └── Themed Design (oshi color)
        ├── Event Check-In
        │     └── Same-Venue Discovery (depends on check-in + doutan filter + auth)
        └── Multiple Profiles (depends on account → 1-to-many profile)

PWA (independent; wraps all of above)
Public Profile View (independent; no auth dependency)
```

**Critical path for Phase 1 launch:**
Public Profile View → QR → Profile (handle + SNS links + oshi tags + doutan) → Auth → Event Check-In → Same-Venue Discovery

---

## Complexity Summary Table

| Feature | Category | Complexity | Phase |
|---|---|---|---|
| Profile + Handle + Avatar | Table Stakes | Low | 0/1 |
| QR Code Generation | Table Stakes | Low | 0/1 |
| SNS Link Aggregation | Table Stakes | Low | 0/1 |
| Public Profile View (no auth) | Table Stakes | Low | 0/1 |
| Mobile-First UI | Table Stakes | Low (design) | 0 |
| PWA / Add to Home Screen | Table Stakes | Medium | 0 |
| Field-Level Privacy Controls | Table Stakes | Medium | 1 |
| Oshi / Genre Tags | Differentiator | Medium | 1 |
| Event / Venue Check-In | Differentiator | Medium | 1 |
| Same-Venue Discovery | Differentiator | High | 1 |
| Doutan Settings | Differentiator | Medium | 1 |
| Multiple Profiles | Differentiator | Medium | 1 |
| Themed Profile Design (color) | Differentiator | Low-Medium | 1 |
| Decorative Frame Overlays | Differentiator | High | 2 |
| Social Login (X OAuth) | Differentiator | Medium | 1 |
| Real Name as Primary Field | Anti-Feature | — | Never |
| In-App DM | Anti-Feature | — | 2+ maybe |
| NFC Exchange | Anti-Feature | — | Never |
| In-App QR Scanner | Anti-Feature | — | 2 maybe |
| Organizer-Managed Events | Anti-Feature | — | Never |
| Follower Count Display | Anti-Feature | — | Never |
| Algorithmic Feed | Anti-Feature | — | Never |
| Forced Signup to View Card | Anti-Feature | — | Never |

---

## Key Findings for Requirements Definition

1. **The "context receipt" mechanic is the moat.** No competitor stores "when and where the exchange happened" as first-class data. This is both the differentiator and the core UX promise of なふだ. Every feature decision should ask: does this serve the context?

2. **Doutan settings are a trust signal, not just a feature.** Getting this wrong (e.g., showing doutan-kyohi users in same-oshi lists) would cause community backlash. It must be in Phase 1, not deferred.

3. **Public view with no auth is the single highest-leverage table-stakes item.** It is also the easiest to implement. Ship this first.

4. **Same-venue discovery is the highest-complexity differentiator.** It requires backend, real-time or near-real-time matching, event scoping, and robust privacy controls all working together. It is the correct Phase 1 target but needs careful sequencing: profile → check-in → discovery.

5. **Anti-features are as important as features.** The corporate biz-card pattern (real name, follower count, forced signup) would actively repel the target audience. The "don'ts" must be documented in requirements as firmly as the "dos."

---

*Research conducted: 2026-04-21*
*Sources: Project context (PROJECT.md, concept_overview.md), domain knowledge of Japanese fan community culture and digital networking app landscape*
