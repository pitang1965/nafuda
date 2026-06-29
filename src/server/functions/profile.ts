import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, and, inArray, or } from "drizzle-orm";
import { db } from "../db/client";
import {
  personas,
  urlIds,
  snsLinks,
  nafudaLinks,
  galleryPhotos,
  connections,
  eventCheckins,
  events,
  favoritePersonas,
  user as userTable,
  session as sessionTable,
  account as accountTable,
} from "../db/schema";
import { auth } from "../auth";
import { deleteFromR2 } from "../storage";

const URLID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

// SNSリンクのURL: https のみ許可。https 前置チェックで javascript:/data: を弾き
// 格納型XSSを防ぐ。http も不許可（https 強制）。
// handler 内で検証して clean な文を throw する（Zod refine だと ZodError の message が
// JSON 化してクライアントに汚く出るため。isNafudaHost と同じ理由）。
function isValidHttpsUrl(url: string): boolean {
  try {
    new URL(url);
  } catch {
    return false;
  }
  return /^https:\/\//i.test(url);
}

// nafuda.me（およびサブドメイン）の URL は SNSリンクに登録させない。
// SNSリンクは「外部サービス」へのリンクであり自社ドメインは対象外。プロフィールURL
// （見せる/つながる）・イベントURL を含むあらゆる nafuda.me URL が対象（ADR-0015）。
// handler 内で throw して使う（Zod refine だと ZodError の message が JSON 化して
// クライアントに汚く出るため、クリーンな文を投げられる handler に置く）。
function isNafudaHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "nafuda.me" || host.endsWith(".nafuda.me");
  } catch {
    return false;
  }
}

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

    const allPhotos =
      personaIds.length > 0
        ? await db
            .select()
            .from(galleryPhotos)
            .where(inArray(galleryPhotos.personaId, personaIds))
            .orderBy(galleryPhotos.displayOrder)
        : [];
    const photosByPersona = allPhotos.reduce<Record<string, typeof allPhotos>>(
      (acc, photo) => {
        (acc[photo.personaId] ??= []).push(photo);
        return acc;
      },
      {},
    );

    // なふだリンク: リンク先ペルソナを JOIN して表示名・アバター・shareToken を動的取得（ADR-0015）
    const allNafudaLinks =
      personaIds.length > 0
        ? await db
            .select({
              id: nafudaLinks.id,
              personaId: nafudaLinks.personaId,
              targetPersonaId: nafudaLinks.targetPersonaId,
              displayOrder: nafudaLinks.displayOrder,
              targetDisplayName: personas.displayName,
              targetAvatarUrl: personas.avatarUrl,
              targetShareToken: personas.shareToken,
            })
            .from(nafudaLinks)
            .innerJoin(personas, eq(nafudaLinks.targetPersonaId, personas.id))
            .where(inArray(nafudaLinks.personaId, personaIds))
            .orderBy(nafudaLinks.displayOrder)
        : [];
    const nafudaLinksByPersona = allNafudaLinks.reduce<
      Record<string, typeof allNafudaLinks>
    >((acc, link) => {
      (acc[link.personaId] ??= []).push(link);
      return acc;
    }, {});

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
        galleryPhotos: photosByPersona[p.id] ?? [],
        nafudaLinks: nafudaLinksByPersona[p.id] ?? [],
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

    // CRITICAL: ギャラリーも非公開ならクエリ段階で除外する（取得して隠すのは不可）
    // id (photoId) は返さない: 匿名収集→削除APIへの攻撃面になるため（SNSリンクと同じ方針）
    const gallery =
      visibility.gallery === "private"
        ? []
        : await db
            .select({
              imageUrl: galleryPhotos.imageUrl,
              caption: galleryPhotos.caption,
              displayOrder: galleryPhotos.displayOrder,
            })
            .from(galleryPhotos)
            .where(eq(galleryPhotos.personaId, persona.id))
            .orderBy(galleryPhotos.displayOrder);

    // なふだリンク（ADR-0015）: 自分の別のなふだへの内部参照。リンク先は同一ユーザーなので
    // urlId は共通。表示名・アバター・shareToken をリンク先 personas から動的取得する。
    // 公開範囲トグルは持たない（貼る＝自己公開の意思表示）。
    const ownerUrlId = await db
      .select({ urlId: urlIds.urlId })
      .from(urlIds)
      .where(eq(urlIds.userId, persona.userId))
      .limit(1);
    const urlId = ownerUrlId[0]?.urlId ?? null;
    const nafudaLinkRows = urlId
      ? await db
          .select({
            displayName: personas.displayName,
            avatarUrl: personas.avatarUrl,
            shareToken: personas.shareToken,
            displayOrder: nafudaLinks.displayOrder,
          })
          .from(nafudaLinks)
          .innerJoin(personas, eq(nafudaLinks.targetPersonaId, personas.id))
          .where(eq(nafudaLinks.personaId, persona.id))
          .orderBy(nafudaLinks.displayOrder)
      : [];
    const nafudaLinkChips = nafudaLinkRows.map((r) => ({
      urlId: urlId!,
      shareToken: r.shareToken,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
    }));

    return {
      displayName: persona.displayName,
      bio: visibility.bio === "private" ? null : persona.bio,
      avatarUrl: visibility.avatar_url === "private" ? null : persona.avatarUrl,
      oshiTags: visibility.oshi_tags === "private" ? [] : persona.oshiTags,
      // 用途タイプはタグ見出しの出し分けに使う（値自体は公開情報ではないが、効果が見える）
      purpose: persona.purpose,
      dojinReject: persona.dojinReject,
      snsLinks: links,
      galleryPhotos: gallery,
      nafudaLinks: nafudaLinkChips,
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
      url: z.string(),
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

    if (!isValidHttpsUrl(data.url)) {
      throw new Error("URL は https:// から始まるフルURLを入力してください。");
    }

    if (isNafudaHost(data.url)) {
      throw new Error(
        "nafuda.me のリンクは SNSリンクに登録できません。自分の別のなふだは「なふだリンク」から追加してください。",
      );
    }

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

// なふだリンクをまとめて設定する（ADR-0015）。リンク先は targetPersonaIds の順に並ぶ。
// 自分のペルソナのみ・自己参照不可・重複不可をサーバー側で強制し、既存行を置き換える。
export const setNafudaLinks = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      personaId: z.uuid(),
      targetPersonaIds: z.array(z.uuid()).max(50),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");
    const userId = session.user.id;

    // リンク元が自分のものか確認
    const [owned] = await db
      .select({ id: personas.id })
      .from(personas)
      .where(and(eq(personas.id, data.personaId), eq(personas.userId, userId)))
      .limit(1);
    if (!owned) throw new Error("Forbidden");

    // 重複除去・自己参照除去（順序は保持）
    const seen = new Set<string>();
    const targetIds = data.targetPersonaIds.filter((id) => {
      if (id === data.personaId || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // 全リンク先が自分のペルソナであることを確認（他人のなふだは指せない）
    if (targetIds.length > 0) {
      const ownTargets = await db
        .select({ id: personas.id })
        .from(personas)
        .where(
          and(inArray(personas.id, targetIds), eq(personas.userId, userId)),
        );
      if (ownTargets.length !== targetIds.length) {
        throw new Error("Forbidden");
      }
    }

    // 既存を全削除して順序どおりに入れ直す
    await db.delete(nafudaLinks).where(eq(nafudaLinks.personaId, data.personaId));
    if (targetIds.length > 0) {
      await db.insert(nafudaLinks).values(
        targetIds.map((targetPersonaId, i) => ({
          personaId: data.personaId,
          targetPersonaId,
          displayOrder: i,
        })),
      );
    }
  });

// 指定なふだ群に紐づく R2 画像（アバター＋ギャラリー写真）を物理削除する。
// DB行は FK cascade / 明示削除で消えるが R2 には効かないため、孤児を残さないよう
// personas を消す前に呼ぶ（ADR-0014。アバターの既存孤児バグもここで塞ぐ）。
async function cleanupPersonaR2Assets(personaIds: string[]) {
  if (personaIds.length === 0) return;
  const [avatars, photos] = await Promise.all([
    db
      .select({ avatarUrl: personas.avatarUrl })
      .from(personas)
      .where(inArray(personas.id, personaIds)),
    db
      .select({ imageUrl: galleryPhotos.imageUrl })
      .from(galleryPhotos)
      .where(inArray(galleryPhotos.personaId, personaIds)),
  ]);
  const urls = [
    ...avatars.map((a) => a.avatarUrl),
    ...photos.map((p) => p.imageUrl),
  ];
  await Promise.all(urls.map((url) => deleteFromR2(url)));
}

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

    // 自分が保存したお気に入りを削除（userId は FK でないため明示削除。ADR-0021）。
    // 自分のなふだが他者に保存されていた被参照分は personas 削除時に FK cascade で消える。
    await db
      .delete(favoritePersonas)
      .where(eq(favoritePersonas.userId, userId));

    if (personaIds.length > 0) {
      // R2 画像（アバター＋ギャラリー）を先に物理削除（孤児を残さない）
      await cleanupPersonaR2Assets(personaIds);
      // FK 制約順: connections → event_checkins → sns_links → personas
      // gallery_photos・nafuda_links は personas 削除時に DB cascade で自動削除される
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

// なふだ（ペルソナ）を1枚だけ削除する。退会(ADR-0005)とは別概念で、
// アカウント・UrlId・他のなふだは残る。最後の1枚は削除不可（ADR-0011）。
export const deletePersona = createServerFn({ method: "POST" })
  .inputValidator(z.object({ personaId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");
    const userId = session.user.id;

    // 自分のなふだ一覧（最古順）。所有チェックと最後の1枚ガードに使う
    const myPersonas = await db
      .select({ id: personas.id, isDefault: personas.isDefault })
      .from(personas)
      .where(eq(personas.userId, userId))
      .orderBy(personas.createdAt);

    const target = myPersonas.find((p) => p.id === data.personaId);
    if (!target) throw new Error("Forbidden");

    // 最後の1枚は削除させない（全削除は退会に委ねる — ADR-0011）
    if (myPersonas.length <= 1) {
      throw new Error("最後のなふだは削除できません");
    }

    const personaIds = [data.personaId];

    // R2 画像（アバター＋ギャラリー）を先に物理削除（孤児を残さない — ADR-0014）
    await cleanupPersonaR2Assets(personaIds);

    // FK 制約順: connections（相手側の鏡像行も含む）→ event_checkins → sns_links → personas
    // connection_qr_tokens・gallery_photos・nafuda_links・favorite_personas は onDelete: cascade で自動削除される
    // （nafuda_links はこのなふだが指す行＋他のなふだからこのなふだを指す被参照の双方が消える。
    //   favorite_personas は他者がこのなふだを保存していた被参照分が消える。自分が他者を保存した分は
    //   userId 起点なので自分のなふだ削除では消えない — ADR-0021）
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
    await db.delete(personas).where(eq(personas.id, data.personaId));

    // デフォルトを削除した場合は残る最古のなふだに付け替える（不変条件維持）
    if (target.isDefault) {
      const nextDefault = myPersonas.find((p) => p.id !== data.personaId);
      if (nextDefault) {
        await db
          .update(personas)
          .set({ isDefault: true })
          .where(eq(personas.id, nextDefault.id));
      }
    }
  });
