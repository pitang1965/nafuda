import {
  pgTable,
  text,
  boolean,
  timestamp,
  uuid,
  jsonb,
  smallint,
  point,
  unique,
} from "drizzle-orm/pg-core";

// --- Better Auth required tables ---
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// URL-ID table: immutable alphanumeric account identifier
export const urlIds = pgTable("url_ids", {
  urlId: text("url_id").primaryKey(), // alphanumeric only, UNIQUE constraint enforced by PK
  userId: text("user_id").notNull().unique(), // FK to Better Auth user.id (text type)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Personas table: each user can have multiple personas
export const personas = pgTable("personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // FK to Better Auth user.id
  displayName: text("display_name").notNull(),
  shareToken: text("share_token").notNull().unique(), // crypto.randomBytes(16).toString('hex')
  isDefault: boolean("is_default").notNull().default(false),
  avatarUrl: text("avatar_url"), // null = use initials avatar
  bio: text("bio"), // null = no bio set (max 200 chars enforced at app layer)
  label: text("label"), // 自分だけが見る識別名（最大20文字）、公開プロフィールには出ない
  // 用途タイプ: アプリが見せ方/編集体験を切り替える機械可読な分類。値は src/lib/purpose.ts のレジストリで管理。
  // null = 用途タイプ導入前の既存なふだ（従来表示で互換維持）。新規作成は常に non-null（最低 'other'）。
  purpose: text("purpose"),
  oshiTags: text("oshi_tags").array().notNull().default([]),
  dojinReject: boolean("dojin_reject").notNull().default(false),
  // fieldVisibility: { sns_links: 'public'|'private', oshi_tags: 'public'|'private', avatar_url: 'public'|'private' }
  // Default {} = all public (QRを渡す行為自体が公開の意思表示)
  fieldVisibility: jsonb("field_visibility")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  styleId: text("style_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SNS links table: multiple links per persona with ordering
export const snsLinks = pgTable("sns_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  personaId: uuid("persona_id").notNull(), // FK to personas.id
  // platform values: 'x' | 'instagram' | 'tiktok' | 'youtube' | 'discord' | 'line_openchat' | 'github' | 'spotify' | 'facebook' | 'other'
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  displayOrder: smallint("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Events table: self-created by first check-in (no admin management)
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(), // 重複検出用内部識別子 例: "animejapan-20260405"
  shareToken: text("share_token").notNull().unique(), // 公開URL用ランダムトークン（推測不可）
  name: text("name").notNull(),
  venueName: text("venue_name"), // 即時イベントは null 可
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  showTime: boolean("show_time").notNull().default(false),
  description: text("description"),
  isInstant: boolean("is_instant").notNull().default(false),
  // GPS: point mode 'xy' → { x: longitude, y: latitude }。即時イベント作成時に自動取得
  gpsCoordinates: point("gps_coordinates", { mode: "xy" }),
  hostUserId: text("host_user_id"),
  hostPersonaId: uuid("host_persona_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Event check-ins table: one per persona per event (active = checkedOutAt IS NULL)
export const eventCheckins = pgTable("event_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  personaId: uuid("persona_id")
    .notNull()
    .references(() => personas.id),
  userId: text("user_id").notNull(), // Better Auth user.id（認証チェック用）
  // GPS: point mode 'xy' → { x: longitude, y: latitude }。ユーザーが拒否した場合 null
  gpsCoordinates: point("gps_coordinates", { mode: "xy" }),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }), // NULL = チェックイン中
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Connection QR tokens: short-lived (15 min) tokens for "なふだを交換する" flow
export const connectionQrTokens = pgTable("connection_qr_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  fromPersonaId: uuid("from_persona_id")
    .notNull()
    .references(() => personas.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Connections table: bidirectional records — A→B and B→A are created simultaneously
export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // fromPersonaId: コネクションを記録した側（「つながる」を押した人のペルソナ）
    fromPersonaId: uuid("from_persona_id")
      .notNull()
      .references(() => personas.id),
    // toPersonaId: QRを見せた側（つながられた人のペルソナ）
    toPersonaId: uuid("to_persona_id")
      .notNull()
      .references(() => personas.id),
    fromUserId: text("from_user_id").notNull(), // Better Auth user.id（認証チェック用）
    // イベントコンテキスト（チェックイン中でない場合は null）
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    eventName: text("event_name"), // 非正規化: JOIN不要で表示できるよう保存
    venueName: text("venue_name"), // 非正規化
    eventDate: timestamp("event_date", { withTimezone: true }),
    privateMemo: text("private_memo"), // 自分だけが見る相手へのメモ
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // 同一ペルソナペアのコネクション重複防止（一方通行なのでfrom/to両方でユニーク）
    uniqueConn: unique().on(table.fromPersonaId, table.toPersonaId),
  }),
);
