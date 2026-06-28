import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { personas, events } from "../db/schema";
import { auth } from "../auth";
import { signTicket } from "../lib/ticket";

// クライアントが realtime コンパニオン Worker へ WebSocket 接続する直前に呼ぶ。
// セッションを持つ本体がペルソナ所有権を確認した上で、persona room の短命署名チケットを発行する。
// コンパニオン Worker はこのチケットの署名だけで接続権を確定する（DB に触れない）。
export const issueRealtimeTicket = createServerFn({ method: "POST" })
  .inputValidator(z.object({ personaId: z.uuid() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new Error("Unauthorized");

    const secret = process.env.REALTIME_SECRET;
    if (!secret) return { ticket: null as string | null }; // realtime 無効環境（本番）→ null

    const [personaRow] = await db
      .select({ userId: personas.userId })
      .from(personas)
      .where(eq(personas.id, data.personaId))
      .limit(1);
    if (personaRow?.userId !== session.user.id)
      throw new Error("権限がありません");

    const ticket = await signTicket(`persona:${data.personaId}`, secret);
    return { ticket };
  });

// イベント参加者一覧（presence）の EventRoom へ接続するためのチケットを発行する。
// イベントページは shareToken を知っていれば誰でも閲覧できる（ログイン不要）ので、
// 認証は要求せず「有効な shareToken を持つこと」を接続権とする（capability ベース）。
export const issueEventRoomTicket = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const secret = process.env.REALTIME_SECRET;
    if (!secret) return { ticket: null as string | null }; // realtime 無効環境（本番）→ null

    const [eventRow] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.shareToken, data.token))
      .limit(1);
    if (!eventRow) return { ticket: null as string | null };

    const ticket = await signTicket(`event:${eventRow.id}`, secret);
    return { ticket };
  });
