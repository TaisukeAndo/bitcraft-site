import { and, eq, ne } from "drizzle-orm";
import { emailTemplates, seminars } from "@bitcraft/db";
import { isTriggerDue, type EmailTrigger } from "@bitcraft/shared";
import type { Bindings } from "./lib/bindings";
import { getDb } from "./lib/db";
import { dispatchTemplateToPendingApplications } from "./lib/email-dispatch";

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
// で定期的に「配信すべきテンプレートが無いか」をスイープする。実際の一斉送信
// ロジック（同一テンプレート×同一申込への二重送信防止を含む）は
// lib/email-dispatch.ts の dispatchTemplateToPendingApplications と共有する
// （routes/emails.ts の POST .../send=手動即時ブロードキャストも同じ関数を使う）。
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

    const result = await dispatchTemplateToPendingApplications(env, seminar, template);
    sent += result.sent;
    failed += result.failed;
  }

  return { checked, sent, failed };
}
