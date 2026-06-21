import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, and, isNull, ne, desc } from "drizzle-orm";
import { db } from "../db/client";
import { events, eventCheckins, personas, urlIds } from "../db/schema";
import { auth } from "../auth";
import { isWithinCheckinWindow } from "../lib/eventCheckinWindow";

function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildEventDate(
  eventDate: string,
  showTime: boolean,
  eventTime?: string,
): Date {
  if (showTime && eventTime) {
    return new Date(`${eventDate}T${eventTime}:00`);
  }
  return new Date(eventDate);
}

// Check in to an existing event by shareToken
export const checkinToEvent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      personaId: z.uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const persona = await db
      .select({ id: personas.id, userId: personas.userId })
      .from(personas)
      .where(eq(personas.id, data.personaId))
      .limit(1);
    if (!persona[0]) throw new Error("Persona not found");
    if (persona[0].userId !== session.user.id)
      throw new Error("Forbidden: persona does not belong to current user");

    const eventRow = await db
      .select()
      .from(events)
      .where(eq(events.shareToken, data.token))
      .limit(1);
    if (!eventRow[0]) throw new Error("Event not found");

    // 受付窓ゲート（ADR-0020）: 開催期間±猶予の外からのチェックインは受け付けない。
    if (!isWithinCheckinWindow(eventRow[0])) {
      throw new Error("チェックインの受付期間外です");
    }

    // Remove other personas of same user from this event (1ユーザー = 1エントリ)
    await db
      .delete(eventCheckins)
      .where(
        and(
          eq(eventCheckins.eventId, eventRow[0].id),
          eq(eventCheckins.userId, session.user.id),
          ne(eventCheckins.personaId, data.personaId),
        ),
      );

    // Check out same persona from other active events
    await db
      .update(eventCheckins)
      .set({ checkedOutAt: new Date() })
      .where(
        and(
          eq(eventCheckins.personaId, data.personaId),
          isNull(eventCheckins.checkedOutAt),
        ),
      );

    const newCheckin = await db
      .insert(eventCheckins)
      .values({
        eventId: eventRow[0].id,
        personaId: data.personaId,
        userId: session.user.id,
        gpsCoordinates: null,
      })
      .returning();

    return { checkin: newCheckin[0], event: eventRow[0] };
  });

// Create event and check in (used from the event creation form)
export const createEventAndCheckin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z
        .string()
        .min(1)
        .max(100)
        .regex(
          /^[a-zA-Z0-9-]+$/,
          "スラッグはURL-safe文字（英数字・ハイフン）のみ使用できます",
        ),
      eventName: z.string().min(1).max(100),
      venueName: z.string().min(1).max(100),
      eventDate: z.string(),
      eventTime: z.string().optional(),
      eventEndDate: z.string().optional(),
      eventEndTime: z.string().optional(),
      showTime: z.boolean(),
      description: z.string().max(1000).optional().nullable(),
      personaId: z.uuid(),
      hostPersonaId: z.uuid(),
      gpsCoordinates: z.object({ x: z.number(), y: z.number() }).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const persona = await db
      .select({ id: personas.id, userId: personas.userId })
      .from(personas)
      .where(eq(personas.id, data.personaId))
      .limit(1);
    if (!persona[0]) throw new Error("Persona not found");
    if (persona[0].userId !== session.user.id)
      throw new Error("Forbidden: persona does not belong to current user");

    await db
      .update(eventCheckins)
      .set({ checkedOutAt: new Date() })
      .where(
        and(
          eq(eventCheckins.personaId, data.personaId),
          isNull(eventCheckins.checkedOutAt),
        ),
      );

    let eventRow = await db
      .select()
      .from(events)
      .where(eq(events.slug, data.slug))
      .limit(1);

    if (!eventRow[0]) {
      try {
        const inserted = await db
          .insert(events)
          .values({
            slug: data.slug,
            shareToken: generateShareToken(),
            name: data.eventName,
            venueName: data.venueName,
            eventDate: buildEventDate(
              data.eventDate,
              data.showTime,
              data.eventTime,
            ),
            eventEndDate: data.eventEndDate
              ? buildEventDate(
                  data.eventEndDate,
                  data.showTime,
                  data.eventEndTime,
                )
              : null,
            showTime: data.showTime,
            description: data.description ?? null,
            hostUserId: session.user.id,
            hostPersonaId: data.hostPersonaId,
          })
          .returning();
        eventRow = inserted;
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          err.code === "23505"
        ) {
          eventRow = await db
            .select()
            .from(events)
            .where(eq(events.slug, data.slug))
            .limit(1);
        } else {
          throw err;
        }
      }
    }

    if (!eventRow[0]) throw new Error("Failed to create or retrieve event");

    // Remove other personas of same user from this event (1ユーザー = 1エントリ)
    await db
      .delete(eventCheckins)
      .where(
        and(
          eq(eventCheckins.eventId, eventRow[0].id),
          eq(eventCheckins.userId, session.user.id),
          ne(eventCheckins.personaId, data.personaId),
        ),
      );

    const newCheckin = await db
      .insert(eventCheckins)
      .values({
        eventId: eventRow[0].id,
        personaId: data.personaId,
        userId: session.user.id,
        gpsCoordinates: data.gpsCoordinates ?? null,
      })
      .returning();

    return { checkin: newCheckin[0], event: eventRow[0] };
  });

// Checkout from event (set checkedOutAt = now)
export const checkoutFromEvent = createServerFn({ method: "POST" })
  .inputValidator(z.object({ checkinId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const checkin = await db
      .select({ id: eventCheckins.id, userId: eventCheckins.userId })
      .from(eventCheckins)
      .where(eq(eventCheckins.id, data.checkinId))
      .limit(1);
    if (!checkin[0]) throw new Error("Checkin not found");
    if (checkin[0].userId !== session.user.id)
      throw new Error("Forbidden: checkin does not belong to current user");

    const updated = await db
      .update(eventCheckins)
      .set({ checkedOutAt: new Date() })
      .where(eq(eventCheckins.id, data.checkinId))
      .returning();

    return updated[0];
  });

// Get active checkin for current user's persona
export const getActiveCheckin = createServerFn({ method: "GET" })
  .inputValidator(z.object({ personaId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

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
        eventToken: events.shareToken,
        eventDate: events.eventDate,
        showTime: events.showTime,
      })
      .from(eventCheckins)
      .innerJoin(events, eq(eventCheckins.eventId, events.id))
      .where(
        and(
          eq(eventCheckins.personaId, data.personaId),
          isNull(eventCheckins.checkedOutAt),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  });

// Get event participants by shareToken — public endpoint (no auth required)
// ただし参加者の永続プロフィールURL（shareToken/urlId）はログインユーザーにのみ返す
export const getEventParticipants = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    const isAuthenticated = !!session?.user;

    const eventRow = await db
      .select()
      .from(events)
      .where(eq(events.shareToken, data.token))
      .limit(1);
    if (!eventRow[0]) return null;

    const rows = await db
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
      .leftJoin(urlIds, eq(personas.userId, urlIds.userId))
      .where(
        and(
          eq(eventCheckins.eventId, eventRow[0].id),
          eq(personas.dojinReject, false),
        ),
      )
      .orderBy(desc(eventCheckins.checkedInAt));

    const seen = new Set<string>();
    const participants = rows
      .filter((r) => {
        if (seen.has(r.personaId)) return false;
        seen.add(r.personaId);
        return true;
      })
      .map((r) =>
        isAuthenticated
          ? r
          : { ...r, shareToken: null as string | null, urlId: null },
      );

    return { event: eventRow[0], participants };
  });

// Check if the current user's persona has any checkin for this event
export const getMyCheckinStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), personaId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return false;

    const eventRow = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.shareToken, data.token))
      .limit(1);
    if (!eventRow[0]) return false;

    const checkin = await db
      .select({ id: eventCheckins.id })
      .from(eventCheckins)
      .where(
        and(
          eq(eventCheckins.eventId, eventRow[0].id),
          eq(eventCheckins.personaId, data.personaId),
        ),
      )
      .limit(1);
    return checkin.length > 0;
  });

// Cancel participation (delete all checkin records for this event + persona)
export const cancelCheckin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().min(1), personaId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const persona = await db
      .select({ userId: personas.userId })
      .from(personas)
      .where(eq(personas.id, data.personaId))
      .limit(1);
    if (!persona[0] || persona[0].userId !== session.user.id)
      throw new Error("Forbidden");

    const eventRow = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.shareToken, data.token))
      .limit(1);
    if (!eventRow[0]) throw new Error("Event not found");

    await db
      .delete(eventCheckins)
      .where(
        and(
          eq(eventCheckins.eventId, eventRow[0].id),
          eq(eventCheckins.personaId, data.personaId),
        ),
      );

    return { success: true };
  });

// Update event fields (host only, slug and shareToken are immutable)
export const updateEvent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      name: z.string().min(1).max(100),
      venueName: z.string().min(1).max(100),
      eventDate: z.string(),
      eventTime: z.string().optional(),
      eventEndDate: z.string().optional(),
      eventEndTime: z.string().optional(),
      showTime: z.boolean(),
      description: z.string().max(1000).optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const eventRow = await db
      .select({ id: events.id, hostUserId: events.hostUserId })
      .from(events)
      .where(eq(events.shareToken, data.token))
      .limit(1);
    if (!eventRow[0]) throw new Error("Event not found");
    if (eventRow[0].hostUserId !== session.user.id)
      throw new Error("Forbidden: only the host can edit this event");

    await db
      .update(events)
      .set({
        name: data.name,
        venueName: data.venueName,
        eventDate: buildEventDate(
          data.eventDate,
          data.showTime,
          data.eventTime,
        ),
        eventEndDate: data.eventEndDate
          ? buildEventDate(data.eventEndDate, data.showTime, data.eventEndTime)
          : null,
        showTime: data.showTime,
        description: data.description ?? null,
      })
      .where(eq(events.id, eventRow[0].id));

    return { success: true };
  });

// Delete event (host only) — CASCADE deletes event_checkins automatically
export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const eventRow = await db
      .select({ id: events.id, hostUserId: events.hostUserId })
      .from(events)
      .where(eq(events.shareToken, data.token))
      .limit(1);
    if (!eventRow[0]) throw new Error("Event not found");
    if (eventRow[0].hostUserId !== session.user.id)
      throw new Error("Forbidden: only the host can delete this event");

    await db.delete(events).where(eq(events.id, eventRow[0].id));
    return { success: true };
  });

// Get events created by or participated in by the current user
export const getMyEvents = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const userId = session.user.id;

    const hostedEvents = await db
      .select()
      .from(events)
      .where(eq(events.hostUserId, userId));

    const participatedRows = await db
      .selectDistinctOn([events.id], {
        id: events.id,
        slug: events.slug,
        shareToken: events.shareToken,
        name: events.name,
        venueName: events.venueName,
        eventDate: events.eventDate,
        showTime: events.showTime,
        isInstant: events.isInstant,
        description: events.description,
        hostUserId: events.hostUserId,
        createdAt: events.createdAt,
        checkedInAt: eventCheckins.checkedInAt,
      })
      .from(eventCheckins)
      .innerJoin(events, eq(eventCheckins.eventId, events.id))
      .where(
        and(eq(eventCheckins.userId, userId), ne(events.hostUserId, userId)),
      );

    return { hostedEvents, participatedEvents: participatedRows };
  },
);

// 「なふだを交換する」フロー中に即時イベントを作成してチェックインする
export const createInstantEventAndCheckin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      eventName: z.string().min(1).max(100),
      personaId: z.uuid(),
      gpsCoordinates: z.object({ x: z.number(), y: z.number() }).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const [personaRow] = await db
      .select({ id: personas.id, userId: personas.userId })
      .from(personas)
      .where(eq(personas.id, data.personaId))
      .limit(1);
    if (!personaRow) throw new Error("Persona not found");
    if (personaRow.userId !== session.user.id) throw new Error("Forbidden");

    // 既存アクティブチェックインをチェックアウト
    await db
      .update(eventCheckins)
      .set({ checkedOutAt: new Date() })
      .where(
        and(
          eq(eventCheckins.personaId, data.personaId),
          isNull(eventCheckins.checkedOutAt),
        ),
      );

    const now = new Date();
    // slug: instant-{timestamp}-{random4hex}
    const randomSuffix = Array.from(crypto.getRandomValues(new Uint8Array(2)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const slug = `instant-${now.getTime()}-${randomSuffix}`;

    const [newEvent] = await db
      .insert(events)
      .values({
        slug,
        shareToken: generateShareToken(),
        name: data.eventName,
        venueName: null,
        eventDate: now,
        showTime: false,
        isInstant: true,
        gpsCoordinates: data.gpsCoordinates ?? null,
        hostUserId: session.user.id,
        hostPersonaId: data.personaId,
      })
      .returning();

    const [newCheckin] = await db
      .insert(eventCheckins)
      .values({
        eventId: newEvent.id,
        personaId: data.personaId,
        userId: session.user.id,
        gpsCoordinates: data.gpsCoordinates ?? null,
      })
      .returning();

    return { event: newEvent, checkin: newCheckin };
  });
