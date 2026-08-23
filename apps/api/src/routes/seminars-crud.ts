import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { desc, eq } from "drizzle-orm";
import { seminars, applications, emailTemplates, type SeminarRow } from "@bitcraft/db";
import {
  isPastEvent,
  seminarApplyFormSchema,
  seminarCreateSchema,
  seminarSectionsSchema,
  seminarStatusUpdateSchema,
  seminarUpdateSchema,
  type SeminarApplyForm,
  type SeminarSections,
} from "@bitcraft/shared";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { checkApiKey } from "../middleware/auth";

const seminarResponseSchema = z.object({
  id: z.number(),
  slug: z.string(),
  status: z.enum(["draft", "before_registration", "open", "closed"]),
  detailPage: z.boolean(),
  eventDate: z.string(),
  eventDateDisplay: z.string().nullable(),
  seminarType: z.string(),
  title: z.string(),
  catchLine: z.string().nullable(),
  heroSub: z.string().nullable(),
  description: z.string(),
  priceDisplay: z.string().nullable(),
  priceNote: z.string().nullable(),
  capacity: z.number().nullable(),
  seatsLeft: z.number().nullable(),
  heroImageKey: z.string().nullable(),
  cardImageKey: z.string().nullable(),
  venueSummary: z.string().nullable(),
  sections: seminarSectionsSchema,
  // 申込フォーム定義は PATCH /v1/seminars/{slug}/apply-form でのみ更新する
  // （routes/seminars.ts）。ここでは参照用に読み取り専用フィールドとして返す。
  applyForm: seminarApplyFormSchema.nullable(),
  metaDescription: z.string(),
  metaKeywords: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toResponse(row: SeminarRow): z.infer<typeof seminarResponseSchema> {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    detailPage: Boolean(row.detailPage),
    eventDate: row.eventDate,
    eventDateDisplay: row.eventDateDisplay,
    seminarType: row.seminarType,
    title: row.title,
    catchLine: row.catchLine,
    heroSub: row.heroSub,
    description: row.description,
    priceDisplay: row.priceDisplay,
    priceNote: row.priceNote,
    capacity: row.capacity,
    seatsLeft: row.seatsLeft,
    heroImageKey: row.heroImageKey,
    cardImageKey: row.cardImageKey,
    venueSummary: row.venueSummary,
    sections: JSON.parse(row.sectionsJson) as SeminarSections,
    applyForm: row.applyFormJson ? (JSON.parse(row.applyFormJson) as SeminarApplyForm) : null,
    metaDescription: row.metaDescription,
    metaKeywords: row.metaKeywords,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// セミナーの本体コンテンツ(core fields + sections_json)のCRUD。
// 申込フォーム定義(apply-form)・メールテンプレート(emails)・申込一覧(applications)は
// それぞれ routes/seminars.ts / routes/emails.ts が担当し、ここでは扱わない
// （状態遷移(status)も専用エンドポイントに分離し、本文更新による誤上書きを防ぐ。実装計画4章）。
export function registerSeminarCrudRoutes(app: OpenAPIHono<{ Bindings: Bindings }>) {
  // GET /v1/seminars -----------------------------------------------------------
  const listRoute = createRoute({
    method: "get",
    path: "/v1/seminars",
    summary: "セミナーの一覧を取得",
    tags: ["seminars"],
    security: [{ bearerAuth: [] }],
    request: {
      query: z.object({
        status: z.enum(["draft", "before_registration", "open", "closed"]).optional(),
        // 「開催予定/過去開催」はevent_dateとJST今日日付から都度計算する派生値
        // （実装計画2章）。trueで開催予定のみ、falseで過去開催のみに絞り込む。
        upcoming: z.coerce.boolean().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        offset: z.coerce.number().int().nonnegative().optional(),
      }),
    },
    responses: {
      200: {
        description: "セミナー一覧（event_date降順）",
        content: { "application/json": { schema: z.array(seminarResponseSchema) } },
      },
      401: { description: "認証エラー" },
    },
  });

  app.openapi(listRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { status, upcoming, limit, offset } = c.req.valid("query");
    const db = getDb(c.env);

    const rows = await db
      .select()
      .from(seminars)
      .where(status ? eq(seminars.status, status) : undefined)
      .orderBy(desc(seminars.eventDate));

    const filtered =
      upcoming === undefined ? rows : rows.filter((r) => isPastEvent(r.eventDate) === !upcoming);

    const paged = filtered.slice(offset ?? 0, (offset ?? 0) + (limit ?? 50));
    return c.json(paged.map(toResponse), 200);
  });

  // GET /v1/seminars/{slug} -------------------------------------------------------
  const getRoute = createRoute({
    method: "get",
    path: "/v1/seminars/{slug}",
    summary: "セミナーを1件取得",
    tags: ["seminars"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: { description: "セミナー", content: { "application/json": { schema: seminarResponseSchema } } },
      401: { description: "認証エラー" },
      404: { description: "見つからない" },
    },
  });

  app.openapi(getRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug } = c.req.valid("param");
    const db = getDb(c.env);
    const row = await db.select().from(seminars).where(eq(seminars.slug, slug)).get();
    if (!row) return c.json({ error: "Not Found" }, 404);
    return c.json(toResponse(row), 200);
  });

  // POST /v1/seminars ----------------------------------------------------------
  const createRouteDef = createRoute({
    method: "post",
    path: "/v1/seminars",
    summary: "セミナーを新規作成",
    tags: ["seminars"],
    security: [{ bearerAuth: [] }],
    request: { body: { content: { "application/json": { schema: seminarCreateSchema } } } },
    responses: {
      201: { description: "作成したセミナー", content: { "application/json": { schema: seminarResponseSchema } } },
      401: { description: "認証エラー" },
      409: { description: "同じslugのセミナーが既に存在する" },
    },
  });

  app.openapi(createRouteDef, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const body = c.req.valid("json");
    const db = getDb(c.env);

    const existing = await db.select({ id: seminars.id }).from(seminars).where(eq(seminars.slug, body.slug)).get();
    if (existing) {
      return c.json({ error: `slug '${body.slug}' は既に使用されています` }, 409);
    }

    const inserted = await db
      .insert(seminars)
      .values({
        slug: body.slug,
        status: body.status ?? "draft",
        detailPage: body.detailPage === false ? 0 : 1,
        eventDate: body.eventDate,
        eventDateDisplay: body.eventDateDisplay ?? null,
        seminarType: body.seminarType,
        title: body.title,
        catchLine: body.catchLine ?? null,
        heroSub: body.heroSub ?? null,
        description: body.description,
        priceDisplay: body.priceDisplay ?? null,
        priceNote: body.priceNote ?? null,
        capacity: body.capacity ?? null,
        seatsLeft: body.seatsLeft ?? null,
        heroImageKey: body.heroImageKey ?? null,
        cardImageKey: body.cardImageKey ?? null,
        venueSummary: body.venueSummary ?? null,
        sectionsJson: JSON.stringify(body.sections),
        metaDescription: body.metaDescription,
        metaKeywords: body.metaKeywords ?? null,
      })
      .returning();

    const row = inserted[0];
    if (!row) return c.json({ error: "作成に失敗しました" }, 409);
    return c.json(toResponse(row), 201);
  });

  // PATCH /v1/seminars/{slug} ---------------------------------------------------
  const updateRoute = createRoute({
    method: "patch",
    path: "/v1/seminars/{slug}",
    summary: "セミナーの本体コンテンツを部分更新（statusとapply-formは対象外）",
    tags: ["seminars"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string() }),
      body: { content: { "application/json": { schema: seminarUpdateSchema } } },
    },
    responses: {
      200: { description: "更新後のセミナー", content: { "application/json": { schema: seminarResponseSchema } } },
      401: { description: "認証エラー" },
      404: { description: "見つからない" },
    },
  });

  app.openapi(updateRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = getDb(c.env);

    const existing = await db.select().from(seminars).where(eq(seminars.slug, slug)).get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    await db
      .update(seminars)
      .set({
        detailPage: body.detailPage === undefined ? existing.detailPage : body.detailPage ? 1 : 0,
        eventDate: body.eventDate ?? existing.eventDate,
        eventDateDisplay: body.eventDateDisplay === undefined ? existing.eventDateDisplay : body.eventDateDisplay,
        seminarType: body.seminarType ?? existing.seminarType,
        title: body.title ?? existing.title,
        catchLine: body.catchLine === undefined ? existing.catchLine : body.catchLine,
        heroSub: body.heroSub === undefined ? existing.heroSub : body.heroSub,
        description: body.description ?? existing.description,
        priceDisplay: body.priceDisplay === undefined ? existing.priceDisplay : body.priceDisplay,
        priceNote: body.priceNote === undefined ? existing.priceNote : body.priceNote,
        capacity: body.capacity === undefined ? existing.capacity : body.capacity,
        seatsLeft: body.seatsLeft === undefined ? existing.seatsLeft : body.seatsLeft,
        heroImageKey: body.heroImageKey === undefined ? existing.heroImageKey : body.heroImageKey,
        cardImageKey: body.cardImageKey === undefined ? existing.cardImageKey : body.cardImageKey,
        venueSummary: body.venueSummary === undefined ? existing.venueSummary : body.venueSummary,
        sectionsJson: body.sections ? JSON.stringify(body.sections) : existing.sectionsJson,
        metaDescription: body.metaDescription ?? existing.metaDescription,
        metaKeywords: body.metaKeywords === undefined ? existing.metaKeywords : body.metaKeywords,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(seminars.id, existing.id))
      .run();

    const updated = await db.select().from(seminars).where(eq(seminars.id, existing.id)).get();
    return c.json(toResponse(updated!), 200);
  });

  // PATCH /v1/seminars/{slug}/status ---------------------------------------------
  // 状態遷移専用エンドポイント。「募集開始日による自動状態遷移」は過去に廃止された
  // 経緯があるため、状態は常にこのAPI経由の明示操作でのみ変化させる。
  const updateStatusRoute = createRoute({
    method: "patch",
    path: "/v1/seminars/{slug}/status",
    summary: "セミナーの状態(status)のみを更新",
    tags: ["seminars"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string() }),
      body: { content: { "application/json": { schema: seminarStatusUpdateSchema } } },
    },
    responses: {
      200: { description: "更新後のセミナー", content: { "application/json": { schema: seminarResponseSchema } } },
      401: { description: "認証エラー" },
      404: { description: "見つからない" },
    },
  });

  app.openapi(updateStatusRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const db = getDb(c.env);

    const existing = await db.select({ id: seminars.id }).from(seminars).where(eq(seminars.slug, slug)).get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    await db
      .update(seminars)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(seminars.id, existing.id))
      .run();

    const updated = await db.select().from(seminars).where(eq(seminars.id, existing.id)).get();
    return c.json(toResponse(updated!), 200);
  });

  // DELETE /v1/seminars/{slug} ----------------------------------------------------
  const deleteRoute = createRoute({
    method: "delete",
    path: "/v1/seminars/{slug}",
    summary: "セミナーを削除（?confirm=true必須）",
    tags: ["seminars"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string() }),
      query: z.object({ confirm: z.string().optional() }),
    },
    responses: {
      204: { description: "削除した" },
      400: { description: "?confirm=true が指定されていない" },
      401: { description: "認証エラー" },
      404: { description: "見つからない" },
      409: { description: "申込またはメールテンプレートが既に存在するため削除できない" },
    },
  });

  app.openapi(deleteRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug } = c.req.valid("param");
    const { confirm } = c.req.valid("query");
    if (confirm !== "true") {
      return c.json({ error: "削除には ?confirm=true の指定が必要です" }, 400);
    }

    const db = getDb(c.env);
    const existing = await db.select({ id: seminars.id }).from(seminars).where(eq(seminars.slug, slug)).get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    // 申込・メールテンプレートはFK(seminar_id)で参照しているため、存在する状態で
    // 削除するとFK違反による生の500になる。監査目的で残す価値もあるため、
    // 無条件のカスケード削除はせず明確な409を返す（emails.ts DELETEと同じ方針）。
    const [hasApplication, hasEmailTemplate] = await Promise.all([
      db.select({ id: applications.id }).from(applications).where(eq(applications.seminarId, existing.id)).get(),
      db.select({ id: emailTemplates.id }).from(emailTemplates).where(eq(emailTemplates.seminarId, existing.id)).get(),
    ]);
    if (hasApplication || hasEmailTemplate) {
      return c.json(
        {
          error:
            "このセミナーには申込またはメールテンプレートが存在するため削除できません。PATCH /v1/seminars/{slug}/status で status='closed' にするなどの運用を検討してください",
        },
        409,
      );
    }

    await db.delete(seminars).where(eq(seminars.id, existing.id)).run();
    return c.body(null, 204);
  });
}
