import { pgTable, text, boolean, timestamp, uuid, jsonb, smallint, point } from 'drizzle-orm/pg-core'

// --- Better Auth required tables ---
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})

// URL-ID table: immutable alphanumeric account identifier
export const urlIds = pgTable('url_ids', {
  urlId: text('url_id').primaryKey(),           // alphanumeric only, UNIQUE constraint enforced by PK
  userId: text('user_id').notNull().unique(),   // FK to Better Auth user.id (text type)
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Personas table: each user can have multiple personas
export const personas = pgTable('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),              // FK to Better Auth user.id
  displayName: text('display_name').notNull(),
  shareToken: text('share_token').notNull().unique(), // crypto.randomBytes(16).toString('hex')
  isDefault: boolean('is_default').notNull().default(false),
  avatarUrl: text('avatar_url'),                  // null = use initials avatar
  bio: text('bio'),                               // null = no bio set (max 200 chars enforced at app layer)
  oshiTags: text('oshi_tags').array().notNull().default([]),
  dojinReject: boolean('dojin_reject').notNull().default(false),
  // fieldVisibility: { sns_links: 'public'|'private', oshi_tags: 'public'|'private', avatar_url: 'public'|'private' }
  // Default {} = all public (QRを渡す行為自体が公開の意思表示)
  fieldVisibility: jsonb('field_visibility').notNull().default({}),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// SNS links table: multiple links per persona with ordering
export const snsLinks = pgTable('sns_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  personaId: uuid('persona_id').notNull(),         // FK to personas.id
  // platform values: 'x' | 'instagram' | 'tiktok' | 'youtube' | 'discord' | 'line_openchat' | 'github' | 'spotify' | 'other'
  platform: text('platform').notNull(),
  url: text('url').notNull(),
  displayOrder: smallint('display_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Events table: self-created by first check-in (no admin management)
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),         // URL-safe identifier 例: "animejapan-20260405"
  name: text('name').notNull(),                  // イベント名（表示用）
  venueName: text('venue_name').notNull(),        // 会場名
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Event check-ins table: one per persona per event (active = checkedOutAt IS NULL)
export const eventCheckins = pgTable('event_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id),
  personaId: uuid('persona_id').notNull().references(() => personas.id),
  userId: text('user_id').notNull(),             // Better Auth user.id（認証チェック用）
  // GPS: point mode 'xy' → { x: longitude, y: latitude }。ユーザーが拒否した場合 null
  gpsCoordinates: point('gps_coordinates', { mode: 'xy' }),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }).defaultNow().notNull(),
  checkedOutAt: timestamp('checked_out_at', { withTimezone: true }),  // NULL = チェックイン中
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
