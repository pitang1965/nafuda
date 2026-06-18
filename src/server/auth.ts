import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { genericOAuth, line } from 'better-auth/plugins/generic-oauth'
import { db } from './db/client'
import * as schema from './db/schema'

const requiredEnvVars = [
  'BETTER_AUTH_URL',
  'BETTER_AUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET',
  'LINE_CLIENT_ID',
  'LINE_CLIENT_SECRET',
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
  accountLinking: {
    enabled: true,
    // LINE のメールは LINE 側で確認済みのものを id_token で受け取るため信頼する
    trustedProviders: ["google", "facebook", "line"],
  },
  session: {
    storeSessionInDatabase: true,
    // cookieCache: avoid DB round-trip on every protected route — validated from the signed
    // cookie itself. Bug #4203 (cookieCache + secondaryStorage) is not applicable here
    // because secondaryStorage is not configured.
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
    expiresIn: 60 * 60 * 24 * 30,   // 30 days (iOS ITP mitigation — users open app ~monthly)
    updateAge: 60 * 60 * 24,          // Refresh session token after 1 day of activity
  },
  plugins: [
    genericOAuth({
      config: [
        // LINE Login（OIDC）。メールは id_token から取得するため email permission の取得が前提。
        // コールバック: {BETTER_AUTH_URL}/api/auth/oauth2/callback/line
        line({
          providerId: "line",
          clientId: process.env.LINE_CLIENT_ID!,
          clientSecret: process.env.LINE_CLIENT_SECRET!,
          pkce: true,
        }),
      ],
    }),
  ],
})
