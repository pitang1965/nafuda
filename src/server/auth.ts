import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from './db/client'
import * as schema from './db/schema'

const requiredEnvVars = [
  'BETTER_AUTH_URL',
  'BETTER_AUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET',
] as const

const missing = requiredEnvVars.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error(`[FATAL] Missing environment variables: ${missing.join(', ')}`)
  throw new Error(`Missing environment variables: ${missing.join(', ')}`)
}

export const auth = betterAuth({
  // CRITICAL: prevents redirect_uri_mismatch in OAuth flows
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: 'offline',        // ensures refresh token is issued
      prompt: 'select_account',     // forces account picker every time
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      // email + public_profile are default scopes — sufficient for Phase 1
    },
  },
  session: {
    storeSessionInDatabase: true,
    // CRITICAL: Do NOT enable cookieCache — Better Auth bug #4203 causes session loss
    // on Cloudflare Workers when cookieCache + secondaryStorage are both enabled.
    // Using storeSessionInDatabase only is the safe pattern.
    expiresIn: 60 * 60 * 24 * 30,   // 30 days (iOS ITP mitigation — users open app ~monthly)
    updateAge: 60 * 60 * 24,          // Refresh session token after 1 day of activity
  },
  plugins: [
    tanstackStartCookies(), // MUST be last plugin — TanStack Start cookie handling
  ],
})
