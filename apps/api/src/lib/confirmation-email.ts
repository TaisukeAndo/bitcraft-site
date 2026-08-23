import {
  DEFAULT_APPLICATION_EMAIL_TEMPLATE,
  renderEmailTemplate,
  type ApplicationAnswers,
  type ApplicationEmailTemplate,
} from "@bitcraft/shared";
import type { SeminarRow } from "@bitcraft/db";
import type { Bindings } from "./bindings";

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

export type ConfirmationEmailResult = { status: "sent" } | { status: "failed"; error: string } | { status: "skipped" };

// 申込確認メールを送信する。送信失敗は呼び出し元（申込受付エンドポイント）で
// 申込自体の失敗として扱わない（ベストエフォート。実装計画のユーザー要望対応）。
export async function sendConfirmationEmail(
  env: Bindings,
  seminar: SeminarRow,
  answers: ApplicationAnswers,
  applicantNameFallback: string | null,
  applicantEmailFallback: string | null,
): Promise<ConfirmationEmailResult> {
  const to = pickApplicantEmail(answers, applicantEmailFallback);
  if (!to) {
    return { status: "skipped" };
  }

  const template: ApplicationEmailTemplate = seminar.confirmationEmailJson
    ? (JSON.parse(seminar.confirmationEmailJson) as ApplicationEmailTemplate)
    : DEFAULT_APPLICATION_EMAIL_TEMPLATE;

  const context = {
    applicantName: pickApplicantName(answers, applicantNameFallback),
    seminarTitle: seminar.title.replace(/<br>/g, ""),
    eventDateDisplay: seminar.eventDateDisplay ?? seminar.eventDate,
    venueSummary: seminar.venueSummary ?? "",
    priceDisplay: seminar.priceDisplay ? `${seminar.priceDisplay}${seminar.priceNote ?? ""}` : "",
  };

  try {
    await env.EMAIL.send({
      to,
      from: { email: template.fromEmail, name: template.fromName },
      subject: renderEmailTemplate(template.subject, context),
      text: renderEmailTemplate(template.bodyText, context),
      html: template.bodyHtml ? renderEmailTemplate(template.bodyHtml, context) : undefined,
    });
    return { status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { status: "failed", error: message };
  }
}
