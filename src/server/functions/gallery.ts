import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/client";
import { personas, galleryPhotos } from "../db/schema";
import { auth } from "../auth";
import { deleteFromR2, putToR2, r2PublicUrl } from "../storage";
import { decodeJpegDataUrl } from "../lib/image";

// アバター以外の「対象物」写真の上限とキャプション長（ADR-0014）
export const MAX_GALLERY_PHOTOS = 6;
const CAPTION_MAX = 30;

// 長辺1080px・JPEG品質0.85 で ~600KB を見込み、base64 膨張(約1.33x)を足して上限を引き上げる
const MAX_DATA_URL_LEN = 850_000;

// 指定なふだが本人のものか検証する。所有していなければ null を返す
async function assertOwnedPersona(personaId: string, userId: string) {
  const db = getDb();
  const [persona] = await db
    .select({ id: personas.id })
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, userId)))
    .limit(1);
  return persona ?? null;
}

export const uploadGalleryPhoto = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      personaId: z.uuid(),
      dataUrl: z
        .string()
        .max(MAX_DATA_URL_LEN)
        .refine((v) => v.startsWith("data:image/"), "画像データが不正です"),
      caption: z.string().max(CAPTION_MAX).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const persona = await assertOwnedPersona(data.personaId, session.user.id);
    if (!persona) throw new Error("Forbidden");

    // 6枚上限。先に件数を確認してから書き込む
    const existing = await db
      .select({ displayOrder: galleryPhotos.displayOrder })
      .from(galleryPhotos)
      .where(eq(galleryPhotos.personaId, data.personaId))
      .orderBy(desc(galleryPhotos.displayOrder));
    if (existing.length >= MAX_GALLERY_PHOTOS) {
      throw new Error(`写真は最大${MAX_GALLERY_PHOTOS}枚までです`);
    }
    const nextOrder = existing.length > 0 ? existing[0].displayOrder + 1 : 0;

    const bytes = decodeJpegDataUrl(data.dataUrl);

    const key = `gallery/${data.personaId}/${crypto.randomUUID()}.jpg`;
    await putToR2(key, bytes, "image/jpeg");

    const imageUrl = r2PublicUrl(key);
    const caption = data.caption?.trim() ? data.caption.trim() : null;
    const [row] = await db
      .insert(galleryPhotos)
      .values({
        personaId: data.personaId,
        imageUrl,
        caption,
        displayOrder: nextOrder,
      })
      .returning({
        id: galleryPhotos.id,
        imageUrl: galleryPhotos.imageUrl,
        caption: galleryPhotos.caption,
        displayOrder: galleryPhotos.displayOrder,
      });

    return row;
  });

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .inputValidator(z.object({ photoId: z.uuid() }))
  .handler(async ({ data }) => {
    const db = getDb();
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    // 所有チェック: personas を JOIN して本人の写真であることを確認
    const [photo] = await db
      .select({ id: galleryPhotos.id, imageUrl: galleryPhotos.imageUrl })
      .from(galleryPhotos)
      .innerJoin(personas, eq(galleryPhotos.personaId, personas.id))
      .where(
        and(
          eq(galleryPhotos.id, data.photoId),
          eq(personas.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!photo) throw new Error("Forbidden");

    // 孤児を残さない: R2 実体を消してから行を消す（ADR-0014）
    await deleteFromR2(photo.imageUrl);
    await db.delete(galleryPhotos).where(eq(galleryPhotos.id, data.photoId));
  });

export const updateGalleryCaption = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ photoId: z.uuid(), caption: z.string().max(CAPTION_MAX) }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const [photo] = await db
      .select({ id: galleryPhotos.id })
      .from(galleryPhotos)
      .innerJoin(personas, eq(galleryPhotos.personaId, personas.id))
      .where(
        and(
          eq(galleryPhotos.id, data.photoId),
          eq(personas.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!photo) throw new Error("Forbidden");

    const caption = data.caption.trim() ? data.caption.trim() : null;
    await db
      .update(galleryPhotos)
      .set({ caption, updatedAt: new Date() })
      .where(eq(galleryPhotos.id, data.photoId));
  });

export const reorderGalleryPhotos = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      personaId: z.uuid(),
      orderedIds: z.array(z.uuid()).max(MAX_GALLERY_PHOTOS),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const persona = await assertOwnedPersona(data.personaId, session.user.id);
    if (!persona) throw new Error("Forbidden");

    // 渡された id が全て本人のなふだの写真であることを確認してから採番し直す
    const rows = await db
      .select({ id: galleryPhotos.id })
      .from(galleryPhotos)
      .where(eq(galleryPhotos.personaId, data.personaId));
    const owned = new Set(rows.map((r) => r.id));
    if (
      data.orderedIds.length !== rows.length ||
      !data.orderedIds.every((id) => owned.has(id))
    ) {
      throw new Error("並び順の指定が不正です");
    }

    if (data.orderedIds.length === 0) return;
    // D1はトランザクションを持たないため、原子性はdb.batch()で担保する。
    const now = new Date();
    const updates = data.orderedIds.map((id, index) =>
      db
        .update(galleryPhotos)
        .set({ displayOrder: index, updatedAt: now })
        .where(eq(galleryPhotos.id, id)),
    );
    await db.batch(updates as unknown as Parameters<typeof db.batch>[0]);
  });
