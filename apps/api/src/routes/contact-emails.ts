import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { contactEmailTemplates } from "@bitcraft/db";
import { contactEmailTemplateKeySchema, updateContactEmailTemplateSchema } from "@bitcraft/shared";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { checkApiKey } from "../middleware/auth";
import {
  dispatchContactTemplateTest,
  getContactEmailTemplateRow,
  resolveContactEmailTemplate,
  toResolved,
  type ContactEmailTemplateKey,
} from "../lib/contact-email-templates";
import { encodeRecipients } from "../lib/email-recipients";

const CONTACT_EMAIL_TEMPLATE_KEYS: ContactEmailTemplateKey[] = ["notification", "confirmation"];

const testSendResultSchema = z.object({ status: z.enum(["sent", "failed"]), error: z.string().nullable() });

const contactEmailTemplateResponseSchema = z.object({
  key: contactEmailTemplateKeySchema,
  label: z.string(),
  enabled: z.boolean(),
  fromName: z.string(),
  fromEmail: z.string(),
  subject: z.string(),
  bodyText: z.string(),
  bodyHtml: z.string().nullable(),
  cc: z.array(z.string()).nullable(),
  bcc: z.array(z.string()).nullable(),
  testSend: testSendResultSchema.optional(),
});

// お問い合わせの通知メール(notification)・自動返信メール(confirmation)の文面設定。
// seminarsのemail_templates(routes/emails.ts)と同じ「メールの内容自体もAPIで
// 設定管理できるようにしたい」という要望に応えるが、Contactはキーが固定2種類・
// 常に即時送信のみのため、POST(新規作成)は無く GET(一覧)/PATCH(更新)のみを
// 提供する（キー自体を増減させる必要が無いため）。DBに行が無いキーはデフォルト
// 文面を返す（実際の解決ロジックはlib/contact-email-templates.tsを
// routes/contacts.ts（送信時）と共有する）。
export function registerContactEmailRoutes(app: OpenAPIHono<{ Bindings: Bindings }>) {
  // GET /v1/contact-email-templates -----------------------------------------
  const listRoute = createRoute({
    method: "get",
    path: "/v1/contact-email-templates",
    summary: "お問い合わせの通知・自動返信メール設定を取得",
    tags: ["contact-emails"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "notification/confirmationの現在の設定（未設定の場合はデフォルト文面）",
        content: { "application/json": { schema: z.array(contactEmailTemplateResponseSchema) } },
      },
      401: { description: "認証エラー" },
    },
  });

  app.openapi(listRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const results = await Promise.all(
      CONTACT_EMAIL_TEMPLATE_KEYS.map(async (key) => ({ key, ...(await resolveContactEmailTemplate(c.env, key)) })),
    );
    return c.json(results, 200);
  });

  // PATCH /v1/contact-email-templates/{key} ----------------------------------
  // DBに行が無ければデフォルト文面をベースに新規作成する（upsert）。
  const updateRoute = createRoute({
    method: "patch",
    path: "/v1/contact-email-templates/{key}",
    summary: "お問い合わせの通知・自動返信メール設定を更新（未設定なら作成）",
    tags: ["contact-emails"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ key: contactEmailTemplateKeySchema }),
      body: { content: { "application/json": { schema: updateContactEmailTemplateSchema } } },
    },
    responses: {
      200: {
        description: "更新後の設定",
        content: { "application/json": { schema: contactEmailTemplateResponseSchema } },
      },
      401: { description: "認証エラー" },
    },
  });

  app.openapi(updateRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { key } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = getDb(c.env);

    const existing = await getContactEmailTemplateRow(c.env, key);
    const base = toResolved(key, existing);

    const next = {
      label: body.label ?? base.label,
      enabled: body.enabled === undefined ? (base.enabled ? 1 : 0) : body.enabled ? 1 : 0,
      fromName: body.fromName ?? base.fromName,
      fromEmail: body.fromEmail ?? base.fromEmail,
      subject: body.subject ?? base.subject,
      bodyText: body.bodyText ?? base.bodyText,
      bodyHtml: body.bodyHtml === undefined ? base.bodyHtml : body.bodyHtml,
      cc: body.cc === undefined ? encodeRecipients(base.cc ?? undefined) : encodeRecipients(body.cc),
      bcc: body.bcc === undefined ? encodeRecipients(base.bcc ?? undefined) : encodeRecipients(body.bcc),
    };

    if (existing) {
      await db
        .update(contactEmailTemplates)
        .set({ ...next, updatedAt: new Date().toISOString() })
        .where(eq(contactEmailTemplates.id, existing.id))
        .run();
    } else {
      await db.insert(contactEmailTemplates).values({ key, ...next }).run();
    }

    const updated = toResolved(key, await getContactEmailTemplateRow(c.env, key));

    let testSend: z.infer<typeof testSendResultSchema> | undefined;
    if (body.testSendTo) {
      const result = await dispatchContactTemplateTest(c.env, updated, body.testSendTo);
      testSend = result.status === "failed" ? result : { status: "sent", error: null };
    }

    return c.json({ key, ...updated, testSend }, 200);
  });
}
