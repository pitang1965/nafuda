import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type CloudflareEnv = { DB: D1Database };

// D1はPostgresの接続文字列と違い、Workersのbindingとしてのみアクセスできる
// (process.envには載らない)。src/server/storage.tsのR2バインディングと同じパターンで、
// envはモジュール読み込み時ではなくリクエスト処理中に呼ばれる関数の中でのみ参照する。
export function getDb() {
  return drizzle((env as unknown as CloudflareEnv).DB, { schema });
}
