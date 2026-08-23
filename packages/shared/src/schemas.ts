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

const emailContentSchema = z.object({
  label: z.string().min(1),
  enabled: z.boolean().optional(),
  trigger: emailTriggerSchema,
  fromName: z.string().min(1),
  fromEmail: fromEmailSchema,
  subject: z.string().min(1),
  bodyText: z.string().min(1),
  bodyHtml: z.string().optional(),
});

export const createEmailTemplateSchema = emailContentSchema.extend({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_-]+$/, { message: "keyは英小文字・数字・ハイフン・アンダースコアのみ使用できます" }),
});

export const updateEmailTemplateSchema = emailContentSchema.partial();
