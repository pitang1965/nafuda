import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { personas } from '../db/schema'
import { auth } from '../auth'

// Get oshi tag suggestions for autocomplete
// Returns top 20 most-used tags matching the query prefix across all personas.
// Only the anonymous tag text + count is returned (no persona/identity linkage),
// so this is not personal data even for personas that mark oshi_tags private.
export const getOshiSuggestions = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ query: z.string().min(1).max(50) }))
  .handler(async ({ data }) => {
    const db = getDb()
    // oshi_tags はD1ではJSON文字列で保持しているため、Postgresの UNNEST() の代わりに
    // SQLiteの json_each() テーブル関数でJSON配列を行に展開する。
    // ILIKE相当は LOWER() 比較で近似する(日本語には大文字小文字の区別が無いため実害は小さい)。
    const results = await db.all<{ tag: string; count: number }>(sql`
      SELECT je.value as tag, COUNT(*) as count
      FROM personas, json_each(personas.oshi_tags) as je
      WHERE LOWER(je.value) LIKE LOWER(${data.query + '%'})
      GROUP BY je.value
      ORDER BY count DESC
      LIMIT 20
    `)
    return results.map((r) => r.tag)
  })

// ゼロ入力で見せる人気タグ(usage 集計)。purpose 指定時はその用途のなふだに絞って
// relevance を上げる(薄い分はクライアント側でキュレーション seed が埋める=ハイブリッド)。
// 匿名のタグ文字列+件数のみ返す(getOshiSuggestions と同じく個人データではない)。
export const getPopularOshiTags = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ purpose: z.string().max(20).nullable().optional() }))
  .handler(async ({ data }) => {
    const db = getDb()
    const purpose = data.purpose ?? null
    const results = await db.all<{ tag: string; count: number }>(sql`
      SELECT je.value as tag, COUNT(*) as count
      FROM personas, json_each(personas.oshi_tags) as je
      ${purpose ? sql`WHERE purpose = ${purpose}` : sql``}
      GROUP BY je.value
      ORDER BY count DESC
      LIMIT 30
    `)
    return results.map((r) => r.tag)
  })

// Update oshi tags for a persona
export const updateOshiTags = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    personaId: z.uuid(),
    tags: z.array(z.string().min(1).max(50)).max(20, '推しタグは20個まで'),
  }))
  .handler(async ({ data }) => {
    const db = getDb()
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    await db.update(personas)
      .set({ oshiTags: data.tags, updatedAt: new Date() })
      .where(and(eq(personas.id, data.personaId), eq(personas.userId, session.user.id)))
  })

// Update dojin_reject flag for a persona
export const updateDojinReject = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    personaId: z.uuid(),
    dojinReject: z.boolean(),
  }))
  .handler(async ({ data }) => {
    const db = getDb()
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    await db.update(personas)
      .set({ dojinReject: data.dojinReject, updatedAt: new Date() })
      .where(and(eq(personas.id, data.personaId), eq(personas.userId, session.user.id)))
  })
