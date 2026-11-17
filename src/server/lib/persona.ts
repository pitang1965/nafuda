import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { personas } from "../db/schema";

// 指定なふだが本人のものか検証する。所有していなければ null を返す（エラー文言は呼び出し側で選ぶ）
export async function assertOwnedPersona(personaId: string, userId: string) {
  const [persona] = await getDb()
    .select({ id: personas.id })
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, userId)))
    .limit(1);
  return persona ?? null;
}
