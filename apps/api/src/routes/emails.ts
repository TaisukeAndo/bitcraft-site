import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { seminars, emailTemplates, applicationEmailSends } from "@bitcraft/db";
import { createEmailTemplateSchema, emailTriggerSchema, updateEmailTemplateSchema } from "@bitcraft/shared";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { checkApiKey } from "../middleware/auth";
import { decodeRecipients, encodeRecipients } from "../lib/email-recipients";

const emailTemplateResponseSchema = z.object({
  key: z.string(),
  label: z.string(),
  enabled: z.boolean(),
  trigger: emailTriggerSchema,
  fromName: z.string(),
  fromEmail: z.string(),
  subject: z.string(),
  bodyText: z.string(),
  bodyHtml: z.string().nullable(),
  cc: z.array(z.string()).nullable(),
  bcc: z.array(z.string()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type EmailTemplateRowLike = {
  key: string;
  label: string;
  enabled: number;
  triggerType: "on_submit" | "relative_to_event" | "absolute";
  triggerOffsetDays: number | null;
  triggerTimeJst: string | null;
  triggerAt: string | null;
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  cc: string | null;
  bcc: string | null;
  createdAt: string;
  updatedAt: string;
};

function toResponse(row: EmailTemplateRowLike): z.infer<typeof emailTemplateResponseSchema> {
  const trigger =
    row.triggerType === "on_submit"
      ? ({ type: "on_submit" } as const)
      : row.triggerType === "relative_to_event"
        ? ({
            type: "relative_to_event",
            offsetDays: row.triggerOffsetDays ?? 0,
            timeJst: row.triggerTimeJst ?? "09:00",
          } as const)
        : ({ type: "absolute", sendAt: row.triggerAt ?? new Date().toISOString() } as const);

  return {
    key: row.key,
    label: row.label,
    enabled: Boolean(row.enabled),
    trigger,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    subject: row.subject,
    bodyText: row.bodyText,
    bodyHtml: row.bodyHtml,
    cc: decodeRecipients(row.cc),
    bcc: decodeRecipients(row.bcc),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// セミナーごとに複数設定できるメール（申込確認・事前準備案内・前日リマインド等）の
// CRUD。配信タイミング(trigger)はJST基準の相対日時・絶対日時に対応し、
// 開催日基準/絶対日時のメールは apps/api の scheduled ハンドラ（Cronトリガー）が
// 定期的に配信要否をチェックする（実装計画: ユーザー要望対応）。
export function registerEmailTemplateRoutes(app: OpenAPIHono<{ Bindings: Bindings }>) {
  // GET /v1/seminars/{slug}/emails -----------------------------------------
  const listRoute = createRoute({
    method: "get",
    path: "/v1/seminars/{slug}/emails",
    summary: "セミナーのメールテンプレート一覧を取得",
    tags: ["emails"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: {
        description: "メールテンプレート一覧",
        content: { "application/json": { schema: z.array(emailTemplateResponseSchema) } },
      },
      401: { description: "認証エラー" },
      404: { description: "セミナーが見つからない" },
    },
  });

  app.openapi(listRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug } = c.req.valid("param");
    const db = getDb(c.env);
    const seminar = await db.select({ id: seminars.id }).from(seminars).where(eq(seminars.slug, slug)).get();
    if (!seminar) return c.json({ error: "Not Found" }, 404);

    const rows = await db.select().from(emailTemplates).where(eq(emailTemplates.seminarId, seminar.id));
    return c.json(rows.map(toResponse), 200);
  });

  // POST /v1/seminars/{slug}/emails ----------------------------------------
  const createRouteDef = createRoute({
    method: "post",
    path: "/v1/seminars/{slug}/emails",
    summary: "セミナーにメールテンプレートを追加",
    tags: ["emails"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string() }),
      body: { content: { "application/json": { schema: createEmailTemplateSchema } } },
    },
    responses: {
      201: {
        description: "作成したテンプレート",
        content: { "application/json": { schema: emailTemplateResponseSchema } },
      },
      401: { description: "認証エラー" },
      404: { description: "セミナーが見つからない" },
      409: { description: "同じkeyのテンプレートが既に存在する" },
    },
  });

  app.openapi(createRouteDef, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = getDb(c.env);
    const seminar = await db.select({ id: seminars.id }).from(seminars).where(eq(seminars.slug, slug)).get();
    if (!seminar) return c.json({ error: "Not Found" }, 404);

    const existing = await db
      .select({ id: emailTemplates.id })
      .from(emailTemplates)
      .where(and(eq(emailTemplates.seminarId, seminar.id), eq(emailTemplates.key, body.key)))
      .get();
    if (existing) {
      return c.json({ error: `key '${body.key}' は既に使用されています` }, 409);
    }

    const inserted = await db
      .insert(emailTemplates)
      .values({
        seminarId: seminar.id,
        seminarSlug: slug,
        key: body.key,
        label: body.label,
        enabled: body.enabled === false ? 0 : 1,
        triggerType: body.trigger.type,
        triggerOffsetDays: body.trigger.type === "relative_to_event" ? body.trigger.offsetDays : null,
        triggerTimeJst: body.trigger.type === "relative_to_event" ? body.trigger.timeJst : null,
        triggerAt: body.trigger.type === "absolute" ? body.trigger.sendAt : null,
        fromName: body.fromName,
        fromEmail: body.fromEmail,
        subject: body.subject,
        bodyText: body.bodyText,
        bodyHtml: body.bodyHtml ?? null,
        cc: encodeRecipients(body.cc),
        bcc: encodeRecipients(body.bcc),
      })
      .returning();

    const row = inserted[0];
    if (!row) return c.json({ error: "作成に失敗しました" }, 404);
    return c.json(toResponse(row), 201);
  });

  // PATCH /v1/seminars/{slug}/emails/{key} ----------------------------------
  const updateRoute = createRoute({
    method: "patch",
    path: "/v1/seminars/{slug}/emails/{key}",
    summary: "セミナーのメールテンプレートを更新",
    tags: ["emails"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string(), key: z.string() }),
      body: { content: { "application/json": { schema: updateEmailTemplateSchema } } },
    },
    responses: {
      200: {
        description: "更新後のテンプレート",
        content: { "application/json": { schema: emailTemplateResponseSchema } },
      },
      401: { description: "認証エラー" },
      404: { description: "セミナーまたはテンプレートが見つからない" },
    },
  });

  app.openapi(updateRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug, key } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = getDb(c.env);
    const seminar = await db.select({ id: seminars.id }).from(seminars).where(eq(seminars.slug, slug)).get();
    if (!seminar) return c.json({ error: "Not Found" }, 404);

    const existing = await db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.seminarId, seminar.id), eq(emailTemplates.key, key)))
      .get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    await db
      .update(emailTemplates)
      .set({
        label: body.label ?? existing.label,
        enabled: body.enabled === undefined ? existing.enabled : body.enabled ? 1 : 0,
        triggerType: body.trigger?.type ?? existing.triggerType,
        triggerOffsetDays:
          body.trigger?.type === "relative_to_event"
            ? body.trigger.offsetDays
            : body.trigger
              ? null
              : existing.triggerOffsetDays,
        triggerTimeJst:
          body.trigger?.type === "relative_to_event"
            ? body.trigger.timeJst
            : body.trigger
              ? null
              : existing.triggerTimeJst,
        triggerAt:
          body.trigger?.type === "absolute" ? body.trigger.sendAt : body.trigger ? null : existing.triggerAt,
        fromName: body.fromName ?? existing.fromName,
        fromEmail: body.fromEmail ?? existing.fromEmail,
        subject: body.subject ?? existing.subject,
        bodyText: body.bodyText ?? existing.bodyText,
        bodyHtml: body.bodyHtml === undefined ? existing.bodyHtml : body.bodyHtml,
        cc: body.cc === undefined ? existing.cc : encodeRecipients(body.cc),
        bcc: body.bcc === undefined ? existing.bcc : encodeRecipients(body.bcc),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(emailTemplates.id, existing.id))
      .run();

    const updated = await db.select().from(emailTemplates).where(eq(emailTemplates.id, existing.id)).get();
    return c.json(toResponse(updated!), 200);
  });

  // DELETE /v1/seminars/{slug}/emails/{key} ---------------------------------
  const deleteRoute = createRoute({
    method: "delete",
    path: "/v1/seminars/{slug}/emails/{key}",
    summary: "セミナーのメールテンプレートを削除",
    tags: ["emails"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string(), key: z.string() }) },
    responses: {
      204: { description: "削除した" },
      401: { description: "認証エラー" },
      404: { description: "セミナーまたはテンプレートが見つからない" },
      409: { description: "送信履歴が存在するため削除できない（enabled:falseでの無効化を推奨）" },
    },
  });

  app.openapi(deleteRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug, key } = c.req.valid("param");
    const db = getDb(c.env);
    const seminar = await db.select({ id: seminars.id }).from(seminars).where(eq(seminars.slug, slug)).get();
    if (!seminar) return c.json({ error: "Not Found" }, 404);

    const existing = await db
      .select({ id: emailTemplates.id })
      .from(emailTemplates)
      .where(and(eq(emailTemplates.seminarId, seminar.id), eq(emailTemplates.key, key)))
      .get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    // 送信履歴(application_email_sends)がある場合、外部キー制約により削除できない。
    // 履歴は監査目的で残す価値があるため無条件のカスケード削除はせず、
    // 「無効化」を案内する明確な409を返す（生のFK違反による500を防ぐ）。
    const hasHistory = await db
      .select({ id: applicationEmailSends.id })
      .from(applicationEmailSends)
      .where(eq(applicationEmailSends.emailTemplateId, existing.id))
      .get();
    if (hasHistory) {
      return c.json(
        { error: "このテンプレートは送信履歴があるため削除できません。enabled:falseで無効化してください" },
        409,
      );
    }

    await db.delete(emailTemplates).where(eq(emailTemplates.id, existing.id)).run();
    return c.body(null, 204);
  });
}
