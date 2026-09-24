import { drizzle } from 'drizzle-orm/neon-http'
import { neon, neonConfig } from '@neondatabase/serverless'
import * as schema from './schema'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[FATAL] Missing environment variable: DATABASE_URL')
  throw new Error('Missing environment variable: DATABASE_URL')
}

// idleなconnectionがreapされた直後、クエリpayloadが32-42KB帯だと
// pipelineConnect="password"(デフォルト)の認証+クエリ合体リクエストが
// 応答なしにハングするバグがある(neondatabase/serverless#209)。
// アクセス頻度が低くconnectionが頻繁にreapされるなふだでは高頻度で踏むため無効化する。
neonConfig.pipelineConnect = false

const sql = neon(DATABASE_URL)
export const db = drizzle(sql, { schema })
