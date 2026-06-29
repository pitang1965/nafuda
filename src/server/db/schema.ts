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

// Nafuda links table: 自分が持つ別のなふだへの内部参照リンク（ADR-0015）。
// 外部サービスを指す sns_links とは別概念。リンク先は URL ではなく targetPersonaId で参照し、
// 表示名・アバターは参照先 personas から動的取得する。他人のなふだは指せない（サーバー側で所有検証）。
// personaId・targetPersonaId 双方に onDelete: cascade を張り、どちらのなふだが消えても幽霊リンクを残さない。
export const nafudaLinks = pgTable(
  "nafuda_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personaId: uuid("persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }), // リンク元
    targetPersonaId: uuid("target_persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }), // リンク先
    displayOrder: smallint("display_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // 同じリンク先を二重に貼らせない
    unique().on(table.personaId, table.targetPersonaId),
  ],
);

// Favorite personas table: 他者の公開なふだを自分の手元に保存する私的ブックマーク（ADR-0021）。
// 片側・相手に不可視・ユーザー所有のライブ参照。コネクション（対面QR交換の対称な記録）とは別系統。
// 所有者は個別ペルソナではなく userId（私的リストは自分のなふだ削除に巻き込まれない）。
// targetPersonaId に onDelete: cascade を張り、相手がそのなふだを削除/退会したら自動で消える。
// 自分の退会時の userId 起点の削除は deleteAccount で明示（userId は FK ではないため）。
export const favoritePersonas = pgTable(
  "favorite_personas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(), // 所有者（保存した人）= Better Auth user.id
    targetPersonaId: uuid("target_persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }), // お気に入りした相手のなふだ
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // 同じなふだを二重に保存させない（冪等保存の土台）
    unique().on(table.userId, table.targetPersonaId),
  ],
);

// Gallery photos table: アバター以外の「対象物」写真を最大6枚並べる独立コンテンツ（ADR-0014）。
// なふだスタイル（コード管理の装飾）とは別レイヤーのユーザーアップロードコンテンツ。
export const galleryPhotos = pgTable("gallery_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  personaId: uuid("persona_id")
    .notNull()
    .references(() => personas.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(), // R2 公開URL（キー: gallery/{personaId}/{uuid}.jpg）
  caption: text("caption"), // null = キャプションなし（最大30文字をアプリ層で強制）
  displayOrder: smallint("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Events table: self-created by first check-in (no admin management)
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(), // 重複検出用内部識別子 例: "animejapan-20260405"
  shareToken: text("share_token").notNull().unique(), // 公開URL用ランダムトークン（推測不可）
  name: text("name").notNull(),
  venueName: text("venue_name"), // 即時イベントは null 可
  // 開催期間の開始（[開始, 終了] の開始点）。即時イベントは作成時刻。
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  // 開催期間の終了。null = 終了未指定（受付窓は開始日の終わりまでにフォールバック）。
  // 即時イベントは常に null。チェックイン受付窓・終了による自動失効に使う（ADR-0020）。
  eventEndDate: timestamp("event_end_date", { withTimezone: true }),
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
  (table) => [
    // 同一ペルソナペアのコネクション重複防止（一方通行なのでfrom/to両方でユニーク）
    unique().on(table.fromPersonaId, table.toPersonaId),
  ],
);

// Pending invites: アカウント未所持の相手がつながりQRをスキャンした時点で作成される
// 後追い接続用レコード（48時間有効）。15分のQRトークン期限切れ後も接続を完成できる。
// 出会い自体は対面のQRスキャンであり、オンライン接続ではない（→ ADR-0007 §3 / ADR-0013）。
export const pendingInvites = pgTable("pending_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  // ブラウザの localStorage に保存し、登録完了後にこのトークンで招待を引いて接続を完成させる
  inviteToken: text("invite_token").notNull().unique(),
  // 発行者（A）= QRを見せた側のペルソナ
  issuerPersonaId: uuid("issuer_persona_id")
    .notNull()
    .references(() => personas.id, { onDelete: "cascade" }),
  // 出会いの文脈スナップショット: 招待作成時の発行者アクティブチェックインから取得（ADR-0012）。
  // 接続が時間差で成立しても「実際に会った場所」を保持するため、適用時に取り直さず固定する。
  eventId: uuid("event_id").references(() => events.id, {
    onDelete: "set null",
  }),
  eventName: text("event_name"),
  venueName: text("venue_name"),
  eventDate: timestamp("event_date", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
