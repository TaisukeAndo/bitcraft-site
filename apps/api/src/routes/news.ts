import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { desc, eq } from "drizzle-orm";
import { news, type NewsRow } from "@bitcraft/db";
import { newsCreateSchema, newsUpdateSchema } from "@bitcraft/shared";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { checkApiKey } from "../middleware/auth";

const newsResponseSchema = z.object({
  id: z.number(),
  slug: z.string(),
  status: z.enum(["draft", "published"]),
  date: z.string(),
  tag: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  metaDescription: z.string(),
  metaKeywords: z.string().nullable(),
  ogImageKey: z.string().nullable(),
  bodyHtml: z.string(),
  relatedSeminarSlug: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toResponse(row: NewsRow): z.infer<typeof newsResponseSchema> {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    date: row.date,
    tag: row.tag,
    title: row.title,
    summary: row.summary,
    metaDescription: row.metaDescription,
    metaKeywords: row.metaKeywords,
    ogImageKey: row.ogImageKey,
    bodyHtml: row.bodyHtml,
    relatedSeminarSlug: row.relatedSeminarSlug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// News記事のCRUD。apps/webは公開ページを直接D1から読むため、このAPIの利用者は
// 運用者本人・AIエージェント(MCP経由)のみを想定し、全エンドポイントに認証を課す
// （実装計画4章。GoogleフォームAPIと同列の「公開・認証不要」な用途がないため）。
export function registerNewsRoutes(app: OpenAPIHono<{ Bindings: Bindings }>) {
  // GET /v1/news -----------------------------------------------------------
  const listRoute = createRoute({
    method: "get",
    path: "/v1/news",
    summary: "News記事の一覧を取得",
    tags: ["news"],
    security: [{ bearerAuth: [] }],
    request: {
      query: z.object({
        status: z.enum(["draft", "published"]).optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        offset: z.coerce.number().int().nonnegative().optional(),
      }),
    },
    responses: {
      200: {
        description: "News記事一覧（date降順）",
        content: { "application/json": { schema: z.array(newsResponseSchema) } },
      },
      401: { description: "認証エラー" },
    },
  });

  app.openapi(listRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { status, limit, offset } = c.req.valid("query");
    const db = getDb(c.env);

    const rows = await db
      .select()
      .from(news)
      .where(status ? eq(news.status, status) : undefined)
      .orderBy(desc(news.date))
      .limit(limit ?? 50)
      .offset(offset ?? 0);

    return c.json(rows.map(toResponse), 200);
  });

  // GET /v1/news/{slug} ------------------------------------------------------
  const getRoute = createRoute({
    method: "get",
    path: "/v1/news/{slug}",
    summary: "News記事を1件取得",
    tags: ["news"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: { description: "News記事", content: { "application/json": { schema: newsResponseSchema } } },
      401: { description: "認証エラー" },
      404: { description: "見つからない" },
    },
  });

  app.openapi(getRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug } = c.req.valid("param");
    const db = getDb(c.env);
    const row = await db.select().from(news).where(eq(news.slug, slug)).get();
    if (!row) return c.json({ error: "Not Found" }, 404);
    return c.json(toResponse(row), 200);
  });

  // POST /v1/news -------------------------------------------------------------
  const createRouteDef = createRoute({
    method: "post",
    path: "/v1/news",
    summary: "News記事を新規作成",
    tags: ["news"],
    security: [{ bearerAuth: [] }],
    request: { body: { content: { "application/json": { schema: newsCreateSchema } } } },
    responses: {
      201: { description: "作成した記事", content: { "application/json": { schema: newsResponseSchema } } },
      401: { description: "認証エラー" },
      409: { description: "同じslugの記事が既に存在する" },
    },
  });

  app.openapi(createRouteDef, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const body = c.req.valid("json");
    const db = getDb(c.env);

    const existing = await db.select({ id: news.id }).from(news).where(eq(news.slug, body.slug)).get();
    if (existing) {
      return c.json({ error: `slug '${body.slug}' は既に使用されています` }, 409);
    }

    const inserted = await db
      .insert(news)
      .values({
        slug: body.slug,
        status: body.status ?? "published",
        date: body.date,
        tag: body.tag,
        title: body.title,
        summary: body.summary ?? null,
        metaDescription: body.metaDescription,
        metaKeywords: body.metaKeywords ?? null,
        ogImageKey: body.ogImageKey ?? null,
        bodyHtml: body.bodyHtml,
        relatedSeminarSlug: body.relatedSeminarSlug ?? null,
      })
      .returning();

    const row = inserted[0];
    if (!row) return c.json({ error: "作成に失敗しました" }, 409);
    return c.json(toResponse(row), 201);
  });

  // PATCH /v1/news/{slug} ------------------------------------------------------
  const updateRoute = createRoute({
    method: "patch",
    path: "/v1/news/{slug}",
    summary: "News記事を部分更新",
    tags: ["news"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string() }),
      body: { content: { "application/json": { schema: newsUpdateSchema } } },
    },
    responses: {
      200: { description: "更新後の記事", content: { "application/json": { schema: newsResponseSchema } } },
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

    const existing = await db.select().from(news).where(eq(news.slug, slug)).get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    await db
      .update(news)
      .set({
        status: body.status ?? existing.status,
        date: body.date ?? existing.date,
        tag: body.tag ?? existing.tag,
        title: body.title ?? existing.title,
        summary: body.summary === undefined ? existing.summary : body.summary,
        metaDescription: body.metaDescription ?? existing.metaDescription,
        metaKeywords: body.metaKeywords === undefined ? existing.metaKeywords : body.metaKeywords,
        ogImageKey: body.ogImageKey === undefined ? existing.ogImageKey : body.ogImageKey,
        bodyHtml: body.bodyHtml ?? existing.bodyHtml,
        relatedSeminarSlug:
          body.relatedSeminarSlug === undefined ? existing.relatedSeminarSlug : body.relatedSeminarSlug,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(news.id, existing.id))
      .run();

    const updated = await db.select().from(news).where(eq(news.id, existing.id)).get();
    return c.json(toResponse(updated!), 200);
  });

  // DELETE /v1/news/{slug} ------------------------------------------------------
  const deleteRoute = createRoute({
    method: "delete",
    path: "/v1/news/{slug}",
    summary: "News記事を削除（?confirm=true必須）",
    tags: ["news"],
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
    const existing = await db.select({ id: news.id }).from(news).where(eq(news.slug, slug)).get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    await db.delete(news).where(eq(news.id, existing.id)).run();
    return c.body(null, 204);
  });
}
