import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.production' })

export default defineConfig({
  out: './drizzle',
  schema: './src/server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
