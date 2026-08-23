import { z } from "zod";
import { APPLICATION_EMAIL_SENDER_DOMAIN } from "./email-template";

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

// seminars.confirmation_email_json の入力バリデーション
// （PATCH /v1/seminars/:slug/confirmation-email）。
// fromEmailはEmail Sendingで認証済みのドメイン(bitcraft.work)のアドレスのみ許可する。
export const updateConfirmationEmailSchema = z.object({
  fromName: z.string().min(1),
  fromEmail: z
    .string()
    .email()
    .refine((v) => v.toLowerCase().endsWith(`@${APPLICATION_EMAIL_SENDER_DOMAIN}`), {
      message: `fromEmailは @${APPLICATION_EMAIL_SENDER_DOMAIN} のアドレスである必要があります`,
    }),
  subject: z.string().min(1),
  bodyText: z.string().min(1),
  bodyHtml: z.string().optional(),
});
