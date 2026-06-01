import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, and, inArray, or } from "drizzle-orm";
import { db } from "../db/client";
import {
  personas,
  urlIds,
  snsLinks,
  connections,
  eventCheckins,
  events,
  user as userTable,
  session as sessionTable,
  account as accountTable,
} from "../db/schema";
import { auth } from "../auth";

const URLID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

async function generateUniqueUrlId(): Promise<string> {
  while (true) {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    const candidate = Array.from(bytes)
      .map((b) => URLID_CHARS[b % 36])
      .join("");
    const existing = await db
      .select({ urlId: urlIds.urlId })
      .from(urlIds)
      .where(eq(urlIds.urlId, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
}

// Get own full profile (authenticated — returns all fields)
export const getOwnProfile = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const myPersonas = await db
      .select()
      .from(personas)
      .where(eq(personas.userId, session.user.id))
      .orderBy(personas.createdAt);

    const urlIdRow = await db
      .select({ urlId: urlIds.urlId })
      .from(urlIds)
      .where(eq(urlIds.userId, session.user.id))
      .limit(1);

    const personaIds = myPersonas.map((p) => p.id);
    const allLinks =
      personaIds.length > 0
        ? await db
            .select()
            .from(snsLinks)
            .where(inArray(snsLinks.personaId, personaIds))
            .orderBy(snsLinks.displayOrder)
        : [];
    const linksByPersona = allLinks.reduce<Record<string, typeof allLinks>>(
      (acc, link) => {
        (acc[link.personaId] ??= []).push(link);
        return acc;
      },
      {},
    );

    return {
      urlId: urlIdRow[0]?.urlId ?? null,
      personas: myPersonas.map((p) => ({
        ...p,
        snsLinks: linksByPersona[p.id] ?? [],
      })),
    };
  },
);

// Create persona (also auto-generates UrlId on first creation)
export const createPersona = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      displayName: z
        .string()
        .min(1, "表示名を入力してください")
        .max(50, "50文字以下"),
      label: z.string().max(20).optional().nullable(),
      bio: z.string().max(200).optional().nullable(),
      avatarUrl: z.url().optional().nullable(),
      isDefault: z.boolean().default(false),
      oshiTags: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    // Generate share token
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const shareToken = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Auto-generate UrlId on first persona creation
    const existingUrlId = await db
      .select({ urlId: urlIds.urlId })
      .from(urlIds)
      .where(eq(urlIds.userId, session.user.id))
      .limit(1);
    if (!existingUrlId[0]) {
      const newUrlId = await generateUniqueUrlId();
      await db
        .insert(urlIds)
        .values({ urlId: newUrlId, userId: session.user.id });
    }

    // If this is default persona, clear existing defaults first
    if (data.isDefault) {
      await db
        .update(personas)
        .set({ isDefault: false })
        .where(eq(personas.userId, session.user.id));
    }

    const [persona] = await db
      .insert(personas)
      .values({
        userId: session.user.id,
        displayName: data.displayName,
        label: data.label ?? null,
        bio: data.bio ?? null,
        shareToken,
        avatarUrl: data.avatarUrl ?? null,
        isDefault: data.isDefault,
        oshiTags: data.oshiTags,
      })
      .returning();

    return persona;
  });

// Update persona fields (display name, avatar, field visibility)
export const updatePersona = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      personaId: z.uuid(),
      displayName: z.string().min(1).max(50).optional(),
      label: z.string().max(20).optional().nullable(),
      bio: z.string().max(200).optional().nullable(),
      avatarUrl: z.url().optional().nullable(),
      fieldVisibility: z
        .record(z.string(), z.enum(["public", "private"]))
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const updates: Partial<typeof personas.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.displayName !== undefined) updates.displayName = data.displayName;
    if (data.label !== undefined) updates.label = data.label;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
    if (data.fieldVisibility !== undefined)
      updates.fieldVisibility = data.fieldVisibility;

    await db
      .update(personas)
      .set(updates)
      .where(
        and(
          eq(personas.id, data.personaId),
          eq(personas.userId, session.user.id),
        ),
      );
  });

// Get public profile by shareToken — CRITICAL: filter non-public fields SERVER-SIDE
export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      shareToken: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const result = await db
      .select()
      .from(personas)
      .where(eq(personas.shareToken, data.shareToken))
      .limit(1);
    const persona = result[0];

    if (!persona) return null;

    const visibility = (persona.fieldVisibility ?? {}) as Record<
      string,
      string
    >;

    // CRITICAL: filter SNS links at query level — do not fetch then hide client-side
    const links =
      visibility.sns_links === "private"
        ? []
        : await db
            .select()
            .from(snsLinks)
            .where(eq(snsLinks.personaId, persona.id))
            .orderBy(snsLinks.displayOrder);

    return {
      displayName: persona.displayName,
      bio: visibility.bio === "private" ? null : persona.bio,
      avatarUrl: visibility.avatar_url === "private" ? null : persona.avatarUrl,
      oshiTags: visibility.oshi_tags === "private" ? [] : persona.oshiTags,
      dojinReject: persona.dojinReject,
      snsLinks: links,
    };
  });

export const upsertSnsLink = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      personaId: z.uuid(),
      linkId: z.uuid().optional(),
      platform: z.enum([
        "x",
        "instagram",
        "tiktok",
        "youtube",
        "discord",
        "line_openchat",
        "github",
        "spotify",
        "facebook",
        "minkara",
        "linkedin",
        "note",
        "pixiv",
        "other",
      ]),
      url: z.url("有効なURLを入力してください"),
      displayOrder: z.number().int().min(0),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const persona = await db
      .select({ id: personas.id })
      .from(personas)
      .where(
        and(
          eq(personas.id, data.personaId),
          eq(personas.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!persona[0]) throw new Error("Forbidden");

    if (data.linkId) {
      await db
        .update(snsLinks)
        .set({
          platform: data.platform,
          url: data.url,
          displayOrder: data.displayOrder,
        })
        .where(eq(snsLinks.id, data.linkId));
    } else {
      await db.insert(snsLinks).values({
        personaId: data.personaId,
        platform: data.platform,
        url: data.url,
        displayOrder: data.displayOrder,
      });
    }
  });

export const deleteSnsLink = createServerFn({ method: "POST" })
  .inputValidator(z.object({ linkId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");
    await db.delete(snsLinks).where(eq(snsLinks.id, data.linkId));
  });

export const deleteAccount = createServerFn({ method: "POST" }).handler(
  async () => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");
    const userId = session.user.id;

    const myPersonas = await db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.userId, userId));
    const personaIds = myPersonas.map((p) => p.id);

    // イベントは保持し、hostUserId のみ NULL に更新（ADR-0005）
    await db
      .update(events)
      .set({ hostUserId: null })
      .where(eq(events.hostUserId, userId));

    if (personaIds.length > 0) {
      // FK 制約順: connections → event_checkins → sns_links → personas
      await db
        .delete(connections)
        .where(
          or(
            inArray(connections.fromPersonaId, personaIds),
            inArray(connections.toPersonaId, personaIds),
          ),
        );
      await db
        .delete(eventCheckins)
        .where(inArray(eventCheckins.personaId, personaIds));
      await db.delete(snsLinks).where(inArray(snsLinks.personaId, personaIds));
      await db.delete(personas).where(eq(personas.userId, userId));
    }

    await db.delete(urlIds).where(eq(urlIds.userId, userId));
    // Better Auth テーブル: session・account は user より先に削除（FK 制約）
    await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
    await db.delete(accountTable).where(eq(accountTable.userId, userId));
    await db.delete(userTable).where(eq(userTable.id, userId));
  },
);
