import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

// db:generate はスキーマからSQLマイグレーションを生成するだけで実DB接続を必要としない。
// dbCredentials は db:studio(GUIでDBの中身を見る)でのみ使われる。
// 実際のマイグレーション適用は drizzle-kit ではなく `wrangler d1 migrations apply` で行う
// (D1はwranglerのbinding経由でしかアクセスできないため)。
export default defineConfig({
  out: './drizzle',
  schema: './src/server/db/schema.ts',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
})
