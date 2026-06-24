import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client";
import { favoritePersonas, personas, urlIds } from "../db/schema";
import { auth } from "../auth";

// お気に入りに追加する（ADR-0021）。公開ページの静的CTAから _protected へ遷移して呼ぶ。
// 相手の shareToken で対象なふだを解決し、自分のなふだは保存させない。
// unique(userId, targetPersonaId) で二重保存を冪等に処理する（既存なら "already" を返す）。
export const addFavorite = createServerFn({ method: "POST" })
  .inputValidator(z.object({ shareToken: z.string().min(1) }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const [target] = await db
      .select({
        id: personas.id,
        userId: personas.userId,
        displayName: personas.displayName,
        urlId: urlIds.urlId,
      })
      .from(personas)
      .innerJoin(urlIds, eq(personas.userId, urlIds.userId))
      .where(eq(personas.shareToken, data.shareToken))
      .limit(1);
    if (!target) return { status: "notfound" as const };

    // 自分のなふだは保存できない（マイなふだ・なふだリンクで到達できるため）
    if (target.userId === session.user.id) {
      return { status: "self" as const, displayName: target.displayName };
    }

    // 既に保存済みかを先に確認して "saved" / "already" を出し分ける
    const [existing] = await db
      .select({ id: favoritePersonas.id })
      .from(favoritePersonas)
      .where(
        and(
          eq(favoritePersonas.userId, session.user.id),
          eq(favoritePersonas.targetPersonaId, target.id),
        ),
      )
      .limit(1);

    if (!existing) {
      await db
        .insert(favoritePersonas)
        .values({ userId: session.user.id, targetPersonaId: target.id })
        .onConflictDoNothing();
    }

    return {
      status: existing ? ("already" as const) : ("saved" as const),
      displayName: target.displayName,
      targetPersonaId: target.id,
      urlId: target.urlId,
      shareToken: data.shareToken,
    };
  });

// お気に入りから外す（自分の行のみ）。一覧・保存直後の確認画面の双方から呼ぶ。
export const removeFavorite = createServerFn({ method: "POST" })
  .inputValidator(z.object({ targetPersonaId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    await db
      .delete(favoritePersonas)
      .where(
        and(
          eq(favoritePersonas.userId, session.user.id),
          eq(favoritePersonas.targetPersonaId, data.targetPersonaId),
        ),
      );
  });

// 自分のお気に入り一覧（新着順）。表示名・アバターは参照先 personas から動的取得する
// ライブ参照（スナップショットではない）。ラベルは他者には見えないので返さない。
export const getMyFavorites = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    return db
      .select({
        targetPersonaId: favoritePersonas.targetPersonaId,
        createdAt: favoritePersonas.createdAt,
        displayName: personas.displayName,
        avatarUrl: personas.avatarUrl,
        bio: personas.bio,
        urlId: urlIds.urlId,
        shareToken: personas.shareToken,
      })
      .from(favoritePersonas)
      .innerJoin(personas, eq(favoritePersonas.targetPersonaId, personas.id))
      .innerJoin(urlIds, eq(personas.userId, urlIds.userId))
      .where(eq(favoritePersonas.userId, session.user.id))
      .orderBy(desc(favoritePersonas.createdAt));
  },
);
