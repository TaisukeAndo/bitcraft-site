import { and, eq, isNull, ne } from "drizzle-orm";
import { applicationEmailSends, applications, emailTemplates, seminars } from "@bitcraft/db";
import { isTriggerDue, type ApplicationAnswers, type EmailTrigger } from "@bitcraft/shared";
import type { Bindings } from "./lib/bindings";
import { getDb } from "./lib/db";
import { dispatchTemplatedEmail, toDispatchContent } from "./lib/email-dispatch";

function toEmailTrigger(row: {
  triggerType: "on_submit" | "relative_to_event" | "absolute";
  triggerOffsetDays: number | null;
  triggerTimeJst: string | null;
  triggerAt: string | null;
}): EmailTrigger {
  if (row.triggerType === "on_submit") return { type: "on_submit" };
  if (row.triggerType === "relative_to_event") {
    return {
      type: "relative_to_event",
      offsetDays: row.triggerOffsetDays ?? 0,
      timeJst: row.triggerTimeJst ?? "09:00",
    };
  }
  return { type: "absolute", sendAt: row.triggerAt ?? new Date().toISOString() };
}

// 開催日基準(relative_to_event)・絶対日時(absolute)のメールは、申込という
// ユーザー操作を起点にできないため、Cronトリガー（wrangler.jsonc triggers.crons）
// で定期的に「配信すべきテンプレートが無いか」をスイープする。
// 同一テンプレート×同一申込への二重送信は application_email_sends の
// UNIQUE制約(applicationId, emailTemplateId)で最終的に防ぐ。
export async function runScheduledEmailSweep(env: Bindings): Promise<{ checked: number; sent: number; failed: number }> {
  const db = getDb(env);
  const now = new Date();
  let checked = 0;
  let sent = 0;
  let failed = 0;

  const templates = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.enabled, 1), ne(emailTemplates.triggerType, "on_submit")));

  for (const template of templates) {
    const seminar = await db.select().from(seminars).where(eq(seminars.id, template.seminarId)).get();
    if (!seminar) continue;

    const trigger = toEmailTrigger(template);
    if (!isTriggerDue(trigger, seminar.eventDate, now)) continue;

    checked += 1;

    // このテンプレートについてまだ送信していない申込を取得
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
  }

  return { checked, sent, failed };
}
