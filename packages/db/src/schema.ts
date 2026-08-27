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
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
    // 非推奨・未使用: 単一の申込確認メールのみを想定していた旧カラム。
    // email_templatesテーブル（申込確認・事前準備案内・前日リマインド等、
    // セミナーごとに複数のメールを配信タイミング付きで設定できる仕組み）に
    // 置き換えた。既存データが無い前提のため、CHECK制約を伴うテーブル再作成の
    // リスクを避けてカラム自体は残し、コード側で参照しない扱いにしている。
    confirmationEmailJson: text("confirmation_email_json"),
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

// products（旧Idea。トップページ#ideaセクションの事業アイデア一覧）------------------
//
// 表示ラベルは「Idea」から「Product」に変更したが、既存の #idea というid・CSSクラス
// （idea/idea-list/idea-item等）はレガシー静的サイトと共有しているstyle.cssの
// セレクタと一致させる必要があるため変更しない（表示テキストのみの改名）。
// まだ詳細ページを持たないため、トップページのカード表示に必要な項目のみを持つ。
export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("published"),
    sortOrder: integer("sort_order").notNull().default(0), // トップページでの表示順（昇順）
    title: text("title").notNull(), // 例: "Meet"
    subTitle: text("sub_title"), // カード上部の一言キャッチコピー
    description: text("description").notNull(),
    // imageUrl: 既存の静的パス("/image/xxx.png")等をそのまま指定する場合に使う。
    // imageKey: /v1/media 経由でR2にアップロードした画像のキー。設定されていれば
    // imageUrlより優先し、mediaUrl(imageKey)（"/media/<key>"）を表示に使う
    // （news.ogImageKey/seminars.heroImageKeyと同じ仕組み。実装計画4章）。
    imageUrl: text("image_url"),
    imageKey: text("image_key"),
    href: text("href"), // NULL（または"#"）は「準備中です」のプレースホルダー扱い
    linkTitle: text("link_title"), // アンカーのtitle属性。未指定時はhrefの有無から既定値を導出する
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    statusSortIdx: index("idx_products_status_sort").on(table.status, table.sortOrder),
    statusCheck: check("products_status_check", sql`${table.status} IN ('draft', 'published')`),
  }),
);

// services（トップページ#serviceセクションの提供サービス一覧。productsと同じ理由でDB管理化）--
export const services = sqliteTable(
  "services",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("published"),
    sortOrder: integer("sort_order").notNull().default(0),
    title: text("title").notNull(),
    description: text("description").notNull(),
    // imageUrl/imageKeyの使い分けはproductsと同じ（imageKey優先、無ければimageUrl）。
    imageUrl: text("image_url"),
    imageKey: text("image_key"),
    href: text("href"),
    linkTitle: text("link_title"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    statusSortIdx: index("idx_services_status_sort").on(table.status, table.sortOrder),
    statusCheck: check("services_status_check", sql`${table.status} IN ('draft', 'published')`),
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
    // 非推奨・未使用: 単一の確認メール送信結果のみを想定していた旧カラム。
    // 複数メール対応のapplication_email_sendsテーブルに置き換えた（confirmationEmailJsonと同じ理由でカラム自体は残す）。
    confirmationEmailStatus: text("confirmation_email_status", { enum: ["sent", "failed"] }),
    confirmationEmailError: text("confirmation_email_error"),
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
    // confirmation_email_status には意図的にCHECK制約を付けない。既存テーブルへの
    // 追加時にSQLiteの制約上テーブル再作成(rebuild)を要求され、それが本番D1で
    // 原因不明のCHECK違反エラーを起こしたため。値の妥当性はAPI層(zod)でのみ担保する。
  }),
);

// email_templates（セミナーごとに複数設定できるメール。申込確認・事前準備案内・
// 前日リマインド等。トリガー種別はpackages/shared の EmailTrigger 型を参照）--------

export const emailTemplates = sqliteTable(
  "email_templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seminarId: integer("seminar_id")
      .notNull()
      .references(() => seminars.id),
    seminarSlug: text("seminar_slug").notNull(), // 冗長だが一覧・検索の簡略化のため保持
    key: text("key").notNull(), // セミナー内で一意な識別子（例: 'confirmation', 'reminder_3d'）
    label: text("label").notNull(), // 管理用の表示名（例: "前日リマインド"）
    enabled: integer("enabled").notNull().default(1),
    triggerType: text("trigger_type", { enum: ["on_submit", "relative_to_event", "absolute"] }).notNull(),
    triggerOffsetDays: integer("trigger_offset_days"), // relative_to_eventのみ使用（負=開催前、正=開催後）
    triggerTimeJst: text("trigger_time_jst"), // relative_to_eventのみ使用。"HH:MM"(JST)
    triggerAt: text("trigger_at"), // absoluteのみ使用。ISO datetime(UTC)
    fromName: text("from_name").notNull(),
    fromEmail: text("from_email").notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    bodyHtml: text("body_html"),
    cc: text("cc"), // string[]のJSON。未設定はnull（lib/email-recipients.tsで符号化/復号）
    bcc: text("bcc"), // string[]のJSON。未設定はnull
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    seminarKeyUnique: uniqueIndex("email_templates_seminar_key_unique").on(table.seminarId, table.key),
    seminarIdx: index("idx_email_templates_seminar").on(table.seminarSlug),
    triggerTypeCheck: check(
      "email_templates_trigger_type_check",
      sql`${table.triggerType} IN ('on_submit', 'relative_to_event', 'absolute')`,
    ),
  }),
);

// application_email_sends（申込者ごと・テンプレートごとの送信履歴。cronスイープでの
// 二重送信防止に使う。UNIQUE制約自体が最終防衛線）--------------------------------

export const applicationEmailSends = sqliteTable(
  "application_email_sends",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id),
    emailTemplateId: integer("email_template_id")
      .notNull()
      .references(() => emailTemplates.id),
    status: text("status", { enum: ["sent", "failed"] }).notNull(),
    error: text("error"),
    sentAt: text("sent_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    applicationTemplateUnique: uniqueIndex("application_email_sends_unique").on(
      table.applicationId,
      table.emailTemplateId,
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
      enum: ["news_og", "seminar_hero", "seminar_card", "seminar_speaker", "product_image", "service_image", "other"],
    }),
    ownerType: text("owner_type", { enum: ["news", "seminar", "product", "service"] }),
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

// contacts（お問い合わせフォーム。Googleフォームを廃止しD1へ直接保存する。
// セミナー申込と異なりフォーム項目はセミナーごとに変わらない固定形式のため、
// apply_form_jsonのような可変スキーマは持たず、通常のカラムで表現する）--------

export const contacts = sqliteTable(
  "contacts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    affiliation: text("affiliation").notNull(), // ご所属
    inquiryType: text("inquiry_type").notNull(), // お問い合わせ種別（contact.tsxの選択肢と対応。UI側の文言変更に追従しやすいようCHECK制約は付けない）
    message: text("message").notNull(), // ご相談内容
    privacyConsent: integer("privacy_consent").notNull(), // プライバシーポリシー同意（常に1。監査目的で保持）
    status: text("status", { enum: ["received", "replied", "closed"] })
      .notNull()
      .default("received"),
    // 通知メール(運用者宛)・確認メール(問い合わせ者宛)の送信結果。文面自体は
    // contact_email_templatesで管理する（下記）。
    notificationEmailStatus: text("notification_email_status", { enum: ["sent", "failed"] }),
    notificationEmailError: text("notification_email_error"),
    confirmationEmailStatus: text("confirmation_email_status", { enum: ["sent", "failed"] }),
    confirmationEmailError: text("confirmation_email_error"),
    submittedAt: text("submitted_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    submittedIdx: index("idx_contacts_submitted").on(table.submittedAt),
    statusCheck: check("contacts_status_check", sql`${table.status} IN ('received', 'replied', 'closed')`),
  }),
);

// contact_email_templates（お問い合わせの通知・自動返信メールの文面設定）--------
//
// seminarsのemail_templatesと同じ「メールの内容自体もAPIで設定管理できるように
// したい」という要望に応えるコンポーネントだが、Contactはセミナーのように複数
// 種類・配信タイミング（開催日基準等）を持たない固定2種類（運用者への通知
// notification・問い合わせ者への自動返信confirmation）の即時送信のみのため、
// seminarIdやtrigger系カラムを持たない、より単純な専用テーブルにしている
// （emailTemplatesにseminarId:NULL許容の形で相乗りさせる案もあったが、
// 既存の populated テーブルのNOT NULL制約変更は本番マイグレーションのリスクが
// 高いため避けた。schemas.tsのemailContentBaseSchemaはこの2テーブルで共通利用）。
export const contactEmailTemplates = sqliteTable(
  "contact_email_templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key", { enum: ["notification", "confirmation"] }).notNull().unique(),
    label: text("label").notNull(),
    enabled: integer("enabled").notNull().default(1),
    fromName: text("from_name").notNull(),
    fromEmail: text("from_email").notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    bodyHtml: text("body_html"),
    cc: text("cc"), // string[]のJSON。未設定はnull（lib/email-recipients.tsで符号化/復号）
    bcc: text("bcc"), // string[]のJSON。未設定はnull
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyCheck: check("contact_email_templates_key_check", sql`${table.key} IN ('notification', 'confirmation')`),
  }),
);

// 型 ------------------------------------------------------------------------

export type NewsRow = typeof news.$inferSelect;
export type NewNewsRow = typeof news.$inferInsert;

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;

export type ServiceRow = typeof services.$inferSelect;
export type NewServiceRow = typeof services.$inferInsert;

export type SeminarRow = typeof seminars.$inferSelect;
export type NewSeminarRow = typeof seminars.$inferInsert;

export type ApplicationRow = typeof applications.$inferSelect;
export type NewApplicationRow = typeof applications.$inferInsert;

export type EmailTemplateRow = typeof emailTemplates.$inferSelect;
export type NewEmailTemplateRow = typeof emailTemplates.$inferInsert;

export type ApplicationEmailSendRow = typeof applicationEmailSends.$inferSelect;
export type NewApplicationEmailSendRow = typeof applicationEmailSends.$inferInsert;

export type MediaRow = typeof media.$inferSelect;
export type NewMediaRow = typeof media.$inferInsert;

export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type NewApiKeyRow = typeof apiKeys.$inferInsert;

export type ContactRow = typeof contacts.$inferSelect;
export type NewContactRow = typeof contacts.$inferInsert;

export type ContactEmailTemplateRow = typeof contactEmailTemplates.$inferSelect;
export type NewContactEmailTemplateRow = typeof contactEmailTemplates.$inferInsert;
