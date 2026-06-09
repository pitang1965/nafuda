import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, and, isNull, desc, gt, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db/client";
import {
  connections,
  connectionQrTokens,
  personas,
  urlIds,
  eventCheckins,
  events,
} from "../db/schema";
import { auth } from "../auth";

// 「なふだを交換する」用のつながりQRトークンを発行する（15分有効）
export const createConnectionQrToken = createServerFn({ method: "POST" })
  .inputValidator(z.object({ fromPersonaId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const personaRows = await db
      .select({ id: personas.id })
      .from(personas)
      .where(
        and(
          eq(personas.id, data.fromPersonaId),
          eq(personas.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!personaRows[0]) throw new Error("ペルソナが見つかりません");

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 同一ペルソナの期限切れトークンを掃除してから発行
    await db
      .delete(connectionQrTokens)
      .where(
        and(
          eq(connectionQrTokens.fromPersonaId, data.fromPersonaId),
          lt(connectionQrTokens.expiresAt, new Date()),
        ),
      );

    await db
      .insert(connectionQrTokens)
      .values({ token, fromPersonaId: data.fromPersonaId, expiresAt });

    return { token };
  });

// 「交換しない」でつながりQRトークンを即時削除する
export const deleteConnectionQrToken = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    // 自分が発行したトークンのみ削除可能
    const [tokenRow] = await db
      .select({ fromPersonaId: connectionQrTokens.fromPersonaId })
      .from(connectionQrTokens)
      .where(eq(connectionQrTokens.token, data.token))
      .limit(1);
    if (!tokenRow) return;

    const [personaRow] = await db
      .select({ userId: personas.userId })
      .from(personas)
      .where(eq(personas.id, tokenRow.fromPersonaId))
      .limit(1);
    if (personaRow?.userId !== session.user.id)
      throw new Error("権限がありません");

    await db
      .delete(connectionQrTokens)
      .where(eq(connectionQrTokens.token, data.token));
  });

// つながりQRをスキャンしたページのローダー用: トークンを検証してプロフィールを返す
export const getConnectPageData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const now = new Date();
    const tokenRows = await db
      .select({ fromPersonaId: connectionQrTokens.fromPersonaId })
      .from(connectionQrTokens)
      .where(
        and(
          eq(connectionQrTokens.token, data.token),
          gt(connectionQrTokens.expiresAt, now),
        ),
      )
      .limit(1);
    if (!tokenRows[0]) return { valid: false as const };

    const issuerPersonaId = tokenRows[0].fromPersonaId;

    const [personaRow] = await db
      .select({
        id: personas.id,
        userId: personas.userId,
        displayName: personas.displayName,
        shareToken: personas.shareToken,
        bio: personas.bio,
        avatarUrl: personas.avatarUrl,
        oshiTags: personas.oshiTags,
        fieldVisibility: personas.fieldVisibility,
        styleId: personas.styleId,
      })
      .from(personas)
      .where(eq(personas.id, issuerPersonaId))
      .limit(1);
    if (!personaRow) return { valid: false as const };

    const [urlIdRow] = await db
      .select({ urlId: urlIds.urlId })
      .from(urlIds)
      .where(eq(urlIds.userId, personaRow.userId))
      .limit(1);

    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });

    let myPersonas: { id: string; displayName: string; isDefault: boolean }[] =
      [];
    let alreadyConnected = false;

    if (session?.user) {
      myPersonas = await db
        .select({
          id: personas.id,
          displayName: personas.displayName,
          isDefault: personas.isDefault,
        })
        .from(personas)
        .where(eq(personas.userId, session.user.id))
        .orderBy(personas.createdAt);

      // 既つながり確認: 自分の fromPersona → 相手の persona が存在するか
      if (myPersonas.length > 0) {
        const myPersonaIds = myPersonas.map((p) => p.id);
        for (const myPersonaId of myPersonaIds) {
          const existing = await db
            .select({ id: connections.id })
            .from(connections)
            .where(
              and(
                eq(connections.fromPersonaId, myPersonaId),
                eq(connections.toPersonaId, issuerPersonaId),
              ),
            )
            .limit(1);
          if (existing[0]) {
            alreadyConnected = true;
            break;
          }
        }
      }
    }

    const visibility = (personaRow.fieldVisibility ?? {}) as Record<
      string,
      string
    >;

    return {
      valid: true as const,
      profile: {
        displayName: personaRow.displayName,
        bio: visibility.bio === "private" ? null : personaRow.bio,
        avatarUrl:
          visibility.avatar_url === "private" ? null : personaRow.avatarUrl,
        oshiTags: visibility.oshi_tags === "private" ? [] : personaRow.oshiTags,
        styleId: personaRow.styleId,
        urlId: urlIdRow?.urlId ?? null,
        shareToken: personaRow.shareToken,
      },
      session: session ? { user: session.user, myPersonas } : null,
      alreadyConnected,
      issuerPersonaId,
    };
  });

// つながりQR経由でコネクションを双方向即時生成する
export const createConnectionFromQr = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      connectionQrToken: z.string().min(1),
      fromPersonaId: z.uuid(), // スキャンした側のペルソナ
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const [scannerPersonaRow] = await db
      .select({ id: personas.id })
      .from(personas)
      .where(
        and(
          eq(personas.id, data.fromPersonaId),
          eq(personas.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!scannerPersonaRow) throw new Error("自分のペルソナが見つかりません");

    const now = new Date();
    const [tokenRow] = await db
      .select({ fromPersonaId: connectionQrTokens.fromPersonaId })
      .from(connectionQrTokens)
      .where(
        and(
          eq(connectionQrTokens.token, data.connectionQrToken),
          gt(connectionQrTokens.expiresAt, now),
        ),
      )
      .limit(1);
    if (!tokenRow) throw new Error("QRコードが無効または期限切れです");

    const issuerPersonaId = tokenRow.fromPersonaId;
    if (issuerPersonaId === scannerPersonaRow.id)
      throw new Error("自分自身にはつながれません");

    const [issuerPersonaRow] = await db
      .select({ userId: personas.userId })
      .from(personas)
      .where(eq(personas.id, issuerPersonaId))
      .limit(1);
    if (issuerPersonaRow?.userId === session.user.id)
      throw new Error("自分自身にはつながれません");

    // 文脈はQR発行側（A）のアクティブチェックインから取得する
    const [activeCheckin] = await db
      .select({
        eventId: eventCheckins.eventId,
        eventName: events.name,
        venueName: events.venueName,
        eventDate: events.eventDate,
        isInstant: events.isInstant,
      })
      .from(eventCheckins)
      .innerJoin(events, eq(eventCheckins.eventId, events.id))
      .where(
        and(
          eq(eventCheckins.personaId, issuerPersonaId),
          isNull(eventCheckins.checkedOutAt),
        ),
      )
      .limit(1);

    const noCtx = { eventId: null, eventName: null, venueName: null, eventDate: null };
    const eventCtx = activeCheckin
      ? {
          eventId: activeCheckin.eventId,
          eventName: activeCheckin.eventName,
          venueName: activeCheckin.venueName,
          eventDate: activeCheckin.eventDate,
        }
      : noCtx;

    // 即時イベントはA（発行側）のみに文脈を付与する。企画イベントは双方に付与。
    const issuerCtx = eventCtx;
    const scannerCtx = activeCheckin?.isInstant ? noCtx : eventCtx;

    // 使用済みトークンを即時削除
    await db
      .delete(connectionQrTokens)
      .where(eq(connectionQrTokens.token, data.connectionQrToken));

    // A→B と B→A を同時生成（ON CONFLICT DO NOTHING で冪等）
    await db
      .insert(connections)
      .values([
        {
          fromPersonaId: scannerPersonaRow.id,
          toPersonaId: issuerPersonaId,
          fromUserId: session.user.id,
          ...scannerCtx,
        },
        {
          fromPersonaId: issuerPersonaId,
          toPersonaId: scannerPersonaRow.id,
          fromUserId: issuerPersonaRow!.userId,
          ...issuerCtx,
        },
      ])
      .onConflictDoNothing();

    return { alreadyConnected: false, connectedAt: new Date().toISOString() };
  });

// QRを見せた側がリアルタイムで接続成立を確認するためのポーリング用
export const checkQrConnectionStatus = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      token: z.string(),
      fromPersonaId: z.uuid(),
      since: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const [personaRow] = await db
      .select({ userId: personas.userId })
      .from(personas)
      .where(eq(personas.id, data.fromPersonaId))
      .limit(1);
    if (personaRow?.userId !== session.user.id)
      throw new Error("権限がありません");

    const [tokenRow] = await db
      .select({ id: connectionQrTokens.fromPersonaId })
      .from(connectionQrTokens)
      .where(eq(connectionQrTokens.token, data.token))
      .limit(1);

    if (tokenRow) return { status: "pending" as const };

    const sinceDate = new Date(data.since);
    const [recentConn] = await db
      .select({ toPersonaId: connections.toPersonaId })
      .from(connections)
      .where(
        and(
          eq(connections.fromPersonaId, data.fromPersonaId),
          gt(connections.connectedAt, sinceDate),
        ),
      )
      .orderBy(desc(connections.connectedAt))
      .limit(1);

    if (!recentConn) return { status: "expired" as const };

    const [toPersona] = await db
      .select({ displayName: personas.displayName })
      .from(personas)
      .where(eq(personas.id, recentConn.toPersonaId))
      .limit(1);

    return {
      status: "connected" as const,
      displayName: toPersona?.displayName ?? "相手",
    };
  });

// つながりを削除する（自分の行のみ・非対称）
export const deleteConnection = createServerFn({ method: "POST" })
  .inputValidator(z.object({ connectionId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    await db
      .delete(connections)
      .where(
        and(
          eq(connections.id, data.connectionId),
          eq(connections.fromUserId, session.user.id),
        ),
      );
  });

// 自分のつながり一覧（双方向モデル: 常に fromPersona が自分）
export const getMyConnections = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const fromPersona = alias(personas, "from_persona");
    const toPersona = alias(personas, "to_persona");
    const toUrlId = alias(urlIds, "to_url_ids");
    const userId = session.user.id;

    return db
      .select({
        connectionId: connections.id,
        connectedAt: connections.connectedAt,
        eventName: connections.eventName,
        venueName: connections.venueName,
        eventDate: connections.eventDate,
        fromDisplayName: fromPersona.displayName,
        fromLabel: fromPersona.label,
        toDisplayName: toPersona.displayName,
        toAvatarUrl: toPersona.avatarUrl,
        toUrlId: toUrlId.urlId,
        toShareToken: toPersona.shareToken,
      })
      .from(connections)
      .innerJoin(fromPersona, eq(connections.fromPersonaId, fromPersona.id))
      .innerJoin(toPersona, eq(connections.toPersonaId, toPersona.id))
      .innerJoin(toUrlId, eq(toPersona.userId, toUrlId.userId))
      .where(eq(fromPersona.userId, userId))
      .orderBy(desc(connections.connectedAt));
  },
);
