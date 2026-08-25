import { eq } from "drizzle-orm";
import { contactEmailTemplates, type ContactEmailTemplateRow } from "@bitcraft/db";
import { DEFAULT_CONTACT_CONFIRMATION_TEMPLATE, DEFAULT_CONTACT_NOTIFICATION_TEMPLATE } from "@bitcraft/shared";
import type { Bindings } from "./bindings";
import { getDb } from "./db";
import { decodeRecipients } from "./email-recipients";

export type ContactEmailTemplateKey = "notification" | "confirmation";

export type ResolvedContactEmailTemplate = {
  label: string;
  enabled: boolean;
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  cc: string[] | null;
  bcc: string[] | null;
};

const DEFAULT_LABELS: Record<ContactEmailTemplateKey, string> = {
  notification: "運用者への通知メール",
  confirmation: "お問い合わせ確認メール（自動返信）",
};

// contact_email_templatesにDB行が無いキー(未設定)はデフォルト文面にフォールバック
// する（seminarsのDEFAULT_ON_SUBMIT_CONTENTと同じ方針）。routes/contacts.ts
// （実際の送信）とroutes/contact-emails.ts（設定値の表示）の両方から使う
// 共通コンポーネント。
export async function resolveContactEmailTemplate(
  env: Bindings,
  key: ContactEmailTemplateKey,
): Promise<ResolvedContactEmailTemplate> {
  const db = getDb(env);
  const row = await db.select().from(contactEmailTemplates).where(eq(contactEmailTemplates.key, key)).get();
  return toResolved(key, row);
}

export async function getContactEmailTemplateRow(
  env: Bindings,
  key: ContactEmailTemplateKey,
): Promise<ContactEmailTemplateRow | undefined> {
  const db = getDb(env);
  return db.select().from(contactEmailTemplates).where(eq(contactEmailTemplates.key, key)).get();
}

export function toResolved(
  key: ContactEmailTemplateKey,
  row: ContactEmailTemplateRow | undefined,
): ResolvedContactEmailTemplate {
  if (row) {
    return {
      label: row.label,
      enabled: Boolean(row.enabled),
      fromName: row.fromName,
      fromEmail: row.fromEmail,
      subject: row.subject,
      bodyText: row.bodyText,
      bodyHtml: row.bodyHtml,
      cc: decodeRecipients(row.cc),
      bcc: decodeRecipients(row.bcc),
    };
  }
  const fallback = key === "notification" ? DEFAULT_CONTACT_NOTIFICATION_TEMPLATE : DEFAULT_CONTACT_CONFIRMATION_TEMPLATE;
  return {
    label: DEFAULT_LABELS[key],
    enabled: true,
    fromName: fallback.fromName,
    fromEmail: fallback.fromEmail,
    subject: fallback.subject,
    bodyText: fallback.bodyText,
    bodyHtml: fallback.bodyHtml ?? null,
    cc: fallback.cc ?? null,
    bcc: fallback.bcc ?? null,
  };
}
