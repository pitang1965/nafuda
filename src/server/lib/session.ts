import { getRequest } from "@tanstack/react-start/server";
import { auth } from "../auth";

// ログイン必須の server fn の入口。未ログインなら Unauthorized を投げる
export async function requireUser() {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}
