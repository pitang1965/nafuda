import {
  sqliteTable,
  text,
  integer,
  unique,
} from "drizzle-orm/sqlite-core";

// --- Better Auth required tables ---
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// URL-ID table: immutable alphanumeric account identifier
export const urlIds = sqliteTable("url_ids", {
  urlId: text("url_id").primaryKey(), // alphanumeric only, UNIQUE constraint enforced by PK
  userId: text("user_id").notNull().unique(), // FK to Better Auth user.id (text type)
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Personas table: each user can have multiple personas
export const personas = sqliteTable("personas", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // FK to Better Auth user.id
  displayName: text("display_name").notNull(),
  shareToken: text("share_token").notNull().unique(), // crypto.randomBytes(16).toString('hex')
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  avatarUrl: text("avatar_url"), // null = use initials avatar
  bio: text("bio"), // null = no bio set (max 200 chars enforced at app layer)
  label: text("label"), // 自分だけが見る識別名(最大20文字)、公開プロフィールには出ない
  // 用途タイプ: アプリが見せ方/編集体験を切り替える機械可読な分類。値は src/lib/purpose.ts のレジストリで管理。
  // null = 用途タイプ導入前の既存なふだ(従来表示で互換維持)。新規作成は常に non-null(最低 'other')。
  purpose: text("purpose"),
  oshiTags: text("oshi_tags", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  dojinReject: integer("dojin_reject", { mode: "boolean" })
    .notNull()
    .default(false),
  // fieldVisibility: { sns_links: 'public'|'private', oshi_tags: 'public'|'private', avatar_url: 'public'|'private' }
  // Default {} = all public (QRを渡す行為自体が公開の意思表示)
  fieldVisibility: text("field_visibility", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  styleId: text("style_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// SNS links table: multiple links per persona with ordering
export const snsLinks = sqliteTable("sns_links", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  personaId: text("persona_id").notNull(), // FK to personas.id
  // platform values: 'x' | 'instagram' | 'tiktok' | 'youtube' | 'discord' | 'line_openchat' | 'github' | 'spotify' | 'facebook' | 'other'
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Nafuda links table: 自分が持つ別のなふだへの内部参照リンク(ADR-0015)。
// 外部サービスを指す sns_links とは別概念。リンク先は URL ではなく targetPersonaId で参照し、
// 表示名・アバターは参照先 personas から動的取得する。他人のなふだは指せない(サーバー側で所有検証)。
// personaId・targetPersonaId 双方に onDelete: cascade を張り、どちらのなふだが消えても幽霊リンクを残さない。
export const nafudaLinks = sqliteTable(
  "nafuda_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    personaId: text("persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }), // リンク元
    targetPersonaId: text("target_persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }), // リンク先
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    // 同じリンク先を二重に貼らせない
    unique().on(table.personaId, table.targetPersonaId),
  ],
);

// Favorite personas table: 他者の公開なふだを自分の手元に保存する私的ブックマーク(ADR-0021)。
// 片側・相手に不可視・ユーザー所有のライブ参照。コネクション(対面QR交換の対称な記録)とは別系統。
// 所有者は個別ペルソナではなく userId(私的リストは自分のなふだ削除に巻き込まれない)。
// targetPersonaId に onDelete: cascade を張り、相手がそのなふだを削除/退会したら自動で消える。
// 自分の退会時の userId 起点の削除は deleteAccount で明示(userId は FK ではないため)。
export const favoritePersonas = sqliteTable(
  "favorite_personas",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(), // 所有者(保存した人)= Better Auth user.id
    targetPersonaId: text("target_persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }), // お気に入りした相手のなふだ
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    // 同じなふだを二重に保存させない(冪等保存の土台)
    unique().on(table.userId, table.targetPersonaId),
  ],
);

// Gallery photos table: アバター以外の「対象物」写真を最大6枚並べる独立コンテンツ(ADR-0014)。
// なふだスタイル(コード管理の装飾)とは別レイヤーのユーザーアップロードコンテンツ。
export const galleryPhotos = sqliteTable("gallery_photos", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  personaId: text("persona_id")
    .notNull()
    .references(() => personas.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(), // R2 公開URL(キー: gallery/{personaId}/{uuid}.jpg)
  caption: text("caption"), // null = キャプションなし(最大30文字をアプリ層で強制)
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Events table: self-created by first check-in (no admin management)
export const events = sqliteTable("events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(), // 重複検出用内部識別子 例: "animejapan-20260405"
  shareToken: text("share_token").notNull().unique(), // 公開URL用ランダムトークン(推測不可)
  name: text("name").notNull(),
  venueName: text("venue_name"), // 即時イベントは null 可
  // 開催期間の開始([開始, 終了] の開始点)。即時イベントは作成時刻。
  eventDate: integer("event_date", { mode: "timestamp" }).notNull(),
  // 開催期間の終了。null = 終了未指定(受付窓は開始日の終わりまでにフォールバック)。
  // 即時イベントは常に null。チェックイン受付窓・終了による自動失効に使う(ADR-0020)。
  eventEndDate: integer("event_end_date", { mode: "timestamp" }),
  showTime: integer("show_time", { mode: "boolean" }).notNull().default(false),
  description: text("description"),
  isInstant: integer("is_instant", { mode: "boolean" }).notNull().default(false),
  // GPS: { x: longitude, y: latitude }。即時イベント作成時に自動取得。JSON列(Postgresのpoint型からの移行)。
  gpsCoordinates: text("gps_coordinates", { mode: "json" }).$type<{
    x: number;
    y: number;
  }>(),
  hostUserId: text("host_user_id"),
  hostPersonaId: text("host_persona_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Event check-ins table: one per persona per event (active = checkedOutAt IS NULL)
export const eventCheckins = sqliteTable("event_checkins", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  personaId: text("persona_id")
    .notNull()
    .references(() => personas.id),
  userId: text("user_id").notNull(), // Better Auth user.id(認証チェック用)
  // GPS: { x: longitude, y: latitude }。即時イベント作成時のみ記録(拒否時 null)。通常イベントでは常に null
  gpsCoordinates: text("gps_coordinates", { mode: "json" }).$type<{
    x: number;
    y: number;
  }>(),
  checkedInAt: integer("checked_in_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  checkedOutAt: integer("checked_out_at", { mode: "timestamp" }), // NULL = チェックイン中
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Connection QR tokens: short-lived (15 min) tokens for "なふだを交換する" flow
export const connectionQrTokens = sqliteTable("connection_qr_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  fromPersonaId: text("from_persona_id")
    .notNull()
    .references(() => personas.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Connections table: bidirectional records — A→B and B→A are created simultaneously
export const connections = sqliteTable(
  "connections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // fromPersonaId: コネクションを記録した側(「つながる」を押した人のペルソナ)
    fromPersonaId: text("from_persona_id")
      .notNull()
      .references(() => personas.id),
    // toPersonaId: QRを見せた側(つながられた人のペルソナ)
    toPersonaId: text("to_persona_id")
      .notNull()
      .references(() => personas.id),
    fromUserId: text("from_user_id").notNull(), // Better Auth user.id(認証チェック用)
    // イベントコンテキスト(チェックイン中でない場合は null)
    eventId: text("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    eventName: text("event_name"), // 非正規化: JOIN不要で表示できるよう保存
    venueName: text("venue_name"), // 非正規化
    eventDate: integer("event_date", { mode: "timestamp" }),
    privateMemo: text("private_memo"), // 自分だけが見る相手へのメモ
    connectedAt: integer("connected_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    // 同一ペルソナペアのコネクション重複防止(一方通行なのでfrom/to両方でユニーク)
    unique().on(table.fromPersonaId, table.toPersonaId),
  ],
);

// Pending invites: アカウント未所持の相手がつながりQRをスキャンした時点で作成される
// 後追い接続用レコード(48時間有効)。15分のQRトークン期限切れ後も接続を完成できる。
// 出会い自体は対面のQRスキャンであり、オンライン接続ではない(→ ADR-0007 §3 / ADR-0013)。
export const pendingInvites = sqliteTable("pending_invites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // ブラウザの localStorage に保存し、登録完了後にこのトークンで招待を引いて接続を完成させる
  inviteToken: text("invite_token").notNull().unique(),
  // 発行者(A)= QRを見せた側のペルソナ
  issuerPersonaId: text("issuer_persona_id")
    .notNull()
    .references(() => personas.id, { onDelete: "cascade" }),
  // 出会いの文脈スナップショット: 招待作成時の発行者アクティブチェックインから取得(ADR-0012)。
  // 接続が時間差で成立しても「実際に会った場所」を保持するため、適用時に取り直さず固定する。
  eventId: text("event_id").references(() => events.id, {
    onDelete: "set null",
  }),
  eventName: text("event_name"),
  venueName: text("venue_name"),
  eventDate: integer("event_date", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});
