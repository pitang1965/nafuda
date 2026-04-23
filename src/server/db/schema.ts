import { pgTable, text, boolean, timestamp, uuid, jsonb, smallint } from 'drizzle-orm/pg-core'

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
