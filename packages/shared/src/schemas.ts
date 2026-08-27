import { z } from "zod";
import { APPLICATION_EMAIL_SENDER_DOMAIN } from "./email-template";
import { isValidJstTime } from "./email-schedule";

// seminars.apply_form_json の入力バリデーション（PATCH /v1/seminars/:slug/apply-form）。
// SeminarApplyFormField/SeminarApplyForm（types.ts）と形を一致させる。
export const seminarApplyFormFieldSchema = z.object({
  id: z.string().min(1),
  section: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "email", "tel", "textarea", "radio", "checkbox"]),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  otherOption: z.boolean().optional(),
});

export const seminarApplyFormSchema = z.object({
  fields: z.array(seminarApplyFormFieldSchema),
});

export const updateApplyFormSchema = z.object({
  fields: z.array(seminarApplyFormFieldSchema).min(1),
});

// POST /v1/seminars/:slug/applications（公開・認証不要の申込エンドポイント）の入力。
// answersの中身がフォーム定義の必須項目を満たしているかは
// validateApplyFormAnswers（apply-form.ts）で別途検証する。
export const submitApplicationSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

// email_templates の入力バリデーション
// （POST/PATCH /v1/seminars/:slug/emails[/{key}]）。
// 「セミナー前のセットアップ案内」「前日リマインド」など、申込確認メール以外にも
// セミナーごとに複数のメールを設定・配信タイミング（JST）を管理できるようにする。
const fromEmailSchema = z
  .string()
  .email()
  .refine((v) => v.toLowerCase().endsWith(`@${APPLICATION_EMAIL_SENDER_DOMAIN}`), {
    message: `fromEmailは @${APPLICATION_EMAIL_SENDER_DOMAIN} のアドレスである必要があります`,
  });

export const emailTriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("on_submit") }),
  z.object({
    type: z.literal("relative_to_event"),
    offsetDays: z.number().int(),
    timeJst: z.string().refine(isValidJstTime, { message: "timeJstは HH:MM(JST) 形式である必要があります" }),
  }),
  z.object({
    type: z.literal("absolute"),
    sendAt: z.string().datetime({ message: "sendAtはISO 8601形式(UTC)である必要があります" }),
  }),
]);

// メールテンプレートの共通フィールド（seminarsのemail_templates・contactの
// contact_email_templates双方で使うコンポーネント）。トリガー(配信タイミング)の
// 有無だけがこの2者の違いのため、baseを共有しseminars側だけtriggerをextendする。
export const emailContentBaseSchema = z.object({
  label: z.string().min(1),
  enabled: z.boolean().optional(),
  fromName: z.string().min(1),
  fromEmail: fromEmailSchema,
  subject: z.string().min(1),
  bodyText: z.string().min(1),
  bodyHtml: z.string().optional(),
  cc: z.array(z.string().email()).optional(), // Toに加えて常に写しを送りたい宛先
  bcc: z.array(z.string().email()).optional(), // To/Ccに見せずに写しを送りたい宛先
});

const emailContentSchema = emailContentBaseSchema.extend({
  trigger: emailTriggerSchema,
});

// テンプレート保存と同時にこのアドレス宛のテスト送信も行う（任意）。
// 実際の申込・問い合わせデータには紐付かないダミー値でレンダリングし、
// 送信結果だけを応答に含める（DBの送信履歴には記録しない）。
export const testSendToSchema = z.object({
  testSendTo: z.string().email().optional(),
});

export const createEmailTemplateSchema = emailContentSchema
  .extend({
    key: z
      .string()
      .min(1)
      .regex(/^[a-z0-9_-]+$/, { message: "keyは英小文字・数字・ハイフン・アンダースコアのみ使用できます" }),
  })
  .extend(testSendToSchema.shape);

export const updateEmailTemplateSchema = emailContentSchema.partial().extend(testSendToSchema.shape);

// news の入力バリデーション（POST/PATCH /v1/news[/{slug}]）。
const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, { message: "slugは英小文字・数字・ハイフンのみ使用できます" });
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "YYYY-MM-DD形式である必要があります" });

export const newsCreateSchema = z.object({
  slug: slugSchema,
  status: z.enum(["draft", "published"]).optional(),
  date: isoDateSchema,
  tag: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  metaDescription: z.string().min(1),
  metaKeywords: z.string().optional(),
  ogImageKey: z.string().optional(),
  bodyHtml: z.string().min(1),
  relatedSeminarSlug: z.string().optional(),
});

export const newsUpdateSchema = newsCreateSchema.omit({ slug: true }).partial();

// products/services の入力バリデーション（POST/PATCH /v1/products[/{slug}], /v1/services[/{slug}]）。
// トップページ#idea(表示名はProduct)・#serviceセクションの一覧項目をDBで管理するための
// CRUD入力。まだ詳細ページを持たないため、トップページのカード表示に必要な項目のみ持つ。
export const productCreateSchema = z.object({
  slug: slugSchema,
  status: z.enum(["draft", "published"]).optional(),
  sortOrder: z.number().int().optional(),
  title: z.string().min(1),
  subTitle: z.string().optional(),
  description: z.string().min(1),
  imageUrl: z.string().optional(),
  href: z.string().optional(),
  linkTitle: z.string().optional(),
});

export const productUpdateSchema = productCreateSchema.omit({ slug: true }).partial();

export const serviceCreateSchema = z.object({
  slug: slugSchema,
  status: z.enum(["draft", "published"]).optional(),
  sortOrder: z.number().int().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().optional(),
  href: z.string().optional(),
  linkTitle: z.string().optional(),
});

export const serviceUpdateSchema = serviceCreateSchema.omit({ slug: true }).partial();

// seminars.sections_json の入力バリデーション（POST/PATCH /v1/seminars[/{slug}]）。
// SeminarSections（types.ts）と形を一致させる。
export const seminarSectionsSchema = z.object({
  target: z.object({
    title: z.string(),
    items: z.array(z.object({ text: z.string() })),
  }),
  benefits: z.object({
    items: z.array(z.object({ num: z.string(), title: z.string(), desc: z.string() })),
  }),
  timeline: z.object({
    items: z.array(
      z.object({
        time: z.string(),
        title: z.string(),
        desc: z.string().optional(),
        modifier: z.enum(["break", "end"]).optional(),
      }),
    ),
  }),
  voices: z.object({
    items: z.array(z.object({ text: z.string(), name: z.string(), job: z.string() })),
    note: z.string().optional(),
  }),
  speakers: z.object({
    items: z.array(
      z.object({
        photoKey: z.string().optional(),
        tags: z.array(z.string()),
        name: z.string(),
        kana: z.string(),
        affil: z.string(),
        desc: z.string(),
      }),
    ),
  }),
  overview: z.object({
    rows: z.array(z.object({ label: z.string(), valueHtml: z.string() })),
  }),
  faq: z.object({
    items: z.array(z.object({ question: z.string(), answer: z.string() })),
  }),
  cta: z.object({
    closing: z.string(),
    sub: z.string(),
    meta: z.string().optional(),
    btnLabel: z.string(),
  }),
});

export const seminarCreateSchema = z.object({
  slug: slugSchema,
  status: z.enum(["draft", "before_registration", "open", "closed"]).optional(),
  detailPage: z.boolean().optional(), // true=詳細ページあり(既定)、false=過去実績のカードのみ
  eventDate: isoDateSchema,
  eventDateDisplay: z.string().optional(),
  seminarType: z.string().min(1),
  title: z.string().min(1),
  catchLine: z.string().optional(),
  heroSub: z.string().optional(),
  description: z.string().min(1),
  priceDisplay: z.string().optional(),
  priceNote: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  seatsLeft: z.number().int().nonnegative().optional(),
  heroImageKey: z.string().optional(),
  cardImageKey: z.string().optional(),
  venueSummary: z.string().optional(),
  sections: seminarSectionsSchema,
  metaDescription: z.string().min(1),
  metaKeywords: z.string().optional(),
});

export const seminarUpdateSchema = seminarCreateSchema.omit({ slug: true }).partial();

export const seminarStatusUpdateSchema = z.object({
  status: z.enum(["draft", "before_registration", "open", "closed"]),
});

// お問い合わせフォーム（POST /v1/contacts、公開・認証不要）の入力バリデーション。
// セミナー申込と異なりフォーム項目は固定のため、apply_form_jsonのような
// 可変スキーマではなく通常のフィールドとして定義する。
// 選択肢はapps/web/src/render/pages/contact.tsxの表示順と一致させること。
export const CONTACT_INQUIRY_TYPES = [
  "システム開発のご相談",
  "Webサイト制作のご依頼",
  "UI・UXデザインのご相談",
  "3DCG制作のご相談",
  "プログラミング・デザイン教育のご依頼",
  "プロジェクト管理・マネジメントのご相談",
  "事業アイデア・企画に関するご相談",
  "その他のお問い合わせ",
] as const;

export const submitContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  affiliation: z.string().min(1),
  inquiryType: z.enum(CONTACT_INQUIRY_TYPES),
  message: z.string().min(1),
  privacyConsent: z.boolean().refine((v) => v === true, {
    message: "プライバシーポリシーへの同意が必要です",
  }),
});

export const contactStatusUpdateSchema = z.object({
  status: z.enum(["received", "replied", "closed"]),
});

// お問い合わせの自動返信メール(confirmation)・運用者への通知メール(notification)の
// 内容設定（PATCH /v1/contact-email-templates/{key}）。emailContentBaseSchemaを
// そのまま再利用する（seminarsのemail_templatesと異なり、キーは固定2種類のみ・
// 配信タイミングは常に即時のためtriggerは持たない）。
export const contactEmailTemplateKeySchema = z.enum(["notification", "confirmation"]);

export const updateContactEmailTemplateSchema = emailContentBaseSchema.partial().extend(testSendToSchema.shape);
