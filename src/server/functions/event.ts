import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../db/client'
import { events, eventCheckins, personas, urlIds } from '../db/schema'
import { auth } from '../auth'

// Check in to an event (creates event if slug doesn't exist, auto-checkouts from previous active checkin)
export const checkinToEvent = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    slug: z.string().min(1).max(100).regex(/^[a-zA-Z0-9-]+$/, 'スラッグはURL-safe文字（英数字・ハイフン）のみ使用できます'),
    eventName: z.string().min(1).max(100),
    venueName: z.string().min(1).max(100),
    eventDate: z.string().datetime(),
    personaId: z.string().uuid(),
    gpsCoordinates: z.object({ x: z.number(), y: z.number() }).optional(),
  }))
  .handler(async ({ data }) => {
    // 1. 認証チェック
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // 2. personaId の owner が session.user.id か確認（他人のペルソナへのチェックイン防止）
    const persona = await db.select({ id: personas.id, userId: personas.userId })
      .from(personas)
      .where(eq(personas.id, data.personaId))
      .limit(1)
    if (!persona[0]) throw new Error('Persona not found')
    if (persona[0].userId !== session.user.id) throw new Error('Forbidden: persona does not belong to current user')

    // 3. 既存アクティブチェックイン（checkedOutAt IS NULL）があれば auto-checkout
    await db.update(eventCheckins)
      .set({ checkedOutAt: new Date() })
      .where(and(
        eq(eventCheckins.personaId, data.personaId),
        isNull(eventCheckins.checkedOutAt)
      ))

    // 4. slug で events を SELECT — 存在しなければ INSERT（slug 衝突時は既存を使用）
    let eventRow = await db.select()
      .from(events)
      .where(eq(events.slug, data.slug))
      .limit(1)

    if (!eventRow[0]) {
      try {
        const inserted = await db.insert(events)
          .values({
            slug: data.slug,
            name: data.eventName,
            venueName: data.venueName,
            eventDate: new Date(data.eventDate),
          })
          .returning()
        eventRow = inserted
      } catch (err: unknown) {
        // 23505 = unique_violation (slug collision): fetch the existing record
        if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
          eventRow = await db.select()
            .from(events)
            .where(eq(events.slug, data.slug))
            .limit(1)
        } else {
          throw err
        }
      }
    }

    if (!eventRow[0]) throw new Error('Failed to create or retrieve event')

    // 5. event_checkins に INSERT して新レコードを返す
    const newCheckin = await db.insert(eventCheckins)
      .values({
        eventId: eventRow[0].id,
        personaId: data.personaId,
        userId: session.user.id,
        gpsCoordinates: data.gpsCoordinates ?? null,
      })
      .returning()

    return { checkin: newCheckin[0], event: eventRow[0] }
  })

// Checkout from event (set checkedOutAt = now)
export const checkoutFromEvent = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ checkinId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // 1. 認証チェック
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // 2. checkinId で SELECT して userId が session.user.id か確認
    const checkin = await db.select({ id: eventCheckins.id, userId: eventCheckins.userId })
      .from(eventCheckins)
      .where(eq(eventCheckins.id, data.checkinId))
      .limit(1)
    if (!checkin[0]) throw new Error('Checkin not found')
    if (checkin[0].userId !== session.user.id) throw new Error('Forbidden: checkin does not belong to current user')

    // 3. checkedOutAt = new Date() で UPDATE
    const updated = await db.update(eventCheckins)
      .set({ checkedOutAt: new Date() })
      .where(eq(eventCheckins.id, data.checkinId))
      .returning()

    return updated[0]
  })

// Get active checkin for current user's persona (NULL checkedOutAt = active)
export const getActiveCheckin = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ personaId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // 1. 認証チェック
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // 2. WHERE personaId = ? AND checkedOutAt IS NULL LIMIT 1
    // 3. JOIN events テーブルでイベント名・会場名も返す（UI表示用）
    const result = await db
      .select({
        checkinId: eventCheckins.id,
        personaId: eventCheckins.personaId,
        userId: eventCheckins.userId,
        checkedInAt: eventCheckins.checkedInAt,
        checkedOutAt: eventCheckins.checkedOutAt,
        gpsCoordinates: eventCheckins.gpsCoordinates,
        eventId: events.id,
        eventName: events.name,
        venueName: events.venueName,
        eventSlug: events.slug,
        eventDate: events.eventDate,
      })
      .from(eventCheckins)
      .innerJoin(events, eq(eventCheckins.eventId, events.id))
      .where(and(
        eq(eventCheckins.personaId, data.personaId),
        isNull(eventCheckins.checkedOutAt)
      ))
      .limit(1)

    // 4. 存在しなければ null を返す
    return result[0] ?? null
  })

// Get event participants — public endpoint (no auth required)
// CRITICAL: dojinReject filter MUST be in SQL WHERE clause (never client-side)
export const getEventParticipants = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    // 1. slug で events を SELECT — 存在しなければ null を返す
    const eventRow = await db.select()
      .from(events)
      .where(eq(events.slug, data.slug))
      .limit(1)
    if (!eventRow[0]) return null

    // 2-4. JOIN: event_checkins → personas → urlIds
    //      WHERE: eventId = ? AND checkedOutAt IS NULL AND dojinReject = false AND isPublic = true
    //      SELECT のみ: checkinId, personaId, displayName, avatarUrl, urlId, shareToken
    //      （SNSリンク・fieldVisibility は絶対含めない）
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
        isNull(eventCheckins.checkedOutAt),
        eq(personas.dojinReject, false),
        eq(personas.isPublic, true)
      ))

    return { event: eventRow[0], participants }
  })
