---
phase: 03-qr-pwa
plan: "06"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/routes/u/$urlId.p.$token.tsx
autonomous: true
requirements:
  - CONN-02
gap_closure: true

must_haves:
  truths:
    - "QRコードをスキャンして遷移したページに「つながる」ボタンが表示される"
    - "「つながる」ボタンを押すとコネクションが記録され「つながり済み ✓」になる"
    - "未ログインユーザーが「つながる」を押すと /login にリダイレクトされる"
    - "自分自身のQRをスキャンしたとき「つながる」ボタンは表示されない"
  artifacts:
    - path: "src/routes/u/$urlId.p.$token.tsx"
      provides: "QRスキャン後のプロフィールページ（つながるボタン付き）"
      contains: "createConnection"
  key_links:
    - from: "src/routes/u/$urlId.p.$token.tsx"
      to: "createConnection"
      via: "button onClick → handleConnect"
      pattern: "createConnection.*targetUrlId"
    - from: "src/routes/u/$urlId.p.$token.tsx"
      to: "/login route"
      via: "navigate({ to: '/login' }) when no session"
      pattern: "navigate.*login"
---

<objective>
QRスキャン後の遷移先（/u/$urlId/p/$token）に「つながる」ボタンを追加してCONN-02を完成させる。

Purpose: QRコードが指すURLは `/u/{urlId}/p/{shareToken}` だが、このページには「つながる」ボタンが存在せず、CONN-02「QRを読み取ってプロフィールを閲覧した後、明示的に「つながる」を選択した場合のみコネクションが記録される」が機能しない。`/u/$urlId.tsx` に実装済みの同一パターンを `$urlId.p.$token.tsx` にも適用する。

Output: src/routes/u/$urlId.p.$token.tsx（つながるボタン、createConnection、isOwnProfile判定を追加）
</objective>

<execution_context>
@C:/Users/pitan/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/pitan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

# 既存実装の参照（直接コピー元）
@src/routes/u/$urlId.tsx
@src/routes/u/$urlId.p.$token.tsx
@src/server/functions/connection.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: $urlId.p.$token.tsx に「つながる」ボタンを追加</name>
  <files>src/routes/u/$urlId.p.$token.tsx</files>
  <action>
`src/routes/u/$urlId.tsx` に実装済みのパターンをそのまま `$urlId.p.$token.tsx` に適用する。

**追加する要素（$urlId.tsx から移植）:**

1. **インポート追加:**
   ```ts
   import { createServerFn } from '@tanstack/react-start'
   import { getRequest } from '@tanstack/react-start/server'
   import { useState } from 'react'
   import { useNavigate } from '@tanstack/react-router'
   import { eq } from 'drizzle-orm'
   import { createConnection } from '../../server/functions/connection'
   import { SnsLinkButton } from '../../components/SnsLinkButton'
   import { auth } from '../../server/auth'
   import { db } from '../../server/db/client'
   import { urlIds } from '../../server/db/schema'
   ```

2. **getSessionWithUrlId サーバー関数を追加**（$urlId.tsx と同一実装）:
   ```ts
   const getSessionWithUrlId = createServerFn({ method: 'GET' }).handler(async () => {
     const request = getRequest()
     const session = await auth.api.getSession({ headers: request.headers })
     if (!session?.user) return { user: null, myUrlId: null }

     const row = await db.select({ urlId: urlIds.urlId })
       .from(urlIds)
       .where(eq(urlIds.userId, session.user.id))
       .limit(1)

     return { user: session.user, myUrlId: row[0]?.urlId ?? null }
   })
   ```

3. **loader を更新**して sessionData と isOwnProfile を追加:
   ```ts
   loader: async ({ params }) => {
     const [profile, sessionData] = await Promise.all([
       getPublicProfile({ data: { shareToken: params.token } }),
       getSessionWithUrlId(),
     ])
     const isOwnProfile = sessionData.myUrlId === params.urlId
     return { profile, session: sessionData, urlId: params.urlId, isOwnProfile }
   }
   ```
   Note: `params.urlId` はルートパラメータ `/u/$urlId/p/$token` の `$urlId` として既に利用可能。

4. **PublicProfilePage コンポーネントを更新**:
   - `Route.useLoaderData()` から `{ profile, session, urlId, isOwnProfile }` を分割代入
   - `connected`, `connecting`, `error` の useState を追加
   - `handleConnect` 関数を追加（$urlId.tsx と同一実装）
   - SNSリンク表示を `<a>` タグから `<SnsLinkButton>` コンポーネントに統一
   - `bio` フィールドの表示を追加（$urlId.tsx と同様）
   - 「つながる」ボタン UI を追加（!isOwnProfile の条件付き）:
     ```tsx
     {!isOwnProfile && (
       <div className="w-full max-w-sm mt-2">
         {connected ? (
           <div className="w-full text-center px-6 py-3 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium">
             つながり済み ✓
           </div>
         ) : (
           <button
             onClick={handleConnect}
             disabled={connecting}
             className="w-full px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
           >
             {connecting ? 'つながっています...' : 'つながる'}
           </button>
         )}
         {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
       </div>
     )}
     ```
   - 「なふだとは？」リンクを追加（$urlId.tsx の Link to="/" と同一）

**Note on CONN-02:** `createConnection` は `targetUrlId` を受け取る。このルートでは `params.urlId`（URL の `$urlId` セグメント）を使用する。shareToken はプロフィール取得にのみ使用し、コネクション記録には使わない。これは正しい設計（urlId は公開識別子、shareToken はプロフィール参照の検証用）。
  </action>
  <verify>
    <automated>cd /c/Users/pitan/dev/nafuda && npx tsc --noEmit 2>&1 | head -30</automated>
    <manual>
      1. `src/routes/u/$urlId.p.$token.tsx` に `createConnection` のインポートと呼び出しが存在することを確認
      2. `getSessionWithUrlId` サーバー関数が定義されていることを確認
      3. ローダーが `isOwnProfile` を返すことを確認
      4. `!isOwnProfile` 条件付きで「つながる」ボタンが存在することを確認
    </manual>
  </verify>
  <done>
    - TypeScript エラーがない
    - src/routes/u/$urlId.p.$token.tsx に createConnection の呼び出しが存在する
    - isOwnProfile が params.urlId vs セッションの myUrlId 比較で算出される
    - 「つながる」ボタンが !isOwnProfile 条件付きで表示される
    - 未ログインユーザーは /login にリダイレクトされる
  </done>
</task>

</tasks>

<verification>
## 全体確認

```bash
cd /c/Users/pitan/dev/nafuda && npx tsc --noEmit
```

TypeScript エラーがないことを確認。

追加確認（grep）:
```bash
grep -n "createConnection" /c/Users/pitan/dev/nafuda/src/routes/u/\$urlId.p.\$token.tsx
grep -n "isOwnProfile" /c/Users/pitan/dev/nafuda/src/routes/u/\$urlId.p.\$token.tsx
```

両方の行が存在することを確認。
</verification>

<success_criteria>
- src/routes/u/$urlId.p.$token.tsx に createConnection の呼び出しが追加されている
- QRスキャン後の遷移先（/u/{urlId}/p/{shareToken}）で「つながる」ボタンが機能する
- TypeScript エラーなし
- CONN-02「QRを読み取ってプロフィールを閲覧した後、明示的に「つながる」を選択した場合のみコネクションが記録される」を達成
</success_criteria>

<output>
After completion, create `.planning/phases/03-qr-pwa/03-06-GAP-SUMMARY.md`
</output>
