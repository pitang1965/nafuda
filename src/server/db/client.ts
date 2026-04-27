import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[FATAL] Missing environment variable: DATABASE_URL')
  throw new Error('Missing environment variable: DATABASE_URL')
}

const sql = neon(DATABASE_URL)
export const db = drizzle(sql, { schema })
