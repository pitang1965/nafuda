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

// SNSリンクのURL: http(s) のみ許可。z.url() は javascript:/data: を通すため
// スキームを明示的に絞り格納型XSSを防ぐ
const httpUrl = z
  .url("有効なURLを入力してください")
  .refine(
    (v) => /^https?:\/\//i.test(v),
    "http または https のURLを入力してください",
  );

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

    // 前回使ったなふだをCookieから解決する。SSR時点で確定させることで、
    // /me 初回描画でデフォルトなふだが一瞬表示されるフラッシュを防ぐ。
    const savedPersonaId = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("nafuda_last_persona_id="))
      ?.slice("nafuda_last_persona_id=".length);
    const defaultPersonaId =
      myPersonas.find((p) => p.isDefault)?.id ?? myPersonas[0]?.id ?? null;
    const initialPersonaId =
      savedPersonaId && myPersonas.some((p) => p.id === savedPersonaId)
        ? savedPersonaId
        : defaultPersonaId;

    return {
      urlId: urlIdRow[0]?.urlId ?? null,
      initialPersonaId,
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
      purpose: z.string().max(32).optional().nullable(),
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
        purpose: data.purpose ?? null,
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
      purpose: z.string().max(32).optional().nullable(),
      bio: z.string().max(200).optional().nullable(),
      avatarUrl: z.url().optional().nullable(),
      fieldVisibility: z
        .record(z.string(), z.enum(["public", "private"]))
        .optional(),
      styleId: z.string().nullable().optional(), // undefined = 変更なし, null = スタイル解除
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
    if (data.purpose !== undefined) updates.purpose = data.purpose;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
    if (data.fieldVisibility !== undefined)
      updates.fieldVisibility = data.fieldVisibility;
    if (data.styleId !== undefined) updates.styleId = data.styleId;

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
    // id (linkId) は返さない: 匿名収集→削除APIへの攻撃面になるため
    const links =
      visibility.sns_links === "private"
        ? []
        : await db
            .select({
              platform: snsLinks.platform,
              url: snsLinks.url,
              title: snsLinks.title,
              displayOrder: snsLinks.displayOrder,
            })
            .from(snsLinks)
            .where(eq(snsLinks.personaId, persona.id))
            .orderBy(snsLinks.displayOrder);

    return {
      displayName: persona.displayName,
      bio: visibility.bio === "private" ? null : persona.bio,
      avatarUrl: visibility.avatar_url === "private" ? null : persona.avatarUrl,
      oshiTags: visibility.oshi_tags === "private" ? [] : persona.oshiTags,
      // 用途タイプはタグ見出しの出し分けに使う（値自体は公開情報ではないが、効果が見える）
      purpose: persona.purpose,
      dojinReject: persona.dojinReject,
      snsLinks: links,
      styleId: persona.styleId,
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
      url: httpUrl,
      title: z.string().max(50).optional(),
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

    const title = data.title?.trim() || null;

    if (data.linkId) {
      // linkId が自分の persona に属することを確認（他人のリンク書き換え防止）
      await db
        .update(snsLinks)
        .set({
          platform: data.platform,
          url: data.url,
          title,
          displayOrder: data.displayOrder,
        })
        .where(
          and(
            eq(snsLinks.id, data.linkId),
            eq(snsLinks.personaId, data.personaId),
          ),
        );
    } else {
      await db.insert(snsLinks).values({
        personaId: data.personaId,
        platform: data.platform,
        url: data.url,
        title,
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

    // linkId → persona → user を辿り所有者を検証（他人のリンク削除防止）
    const [owned] = await db
      .select({ id: snsLinks.id })
      .from(snsLinks)
      .innerJoin(personas, eq(snsLinks.personaId, personas.id))
      .where(
        and(eq(snsLinks.id, data.linkId), eq(personas.userId, session.user.id)),
      )
      .limit(1);
    if (!owned) throw new Error("Forbidden");

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
