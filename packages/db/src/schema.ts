// D1（bitcraft-cms）スキーマ定義の単一ソース。
//
// 正規化カラム(一覧・ソート・状態遷移・締切計算に使うもの) と、9セクション構成の
// セミナー詳細ページ本文のような「常にページ単位で読み書きされ横断検索が不要な
// 繰り返し構造」を持つJSON列、を使い分ける方針（実装計画 2章）。
//
// マイグレーションSQLは `pnpm --filter @bitcraft/db generate` で ./migrations に
// 生成し、適用は `wrangler d1 migrations apply bitcraft-cms --remote` で行う
// （Drizzle Kitでは適用しない。履歴管理をWranglerの d1_migrations テーブルに一本化するため）。
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// news ------------------------------------------------------------------

export const news = sqliteTable(
  "news",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("published"),
    date: text("date").notNull(), // ISO 'YYYY-MM-DD'。表示時に 'YYYY.MM.DD' へ変換する
    tag: text("tag").notNull(),
    title: text("title").notNull(),
    summary: text("summary"), // /news/ 一覧の要約文（トップページには出さない）
    metaDescription: text("meta_description").notNull(),
    metaKeywords: text("meta_keywords"),
    ogImageKey: text("og_image_key"), // R2オブジェクトキー
    bodyHtml: text("body_html").notNull(), // 自由形式HTML
    relatedSeminarSlug: text("related_seminar_slug"), // 任意。FK制約なしの緩い参照
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    statusDateIdx: index("idx_news_status_date").on(table.status, table.date),
    statusCheck: check("news_status_check", sql`${table.status} IN ('draft', 'published')`),
  }),
);

// seminars ----------------------------------------------------------------

export const seminars = sqliteTable(
  "seminars",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    // API経由の明示操作でのみ変化させる。「募集開始日による自動状態遷移」は
    // 過去に廃止された経緯があるため、event_date からの自動導出はしない
    // （実装計画 Context章参照）。
    status: text("status", {
      enum: ["draft", "before_registration", "open", "closed"],
    })
      .notNull()
      .default("draft"),
    detailPage: integer("detail_page").notNull().default(1), // 0=カードのみ（詳細ページ無しの過去実績）
    eventDate: text("event_date").notNull(), // ISO 'YYYY-MM-DD'
    eventDateDisplay: text("event_date_display"), // 和暦フリーテキスト表示用
    seminarType: text("seminar_type").notNull(),
    title: text("title").notNull(),
    catchLine: text("catch_line"),
    heroSub: text("hero_sub"),
    description: text("description").notNull(), // 一覧カードの説明文
    priceDisplay: text("price_display"),
    priceNote: text("price_note"),
    capacity: integer("capacity"),
    seatsLeft: integer("seats_left"), // NULL = 非表示
    heroImageKey: text("hero_image_key"), // R2キー
    cardImageKey: text("card_image_key"), // R2キー（一覧カード/OGP兼用）
    venueSummary: text("venue_summary"),
    sectionsJson: text("sections_json").notNull(), // SeminarSections型(packages/shared)のJSON
    // 申込フォーム定義(SeminarApplyForm型)。Googleフォームは廃止し、CMS API経由で
    // D1(applicationsテーブル)へ直接保存する自前実装に置き換えた（実装計画4章）。
    // セミナーごとに入力項目を自由に設定できる(PATCH /v1/seminars/:slug/apply-form)。
    applyFormJson: text("apply_form_json"),
    metaDescription: text("meta_description").notNull(),
    metaKeywords: text("meta_keywords"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    eventDateIdx: index("idx_seminars_event_date").on(table.eventDate),
    statusIdx: index("idx_seminars_status").on(table.status),
    statusCheck: check(
      "seminars_status_check",
      sql`${table.status} IN ('draft', 'before_registration', 'open', 'closed')`,
    ),
    detailPageCheck: check("seminars_detail_page_check", sql`${table.detailPage} IN (0, 1)`),
  }),
);

// applications（セミナー申込。Googleフォームを廃止しD1へ直接保存する）------------

export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seminarId: integer("seminar_id")
      .notNull()
      .references(() => seminars.id),
    seminarSlug: text("seminar_slug").notNull(), // 冗長だが一覧・検索の簡略化のため保持
    answersJson: text("answers_json").notNull(), // ApplicationAnswers型(packages/shared)のJSON
    applicantName: text("applicant_name"), // 一覧表示・通知用に頻出項目を正規化（任意）
    applicantEmail: text("applicant_email"),
    status: text("status", { enum: ["received", "confirmed", "cancelled"] })
      .notNull()
      .default("received"),
    submittedAt: text("submitted_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    seminarSubmittedIdx: index("idx_applications_seminar_submitted").on(
      table.seminarSlug,
      table.submittedAt,
    ),
    statusCheck: check(
      "applications_status_check",
      sql`${table.status} IN ('received', 'confirmed', 'cancelled')`,
    ),
  }),
);

// media（R2アップロードのレジストリ）----------------------------------------

export const media = sqliteTable(
  "media",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    r2Key: text("r2_key").notNull().unique(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes"),
    purpose: text("purpose", {
      enum: ["news_og", "seminar_hero", "seminar_card", "seminar_speaker", "other"],
    }),
    ownerType: text("owner_type", { enum: ["news", "seminar"] }),
    ownerSlug: text("owner_slug"),
    uploadedAt: text("uploaded_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerIdx: index("idx_media_owner").on(table.ownerType, table.ownerSlug),
  }),
);

// api_keys（CMS API / MCPサーバー共通の認証、詳細は実装計画4章）------------------

export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(), // 'claude-mcp-client' 'ops-cli' 等、呼び出し元の識別用
  tokenHash: text("token_hash").notNull().unique(), // SHA-256(トークン)。生トークンは保存しない
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text("last_used_at"),
  revokedAt: text("revoked_at"),
});

// 型 ------------------------------------------------------------------------

export type NewsRow = typeof news.$inferSelect;
export type NewNewsRow = typeof news.$inferInsert;

export type SeminarRow = typeof seminars.$inferSelect;
export type NewSeminarRow = typeof seminars.$inferInsert;

export type ApplicationRow = typeof applications.$inferSelect;
export type NewApplicationRow = typeof applications.$inferInsert;

export type MediaRow = typeof media.$inferSelect;
export type NewMediaRow = typeof media.$inferInsert;

export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type NewApiKeyRow = typeof apiKeys.$inferInsert;
