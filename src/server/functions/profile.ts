import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client'
import { personas, urlIds, snsLinks } from '../db/schema'
import { auth } from '../auth'

// URL-ID validation schema (shared between wizard and server)
export const urlIdSchema = z.string()
  .min(3, 'URL-IDは3文字以上')
  .max(30, 'URL-IDは30文字以下')
  .regex(/^[a-zA-Z0-9]+$/, 'URL-IDは英数字のみ使用できます')

// Check if a URL-ID is available (debounced frontend check — NOT a uniqueness guarantee)
export const checkUrlIdAvailability = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ urlId: urlIdSchema }))
  .handler(async ({ data }) => {
    const existing = await db.select({ urlId: urlIds.urlId })
      .from(urlIds)
      .where(eq(urlIds.urlId, data.urlId))
      .limit(1)
    return { available: existing.length === 0 }
  })

// Get own full profile (authenticated — returns all fields)
export const getOwnProfile = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    const myPersonas = await db.select()
      .from(personas)
      .where(eq(personas.userId, session.user.id))
      .orderBy(personas.createdAt)

    const urlIdRow = await db.select({ urlId: urlIds.urlId })
      .from(urlIds)
      .where(eq(urlIds.userId, session.user.id))
      .limit(1)

    return {
      urlId: urlIdRow[0]?.urlId ?? null,
      personas: myPersonas,
    }
  })

// Create persona during wizard (also sets URL-ID on first call)
export const createPersona = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    urlId: urlIdSchema.optional(), // only on first persona creation
    displayName: z.string().min(1, '表示名を入力してください').max(50, '50文字以下'),
    avatarUrl: z.string().url().optional().nullable(),
    isDefault: z.boolean().default(false),
  }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // Generate opaque share token (not guessable, not linked to persona name)
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const shareToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

    // If urlId provided, insert it (UNIQUE constraint catches race conditions — catch error 23505)
    if (data.urlId) {
      try {
        await db.insert(urlIds).values({
          urlId: data.urlId,
          userId: session.user.id,
        })
      } catch (err: unknown) {
        // PostgreSQL unique violation code 23505
        if ((err as { code?: string }).code === '23505') {
          throw new Error('URL_ID_TAKEN')
        }
        throw err
      }
    }

    // If this is default persona, clear existing defaults first
    if (data.isDefault) {
      await db.update(personas)
        .set({ isDefault: false })
        .where(eq(personas.userId, session.user.id))
    }

    const [persona] = await db.insert(personas).values({
      userId: session.user.id,
      displayName: data.displayName,
      shareToken,
      avatarUrl: data.avatarUrl ?? null,
      isDefault: data.isDefault,
    }).returning()

    return persona
  })

// Update persona fields (display name, avatar, field visibility)
export const updatePersona = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    personaId: z.string().uuid(),
    displayName: z.string().min(1).max(50).optional(),
    avatarUrl: z.string().url().optional().nullable(),
    fieldVisibility: z.record(z.string(), z.enum(['public', 'private'])).optional(),
  }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    const updates: Partial<typeof personas.$inferInsert> = { updatedAt: new Date() }
    if (data.displayName !== undefined) updates.displayName = data.displayName
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl
    if (data.fieldVisibility !== undefined) updates.fieldVisibility = data.fieldVisibility

    await db.update(personas)
      .set(updates)
      .where(and(eq(personas.id, data.personaId), eq(personas.userId, session.user.id)))
  })

// Get public profile — CRITICAL: filter non-public fields SERVER-SIDE, never return private data
export const getPublicProfile = createServerFn({ method: 'GET' })
  .inputValidator(z.object({
    urlId: z.string().optional(),
    shareToken: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    let persona: typeof personas.$inferSelect | undefined

    if (data.shareToken) {
      // /u/:urlId/p/:token — specific persona by share token
      const result = await db.select().from(personas)
        .where(eq(personas.shareToken, data.shareToken))
        .limit(1)
      persona = result[0]
    } else if (data.urlId) {
      // /u/:urlId — default persona
      const urlEntry = await db.select({ userId: urlIds.userId })
        .from(urlIds)
        .where(eq(urlIds.urlId, data.urlId))
        .limit(1)
      if (!urlEntry[0]) return null

      const result = await db.select().from(personas)
        .where(and(eq(personas.userId, urlEntry[0].userId), eq(personas.isDefault, true)))
        .limit(1)
      persona = result[0]
    }

    if (!persona || !persona.isPublic) return null

    const visibility = (persona.fieldVisibility ?? {}) as Record<string, string>

    // CRITICAL: filter SNS links at query level — do not fetch then hide client-side
    const links = visibility.sns_links === 'private' ? [] :
      await db.select().from(snsLinks)
        .where(eq(snsLinks.personaId, persona.id))
        .orderBy(snsLinks.displayOrder)

    return {
      displayName: persona.displayName,
      avatarUrl: visibility.avatar_url === 'private' ? null : persona.avatarUrl,
      oshiTags: visibility.oshi_tags === 'private' ? [] : persona.oshiTags,
      dojinReject: persona.dojinReject, // always exposed (Phase 2 event filtering needs this)
      snsLinks: links,
    }
  })

// Add SNS link management functions

export const upsertSnsLink = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    personaId: z.string().uuid(),
    linkId: z.string().uuid().optional(), // undefined = create new
    platform: z.enum(['x', 'instagram', 'tiktok', 'youtube', 'discord', 'line_openchat', 'github', 'spotify', 'other']),
    url: z.string().url('有効なURLを入力してください'),
    displayOrder: z.number().int().min(0),
  }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // Verify persona belongs to this user
    const persona = await db.select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.id, data.personaId), eq(personas.userId, session.user.id)))
      .limit(1)
    if (!persona[0]) throw new Error('Forbidden')

    if (data.linkId) {
      await db.update(snsLinks)
        .set({ platform: data.platform, url: data.url, displayOrder: data.displayOrder })
        .where(eq(snsLinks.id, data.linkId))
    } else {
      await db.insert(snsLinks).values({
        personaId: data.personaId,
        platform: data.platform,
        url: data.url,
        displayOrder: data.displayOrder,
      })
    }
  })

export const deleteSnsLink = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ linkId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')
    await db.delete(snsLinks).where(eq(snsLinks.id, data.linkId))
  })
