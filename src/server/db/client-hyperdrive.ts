import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Used for: production Cloudflare Workers when HYPERDRIVE binding is available
// Pass the hyperdrive binding's connectionString from the Worker context
export function createDb(hyperdrive: { connectionString: string }) {
  const pool = new Pool({ connectionString: hyperdrive.connectionString })
  return drizzle(pool, { schema })
}
