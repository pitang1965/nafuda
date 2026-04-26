import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { db } from '../db/client'
import { connections, personas, urlIds, eventCheckins, events } from '../db/schema'
import { auth } from '../auth'

// 「つながる」ボタンから呼ばれる: targetUrlId のペルソナにコネクションを記録する
export const createConnection = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    targetUrlId: z.string().min(1),  // 相手の urlId（公開プロフィールURLに使われる値）
  }))
  .handler(async ({ data }) => {
    // 1. 認証チェック
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) throw new Error('Unauthorized')

    // 2. 呼び出し側のデフォルトペルソナを取得
    const fromPersonaRows = await db.select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.userId, session.user.id), eq(personas.isDefault, true)))
      .limit(1)
    if (!fromPersonaRows[0]) throw new Error('自分のペルソナが見つかりません')
    const fromPersonaId = fromPersonaRows[0].id

    // 3. 対象 urlId からペルソナを解決
    const targetUrlRow = await db.select({ userId: urlIds.userId })
      .from(urlIds)
      .where(eq(urlIds.urlId, data.targetUrlId))
      .limit(1)
    if (!targetUrlRow[0]) throw new Error('対象ユーザーが見つかりません')

    const toPersonaRows = await db.select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.userId, targetUrlRow[0].userId), eq(personas.isDefault, true)))
      .limit(1)
    if (!toPersonaRows[0]) throw new Error('対象ペルソナが見つかりません')
    const toPersonaId = toPersonaRows[0].id

    // 4. 自己接続防止チェック
    if (fromPersonaId === toPersonaId) throw new Error('自分自身にはつながれません')

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

    // 自分のデフォルトペルソナを取得
    const myPersonaRows = await db.select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.userId, session.user.id), eq(personas.isDefault, true)))
      .limit(1)
    if (!myPersonaRows[0]) return []
    const myPersonaId = myPersonaRows[0].id

    // connections + 相手ペルソナ情報 + urlId を JOIN して取得
    const result = await db.select({
      connectionId: connections.id,
      connectedAt: connections.connectedAt,
      eventName: connections.eventName,
      venueName: connections.venueName,
      eventDate: connections.eventDate,
      toPersonaId: connections.toPersonaId,
      toDisplayName: personas.displayName,
      toAvatarUrl: personas.avatarUrl,
      toUrlId: urlIds.urlId,
      toShareToken: personas.shareToken,
    })
      .from(connections)
      .innerJoin(personas, eq(connections.toPersonaId, personas.id))
      .innerJoin(urlIds, eq(personas.userId, urlIds.userId))
      .where(eq(connections.fromPersonaId, myPersonaId))
      .orderBy(desc(connections.connectedAt))

    return result
  })
