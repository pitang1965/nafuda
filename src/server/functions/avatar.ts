import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { personas } from "../db/schema";
import { auth } from "../auth";
import { env } from "cloudflare:workers";

type CloudflareEnv = { AVATARS_BUCKET: R2Bucket };

function r2Key(url: string): string | null {
  const base = process.env.R2_PUBLIC_URL;
  if (!base || !url.startsWith(base)) return null;
  return url.slice(base.length + 1); // strip leading "/"
}

async function deleteFromR2(url: string | null) {
  if (!url) return;
  const key = r2Key(url);
  if (!key) return;
  const bucket = (env as unknown as CloudflareEnv).AVATARS_BUCKET;
  await bucket.delete(key);
}

export const uploadAvatar = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      personaId: z.uuid(),
      dataUrl: z
        .string()
        .max(300_000)
        .refine((v) => v.startsWith("data:image/"), "画像データが不正です"),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const [persona] = await db
      .select({ id: personas.id, avatarUrl: personas.avatarUrl })
      .from(personas)
      .where(
        and(
          eq(personas.id, data.personaId),
          eq(personas.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!persona) throw new Error("Forbidden");

    await deleteFromR2(persona.avatarUrl);

    const [header, base64] = data.dataUrl.split(",");
    const contentType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const key = `avatars/${data.personaId}/${crypto.randomUUID()}.jpg`;
    const bucket = (env as unknown as CloudflareEnv).AVATARS_BUCKET;
    await bucket.put(key, bytes, { httpMetadata: { contentType } });

    const avatarUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    await db
      .update(personas)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(personas.id, data.personaId));

    return { avatarUrl };
  });

export const deleteAvatar = createServerFn({ method: "POST" })
  .inputValidator(z.object({ personaId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const [persona] = await db
      .select({ id: personas.id, avatarUrl: personas.avatarUrl })
      .from(personas)
      .where(
        and(
          eq(personas.id, data.personaId),
          eq(personas.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!persona) throw new Error("Forbidden");

    await deleteFromR2(persona.avatarUrl);

    await db
      .update(personas)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(personas.id, data.personaId));
  });
