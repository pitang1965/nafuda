import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { personas } from "../db/schema";
import { auth } from "../auth";
import { signTicket } from "../lib/ticket";

// クライアントが realtime コンパニオン Worker へ WebSocket 接続する直前に呼ぶ。
// セッションを持つ本体がペルソナ所有権を確認した上で、短命の署名チケットを発行する。
// コンパニオン Worker はこのチケットの署名だけで本人性を確定する（DB に触れない）。
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

    const ticket = await signTicket(data.personaId, secret);
    return { ticket };
  });
