import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../db/client'
import { connections, personas, urlIds, eventCheckins, events } from '../db/schema'
import { auth } from '../auth'

// 「つながる」ボタンから呼ばれる: shareToken で指定されたペルソナにコネクションを記録する
export const createConnection = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    targetShareToken: z.string().min(1),
    fromPersonaId: z.string().uuid(), // ユーザーが選択したなふだ
  }))
  .handler(async ({ data }) => {
    // 1. 認証チェック
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // 2. fromPersonaId が自分のペルソナであることを確認
    const fromPersonaRows = await db.select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.id, data.fromPersonaId), eq(personas.userId, session.user.id)))
      .limit(1)
    if (!fromPersonaRows[0]) throw new Error('自分のペルソナが見つかりません')
    const fromPersonaId = fromPersonaRows[0].id

    // 3. 対象 shareToken からペルソナを直接解決
    const toPersonaRows = await db.select({ id: personas.id, userId: personas.userId })
      .from(personas)
      .where(eq(personas.shareToken, data.targetShareToken))
      .limit(1)
    if (!toPersonaRows[0]) throw new Error('対象ペルソナが見つかりません')
    const toPersonaId = toPersonaRows[0].id

    // 4. 自己接続防止チェック
    if (toPersonaRows[0].userId === session.user.id) throw new Error('自分自身にはつながれません')

    // 5. アクティブチェックイン確認（イベントコンテキスト付与用）
    const activeCheckinRows = await db.select({
      eventId: eventCheckins.eventId,
      eventName: events.name,
      venueName: events.venueName,
      eventDate: events.eventDate,
    })
      .from(eventCheckins)
      .innerJoin(events, eq(eventCheckins.eventId, events.id))
      .where(and(
        eq(eventCheckins.personaId, fromPersonaId),
        isNull(eventCheckins.checkedOutAt)
      ))
      .limit(1)
    const activeCheckin = activeCheckinRows[0] ?? null

    // 6. connections に INSERT（UNIQUE 制約違反 = 重複 → 23505 エラーをキャッチして無視）
    try {
      const newConn = await db.insert(connections)
        .values({
          fromPersonaId,
          toPersonaId,
          fromUserId: session.user.id,
          eventId: activeCheckin?.eventId ?? null,
          eventName: activeCheckin?.eventName ?? null,
          venueName: activeCheckin?.venueName ?? null,
          eventDate: activeCheckin?.eventDate ?? null,
        })
        .returning()
      return { connection: newConn[0], alreadyConnected: false }
    } catch (err: unknown) {
      // PostgreSQL UNIQUE constraint violation
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        return { connection: null, alreadyConnected: true }
      }
      throw err
    }
  })

// 自分がつながった相手の一覧を取得（connectedAt 降順）
export const getMyConnections = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // 自分の全ペルソナからのコネクションを取得（エイリアスで from/to を区別）
    const fromPersona = alias(personas, 'from_persona')
    const toPersona = alias(personas, 'to_persona')
    const toUrlId = alias(urlIds, 'to_url_ids')

    const result = await db.select({
      connectionId: connections.id,
      connectedAt: connections.connectedAt,
      eventName: connections.eventName,
      venueName: connections.venueName,
      eventDate: connections.eventDate,
      fromPersonaId: connections.fromPersonaId,
      fromDisplayName: fromPersona.displayName,
      fromLabel: fromPersona.label,
      toPersonaId: connections.toPersonaId,
      toDisplayName: toPersona.displayName,
      toAvatarUrl: toPersona.avatarUrl,
      toUrlId: toUrlId.urlId,
      toShareToken: toPersona.shareToken,
    })
      .from(connections)
      .innerJoin(fromPersona, eq(connections.fromPersonaId, fromPersona.id))
      .innerJoin(toPersona, eq(connections.toPersonaId, toPersona.id))
      .innerJoin(toUrlId, eq(toPersona.userId, toUrlId.userId))
      .where(eq(fromPersona.userId, session.user.id))
      .orderBy(desc(connections.connectedAt))

    return result
  })
