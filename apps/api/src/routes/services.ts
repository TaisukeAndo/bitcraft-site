import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { asc, eq } from "drizzle-orm";
import { services, type ServiceRow } from "@bitcraft/db";
import { serviceCreateSchema, serviceUpdateSchema } from "@bitcraft/shared";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { checkApiKey } from "../middleware/auth";

const serviceResponseSchema = z.object({
  id: z.number(),
  slug: z.string(),
  status: z.enum(["draft", "published"]),
  sortOrder: z.number(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().nullable(),
  href: z.string().nullable(),
  linkTitle: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toResponse(row: ServiceRow): z.infer<typeof serviceResponseSchema> {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    sortOrder: row.sortOrder,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    href: row.href,
    linkTitle: row.linkTitle,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// トップページ#serviceセクションのCRUD。productsと同じ理由（実装計画4章）で
// 全エンドポイントに認証を課す。apps/webはトップページ描画時にstatus='published'を
// sortOrder昇順で直接D1から読む。
export function registerServiceRoutes(app: OpenAPIHono<{ Bindings: Bindings }>) {
  // GET /v1/services -----------------------------------------------------------
  const listRoute = createRoute({
    method: "get",
    path: "/v1/services",
    summary: "Service一覧を取得",
    tags: ["services"],
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
        description: "Service一覧（sortOrder昇順）",
        content: { "application/json": { schema: z.array(serviceResponseSchema) } },
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
      .from(services)
      .where(status ? eq(services.status, status) : undefined)
      .orderBy(asc(services.sortOrder))
      .limit(limit ?? 50)
      .offset(offset ?? 0);

    return c.json(rows.map(toResponse), 200);
  });

  // GET /v1/services/{slug} ---------------------------------------------------
  const getRoute = createRoute({
    method: "get",
    path: "/v1/services/{slug}",
    summary: "Serviceを1件取得",
    tags: ["services"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: { description: "Service", content: { "application/json": { schema: serviceResponseSchema } } },
      401: { description: "認証エラー" },
      404: { description: "見つからない" },
    },
  });

  app.openapi(getRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug } = c.req.valid("param");
    const db = getDb(c.env);
    const row = await db.select().from(services).where(eq(services.slug, slug)).get();
    if (!row) return c.json({ error: "Not Found" }, 404);
    return c.json(toResponse(row), 200);
  });

  // POST /v1/services -----------------------------------------------------------
  const createRouteDef = createRoute({
    method: "post",
    path: "/v1/services",
    summary: "Serviceを新規作成",
    tags: ["services"],
    security: [{ bearerAuth: [] }],
    request: { body: { content: { "application/json": { schema: serviceCreateSchema } } } },
    responses: {
      201: { description: "作成したService", content: { "application/json": { schema: serviceResponseSchema } } },
      401: { description: "認証エラー" },
      409: { description: "同じslugのServiceが既に存在する" },
    },
  });

  app.openapi(createRouteDef, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const body = c.req.valid("json");
    const db = getDb(c.env);

    const existing = await db.select({ id: services.id }).from(services).where(eq(services.slug, body.slug)).get();
    if (existing) {
      return c.json({ error: `slug '${body.slug}' は既に使用されています` }, 409);
    }

    const inserted = await db
      .insert(services)
      .values({
        slug: body.slug,
        status: body.status ?? "published",
        sortOrder: body.sortOrder ?? 0,
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl ?? null,
        href: body.href ?? null,
        linkTitle: body.linkTitle ?? null,
      })
      .returning();

    const row = inserted[0];
    if (!row) return c.json({ error: "作成に失敗しました" }, 409);
    return c.json(toResponse(row), 201);
  });

  // PATCH /v1/services/{slug} ------------------------------------------------------
  const updateRoute = createRoute({
    method: "patch",
    path: "/v1/services/{slug}",
    summary: "Serviceを部分更新",
    tags: ["services"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string() }),
      body: { content: { "application/json": { schema: serviceUpdateSchema } } },
    },
    responses: {
      200: { description: "更新後のService", content: { "application/json": { schema: serviceResponseSchema } } },
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

    const existing = await db.select().from(services).where(eq(services.slug, slug)).get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    await db
      .update(services)
      .set({
        status: body.status ?? existing.status,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        imageUrl: body.imageUrl === undefined ? existing.imageUrl : body.imageUrl,
        href: body.href === undefined ? existing.href : body.href,
        linkTitle: body.linkTitle === undefined ? existing.linkTitle : body.linkTitle,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(services.id, existing.id))
      .run();

    const updated = await db.select().from(services).where(eq(services.id, existing.id)).get();
    return c.json(toResponse(updated!), 200);
  });

  // DELETE /v1/services/{slug} ------------------------------------------------------
  const deleteRoute = createRoute({
    method: "delete",
    path: "/v1/services/{slug}",
    summary: "Serviceを削除（?confirm=true必須）",
    tags: ["services"],
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
    const existing = await db.select({ id: services.id }).from(services).where(eq(services.slug, slug)).get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    await db.delete(services).where(eq(services.id, existing.id)).run();
    return c.body(null, 204);
  });
}
