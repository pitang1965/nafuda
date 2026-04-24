import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { personas } from '../db/schema'
import { auth } from '../auth'

// Get oshi tag suggestions for autocomplete
// Returns top 20 most-used tags matching the query prefix across all public personas
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
        WHERE is_public = true
      ) t
      WHERE tag ILIKE ${data.query + '%'}
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 20
    `)
    return (results.rows as Array<{ tag: string; count: string }>).map(r => r.tag)
  })

// Update oshi tags for a persona
export const updateOshiTags = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    personaId: z.string().uuid(),
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
    personaId: z.string().uuid(),
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
