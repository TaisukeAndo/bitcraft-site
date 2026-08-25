import {
  DEFAULT_APPLICATION_EMAIL_TEMPLATE,
  renderEmailTemplate,
  type ApplicationAnswers,
} from "@bitcraft/shared";
import { and, eq, isNull } from "drizzle-orm";
import { applicationEmailSends, applications, type EmailTemplateRow, type SeminarRow } from "@bitcraft/db";
import type { Bindings } from "./bindings";
import { getDb } from "./db";
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

// 指定テンプレートについて、まだ送信していないそのセミナーの申込を全員抽出して
// 一斉送信する共通ロジック（「同じセミナーの参加者にメールを一斉送信する」
// 仕組み）。scheduled.ts（トリガー時刻が来たテンプレートを対象に定期実行）と
// routes/emails.ts の POST .../send（トリガーに関係なく今すぐ実行、管理者向け
// 手動ブロードキャスト）の両方から使う。同一テンプレート×同一申込への二重送信は
// application_email_sends のUNIQUE制約で最終的に防ぐ。
export async function dispatchTemplateToPendingApplications(
  env: Bindings,
  seminar: SeminarRow,
  template: EmailTemplateRow,
): Promise<{ pendingCount: number; sent: number; failed: number }> {
  const db = getDb(env);

  const pending = await db
    .select({ application: applications })
    .from(applications)
    .leftJoin(
      applicationEmailSends,
      and(
        eq(applicationEmailSends.applicationId, applications.id),
        eq(applicationEmailSends.emailTemplateId, template.id),
      ),
    )
    .where(and(eq(applications.seminarId, seminar.id), isNull(applicationEmailSends.id)));

  let sent = 0;
  let failed = 0;

  for (const { application } of pending) {
    const answers = JSON.parse(application.answersJson) as ApplicationAnswers;
    const result = await dispatchTemplatedEmail(
      env,
      seminar,
      toDispatchContent(template),
      answers,
      application.applicantName,
      application.applicantEmail,
    );
    if (result.status === "skipped") continue;

    if (result.status === "sent") sent += 1;
    else failed += 1;

    await db
      .insert(applicationEmailSends)
      .values({
        applicationId: application.id,
        emailTemplateId: template.id,
        status: result.status,
        error: result.status === "failed" ? result.error : null,
      })
      .onConflictDoNothing()
      .run();
  }

  return { pendingCount: pending.length, sent, failed };
}

// テンプレートの内容確認用にテスト送信する。実際の申込データには紐付かない
// ダミー値（宛先はtestSendTo固定、氏名はプレースホルダー）でレンダリングし、
// 件名に印を付けて実配信と区別できるようにする。送信履歴(application_email_
// sends)には記録しない（実際の申込ではないため）。
export async function dispatchSeminarTemplateTest(
  env: Bindings,
  seminar: SeminarRow,
  content: EmailDispatchContent,
  testSendTo: string,
): Promise<EmailDispatchResult> {
  return dispatchTemplatedEmail(
    env,
    seminar,
    { ...content, subject: `【テスト送信】${content.subject}` },
    {},
    "テスト太郎",
    testSendTo,
  );
}
