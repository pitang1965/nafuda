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
  pendingInvites,
} from "../db/schema";
import { auth } from "../auth";
import { isValidConnectionContext } from "../lib/eventCheckinWindow";
import { pushToRoom } from "../realtimePush";

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

// 発行者ペルソナのプロフィール＋現在のセッション文脈（自分のなふだ・既つながり判定）を
// 組み立てる共有ヘルパー。つながりQR経由（getConnectPageData）と保留招待経由
// （getPendingInviteData）で同一の画面を描けるよう返り値の形を揃える。
async function buildIssuerView(issuerPersonaId: string) {
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
  if (!personaRow) return null;

  const [urlIdRow] = await db
    .select({ urlId: urlIds.urlId })
    .from(urlIds)
    .where(eq(urlIds.userId, personaRow.userId))
    .limit(1);

  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });

  let myPersonas: { id: string; displayName: string; isDefault: boolean }[] = [];
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
}

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

    const view = await buildIssuerView(tokenRows[0].fromPersonaId);
    if (!view) return { valid: false as const };

    return { valid: true as const, ...view };
  });

// アカウント未所持の相手がスキャンした時点で保留招待を作成する（48時間有効）。
// 文脈は発行者の現在のアクティブチェックインからスナップショットする（ADR-0012）。
// 認証不要（スキャン者はまだアカウントを持たない）。有効な15分QRトークンが必須。
export const ensurePendingInvite = createServerFn({ method: "POST" })
  .inputValidator(z.object({ connectionQrToken: z.string().min(1) }))
  .handler(async ({ data }) => {
    const now = new Date();

    // 期限切れ招待を掃除（テーブルを肥大させない）
    await db.delete(pendingInvites).where(lt(pendingInvites.expiresAt, now));

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

    // 文脈スナップショット: 発行者のアクティブチェックイン（企画・即時とも eventId 付き）。
    // ただし有効な文脈に限る（企画=開催期間内／即時=直近セッションのみ。ADR-0020）。
    const [activeCheckin] = await db
      .select({
        eventId: eventCheckins.eventId,
        eventName: events.name,
        venueName: events.venueName,
        eventDate: events.eventDate,
        eventEndDate: events.eventEndDate,
        showTime: events.showTime,
        isInstant: events.isInstant,
        checkedInAt: eventCheckins.checkedInAt,
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

    const ctx =
      activeCheckin && isValidConnectionContext(activeCheckin)
        ? activeCheckin
        : null;

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const inviteToken = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await db.insert(pendingInvites).values({
      inviteToken,
      issuerPersonaId,
      eventId: ctx?.eventId ?? null,
      eventName: ctx?.eventName ?? null,
      venueName: ctx?.venueName ?? null,
      eventDate: ctx?.eventDate ?? null,
      expiresAt,
    });

    return { inviteToken };
  });

// QR期限切れ後の復旧用ローダー: inviteToken を検証して発行者プロフィールを返す
export const getPendingInviteData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ inviteToken: z.string() }))
  .handler(async ({ data }) => {
    const now = new Date();
    const [inviteRow] = await db
      .select({ issuerPersonaId: pendingInvites.issuerPersonaId })
      .from(pendingInvites)
      .where(
        and(
          eq(pendingInvites.inviteToken, data.inviteToken),
          gt(pendingInvites.expiresAt, now),
        ),
      )
      .limit(1);
    if (!inviteRow) return { valid: false as const };

    const view = await buildIssuerView(inviteRow.issuerPersonaId);
    if (!view) return { valid: false as const };

    return { valid: true as const, ...view };
  });

// 保留招待経由でコネクションを双方向即時生成する。文脈は招待作成時のスナップショットを使い、
// 取り直さない（時間差で成立しても「実際に会った場所」を保持する）。
export const applyPendingInvite = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      inviteToken: z.string().min(1),
      fromPersonaId: z.uuid(), // スキャンした側（後から登録した人）のペルソナ
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
    const [inviteRow] = await db
      .select({
        issuerPersonaId: pendingInvites.issuerPersonaId,
        eventId: pendingInvites.eventId,
        eventName: pendingInvites.eventName,
        venueName: pendingInvites.venueName,
        eventDate: pendingInvites.eventDate,
      })
      .from(pendingInvites)
      .where(
        and(
          eq(pendingInvites.inviteToken, data.inviteToken),
          gt(pendingInvites.expiresAt, now),
        ),
      )
      .limit(1);
    if (!inviteRow) throw new Error("招待が無効または期限切れです");

    const issuerPersonaId = inviteRow.issuerPersonaId;
    if (issuerPersonaId === scannerPersonaRow.id)
      throw new Error("自分自身にはつながれません");

    const [issuerPersonaRow] = await db
      .select({ userId: personas.userId })
      .from(personas)
      .where(eq(personas.id, issuerPersonaId))
      .limit(1);
    if (!issuerPersonaRow) throw new Error("相手のなふだが見つかりません");
    if (issuerPersonaRow.userId === session.user.id)
      throw new Error("自分自身にはつながれません");

    // 文脈は招待のスナップショットを双方の行へ（ADR-0012: 成立時点のコピー、編集は各自独立）
    const ctx = {
      eventId: inviteRow.eventId,
      eventName: inviteRow.eventName,
      venueName: inviteRow.venueName,
      eventDate: inviteRow.eventDate,
    };

    // 使用済み招待を即時削除
    await db
      .delete(pendingInvites)
      .where(eq(pendingInvites.inviteToken, data.inviteToken));

    // A→B と B→A を同時生成（ON CONFLICT DO NOTHING で冪等）
    await db
      .insert(connections)
      .values([
        {
          fromPersonaId: scannerPersonaRow.id,
          toPersonaId: issuerPersonaId,
          fromUserId: session.user.id,
          ...ctx,
        },
        {
          fromPersonaId: issuerPersonaId,
          toPersonaId: scannerPersonaRow.id,
          fromUserId: issuerPersonaRow.userId,
          ...ctx,
        },
      ])
      .onConflictDoNothing();

    return { connectedAt: new Date().toISOString() };
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

    // 発行者A（QRを見せて /me で待っている側）へ realtime 通知するため、
    // スキャンした側（B）の表示名を取得しておく。
    const [scannerPersona] = await db
      .select({ displayName: personas.displayName })
      .from(personas)
      .where(eq(personas.id, scannerPersonaRow.id))
      .limit(1);

    // 文脈はQR発行側（A）のアクティブチェックインから取得する。ただし有効な文脈に限る
    // （企画=開催期間内／即時=直近セッションのみ。古い即時チェックインは使わない。ADR-0020）。
    const [activeCheckin] = await db
      .select({
        eventId: eventCheckins.eventId,
        eventName: events.name,
        venueName: events.venueName,
        eventDate: events.eventDate,
        eventEndDate: events.eventEndDate,
        showTime: events.showTime,
        isInstant: events.isInstant,
        checkedInAt: eventCheckins.checkedInAt,
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

    // 文脈は双方のコネクション行に付与する（ADR-0012）。即時・企画とも eventId 付きで
    // 双方にコピーする。編集可否はロック判定（isInstant）で出し分け、即時イベントは
    // 各自が自分の行を③で編集できる。
    const ctx =
      activeCheckin && isValidConnectionContext(activeCheckin)
        ? {
            eventId: activeCheckin.eventId,
            eventName: activeCheckin.eventName,
            venueName: activeCheckin.venueName,
            eventDate: activeCheckin.eventDate,
          }
        : { eventId: null, eventName: null, venueName: null, eventDate: null };
    const issuerCtx = ctx;
    const scannerCtx = ctx;

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

    // 発行者A の PersonaChannel へ「つながりました」を push（realtime 確認用）。
    // realtime 無効環境では no-op。失敗しても Postgres は書けており、A 側は
    // reconcile-on-connect / 縮退ポーリングで必ず収束する。
    await pushToRoom(`persona:${issuerPersonaId}`, {
      type: "connection",
      displayName: scannerPersona?.displayName ?? "相手",
      since: now.toISOString(),
    });

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

// つながりの文脈・プライベートメモを編集する（自分の行のみ）
export const updateConnection = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      connectionId: z.uuid(),
      eventName: z.string().max(100).optional(),
      venueName: z.string().max(100).optional(),
      privateMemo: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const [row] = await db
      .select({ eventId: connections.eventId, isInstant: events.isInstant })
      .from(connections)
      .leftJoin(events, eq(connections.eventId, events.id))
      .where(
        and(
          eq(connections.id, data.connectionId),
          eq(connections.fromUserId, session.user.id),
        ),
      )
      .limit(1);
    if (!row) throw new Error("つながりが見つかりません");

    // 企画イベント由来の文脈のみ事実として固定（編集不可）。即時イベントは各自が編集可能（ADR-0012）。
    const contextLocked = row.eventId !== null && row.isInstant === false;
    if (
      contextLocked &&
      (data.eventName !== undefined || data.venueName !== undefined)
    )
      throw new Error("企画イベント由来の文脈は編集できません");

    const updates: {
      eventName?: string | null;
      venueName?: string | null;
      privateMemo?: string | null;
    } = {};
    if (data.eventName !== undefined)
      updates.eventName = data.eventName.trim() || null;
    if (data.venueName !== undefined)
      updates.venueName = data.venueName.trim() || null;
    if (data.privateMemo !== undefined)
      updates.privateMemo = data.privateMemo.trim() || null;
    if (Object.keys(updates).length === 0) return;

    await db
      .update(connections)
      .set(updates)
      .where(eq(connections.id, data.connectionId));
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
        eventId: connections.eventId,
        isInstant: events.isInstant,
        eventName: connections.eventName,
        venueName: connections.venueName,
        eventDate: connections.eventDate,
        privateMemo: connections.privateMemo,
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
      .leftJoin(events, eq(connections.eventId, events.id))
      .where(eq(fromPersona.userId, userId))
      .orderBy(desc(connections.connectedAt));
  },
);
