import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { desc, eq } from "drizzle-orm";
import { apiKeys, type ApiKeyRow } from "@bitcraft/db";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { checkApiKey } from "../middleware/auth";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const apiKeyResponseSchema = z.object({
  id: z.number(),
  label: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
});

function toResponse(row: ApiKeyRow): z.infer<typeof apiKeyResponseSchema> {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
  };
}

// APIキー(api_keys)の発行・一覧・失効。生トークンはハッシュ化(SHA-256)して
// 保存し、発行直後のレスポンス以外では二度と表示しない（実装計画4章）。
// 初回キーはブートストラップ時に wrangler d1 execute で手動投入しているため、
// このAPI自体は「既存の有効なキーで認証できること」を前提にした2本目以降用。
export function registerApiKeyRoutes(app: OpenAPIHono<{ Bindings: Bindings }>) {
  // POST /v1/api-keys -----------------------------------------------------------
  const createRouteDef = createRoute({
    method: "post",
    path: "/v1/api-keys",
    summary: "APIキーを新規発行",
    tags: ["api-keys"],
    security: [{ bearerAuth: [] }],
    request: {
      body: { content: { "application/json": { schema: z.object({ label: z.string().min(1) }) } } },
    },
    responses: {
      201: {
        description: "発行したAPIキー。tokenはこのレスポンスでのみ表示される",
        content: {
          "application/json": {
            schema: apiKeyResponseSchema.extend({ token: z.string() }),
          },
        },
      },
      401: { description: "認証エラー" },
    },
  });

  app.openapi(createRouteDef, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { label } = c.req.valid("json");
    const token = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await sha256Hex(token);

    const db = getDb(c.env);
    const inserted = await db.insert(apiKeys).values({ label, tokenHash }).returning();

    const row = inserted[0];
    if (!row) return c.json({ error: "発行に失敗しました" }, 401);
    return c.json({ ...toResponse(row), token }, 201);
  });

  // GET /v1/api-keys -------------------------------------------------------------
  const listRoute = createRoute({
    method: "get",
    path: "/v1/api-keys",
    summary: "APIキー一覧を取得（tokenは含まれない）",
    tags: ["api-keys"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "APIキー一覧", content: { "application/json": { schema: z.array(apiKeyResponseSchema) } } },
      401: { description: "認証エラー" },
    },
  });

  app.openapi(listRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const db = getDb(c.env);
    const rows = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
    return c.json(rows.map(toResponse), 200);
  });

  // DELETE /v1/api-keys/{id} -------------------------------------------------------
  const revokeRoute = createRoute({
    method: "delete",
    path: "/v1/api-keys/{id}",
    summary: "APIキーを失効",
    tags: ["api-keys"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.coerce.number().int().positive() }) },
    responses: {
      204: { description: "失効した" },
      401: { description: "認証エラー" },
      404: { description: "見つからない、または既に失効済み" },
    },
  });

  app.openapi(revokeRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { id } = c.req.valid("param");
    const db = getDb(c.env);
    const existing = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    await db
      .update(apiKeys)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, id))
      .run();
    return c.body(null, 204);
  });
}
