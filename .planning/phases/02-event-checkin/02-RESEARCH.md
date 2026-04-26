# Phase 2: イベント・チェックイン (REDESIGNED) - Research

**Researched:** 2026-04-25 (updated 2026-04-25 after design change)
**Domain:** TanStack Start v1 + Drizzle ORM + qrcode.react + Drizzle ALTER TABLE migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**確定した設計**

- `/events` — 2セクション（「主催したイベント」「参加したイベント」）＋「新規イベントを作成」ボタン
- `/events/new` — イベント名・会場名・日付を入力するフォーム。作成後 `/e/$slug` にリダイレクト
- `/e/$slug` — イベント情報 ＋ 参加者一覧（全チェックイン済みユーザー） ＋ QRコード ＋「参加する」ボタン
- チェックインは「来た記録」のみ。チェックアウトUIは不要（`checkedOutAt` はDBに残るが機能廃止）
- 参加者一覧は「チェックインした全員」（`checkedOutAt` IS NULL フィルタを外す）
- QRコードはクライアントサイドのみでレンダリング（`window.location.href` を値とする）
- `events` テーブルに `hostUserId: text('host_user_id').notNull()` カラムを追加（マイグレーション必要）
- slug はイベント名＋日付から自動生成
- `/e/$slug` は公開アクセス可能。未ログイン者はハンドル名・アバターのみ閲覧可（OSHI-05 維持）
- プロフィールリンクはログイン時のみ有効

**廃止するもの**

- `EventCheckinCard` コンポーネント（チェックイン中ステータスカード）
- `checkoutFromEvent` サーバー関数
- `getActiveCheckin` サーバー関数

### Claude's Discretion

- QRコードのサイズ・スタイリング（クライアントレンダリング、`window.location.href` で表示）
- イベント一覧ページの具体的なUIレイアウト（2セクション構成）
- 「参加する」ボタンのUXデザイン（ログイン済み/未ログインで表示切替）
- `getMyEvents` 関数の返却形式（`{hosted: [...], participated: [...]}` を推奨）

### Deferred Ideas (OUT OF SCOPE)

- チェックアウト機能のUI（DBカラムは残存）
- リアルタイム参加者更新（TECH-01、Phase 3 以降）
- イベント管理機能（編集・削除）
- GPS座標取得（新設計ではチェックインフォームが不要なため対象外）
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OSHI-03 | ユーザーはイベントにチェックインできる（日付・会場名・イベント名・GPS座標を記録） | `createEvent` server fn、`checkinToEvent` 改修（auto-checkout削除）、`/events/new` フォーム、`/e/$slug` の「参加する」ボタン経由チェックイン |
| OSHI-04 | ログインユーザーは同じイベントにチェックインしている参加者の一覧を閲覧できる（同担フィルタ適用済み） | `getEventParticipants` 改修（`checkedOutAt IS NULL` フィルタ削除）、`getMyEvents` server fn 新規追加、`/events` 一覧ページ |
| OSHI-05 | 未ログインユーザーはイベント参加者の一覧（ハンドル名・アバターのみ）を閲覧できるが、個別プロフィールは閲覧不可 | `/e/$slug` 公開ルート、`getOptionalSession` パターン、QRコードによる誘導フロー |
</phase_requirements>

---

## Summary

Phase 2 の設計が変更された。旧設計（自己申告チェックイン＋チェックアウト）から新設計（主催者がイベントを作成→QRを共有→参加者がスキャンしてページ上のボタンでチェックイン）に切り替える。

技術的に必要な変更は以下の4点:
1. **DBマイグレーション**: `events` テーブルへ `host_user_id` カラムを ALTER TABLE で追加（Drizzle `db:generate` + `db:migrate`）
2. **server functions 改修**: `checkinToEvent` の auto-checkout ロジック削除、`getEventParticipants` の `checkedOutAt IS NULL` フィルタ削除。新規: `createEvent`、`getMyEvents` の追加。廃止: `checkoutFromEvent`、`getActiveCheckin`
3. **ルート大幅改修**: `/_protected/events/index.tsx` を「一覧ページ」に書き換え、`/_protected/events/new.tsx` を新規作成、`/e/$slug.tsx` に QRコード と「参加する」ボタン追加
4. **QRコード**: `qrcode.react` v4.2 は既にインストール済み。`QRCodeSVG` named export を使用（SSR非対応のため `useEffect` またはクライアント専用コンポーネントに封じ込める）

既存の `ParticipantCard` コンポーネント・`getEventParticipants` の大部分・Drizzle パターン・`createServerFn` パターンはすべて再利用可能。

**Primary recommendation:** 既存コードを「削除・改修」してから「新規追加」する順序で進める。マイグレーションは最初のタスクとして分離する。

---

## Standard Stack

### Core (already in project — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `qrcode.react` | ^4.2.0 | QRコードSVG/Canvas描画 | 既にインストール済み |
| `drizzle-orm` | ^0.45.2 | DB schema、クエリ、マイグレーション | Phase 1 から確立済み |
| `@neondatabase/serverless` | ^1.1.0 | Neon HTTP driver for Cloudflare Workers | Phase 1 から確立済み |
| `@tanstack/react-start` | ^1.167.42 | `createServerFn`、`createFileRoute`、`getRequest()` | Phase 1 から確立済み |
| `@tanstack/react-query` | ^5.100.1 | クライアントサイドデータフェッチ | Phase 1 から確立済み |
| `better-auth` | ^1.6.8 | `auth.api.getSession()` 認証チェック | Phase 1 から確立済み |
| `zod` | ^3.25.76 | server function の入力バリデーション | Phase 1 から確立済み |
| `react-hook-form` | ^7.73.1 | フォーム状態管理 | Phase 1 から確立済み |
| `tailwindcss` | ^4.2.4 | スタイリング | Phase 1 から確立済み |

### qrcode.react v4 API (HIGH confidence — verified from installed type definitions)

`qrcode.react` v4.2 は named exports のみ:

```typescript
import { QRCodeSVG } from 'qrcode.react'
import { QRCodeCanvas } from 'qrcode.react'
```

**推奨: `QRCodeSVG`** — SVGはスケーラブルでモバイル表示に適する。印刷にも有利。

props:
- `value: string` — QRコードにエンコードするURL
- `size?: number` — ピクセルサイズ（default: 128）
- `level?: 'L'|'M'|'Q'|'H'` — エラー訂正レベル（URLには 'M' 推奨）
- `marginSize?: number` — 余白モジュール数（QR仕様では4推奨）
- `bgColor?: string` — 背景色（default: '#FFFFFF'）
- `fgColor?: string` — 前景色（default: '#000000'）

**SSR注意:** `qrcode.react` はブラウザAPIを使用するため SSR 環境でのサーバーサイドレンダリング不可。TanStack Start の SSR 対応には `useEffect` でマウント後のみ表示するか、`React.lazy` + `Suspense` で遅延読み込みにする。

### No New Packages Required

新しい npm インストールは不要:
- QRコード: `qrcode.react` (既存)
- slug生成: 文字列操作のみ（既存ヘルパー関数を流用）
- フォーム: `react-hook-form` + `zod` (既存)
- 認証: `getRequest()` + `auth.api.getSession()` (既存パターン)

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
├── server/
│   ├── db/
│   │   └── schema.ts           # MODIFY: events に hostUserId カラム追加
│   └── functions/
│       └── event.ts            # MODIFY: createEvent・getMyEvents 追加
│                               #         checkinToEvent 改修（auto-checkout削除）
│                               #         getEventParticipants 改修（全参加者返却）
│                               #         checkoutFromEvent・getActiveCheckin 削除
├── routes/
│   ├── e/
│   │   └── $slug.tsx           # MODIFY: QRコード + 「参加する」ボタン追加
│   └── _protected/
│       └── events/
│           ├── index.tsx       # REPLACE: チェックインフォーム → イベント一覧ページ
│           └── new.tsx         # NEW: イベント作成フォーム（名前・会場・日付）
└── components/
    └── EventCheckinCard.tsx    # DELETE: 新設計では不要
```

drizzle/
└── 0004_xxxx.sql               # NEW: ADD COLUMN host_user_id migration

### Pattern 1: DB Migration — events に hostUserId カラム追加

**What:** `events` テーブルに `hostUserId` カラムを Drizzle ALTER TABLE で追加する。

**手順:**
1. `src/server/db/schema.ts` の `events` 定義に `hostUserId` を追加
2. `pnpm db:generate` で migration SQL を生成
3. `pnpm db:migrate` で Neon DB に適用

**スキーマ変更:**
```typescript
// Source: src/server/db/schema.ts — modify events table
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  venueName: text('venue_name').notNull(),
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  // NEW: 主催者のBetter Auth user.id
  hostUserId: text('host_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

**生成されるSQL（参考）:**
```sql
ALTER TABLE "events" ADD COLUMN "host_user_id" text NOT NULL;
```

**注意:** 既存レコードが存在する場合、`NOT NULL` カラムの追加は既存行に DEFAULT 値が必要。開発環境ではテストデータを削除してから migrate するか、一時的に `.default('')` を付けて生成後 SQL を手動編集する。

### Pattern 2: createEvent サーバー関数

**What:** ホストがイベントを作成する。slug は eventName + eventDate から自動生成。

```typescript
// Source: established Phase 1 codebase pattern (createServerFn + getRequest)
export const createEvent = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    eventName: z.string().min(1).max(100),
    venueName: z.string().min(1).max(100),
    eventDate: z.string().datetime(),
  }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    const slug = generateSlug(data.eventName, data.eventDate)

    // slug 衝突時は既存を使用（Phase 1 URL-ID パターンと同様）
    let eventRow = await db.select().from(events).where(eq(events.slug, slug)).limit(1)
    if (!eventRow[0]) {
      try {
        const inserted = await db.insert(events)
          .values({
            slug,
            name: data.eventName,
            venueName: data.venueName,
            eventDate: new Date(data.eventDate),
            hostUserId: session.user.id,  // NEW
          })
          .returning()
        eventRow = inserted
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
          eventRow = await db.select().from(events).where(eq(events.slug, slug)).limit(1)
        } else {
          throw err
        }
      }
    }

    if (!eventRow[0]) throw new Error('Failed to create event')
    return eventRow[0]
  })
```

### Pattern 3: getMyEvents サーバー関数

**What:** ログインユーザーの「主催したイベント」「参加したイベント」を返す。

```typescript
// Source: established Phase 1 codebase pattern (Drizzle JOIN)
export const getMyEvents = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // 主催したイベント: events.hostUserId = session.user.id
    const hosted = await db.select()
      .from(events)
      .where(eq(events.hostUserId, session.user.id))
      .orderBy(desc(events.eventDate))

    // 参加したイベント: event_checkins.userId = session.user.id で JOIN events
    const participated = await db
      .select({
        id: events.id,
        slug: events.slug,
        name: events.name,
        venueName: events.venueName,
        eventDate: events.eventDate,
        hostUserId: events.hostUserId,
        checkedInAt: eventCheckins.checkedInAt,
      })
      .from(eventCheckins)
      .innerJoin(events, eq(eventCheckins.eventId, events.id))
      .where(eq(eventCheckins.userId, session.user.id))
      .orderBy(desc(events.eventDate))

    return { hosted, participated }
  })
```

### Pattern 4: checkinToEvent の改修

**What:** 新設計ではチェックインは `/e/$slug` ページのボタンから行う。slug は URL パラメータから取得済みなのでフォーム入力不要。auto-checkout ロジックを削除。

**変更点:**
- input: `slug`（URLから取得）、`personaId`（ログインユーザーのデフォルトペルソナ）のみ。eventName/venueName/eventDate は削除（slug で events SELECT済みのため不要）
- auto-checkout（既存 NULL チェックインの UPDATE）ロジックを削除
- イベントが存在しない場合は 404 エラーを投げる（イベントを作成する権限は `createEvent` のみ）

```typescript
// 改修後の checkinToEvent（簡略化）
export const checkinToEvent = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    slug: z.string().min(1).max(100),
    personaId: z.string().uuid(),
  }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // personaId のオーナー確認
    const persona = await db.select({ id: personas.id, userId: personas.userId })
      .from(personas).where(eq(personas.id, data.personaId)).limit(1)
    if (!persona[0]) throw new Error('Persona not found')
    if (persona[0].userId !== session.user.id) throw new Error('Forbidden')

    // slug でイベントを取得（存在しない場合はエラー）
    const eventRow = await db.select().from(events).where(eq(events.slug, data.slug)).limit(1)
    if (!eventRow[0]) throw new Error('Event not found')

    // チェックイン INSERT（auto-checkout ロジックなし）
    const newCheckin = await db.insert(eventCheckins)
      .values({
        eventId: eventRow[0].id,
        personaId: data.personaId,
        userId: session.user.id,
        gpsCoordinates: null,
      })
      .returning()

    return { checkin: newCheckin[0], event: eventRow[0] }
  })
```

### Pattern 5: getEventParticipants の改修

**What:** `checkedOutAt IS NULL` フィルタを削除して「全チェックイン済みユーザー」を返す。

**変更点（1行のみ）:**
```typescript
// 削除する行:
isNull(eventCheckins.checkedOutAt),
// これだけ消せば全参加者が返る
```

### Pattern 6: /e/$slug.tsx — QRコードと「参加する」ボタン追加

**What:** 既存のイベントページに QRコード（当ページURL）と「参加する」ボタンを追加する。

**SSR対応のQRコードレンダリング:**

```typescript
// qrcode.react はブラウザAPIを使うため SSR 非対応
// useEffect パターン（recommended）
import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect } from 'react'

function QRCodeDisplay({ url }: { url: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <div className="w-48 h-48 bg-gray-100 rounded" />
  return <QRCodeSVG value={url} size={192} level="M" marginSize={4} />
}
```

**「参加する」ボタン — ログイン状態に応じた表示切替:**

```typescript
// /e/$slug.tsx (追加部分)
// loader では isLoggedIn と data を返す（既存）
// + defaultPersonaId もloaderで取得（チェックイン時に使用）

// コンポーネント内
const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

{isLoggedIn ? (
  <button onClick={handleCheckin} disabled={isCheckingIn}>
    {isCheckingIn ? '参加中...' : '参加する'}
  </button>
) : (
  <Link to="/login">ログインして参加する</Link>
)}

<QRCodeDisplay url={currentUrl} />
```

**loader での defaultPersonaId 取得:**
```typescript
// loader に getOwnProfile() を追加してデフォルトペルソナIDを取得
loader: async ({ params }) => {
  const [data, session] = await Promise.all([
    getEventParticipants({ data: { slug: params.slug } }),
    getOptionalSession(),
  ])
  let defaultPersonaId: string | null = null
  if (session?.user) {
    const profile = await getOwnProfile()
    defaultPersonaId = profile?.personas?.find(p => p.isDefault)?.id
      ?? profile?.personas?.[0]?.id ?? null
  }
  return { data, isLoggedIn: !!session?.user, defaultPersonaId }
}
```

### Pattern 7: /_protected/events/index.tsx — イベント一覧ページ

**What:** 旧チェックインフォームを「主催したイベント」「参加したイベント」の2セクション一覧に書き換える。

```typescript
// Route loader
loader: async () => {
  return await getMyEvents()
}

// Component
function EventsPage() {
  const { hosted, participated } = Route.useLoaderData()

  return (
    <div>
      <header>
        <h1>イベント</h1>
        <Link to="/_protected/events/new">新規イベントを作成</Link>
      </header>

      <section>
        <h2>主催したイベント</h2>
        {hosted.map(event => <EventListItem key={event.id} event={event} />)}
      </section>

      <section>
        <h2>参加したイベント</h2>
        {participated.map(event => <EventListItem key={event.id} event={event} />)}
      </section>
    </div>
  )
}
```

### Pattern 8: /_protected/events/new.tsx — イベント作成フォーム

**What:** 新規ルート。react-hook-form でイベント名・会場名・日付を入力 → `createEvent` 呼び出し → `/e/$slug` にリダイレクト。

```typescript
export const Route = createFileRoute('/_protected/events/new')({
  component: NewEventPage,
})

function NewEventPage() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(newEventSchema),
  })

  const onSubmit = async (formData: FormValues) => {
    const event = await createEvent({
      data: {
        eventName: formData.eventName,
        venueName: formData.venueName,
        eventDate: new Date(formData.eventDate).toISOString(),
      }
    })
    // 作成後は /e/$slug にリダイレクト
    await router.navigate({ to: '/e/$slug', params: { slug: event.slug } })
  }
  // ... form JSX
}
```

### Anti-Patterns to Avoid

- **QRCodeSVG をSSR側でレンダリング:** ブラウザAPIを使用するため必ず `useEffect` または `mounted` state でガードする
- **`isNull(eventCheckins.checkedOutAt)` を残す:** 新設計では全参加者を表示する。このフィルタは削除対象
- **checkinToEvent にイベント作成ロジックを残す:** 新設計では `/e/$slug` からのチェックインはイベントが既存である前提。作成は `createEvent` の責務
- **context.request.headers:** Phase 1 確定決定 — 常に `getRequest()` を使う
- **dojinReject フィルタをクライアント側で行う:** SQL WHERE 句のみ（Phase 1 から継続）
- **`window.location.href` をサーバーサイドで参照:** SSR では `undefined`。QRコードの URL は必ず `mounted` 後に取得

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QRコード生成 | Canvas/SVG 手書き | `QRCodeSVG` from `qrcode.react` | 既にインストール済み、エラー訂正・余白・サイズ自動処理 |
| DB ALTER TABLE | 手書きSQL | `pnpm db:generate` + `pnpm db:migrate` | Drizzle が型安全な migration SQL を生成。Phase 1 確立済み |
| 認証セッション取得 | Cookie手動パース | `auth.api.getSession({ headers: request.headers })` | Phase 1 確立済みパターン |
| 入力バリデーション | 手動型ガード | `zod` inputValidator on createServerFn | Phase 1 確立済み |
| slug 生成 | UUID など | 文字列操作（eventName + eventDate → URL-safe） | 既存 `generateSlug` ヘルパーが `_protected/events/index.tsx` に存在 |
| ルーティング後リダイレクト | `window.location.href = ...` | `router.navigate({ to: '...', params: {...} })` | TanStack Router の確立済みパターン |

---

## Common Pitfalls

### Pitfall 1: qrcode.react の SSR クラッシュ

**What goes wrong:** TanStack Start の SSR フェーズで `QRCodeSVG` をレンダリングすると内部のブラウザAPI（`document` 等）が存在せずクラッシュまたは hydration mismatch が発生する。

**Why it happens:** `qrcode.react` はブラウザ専用ライブラリ。

**How to avoid:** `mounted` state パターンで useEffect 後のみレンダリング:

```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return <div className="w-48 h-48 bg-gray-100 rounded-lg" />
return <QRCodeSVG value={url} size={192} level="M" marginSize={4} />
```

**Warning signs:** サーバーサイドで `ReferenceError: document is not defined` またはクライアントで hydration mismatch warning。

### Pitfall 2: `window.location.href` がサーバーで undefined

**What goes wrong:** QRコードの `value` として `window.location.href` を直接渡すと SSR 時に `ReferenceError`.

**Why it happens:** `window` はブラウザのみ存在。

**How to avoid:** `mounted` フラグが `true` になった後に `window.location.href` を参照する。または `typeof window !== 'undefined'` でガードし、サーバーサイドではプレースホルダー文字列を使用。

**Warning signs:** "window is not defined" エラー。

### Pitfall 3: `checkedOutAt IS NULL` フィルタが残存する

**What goes wrong:** `getEventParticipants` に `isNull(eventCheckins.checkedOutAt)` が残っていると、「チェックインした全員」ではなく「チェックアウトしていない人だけ」が表示される。新設計では全員表示が正しい。

**Why it happens:** 旧コードからの削除漏れ。

**How to avoid:** `getEventParticipants` の WHERE 句から `isNull(eventCheckins.checkedOutAt)` を削除する。

**Warning signs:** 参加済みユーザーが一覧に表示されない。

### Pitfall 4: hostUserId カラム追加 — 既存レコードの NOT NULL 制約

**What goes wrong:** `host_user_id text NOT NULL` を既存行ありのテーブルに追加すると、既存行のデフォルト値がないため `pnpm db:migrate` が失敗する。

**Why it happens:** PostgreSQL は NOT NULL カラム追加時に既存行全てのデフォルト値を必要とする。

**How to avoid:** 開発環境では既存 `events` レコードを削除してから migrate する。または Drizzle スキーマで一時的に `.default('')` を付けて migrate 後に削除（その場合 SQL を手動調整）。本番環境では `nullable()` → migrate → UPDATE → NOT NULL 制約追加の手順。

**Warning signs:** `ERROR: column "host_user_id" of relation "events" contains null values`。

### Pitfall 5: 重複チェックイン（同一ユーザーが同一イベントに複数回参加）

**What goes wrong:** 「参加する」ボタンを複数回押すと同一 personaId × eventId の `event_checkins` レコードが複数作成される。

**Why it happens:** DB に UNIQUE 制約がない。

**How to avoid:** `checkinToEvent` ハンドラで事前確認: 既存チェックインがあれば INSERT をスキップして既存を返す。または `(personaId, eventId)` に UNIQUE 制約（別途マイグレーション）。シンプルな実装として「既存チェックインを SELECT → あれば skip、なければ INSERT」のパターンを推奨。

**Warning signs:** 参加者一覧に同一ユーザーが複数行表示される。

### Pitfall 6: dojinReject フィルタのクライアントサイド適用

**What goes wrong:** 全参加者データがブラウザに届いた後に JS でフィルタリングされ、`dojinReject=true` ユーザーのデータが一瞬露出する可能性。

**Why it happens:** Phase 1 の確立された原則を忘れる。

**How to avoid:** WHERE `personas.dojin_reject = false` は SQL クエリ内に必ず残す。

### Pitfall 7: context.request.headers の使用

**What goes wrong:** TypeScript エラーまたはランタイムクラッシュ。

**Why it happens:** TanStack Start v1.167 の `ServerFnCtx` は `.request` を持たない。

**How to avoid:** 常に `getRequest()` from `@tanstack/react-start/server` を使用（Phase 1 確定決定）。

---

## Code Examples

### QRCodeSVG — SSR 対応パターン（推奨）

```typescript
// Source: qrcode.react v4 type definitions (installed)
import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect } from 'react'

function EventQRCode({ slug }: { slug: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  if (!url) {
    // SSR / マウント前: プレースホルダー
    return <div className="w-48 h-48 bg-gray-100 rounded-lg animate-pulse" />
  }

  return (
    <QRCodeSVG
      value={url}
      size={192}
      level="M"       // URL用には M (15%エラー訂正)が適切
      marginSize={4}  // QR仕様の推奨余白
    />
  )
}
```

### createEvent 呼び出し → /e/$slug リダイレクト

```typescript
// Source: established Phase 1 pattern (router.navigate)
import { useRouter } from '@tanstack/react-router'
import { createEvent } from '../../../server/functions/event'

const router = useRouter()

const onSubmit = async (formData: FormValues) => {
  const event = await createEvent({
    data: {
      eventName: formData.eventName,
      venueName: formData.venueName,
      eventDate: new Date(formData.eventDate).toISOString(),
    }
  })
  await router.navigate({ to: '/e/$slug', params: { slug: event.slug } })
}
```

### 「参加する」ボタン — ログイン済みか否かで表示切替

```typescript
// /e/$slug.tsx のコンポーネント内
function CheckinButton({
  isLoggedIn,
  defaultPersonaId,
  slug,
  onCheckedIn,
}: {
  isLoggedIn: boolean
  defaultPersonaId: string | null
  slug: string
  onCheckedIn: () => void
}) {
  const [isCheckingIn, setIsCheckingIn] = useState(false)

  if (!isLoggedIn) {
    return (
      <Link to="/login" className="...">
        ログインして参加する
      </Link>
    )
  }

  if (!defaultPersonaId) {
    return (
      <Link to="/_protected/profile" className="...">
        プロフィールを設定して参加する
      </Link>
    )
  }

  const handleCheckin = async () => {
    setIsCheckingIn(true)
    try {
      await checkinToEvent({ data: { slug, personaId: defaultPersonaId } })
      onCheckedIn()  // router.invalidate() でリロード
    } finally {
      setIsCheckingIn(false)
    }
  }

  return (
    <button onClick={handleCheckin} disabled={isCheckingIn}>
      {isCheckingIn ? '参加中...' : '参加する'}
    </button>
  )
}
```

### getEventParticipants — checkedOutAt フィルタ削除後（全参加者返却）

```typescript
// Source: established Phase 1 Drizzle pattern
const participants = await db
  .select({
    checkinId: eventCheckins.id,
    personaId: personas.id,
    displayName: personas.displayName,
    avatarUrl: personas.avatarUrl,
    shareToken: personas.shareToken,
    urlId: urlIds.urlId,
  })
  .from(eventCheckins)
  .innerJoin(personas, eq(eventCheckins.personaId, personas.id))
  .innerJoin(urlIds, eq(personas.userId, urlIds.userId))
  .where(and(
    eq(eventCheckins.eventId, eventRow[0].id),
    // checkedOutAt IS NULL フィルタを削除 ← 変更点
    eq(personas.dojinReject, false),   // MUST be server-side
    eq(personas.isPublic, true)
  ))
```

### DB Migration コマンド

```bash
# schema.ts を修正後:
pnpm db:generate   # drizzle/ に SQL migration を生成
pnpm db:migrate    # .env.local の DATABASE_URL に適用
```

---

## State of the Art

| Old Approach (旧設計) | New Approach (新設計) | 変更理由 |
|----------------------|----------------------|---------|
| 自己申告チェックイン（イベント名フォーム入力） | 主催者がイベント作成 → QRでURL共有 → 参加ボタン | UX改善、QRフローが中心 |
| チェックアウトUI（EventCheckinCard） | 不要（DBカラムは残存） | チェックアウトのUXは不要との判断 |
| `checkedOutAt IS NULL` で「参加中」のみ表示 | 全チェックイン履歴を表示 | 「来た記録」として全員表示が正しい |
| `/events/index.tsx` がチェックインフォーム | `/events/index.tsx` がイベント一覧、`/events/new.tsx` が作成フォーム | 役割分離、ルート設計を明確化 |
| events に hostUserId なし | events に hostUserId あり | 主催判定・「主催したイベント」一覧に必要 |

**廃止（削除対象）:**
- `checkoutFromEvent` サーバー関数: チェックアウト機能廃止
- `getActiveCheckin` サーバー関数: アクティブチェックイン概念廃止
- `EventCheckinCard` コンポーネント: チェックアウトUIを含む旧コンポーネント

---

## Open Questions

1. **重複チェックイン防止の実装レベル**
   - What we know: 同一ユーザーが「参加する」を複数回押すと重複レコードが作成される
   - What's unclear: DB 制約（UNIQUE INDEX）にするか、アプリ層で防ぐか
   - Recommendation: `checkinToEvent` ハンドラで「既存チェックインがあればスキップして返す」アプリ層での処理。DB UNIQUE 制約は別マイグレーションが必要で今回は defer。

2. **hostUserId の NOT NULL — 既存レコード対応**
   - What we know: 開発環境には既存の `events` レコードが存在する可能性（02-01 で作成済み）
   - What's unclear: migrate 実行前にテストデータがどの程度あるか
   - Recommendation: migrate 前に `events` テーブルを全削除（`TRUNCATE events CASCADE`）してから実行。または Drizzle スキーマで `hostUserId` を一時的に nullable として migration 後に NOT NULL 化。

3. **`window.location.href` vs サーバーで構築したURL**
   - What we know: QRコードには「このページのURL」をエンコードする
   - What's unclear: SSR時とクライアント時でURLが異なる可能性（Cloudflare Workers のホスト名）
   - Recommendation: `useEffect` + `window.location.href` パターン推奨。SSR では空文字でプレースホルダー表示し、hydration 後に実URLに切り替わる。

---

## Sources

### Primary (HIGH confidence)
- Installed `node_modules/qrcode.react/lib/index.d.ts` — QRCodeSVG / QRCodeCanvas named exports、props API 全確認済み
- `src/server/db/schema.ts` (現在のスキーマ) — events テーブル定義、hostUserId 不在を確認
- `src/server/functions/event.ts` (現在の実装) — 改修対象の全関数を確認済み
- `src/routes/e/$slug.tsx` (現在の実装) — 追加対象箇所を確認済み
- `src/routes/_protected/events/index.tsx` (現在の実装) — 全書き換え対象を確認済み
- `drizzle/0003_dry_zeigeist.sql` — 現在の events テーブル DDL（hostUserId なし）確認済み
- Phase 1 STATE.md decisions — getRequest()パターン、no context.request、TanStack Start v1.167

### Secondary (MEDIUM confidence)
- MDN Web API https://developer.mozilla.org/en-US/docs/Web/API/Window/location — window.location.href のブラウザ専用性
- TanStack Router docs — router.navigate パターン（Phase 1 での使用実績から確認済み）

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — qrcode.react は型定義を直接確認。その他は全て既存インストール済み
- Architecture: HIGH — 現在の実装コードを全て読んで差分を把握
- DB migration: MEDIUM — Drizzle ALTER TABLE は一般的な操作だが NOT NULL 既存レコード問題は要注意
- Pitfalls: HIGH — SSR pitfall は qrcode.react の型定義とブラウザAPI性質から導出。その他は既存 Phase 1 決定から

**Research date:** 2026-04-25 (updated for redesign)
**Valid until:** 2026-05-25 (TanStack Start は fast-moving — v1.167 以降にアップグレードする場合は再確認)
