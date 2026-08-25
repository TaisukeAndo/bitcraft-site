import {
  DEFAULT_APPLICATION_EMAIL_TEMPLATE,
  renderEmailTemplate,
  type ApplicationAnswers,
} from "@bitcraft/shared";
import type { EmailTemplateRow, SeminarRow } from "@bitcraft/db";
import type { Bindings } from "./bindings";
import { sendMail } from "./smtp-mailer";
import { decodeRecipients } from "./email-recipients";

function pickApplicantName(answers: ApplicationAnswers, fallback: string | null): string {
  const value = answers["name"];
  if (typeof value === "string" && value.trim()) return value;
  return fallback ?? "参加者";
}

function pickApplicantEmail(answers: ApplicationAnswers, fallback: string | null): string | null {
  for (const value of Object.values(answers)) {
    if (typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return value;
    }
  }
  return fallback;
}

export type EmailDispatchContent = {
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  cc?: string[] | null;
  bcc?: string[] | null;
};

export type EmailDispatchResult = { status: "sent" } | { status: "failed"; error: string } | { status: "skipped" };

// 申込確認メール(on_submit)・事前準備案内・前日リマインド等、あらゆる
// email_templatesの内容をレンダリングして送信する共通ロジック。
// 即時送信(申込受付ハンドラ)・定期スイープ(scheduled.ts)の両方から使う。
export async function dispatchTemplatedEmail(
  env: Bindings,
  seminar: SeminarRow,
  content: EmailDispatchContent,
  answers: ApplicationAnswers,
  applicantNameFallback: string | null,
  applicantEmailFallback: string | null,
): Promise<EmailDispatchResult> {
  const to = pickApplicantEmail(answers, applicantEmailFallback);
  if (!to) {
    return { status: "skipped" };
  }

  const context = {
    applicantName: pickApplicantName(answers, applicantNameFallback),
    seminarTitle: seminar.title.replace(/<br>/g, ""),
    eventDateDisplay: seminar.eventDateDisplay ?? seminar.eventDate,
    venueSummary: seminar.venueSummary ?? "",
    priceDisplay: seminar.priceDisplay ? `${seminar.priceDisplay}${seminar.priceNote ?? ""}` : "",
  };

  try {
    await sendMail(env, {
      to,
      from: { email: content.fromEmail, name: content.fromName },
      subject: renderEmailTemplate(content.subject, context),
      text: renderEmailTemplate(content.bodyText, context),
      html: content.bodyHtml ? renderEmailTemplate(content.bodyHtml, context) : undefined,
      cc: content.cc,
      bcc: content.bcc,
    });
    return { status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { status: "failed", error: message };
  }
}

// email_templates の1行をEmailDispatchContentへ変換する薄いヘルパー。
export function toDispatchContent(row: EmailTemplateRow): EmailDispatchContent {
  return {
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    subject: row.subject,
    bodyText: row.bodyText,
    bodyHtml: row.bodyHtml,
    cc: decodeRecipients(row.cc),
    bcc: decodeRecipients(row.bcc),
  };
}

// email_templatesの行が1件も無いセミナーでも申込確認メールが届かなくなる
// 退行を防ぐためのフォールバック（実装計画: 申込確認メールPRからの既存挙動維持）。
export const DEFAULT_ON_SUBMIT_CONTENT: EmailDispatchContent = DEFAULT_APPLICATION_EMAIL_TEMPLATE;
