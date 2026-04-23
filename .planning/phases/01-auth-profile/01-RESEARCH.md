# Phase 1: 認証・プロフィール基盤 - Research

**Researched:** 2026-04-23
**Domain:** TanStack Start v1 + Better Auth + Drizzle ORM + Neon Postgres + Cloudflare Workers
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 認証フロー・アクセス制御
- ログイン画面: シンプルレイアウト（アプリ名「なふだ」＋キャッチコピー ＋ Google/Facebookボタン ＋「ログインせずに見る →」リンク）
- 「ログインせずに見る」リンクは常に目立つ位置に表示（QRスキャンした相手の離脱防止が最重要）
- **アクセスモデル:**
  - イベントQR（`/e/<slug>`）→ 参加者一覧は未ログインで閲覧可（ハンドル名・アバターのみ）/ 個別プロフィールはログイン必要
  - 個人QR（`/u/<url-id>` または `/u/<url-id>/p/<token>`）→ プロフィール全体を未ログインで閲覧可
  - 「つながる」はログイン必要
- iOS 7日間ストレージ失効対策: リフレッシュトークンで次回起動時にサイレント再認証（ユーザーには見えない）
- OAuth失敗時: 具体的なエラーメッセージ ＋ 再試行ボタンを表示

#### URL・識別子設計
- **URL-ID**（アカウント識別子）と**表示名**を分離
  - URL-ID: 英数字のみ・一意・変更不可（初回ウィザードで設定必須）
  - 表示名: 自由記述（絵文字OK）・非一意・後から変更可
- URLスキーム:
  - `/u/<url-id>` → デフォルトペルソナ
  - `/u/<url-id>/p/<opaque-token>` → 特定ペルソナ（不透明トークン、ペルソナ名が推測不可能）

#### 初回プロフィール設定ウィザード
- ステップ形式ウィザード: URL-ID入力 → 表示名 → 推しタグ（1個以上必須）→ アバター → 完了
- URL-ID入力はリアルタイム重複チェック（デバウンス付き）
- 「本名は不要です」コピーをハンドル名入力欄に添える
- ウィザード完了後は自分のプロフィール画面（ホーム）にランディング

#### ペルソナ管理
- 複数ペルソナの切り替え: 画面上部のドロワーダウン・セレクター
  - 現在のペルソナ名を表示 → タップで一覧 → 切り替え・新規作成
- 各ペルソナは独立したURL（不透明トークン）・フィールド・公開設定を持つ
- 公開/非公開設定はペルソナごとに独立（推し活ペルソナと本業ペルソナで別々に管理）

#### 公開/非公開コントロール
- 配置: プロフィール編集画面で各フィールドの横に目アイコン（👁️/🔒）
- デフォルト: 全フィールド公開（QRを渡す行為自体が公開の意思表示）
- 非公開フィールドはそのペルソナのURLにアクセスした相手に表示されない

#### 推しタグ・同担拒否
- 入力UX: チップ入力 ＋ オートコンプリート（入力中にサジェスト表示、Enter/選択でチップ化）
- タグは自由記述（ジャンル・推しの名前・グループ名など何でも可）
- 同担拒否フラグ: 推しタグの直下に配置、ラジオボタン形式
  - オフ「同担の人にも表示される」/ オン「同担の人の一覧に出たくない場合にオン」
  - ネガティブ表現（「拒否」「食われない」）は使わず中立的な言い回し

#### SNSリンク管理
- 追加UI: プラットフォーム選択リスト → URL入力（プラットフォームごとにバリデーション）
- 初期対応プラットフォーム: X(Twitter) / Instagram / TikTok / YouTube / Discord / LINEオープンチャット / GitHub / Spotify
- 「その他」でカスタムURL（自分のホームページ等）も登録可能
- 表示順序: 手動ドラッグ＆ドロップで並び替え可能

#### アバター設定
- 選択肢: 外部URL入力 または 自動生成のどちらか
- 自動生成: イニシャルアバター（表示名の頭文字 ＋ ランダムカラー背景）
- 将来の画像アップロードは有料機能候補（Phase 1では不要）

#### アプリ構造・ナビゲーション
- ログイン後のランディング: 自分のプロフィール画面（ホーム）
- ボトムナビゲーション: 🏠 ホーム（プロフィール） / 📅 イベント / 📷 QR / ⚙️ 設定

### Claude's Discretion
- ウィザードのステップインジケーター（ドット・バー・番号など）
- イニシャルアバターの色パレット・フォント
- チップ入力のアニメーション・スタイリング
- エラー表示の具体的なメッセージ文言
- SNSプラットフォームアイコンの表示方法

### Deferred Ideas (OUT OF SCOPE)
- プロフィール画像アップロード → 有料機能として将来フェーズ
- Threads / Bluesky 対応 → Phase 1以降の追加対応
- ペルソナ削除・アーカイブ機能の詳細設計 → 実装時判断
- 「自分のプロフィールが他人にどう見える」プレビュー機能 → Phase 1後半または Phase 2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | ユーザーはGoogleアカウントでログインできる | Better Auth `socialProviders.google` configuration; `tanstackStartCookies` plugin for cookie handling |
| AUTH-02 | ユーザーはFacebookアカウントでログインできる | Better Auth `socialProviders.facebook` configuration; same auth handler pattern as Google |
| AUTH-03 | 未ログインユーザーはQRコードからプロフィールURLへアクセスできる | Public loader pattern in TanStack Start; no `beforeLoad` guard on `/u/$urlId` routes |
| AUTH-04 | プロフィール閲覧・QR表示は認証なし、コネクション記録・チェックインには認証が必要 | Pathless `_protected.tsx` layout route pattern; public vs protected route split |
| PROF-01 | ユーザーはハンドル名（表示名）でプロフィールを作成できる（本名入力は不要） | Initial wizard flow; `url_id` + `display_name` separate columns in Drizzle schema |
| PROF-02 | ユーザーはアバターを外部URL入力・自動生成の2方式で設定できる | `avatar_url` nullable column; client-side initials+color generation component |
| PROF-03 | ユーザーはSNSリンクを複数登録できる | `sns_links` table with `platform`, `url`, `display_order`, `persona_id` columns |
| PROF-04 | ユーザーはプロフィールの各フィールドを項目単位で公開/非公開に設定できる | `field_visibility` jsonb column on `personas` table; server-side filter on public profile loader |
| PROF-05 | ユーザーは複数のプロフィール（ペルソナ）を作成し、シーンに応じて切り替えられる | `personas` table with `user_id` FK, `share_token` (opaque), `is_default` boolean |
| OSHI-01 | ユーザーは推し・ジャンルタグを登録できる（自由記述 ＋ サジェスト形式） | `oshi_tags` text array column on `personas`; Emblor chip input component + Command autocomplete |
| OSHI-02 | ユーザーは同担設定を行える（同担拒否フラグを立てると、同じ推しユーザーの一覧から非表示になる） | `dojin_reject` boolean on `personas`; server-side filter in Phase 2 event queries (schema needed now) |
</phase_requirements>

---

## Summary

Phase 1 executes a hard migration: the existing React + Vite SPA (Phase 0) is replaced with TanStack Start v1 running on Cloudflare Workers, backed by Neon Postgres via Cloudflare Hyperdrive, with Better Auth providing Google and Facebook OAuth. All Phase 0 React components are reusable without modification (both use Vite + React 19). The migration work is primarily infrastructure and framework plumbing — not UI work.

The three highest-risk areas are (1) the `verbatimModuleSyntax: true` setting in the current tsconfig, which must be removed for TanStack Start server/client bundle isolation to work correctly, (2) Better Auth's known `cookieCache` + `secondaryStorage` bug that causes session loss — disable cookie cache and rely on DB session storage, and (3) Hyperdrive vs neon-http driver selection — use native `pg` driver (not `@neondatabase/serverless`) when going through Hyperdrive, but use `neon-http` for direct Neon access without Hyperdrive.

The per-field public/private control (PROF-04) is the most schema-design-sensitive requirement. Store visibility preferences as a `jsonb` column on the `personas` table, apply filtering in the server-side public profile loader (not client-side), and never expose non-public data in the API response at all.

**Primary recommendation:** Set up TanStack Start + Cloudflare + Drizzle + Better Auth in Plan 01-01 before touching any auth or profile logic. The infrastructure layer must be solid before feature work begins.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-start | ^1.154.0 | SSR framework + file-based routing | Cloudflare-first, Vite-based (Phase 0 components reuse without change) |
| @tanstack/react-router | ^1.0.0 | Bundled with Start; type-safe routing | Required by Start; provides typed params/loaders |
| better-auth | ^1.6.8 | OAuth + session management | Workers-native (no Node.js TCP), Google/Facebook built-in, TanStack integration plugin |
| drizzle-orm | ^0.40.0 | TypeScript ORM | Only Workers-compatible ORM (Prisma uses Rust binary) |
| drizzle-kit | ^0.30.0 | Migration CLI + Drizzle Studio | Companion CLI for schema generation and migrations |
| @neondatabase/serverless | ^0.10.0 | Neon HTTP driver (no Hyperdrive path) | Edge-compatible HTTP-based Postgres driver |
| pg | ^8.16.3+ | node-postgres (Hyperdrive path) | Required for Hyperdrive — minimum version 8.16.3 |
| @cloudflare/vite-plugin | latest | Workers deploy integration | Official Cloudflare plugin for TanStack Start builds |
| wrangler | ^3.0.0 | Cloudflare CLI | Deployment, secrets, typegen |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | ^7.50.0 | Form state management | All profile/wizard forms |
| @hookform/resolvers | ^3.9.0 | Zod integration for RHF | Required for Zod schema validation in RHF |
| zod | ^3.23.0 | Schema validation (MUST be v3) | All form validation; v4 not supported by RHF resolver |
| @tanstack/react-query | ^5.0.0 | Server-state caching | Data fetching outside of loaders; polling patterns |
| emblor | latest | Chip/tag input with autocomplete | OSHI-01 tag input with shadcn/ui integration |
| shadcn/ui | latest | UI component library | Copy-paste components; Tailwind v4 + React 19 compatible |
| tailwindcss | ^4.2.4 | CSS (carry from Phase 0) | Already configured; CSS-first config |
| motion | ^12.38.0 | Animations (carry from Phase 0) | Already in use; persona switcher transitions |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Clerk | Clerk has vendor lock-in and SaaS pricing risk; Better Auth is self-hosted |
| Better Auth | Auth.js v5 | Auth.js v5 is Next.js-first; TanStack integration is limited |
| Drizzle ORM | Prisma | Prisma Rust binary incompatible with Workers; Drizzle is the only real option |
| Neon (HTTP) | Cloudflare D1 | D1 is SQLite; social graph JOINs and full-text search require Postgres |
| Emblor | Custom chip input | Emblor is shadcn-native, RHF-compatible; hand-rolling costs 3+ days |

**Installation (full Phase 1 stack):**
```bash
pnpm add @tanstack/react-start @tanstack/react-router @tanstack/react-query \
  better-auth drizzle-orm @neondatabase/serverless \
  react-hook-form @hookform/resolvers zod \
  emblor

pnpm add -D @cloudflare/vite-plugin wrangler drizzle-kit @types/pg pg
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── routes/
│   ├── __root.tsx          # Root layout (HeadContent, Scripts, QueryClientProvider)
│   ├── index.tsx           # Redirect to /u/$urlId or login
│   ├── login.tsx           # Login page (public)
│   ├── u/
│   │   ├── $urlId.tsx      # Public profile (default persona, no auth required)
│   │   └── $urlId.p.$token.tsx  # Public profile (specific persona, no auth required)
│   ├── _protected.tsx      # Pathless layout — auth guard for all nested routes
│   ├── _protected/
│   │   ├── home.tsx        # Own profile view (logged in)
│   │   ├── profile/
│   │   │   ├── edit.tsx    # Profile edit
│   │   │   └── wizard.tsx  # First-run wizard
│   │   ├── settings.tsx    # Account settings
│   │   └── events.tsx      # Events list (Phase 2)
│   └── api/
│       └── auth/
│           └── $.ts        # Better Auth handler — catches ALL /api/auth/* requests
├── server/
│   ├── db/
│   │   ├── schema.ts       # Drizzle table definitions
│   │   └── client.ts       # db instance (neon-http or pg+hyperdrive)
│   ├── auth.ts             # Better Auth instance
│   └── functions/          # createServerFn wrappers
│       ├── profile.ts
│       └── oshi.ts
├── components/
│   ├── ui/                 # shadcn/ui copy-paste components
│   ├── ProfileCard.tsx     # Carries from Phase 0
│   ├── PersonaSwitcher.tsx # Persona dropdown selector
│   ├── OshiTagInput.tsx    # Emblor-based chip input
│   └── InitialsAvatar.tsx  # Letter + color avatar
├── lib/
│   ├── auth-client.ts      # Better Auth client (authClient)
│   └── utils.ts            # cn() helper, etc.
├── router.tsx              # getRouter() export
└── routeTree.gen.ts        # Auto-generated by TanStack Router
```

### Pattern 1: TanStack Start + Cloudflare Workers Bootstrap

**What:** Minimal wrangler + vite config for Cloudflare Workers deployment
**When to use:** Start of Plan 01-01

```typescript
// vite.config.ts
// Source: https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
  ],
})
```

```toml
# wrangler.toml
# Source: https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
name = "nafuda"
compatibility_date = "2026-04-23"
compatibility_flags = [ "nodejs_compat" ]
main = "@tanstack/react-start/server-entry"

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<your-hyperdrive-id>"

[observability]
enabled = true
```

**CRITICAL:** Remove `verbatimModuleSyntax: true` from tsconfig. TanStack Start's official docs explicitly warn this causes server code to leak into client bundles.

### Pattern 2: Better Auth Server Setup

**What:** Mount Better Auth handler + TanStack cookie plugin
**When to use:** Plan 01-02 (OAuth implementation)

```typescript
// src/server/auth.ts
// Source: https://better-auth.com/docs/integrations/tanstack
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from './db/client'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!, // CRITICAL: prevents redirect_uri_mismatch
  database: drizzleAdapter(db, { provider: 'pg' }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    },
  },
  session: {
    storeSessionInDatabase: true,
    // NOTE: Do NOT enable cookieCache — upstream bug #4203 causes session loss
    // when combined with secondaryStorage on Cloudflare Workers
    expiresIn: 60 * 60 * 24 * 30,  // 30 days (iOS ITP mitigation)
    updateAge: 60 * 60 * 24,        // Refresh after 1 day
  },
  plugins: [
    tanstackStartCookies(), // MUST be last plugin in array
  ],
})
```

```typescript
// src/routes/api/auth/$.ts
// Source: https://better-auth.com/docs/integrations/tanstack
import { auth } from '../../../server/auth'

export const APIRoute = {
  GET: ({ request }: { request: Request }) => auth.handler(request),
  POST: ({ request }: { request: Request }) => auth.handler(request),
}
```

### Pattern 3: Database Connection (Neon + Hyperdrive)

**What:** Two connection modes — HTTP for dev/migrations, Hyperdrive pg for production Workers
**When to use:** Plan 01-01 (infrastructure setup)

```typescript
// src/server/db/client.ts
// Source: https://dev.to/isaac-fei/deploying-a-tanstack-start-app-with-neon-postgres-and-cloudflare-workers-2fc0
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Use neon-http for migrations and dev (no Hyperdrive)
export const db = drizzle(process.env.DATABASE_URL!, { schema })
```

```typescript
// For production Workers with Hyperdrive:
// src/server/db/client-hyperdrive.ts
// Source: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export function createDb(hyperdrive: Hyperdrive) {
  const pool = new Pool({ connectionString: hyperdrive.connectionString })
  return drizzle(pool, { schema })
}
```

**Note:** Use `neon-http` driver (`drizzle-orm/neon-http`) for Drizzle Kit migrations. Use `node-postgres` driver (`drizzle-orm/node-postgres`) with `pg` when going through Hyperdrive in production Workers.

### Pattern 4: Core Drizzle Schema

**What:** Table definitions for users, personas, SNS links, oshi tags
**When to use:** Plan 01-01 (schema must be established before auth)

```typescript
// src/server/db/schema.ts
// Source: https://orm.drizzle.team/docs/column-types/pg + Better Auth adapter requirements
import { pgTable, text, boolean, timestamp, uuid, jsonb, integer, smallint } from 'drizzle-orm/pg-core'

// Better Auth generates: user, session, account, verification tables via `npx auth generate`

export const personas = pgTable('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(), // FK to Better Auth user.id
  displayName: text('display_name').notNull(),
  shareToken: text('share_token').notNull().unique(), // opaque random token for /u/:id/p/:token
  isDefault: boolean('is_default').notNull().default(false),
  avatarUrl: text('avatar_url'),                  // null = use initials avatar
  oshiTags: text('oshi_tags').array().notNull().default([]),
  dojinReject: boolean('dojin_reject').notNull().default(false),
  fieldVisibility: jsonb('field_visibility').notNull().default({}),
  // { sns_links: 'public'|'private', oshi_tags: 'public'|'private', ... }
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const urlIds = pgTable('url_ids', {
  urlId: text('url_id').primaryKey(),             // immutable, alphanumeric only
  userId: text('user_id').notNull().unique(),      // FK to Better Auth user.id
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const snsLinks = pgTable('sns_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  personaId: uuid('persona_id').notNull(),         // FK to personas.id
  platform: text('platform').notNull(),            // 'x' | 'instagram' | 'tiktok' | etc.
  url: text('url').notNull(),
  displayOrder: smallint('display_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

### Pattern 5: Route Protection (Pathless Layout)

**What:** Auth guard for all protected routes using pathless `_protected.tsx`
**When to use:** Plan 01-02

```typescript
// src/routes/_protected.tsx
// Source: https://better-auth.com/docs/integrations/tanstack
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '../server/auth'

const getSession = createServerFn({ method: 'GET' }).handler(async ({ context }) => {
  const session = await auth.api.getSession({ headers: context.request.headers })
  return session
})

export const Route = createFileRoute('/_protected')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
    return { session }
  },
  component: () => <Outlet />,
})
```

### Pattern 6: Server Function (createServerFn)

**What:** Type-safe server function with Zod validation
**When to use:** All profile CRUD operations

```typescript
// src/server/functions/profile.ts
// Source: https://tanstack.com/start/latest/docs/framework/react/guide/server-functions
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional().nullable(),
})

export const updateProfile = createServerFn({ method: 'POST' })
  .inputValidator(UpdateProfileSchema)
  .handler(async ({ data, context }) => {
    // DB update via Drizzle
  })
```

### Pattern 7: Public Profile Loader (Auth-Free)

**What:** Load profile data without requiring auth; filter non-public fields server-side
**When to use:** `/u/$urlId` and `/u/$urlId/p/$token` routes

```typescript
// src/routes/u/$urlId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const getPublicProfile = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ urlId: z.string() }))
  .handler(async ({ data }) => {
    // 1. Look up urlId -> userId
    // 2. Load default persona for userId
    // 3. Filter fieldVisibility — NEVER return non-public fields
    // 4. Return only public data
  })

export const Route = createFileRoute('/u/$urlId')({
  loader: ({ params }) => getPublicProfile({ data: { urlId: params.urlId } }),
  component: PublicProfilePage,
})
```

### Pattern 8: Oshi Tag Chip Input (Emblor)

**What:** RHF-integrated chip input with autocomplete for oshi tags
**When to use:** OSHI-01 — wizard step 3 and profile edit

```typescript
// src/components/OshiTagInput.tsx
// Source: https://github.com/JaleelB/emblor
import { TagInput } from 'emblor'
import { useFormContext } from 'react-hook-form'

export function OshiTagInput() {
  const { setValue, watch } = useFormContext()
  const tags = watch('oshiTags') ?? []

  return (
    <TagInput
      tags={tags.map((t: string, i: number) => ({ id: String(i), text: t }))}
      setTags={(newTags) => setValue('oshiTags', newTags.map(t => t.text))}
      enableAutocomplete
      autocompleteOptions={[]} // populated from server suggestion query
      placeholder="推し名・ジャンルを入力..."
    />
  )
}
```

### Pattern 9: Initials Avatar Generation

**What:** Client-side deterministic initials avatar (no image upload)
**When to use:** PROF-02 — when `avatarUrl` is null

```typescript
// src/components/InitialsAvatar.tsx
const PALETTE = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#C77DFF', '#FF9F43', '#48CAE4', '#F72585',
]

function getColorForName(name: string): string {
  let hash = 0
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function InitialsAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = [...name][0]?.toUpperCase() ?? '?'  // spread for emoji/multi-byte
  const bg = getColorForName(name)
  return (
    <div
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.4 }}
      className="flex items-center justify-center rounded-full text-white font-bold select-none"
    >
      {initial}
    </div>
  )
}
```

### Pattern 10: Auth Client (Browser-Side)

**What:** Better Auth client for triggering OAuth flows
**When to use:** Login page component

```typescript
// src/lib/auth-client.ts
// Source: https://better-auth.com/docs/authentication/google
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
})

// Usage on login page:
// await authClient.signIn.social({ provider: 'google', callbackURL: '/home' })
// await authClient.signIn.social({ provider: 'facebook', callbackURL: '/home' })
```

### Anti-Patterns to Avoid

- **Using `verbatimModuleSyntax: true` in tsconfig:** Causes server code (Drizzle, db credentials) to leak into client bundles. Remove this from tsconfig when migrating to TanStack Start.
- **Enabling `cookieCache` with Cloudflare Workers:** Better Auth bug #4203 (as of April 2026) causes sessions to not refresh after expiry when `cookieCache` + `secondaryStorage` are both enabled. Use `storeSessionInDatabase: true` only.
- **Using the Neon serverless HTTP driver through Hyperdrive:** Hyperdrive requires native TCP-based drivers (`pg` / Postgres.js). Using `@neondatabase/serverless` through Hyperdrive bypasses the connection pool and misses all performance benefits.
- **Filtering non-public profile fields on the client:** Always filter in the server loader. Never return private field data and hide it client-side — it still leaks via network response.
- **Storing `dojin_reject` filtering in client state:** Must be applied at the DB query level in Phase 2 event queries. The schema design (boolean on `personas`) must be established now.
- **Using a singleton Better Auth instance in Workers without `waitUntil`:** Background tasks (token cleanup, session writes) will be cut off when the Worker exits. Always pass `executionCtx.waitUntil()` to the auth handler.
- **Creating multiple Drizzle instances wrapping the same DB binding:** Causes write-lock contention on D1 (33-second hangs) and potential issues on Neon under Hyperdrive. One db instance per request context.
- **Putting profile public/private logic in application layer (not query layer):** When non-public fields are fetched from DB and then stripped in app code, they can still appear in error messages, logs, or accidental serialization. Filter at select time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chip input with autocomplete | Custom `<input>` + tag list | Emblor | RHF integration, keyboard nav, a11y, drag-reorder built-in |
| OAuth flow | Custom redirect + callback | Better Auth `socialProviders` | PKCE, state validation, token refresh, error handling |
| Session management | Custom JWT cookies | Better Auth session system | iOS ITP handling, token rotation, revocation |
| Form validation | Custom validation logic | Zod v3 + RHF resolver | Type inference, async validation, server/client schema sharing |
| DB migrations | Hand-crafted SQL files | `drizzle-kit generate` + `migrate` | Schema diff, rollback, Drizzle Studio GUI |
| Auth schema tables | Manual `users`/`sessions` tables | `npx auth generate` | Better Auth expects exact column names; mismatches cause silent failures |
| Opaque persona tokens | Incrementing IDs or UUIDs as URL | `crypto.randomBytes(16).toString('hex')` | UUIDs are guessable; opaque tokens prevent persona enumeration |
| Initials avatar colors | Random per-render colors | Deterministic hash of display name | Prevents color flash on re-render and hydration mismatch |

**Key insight:** Better Auth + Drizzle handle the entire auth/session/schema surface. The only custom code needed is business logic: persona management, field visibility rules, and tag filtering.

---

## Common Pitfalls

### Pitfall 1: verbatimModuleSyntax Breaks Server/Client Bundle Split

**What goes wrong:** Drizzle, DB credentials, and server-only code appear in the browser bundle. Build may succeed but the client downloads database driver code.
**Why it happens:** `verbatimModuleSyntax: true` preserves all import statements even for type-only imports, preventing TanStack Start's dead-code elimination from stripping server modules from the client bundle.
**How to avoid:** Remove `"verbatimModuleSyntax": true` from `tsconfig.json` when migrating Phase 0 to TanStack Start. Replace type-only imports by using explicit `import type` syntax (already required by the existing codebase convention per STATE.md [00-02]) — TanStack Start handles these correctly without the flag.
**Warning signs:** Browser devtools Network tab shows `drizzle-orm` in client JS bundles; `pg` or `@neondatabase/serverless` in client chunks.

### Pitfall 2: Better Auth cookieCache + Cloudflare Workers Session Loss

**What goes wrong:** Users are logged out after exactly 5 minutes regardless of `expiresIn` setting. Session valid in database but Better Auth doesn't refresh it.
**Why it happens:** Better Auth bug #4203 (open as of January 2026, confirmed still affecting Workers deployments April 2026). `cookieCache` + `secondaryStorage` combination breaks session refresh logic on Workers.
**How to avoid:** In `auth.ts`, do NOT set `cookieCache: { enabled: true }`. Use only `session: { storeSessionInDatabase: true }`. Accept the extra DB read per request — it is worth the correctness.
**Warning signs:** Users report being logged out at fixed intervals; session exists in DB but is not recognized by subsequent requests.

### Pitfall 3: iOS 7-Day ITP — Session Expiry

**What goes wrong:** Monthly concert attendees find themselves logged out every time they open the app (iOS ITP clears storage after 7 days of no cross-site communication).
**Why it happens:** iOS Safari's Intelligent Tracking Prevention (ITP) caps cookie storage lifetime at 7 days if the user has not interacted with the site via a link from another domain.
**How to avoid:** Set `expiresIn: 60 * 60 * 24 * 30` (30 days) in Better Auth session config. On PWA launch, call `authClient.getSession()` silently — Better Auth will refresh the session if it is within the `updateAge` window. If session is expired, redirect to login with a friendly message (not a blank screen).
**Warning signs:** Users report random logouts ~7 days after last visit; only reproducible on iOS, not Android/desktop.

### Pitfall 4: Neon Driver vs Hyperdrive Mismatch

**What goes wrong:** Queries are slower than expected, or connection fails with TCP-related errors, when using `@neondatabase/serverless` through Hyperdrive.
**Why it happens:** `@neondatabase/serverless` uses HTTP (WebSockets for transactions), bypassing Hyperdrive's TCP connection pool entirely. Hyperdrive is designed for `pg` or `postgres.js` drivers.
**How to avoid:** In production Workers (with Hyperdrive binding), use `drizzle-orm/node-postgres` with `pg`. For dev/migrations (no Hyperdrive), use `drizzle-orm/neon-http` with `@neondatabase/serverless`. Keep two separate connection helpers if needed.
**Warning signs:** Hyperdrive dashboard shows 0 connections; query latency is the same with and without Hyperdrive enabled.

### Pitfall 5: Better Auth Schema Mismatch with Drizzle Adapter

**What goes wrong:** Auth fails silently, sessions are not created, or user record is not found — even when OAuth completes successfully.
**Why it happens:** The Drizzle adapter expects exact table and column names that match Better Auth's internal schema. Manually created tables or tables with plural naming (`users` vs `user`) will not be recognized.
**How to avoid:** Always run `npx auth generate` first to generate the Better Auth schema as Drizzle migrations. Then run `npx drizzle-kit migrate`. Do not hand-write the auth tables.
**Warning signs:** OAuth callback redirects to success URL but no user is created in DB; `auth.api.getSession()` always returns null.

### Pitfall 6: URL-ID Uniqueness Race Condition

**What goes wrong:** Two users simultaneously submit the same URL-ID during wizard setup and both succeed, violating the uniqueness invariant.
**Why it happens:** The real-time availability check (debounced frontend query) is not atomic with the INSERT. Two requests can pass the check concurrently before either completes the insert.
**How to avoid:** Add a `UNIQUE` constraint on `url_ids.url_id` in the Drizzle schema. On insert failure (duplicate key error), catch the PostgreSQL error code `23505` and return a user-friendly "URL-ID is already taken" message. The frontend debounce check is UX-only, not a correctness guarantee.
**Warning signs:** Duplicate URL-IDs visible in database; `psql` shows constraint violation in error logs.

### Pitfall 7: Non-Public Field Data Leaking in API Response

**What goes wrong:** User sets SNS links to private, but another user can retrieve the private data by directly calling the API with the profile's URL-ID.
**Why it happens:** Filtering is done in component render logic (e.g., `{isPublic && <SNSLinks />}`) rather than at the data layer.
**How to avoid:** In the public profile server function, SELECT only the columns/fields that pass the `fieldVisibility` check before returning data. Never SELECT private fields and conditionally hide them — they will appear in the raw response JSON.
**Warning signs:** Browser devtools shows private SNS links in the JSON response for an unauthenticated request.

---

## Code Examples

Verified patterns from official sources:

### Better Auth Google + Facebook Provider Configuration
```typescript
// Source: https://better-auth.com/docs/authentication/google
//         https://better-auth.com/docs/authentication/facebook
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: 'offline',        // ensures refresh token is issued
      prompt: 'select_account',     // forces account picker every time
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      // email + public_profile are default scopes — sufficient for Phase 1
    },
  },
})
```

### Drizzle Kit Configuration
```typescript
// drizzle.config.ts
// Source: https://dev.to/isaac-fei/deploying-a-tanstack-start-app-with-neon-postgres-and-cloudflare-workers-2fc0
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

export default defineConfig({
  out: './drizzle',
  schema: './src/server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### Persona Share Token Generation (Opaque)
```typescript
// src/server/functions/persona.ts
import { createServerFn } from '@tanstack/react-start'

function generateShareToken(): string {
  // 16 bytes = 32 hex chars — unguessable, not linked to persona name
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const createPersona = createServerFn({ method: 'POST' })
  .handler(async ({ context }) => {
    const token = generateShareToken()
    // INSERT persona with shareToken = token
  })
```

### URL-ID Validation (Realtime Check with Debounce)
```typescript
// Zod schema for URL-ID constraints
const urlIdSchema = z.string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9]+$/, 'URL-ID は英数字のみ使用できます')

// RHF field with debounced server check
// Use useDebounce hook + createServerFn to check availability
```

### Public Profile Loader with Field Visibility Filtering
```typescript
// Conceptual pattern — filter at query time, not component time
const getPublicProfile = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ urlId: z.string() }))
  .handler(async ({ data }) => {
    const urlEntry = await db.select().from(urlIds).where(eq(urlIds.urlId, data.urlId)).get()
    if (!urlEntry) throw notFound()

    const persona = await db.select().from(personas)
      .where(and(eq(personas.userId, urlEntry.userId), eq(personas.isDefault, true)))
      .get()
    if (!persona || !persona.isPublic) throw notFound()

    const visibility = persona.fieldVisibility as Record<string, string>

    // Filter SNS links based on field visibility
    const links = visibility.sns_links === 'private' ? [] :
      await db.select().from(snsLinks).where(eq(snsLinks.personaId, persona.id))
        .orderBy(snsLinks.displayOrder)

    return {
      displayName: persona.displayName,
      avatarUrl: persona.avatarUrl,
      oshiTags: visibility.oshi_tags === 'private' ? [] : persona.oshiTags,
      dojinReject: persona.dojinReject, // always exposed (needed for Phase 2 filtering)
      snsLinks: links,
    }
  })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `app.config.ts` (Vinxi) | `vite.config.ts` + `tanstackStart()` plugin | TanStack Start v1.121.0 (June 2025) | Any pre-RC tutorial using `app.config.ts` is outdated; must use vite plugin |
| `@tanstack/react-start/config` | `@tanstack/react-start/plugin/vite` | TanStack Start v1.121.0 | Import path changed; old path no longer works |
| better-auth pinned at <1.3.0-beta9 | better-auth ^1.6.8 (stable) | Fixed in post-beta9 releases | X OAuth regression was fixed; since we do NOT use X OAuth, any ^1.6.x stable is fine |
| `app/` directory (Vinxi convention) | `src/` directory | TanStack Start v1.121.0 | Official template now uses `src/`; existing Phase 0 structure is already `src/` — no change needed |
| Entry files `app/ssr.tsx`, `app/client.tsx` | Auto-detected by `@tanstack/react-start/server-entry` | TanStack Start v1 | No manual entry file needed; `main` in wrangler.toml points to the Start server entry |

**Deprecated/outdated:**
- `TanStackRouterVite()` plugin: replaced by `tanstackStart()` — do not use the old plugin
- `app.config.ts`: entirely replaced by `vite.config.ts` + tanstackStart plugin
- `react-router` (Phase 0): replaced by TanStack Router in Phase 1; remove from dependencies

---

## Open Questions

1. **Hyperdrive Free Tier Availability**
   - What we know: Cloudflare Hyperdrive requires the Workers Paid plan ($5/month). Free plan excludes Hyperdrive.
   - What's unclear: Whether the project is on a paid Cloudflare plan.
   - Recommendation: Confirm billing tier before Plan 01-01. If free plan only: use `@neondatabase/serverless` (neon-http) directly in Workers without Hyperdrive. This works and is the fallback pattern documented by Neon and confirmed in the DEV.to tutorial.

2. **Better Auth Background Task `waitUntil` Pattern in TanStack Start**
   - What we know: The Medium article on Better Auth + Cloudflare Workers (Hono context) shows passing `ctx.waitUntil()` to prevent background task cutoff. The TanStack Start integration page does not mention this explicitly.
   - What's unclear: How to access `executionCtx.waitUntil()` from within the TanStack Start auth route handler (`$.ts`).
   - Recommendation: In Plan 01-02, test session writes/logout to verify background tasks complete. If sessions are not persisted, investigate passing the execution context via TanStack Start's server context.

3. **Neon Region Selection**
   - What we know: For a Japan-focused app, `ap-northeast-1` (Tokyo) is the nearest Neon region for Japanese users.
   - What's unclear: Whether Neon's `ap-northeast-1` region supports all features (branching, compute autoscale) on the free tier.
   - Recommendation: Select `ap-northeast-1` when creating the Neon project. Verify branching is available (needed for `drizzle-kit` dev branch workflow).

4. **Facebook OAuth App Review Requirements**
   - What we know: Facebook basic OAuth (email + public_profile) can be used in development without App Review. Production deployment for public users may require Facebook App Review.
   - What's unclear: Whether Phase 1 will launch publicly or remain in development/limited testing mode.
   - Recommendation: Submit Facebook App for review early if planning a public launch. Basic permissions (email, public_profile) do not require review but the app must be in "Live" mode, not "Development" mode, for real users.

---

## Sources

### Primary (HIGH confidence)
- `https://better-auth.com/docs/integrations/tanstack` — Better Auth TanStack Start integration guide (server handler, cookie plugin, route protection)
- `https://better-auth.com/docs/authentication/google` — Google OAuth provider configuration
- `https://better-auth.com/docs/authentication/facebook` — Facebook OAuth provider configuration
- `https://better-auth.com/docs/adapters/drizzle` — Drizzle adapter setup, schema generation commands
- `https://better-auth.com/docs/concepts/session-management` — Session config, cookieCache strategies
- `https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/` — Official TanStack Start + Cloudflare Workers setup guide
- `https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/` — Hyperdrive + Neon official setup (driver selection: pg, not neon-serverless)
- `https://tanstack.com/start/latest/docs/framework/react/build-from-scratch` — TanStack Start from-scratch setup, `verbatimModuleSyntax` warning
- `https://tanstack.com/start/latest/docs/framework/react/guide/server-functions` — createServerFn API, Zod validation pattern

### Secondary (MEDIUM confidence)
- `https://dev.to/isaac-fei/deploying-a-tanstack-start-app-with-neon-postgres-and-cloudflare-workers-2fc0` (March 2026) — Complete TanStack Start + Neon + Cloudflare Workers tutorial; wrangler.jsonc, drizzle.config.ts, vite.config.ts verified against official docs
- `https://medium.com/@senioro.valentino/better-auth-cloudflare-workers-the-integration-guide-nobody-wrote-8480331d805f` (Feb 2026) — Better Auth + Cloudflare Workers pitfalls: dual instance problem, KV TTL, cookieCache bug #4203, waitUntil requirement
- `https://github.com/chao800404/better-auth-d1-cloudflare-tanstack-start` — Working production template with Better Auth + TanStack Start + Cloudflare; confirms basic integration pattern
- `https://github.com/JaleelB/emblor` — Emblor tag input component; RHF integration, autocomplete, shadcn-compatible

### Tertiary (LOW confidence — flagged for validation)
- Better Auth cookieCache bug #4203 status (April 2026): Reported as still open in January 2026 per the Medium article; current status in v1.6.8 not confirmed. Validate by testing session persistence in Plan 01-02.
- Facebook App Review requirement timeline: Based on general Facebook platform knowledge, not specifically verified for Better Auth flow. Check Facebook developer dashboard during Plan 01-02.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — Core libraries verified against official Cloudflare docs, Better Auth docs, TanStack docs
- Architecture Patterns: HIGH — Code patterns sourced from official guides and March 2026 tutorial
- Pitfalls: HIGH — `verbatimModuleSyntax` from official TanStack docs; cookieCache bug from Feb 2026 Medium article cross-referenced with GitHub issue #4203; Hyperdrive driver from official Cloudflare docs
- iOS ITP session handling: MEDIUM — session behavior pattern is standard; Better Auth-specific iOS testing not confirmed

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (Better Auth and TanStack Start are actively releasing; recheck before Plan 01-02 implementation if > 30 days elapsed)
