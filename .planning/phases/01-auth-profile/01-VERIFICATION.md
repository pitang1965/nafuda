---
phase: 01-auth-profile
verified: 2026-04-25T10:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: null
gaps: []
human_verification:
  - test: "Google OAuth ログインフロー（エンドツーエンド）"
    expected: "Googleボタンをクリック → Googleコンセント画面 → /home に着地、セッションクッキーが設定される"
    why_human: "OAuth フローはブラウザ + 外部サービスとのリダイレクトを伴い、プログラム的に検証不可"
  - test: "Facebook OAuth ログインフロー（エンドツーエンド）"
    expected: "Facebookボタンをクリック → Facebook コンセント画面 → /home に着地"
    why_human: "OAuth フローは外部サービス依存であり、テストユーザーが必要"
  - test: "セッション30日持続"
    expected: "ログイン後30日間、再ログイン不要でアプリが使える"
    why_human: "実際の経過時間が必要"
  - test: "推しタグオートコンプリート（DB内の既存タグがあるとき）"
    expected: "複数ユーザーがタグを登録した後、新規ユーザーが入力すると既存タグが候補として表示される"
    why_human: "テストデータが必要。DB内に複数ペルソナのoshiTagsが存在する必要がある"
---

# Phase 01: 認証・プロフィール基盤 Verification Report

**Phase Goal:** 実ユーザーがGoogleまたはFacebookでログインし、ハンドルネームベースのプロフィールを作成・管理でき、推し設定と同担拒否フラグを設定できる
**Verified:** 2026-04-25T10:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ユーザーはGoogleまたはFacebookアカウントでログインでき、ハンドル名と本名が分離されたプロフィールを作成できる | VERIFIED | `src/server/auth.ts`: betterAuth with google/facebook socialProviders; `src/routes/login.tsx`: signIn.social calls; `src/routes/_protected/profile/wizard.tsx`: 5-step wizard with "本名は不要です" copy |
| 2 | ログインしていないユーザーがQRコードのURLにアクセスすると、ログイン不要でプロフィールを閲覧できる（SNSリンク・推しタグ含む） | VERIFIED | `src/routes/u/$urlId.tsx`: no beforeLoad auth check; `getPublicProfile` in profile.ts filters server-side; `src/routes/login.tsx` L42: href="/" (fixed from /u/demo by plan 01-05) |
| 3 | ユーザーは複数のプロフィール（ペルソナ）を作成し、推し活用・本業用など切り替えながら使える | VERIFIED | `src/components/PersonaSwitcher.tsx`: dropdown with switch + "新しいペルソナを作成"; `src/routes/_protected/home.tsx` L40: `onCreateNew={() => navigate({ to: '/profile/wizard' })}` (fixed by plan 01-05) |
| 4 | ユーザーはプロフィールの各フィールドを項目単位で公開/非公開に設定でき、設定が即座に反映される | VERIFIED | `src/routes/_protected/profile/edit.tsx` L13: `staleTime: 0`; VisibilityToggle component; `updatePersona` sends fieldVisibility to DB; `getPublicProfile` filters by fieldVisibility server-side |
| 5 | ユーザーは推し・ジャンルタグを自由記述とサジェストで登録でき、同担拒否フラグを設定すると一覧から自分が非表示になる | VERIFIED | `src/components/OshiTagInput.tsx`: TagInput from emblor + getOshiSuggestions autocomplete; `src/server/functions/oshi.ts`: updateDojinReject saves dojinReject to personas table; dojin_reject column in schema |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/server/db/schema.ts` | VERIFIED | Contains pgTable('personas') with oshiTags array, dojinReject boolean, fieldVisibility jsonb, bio. Also urlIds, snsLinks, Better Auth tables (user/session/account/verification) |
| `src/server/db/client.ts` | VERIFIED | Exports `db` via drizzle/neon-http, imports schema |
| `src/server/db/client-hyperdrive.ts` | VERIFIED | Exports `createDb` factory using pg+Pool for production Cloudflare Workers |
| `drizzle.config.ts` | VERIFIED | dialect: 'postgresql', schema: './src/server/db/schema.ts' |
| `wrangler.toml` | VERIFIED | compatibility_flags = ["nodejs_compat"] present |
| `vite.config.ts` | VERIFIED | cloudflare() + tanstackStart() plugins; ssr.noExternal: ['emblor'] |
| `src/routes/__root.tsx` | VERIFIED | Uses HeadContent (from @tanstack/react-router) + Scripts + Outlet |
| `src/server/auth.ts` | VERIFIED | betterAuth with google/facebook providers, 30-day session, no cookieCache, drizzleAdapter |
| `src/lib/auth-client.ts` | VERIFIED | Exports authClient, useSession, signIn, signOut |
| `src/routes/api/auth/$.ts` | VERIFIED | createFileRoute with server.handlers GET/POST calling auth.handler |
| `src/routes/login.tsx` | VERIFIED | signIn.social for google/facebook; "ログインせずに見る" link to "/" |
| `src/routes/_protected.tsx` | VERIFIED | getSession via getRequest() + auth.api.getSession(); redirect to /login if no session |
| `src/server/functions/profile.ts` | VERIFIED | Exports: checkUrlIdAvailability, getOwnProfile, createPersona, updatePersona, getPublicProfile, upsertSnsLink, deleteSnsLink |
| `src/routes/_protected/profile/wizard.tsx` | VERIFIED | 5-step wizard with FormProvider; OshiTagInput at step 3; oshiTags min(1) validation; createPersona called on submit |
| `src/routes/_protected/profile/edit.tsx` | VERIFIED | staleTime: 0; FormProvider; VisibilityToggle; OshiTagInput; dojin_reject radio; SNS link manager with add/delete/reorder |
| `src/routes/u/$urlId.tsx` | VERIFIED | No auth check; loader calls getPublicProfile; renders filtered public fields |
| `src/components/PersonaSwitcher.tsx` | VERIFIED | Dropdown with current persona, list, onSwitch, onCreateNew |
| `src/components/InitialsAvatar.tsx` | VERIFIED | getColorForName deterministic hash; used in wizard/home/edit/public routes |
| `src/server/functions/oshi.ts` | VERIFIED | Exports: getOshiSuggestions (UNNEST SQL), updateOshiTags, updateDojinReject |
| `src/components/OshiTagInput.tsx` | VERIFIED | TagInput from emblor; RHF integration (useFormContext setValue/watch); getOshiSuggestions autocomplete with 300ms debounce |
| `src/routes/_protected/home.tsx` | VERIFIED | Loader calls getOwnProfile; authClient.signOut() logout; navigate to /profile/wizard on create; PersonaSwitcher |
| `drizzle/` | VERIFIED | 3 migration files: 0000_great_the_fury.sql, 0001_ambiguous_luckman.sql, 0002_lovely_paper_doll.sql |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/routes/login.tsx` | `src/lib/auth-client.ts` | `authClient.signIn.social({ provider: 'google' })` | WIRED | L10, L13 confirmed |
| `src/routes/api/auth/$.ts` | `src/server/auth.ts` | `auth.handler(request)` | WIRED | L10-11 confirmed |
| `src/routes/_protected.tsx` | `src/server/auth.ts` | `auth.api.getSession()` | WIRED | L11 confirmed via getRequest() pattern |
| `src/server/auth.ts` | `src/server/db/client.ts` | `drizzleAdapter(db, ...)` | WIRED | L11 confirmed |
| `src/routes/_protected/profile/wizard.tsx` | `src/server/functions/profile.ts` | `createPersona()` call | WIRED | L77, passes oshiTags |
| `src/routes/u/$urlId.tsx` | `src/server/functions/profile.ts` | `getPublicProfile()` loader | WIRED | L8 confirmed |
| `src/routes/_protected/home.tsx` | `src/server/functions/profile.ts` | `getOwnProfile()` loader | WIRED | L10 confirmed |
| `src/server/functions/profile.ts` | `src/server/db/schema.ts` | `db.select/insert/update from personas` | WIRED | L98, L103, L136, L152, L164 confirmed |
| `src/components/OshiTagInput.tsx` | `src/server/functions/oshi.ts` | `getOshiSuggestions()` on input change | WIRED | L4, L47 confirmed |
| `src/routes/_protected/profile/edit.tsx` | `src/components/OshiTagInput.tsx` | OshiTagInput component in form | WIRED | L9, L417 confirmed |
| `src/server/functions/oshi.ts` | `src/server/db/schema.ts` | `db.update(personas).set({ oshiTags, dojinReject })` | WIRED | L42-44, L58-60 confirmed |
| `src/routes/_protected/home.tsx` | `src/lib/auth-client.ts` | `authClient.signOut()` on logout | WIRED | L23 confirmed |
| `src/routes/_protected/home.tsx` | `/profile/wizard` | `navigate({ to: '/profile/wizard' })` | WIRED | L40 confirmed |
| `src/routes/_protected/profile/edit.tsx` | TanStack Router loader cache | `staleTime: 0` forces re-run on navigation | WIRED | L13 confirmed |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 01-01, 01-02 | Googleアカウントでログインできる | SATISFIED | src/server/auth.ts: socialProviders.google; login.tsx: signIn.social('google') |
| AUTH-02 | 01-01, 01-02 | Facebookアカウントでログインできる | SATISFIED | src/server/auth.ts: socialProviders.facebook; login.tsx: signIn.social('facebook') |
| AUTH-03 | 01-01, 01-02, 01-03, 01-05 | 未ログインユーザーはQRからプロフィールURLへアクセスできる | SATISFIED | /u/$urlId.tsx: no auth check; login.tsx: href="/" (not /u/demo) |
| AUTH-04 | 01-01, 01-02, 01-03, 01-05 | プロフィール閲覧・QR表示は認証なしで可能 | SATISFIED | /u/$urlId.tsx and /u/$urlId.p.$token.tsx: no beforeLoad auth gates |
| PROF-01 | 01-01, 01-03 | ハンドル名でプロフィールを作成できる（本名入力不要） | SATISFIED | wizard.tsx: "本名は不要です" copy; displayName field (no real name field) |
| PROF-02 | 01-01, 01-03 | アバターを外部URL・自動生成の2方式で設定できる | SATISFIED | wizard.tsx: useAutoAvatar checkbox; InitialsAvatar component; avatarUrl URL input |
| PROF-03 | 01-01, 01-03 | SNSリンクを複数登録できる（9 platforms） | SATISFIED | edit.tsx: PLATFORMS const with 9 platforms; upsertSnsLink/deleteSnsLink server functions |
| PROF-04 | 01-01, 01-03, 01-05 | 各フィールドを公開/非公開に設定でき即座に反映 | SATISFIED | edit.tsx: VisibilityToggle; staleTime: 0; getPublicProfile filters fieldVisibility server-side |
| PROF-05 | 01-01, 01-03 | 複数ペルソナを作成し切り替えられる | SATISFIED | createPersona allows multiple; PersonaSwitcher in home.tsx; onCreateNew navigates to wizard |
| OSHI-01 | 01-01, 01-04 | 推し・ジャンルタグを自由記述＋サジェストで登録 | SATISFIED | OshiTagInput.tsx: Emblor TagInput + getOshiSuggestions autocomplete; wizard step 3 + edit page |
| OSHI-02 | 01-01, 01-04 | 同担拒否フラグを設定できる | SATISFIED | dojin_reject column in schema; updateDojinReject server fn; radio toggle in edit.tsx L437-451 |

**All 11 required requirements (AUTH-01 through PROF-05, OSHI-01, OSHI-02) are SATISFIED.**

Note: No orphaned requirements. REQUIREMENTS.md maps exactly AUTH-01, AUTH-02, AUTH-03, AUTH-04, PROF-01 through PROF-05, OSHI-01, OSHI-02 to Phase 1 — all accounted for across 01-01 through 01-05 plans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/routes/_protected/profile/edit.tsx` | 369, 397, 512 | `placeholder=` | Info | HTML input placeholders, not stub code — legitimate UI |
| `src/components/OshiTagInput.tsx` | 64 | `placeholder=` | Info | HTML input placeholder — legitimate UI |
| `src/server/functions/profile.ts` | 162, 170 | `return null` | Info | Legitimate null return when persona/urlId not found in public profile query — correct behavior |

No blockers or warnings found. All `return null` instances are intentional guard clauses, not stubs.

One notable observation: `setDefaultPersona` was listed in 01-03-PLAN.md artifacts section as an expected export from `profile.ts`, but it was not implemented. This does not affect goal achievement — default persona is set at creation time via `isDefault: true` in `createPersona`, and the persona switcher currently switches the active persona in local state. Full setDefaultPersona persistence is a future enhancement, not a current requirement gap.

---

### Human Verification Required

#### 1. Google OAuth Login Flow

**Test:** Start fresh (no session cookie). Navigate to /login. Click "Googleでログイン".
**Expected:** Google OAuth consent screen opens. Complete auth. Browser lands on /home. No redirect loop. Session cookie present.
**Why human:** OAuth redirect flow requires browser + Google's servers + network.

#### 2. Facebook OAuth Login Flow

**Test:** Log out. Navigate to /login. Click "Facebookでログイン". Use a Facebook test user.
**Expected:** Facebook consent screen opens. Complete auth. Browser lands on /home.
**Why human:** Facebook app must be in Development mode with a test user configured.

#### 3. Session persistence across browser restart

**Test:** Log in with Google. Close browser entirely. Reopen and navigate to /home.
**Expected:** User is still logged in (no redirect to /login). Session persists for 30 days.
**Why human:** Requires actual time passage or browser session manipulation.

#### 4. Oshi tag autocomplete (with existing DB data)

**Test:** Create a user with oshi tag "アイマス". Log in as a second user. In wizard step 3, type "アイ".
**Expected:** After ~300ms, "アイマス" appears as an autocomplete suggestion in the dropdown.
**Why human:** Requires at least one pre-existing persona with oshi tags in the database.

---

## Summary

All 5 ROADMAP.md Success Criteria for Phase 1 are verified against the actual codebase. All 11 requirement IDs (AUTH-01 through AUTH-04, PROF-01 through PROF-05, OSHI-01, OSHI-02) have confirmed implementation evidence. Gap-closure plan 01-05 correctly resolved all 4 UAT failures identified in 01-UAT.md:

1. login.tsx: `href="/"` confirmed (was `/u/demo`)
2. home.tsx: `authClient.signOut()` + logout button confirmed
3. home.tsx: `navigate({ to: '/profile/wizard' })` in onCreateNew confirmed
4. edit.tsx: `staleTime: 0` on route definition confirmed

Key architectural decisions implemented correctly: server-side field filtering in `getPublicProfile` (private fields never returned in API response), `getRequest()` pattern for session access in all server functions, no `cookieCache` in auth.ts, `staleTime: 0` preventing stale loader cache on edit page.

Phase 1 goal is achieved.

---

_Verified: 2026-04-25T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
