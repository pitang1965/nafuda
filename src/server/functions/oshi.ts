import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { personas } from '../db/schema'
import { auth } from '../auth'

// Get oshi tag suggestions for autocomplete
// Returns top 20 most-used tags matching the query prefix across all personas.
// Only the anonymous tag text + count is returned (no persona/identity linkage),
// so this is not personal data even for personas that mark oshi_tags private.
export const getOshiSuggestions = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ query: z.string().min(1).max(50) }))
  .handler(async ({ data }) => {
    // Unnest all oshi_tags arrays, count occurrences, filter by prefix, return top 20
    // Uses Postgres unnest() to flatten text arrays into rows
    const results = await db.execute(sql`
      SELECT tag, COUNT(*) as count
      FROM (
        SELECT UNNEST(oshi_tags) as tag
        FROM personas
      ) t
      WHERE tag ILIKE ${data.query + '%'}
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 20
    `)
    return (results.rows as Array<{ tag: string; count: string }>).map(r => r.tag)
  })

// ゼロ入力で見せる人気タグ（usage 集計）。purpose 指定時はその用途のなふだに絞って
// relevance を上げる（薄い分はクライアント側でキュレーション seed が埋める＝ハイブリッド）。
// 匿名のタグ文字列＋件数のみ返す（getOshiSuggestions と同じく個人データではない）。
export const getPopularOshiTags = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ purpose: z.string().max(20).nullable().optional() }))
  .handler(async ({ data }) => {
    const purpose = data.purpose ?? null
    const results = await db.execute(sql`
      SELECT tag, COUNT(*) as count
      FROM (
        SELECT UNNEST(oshi_tags) as tag
        FROM personas
        ${purpose ? sql`WHERE purpose = ${purpose}` : sql``}
      ) t
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 30
    `)
    return (results.rows as Array<{ tag: string; count: string }>).map(r => r.tag)
  })

// Update oshi tags for a persona
export const updateOshiTags = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    personaId: z.uuid(),
    tags: z.array(z.string().min(1).max(50)).max(20, '推しタグは20個まで'),
  }))
  .handler(async ({ data }) => {
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
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    await db.update(personas)
      .set({ dojinReject: data.dojinReject, updatedAt: new Date() })
      .where(and(eq(personas.id, data.personaId), eq(personas.userId, session.user.id)))
  })
