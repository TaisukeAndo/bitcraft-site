import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import type { Bindings } from "./lib/bindings";
import { checkApiKey } from "./middleware/auth";
import { registerSeminarApplicationRoutes } from "./routes/seminars";

// CMS API。news/seminarsのCRUD等はPhase 5で引き続き実装していく
// （実装計画 4章）。ここではOpenAPIHonoによるSwagger UI (/v1/docs) の配線・
// ヘルスチェック・認証確認・セミナー申込関連エンドポイントを持つ。
const app = new OpenAPIHono<{ Bindings: Bindings }>();

const healthRoute = createRoute({
  method: "get",
  path: "/v1/health",
  summary: "ヘルスチェック",
  tags: ["meta"],
  responses: {
    200: {
      description: "OK",
      content: {
        "application/json": {
          schema: z.object({ ok: z.boolean() }),
        },
      },
    },
  },
});

app.openapi(healthRoute, (c) => c.json({ ok: true }));

const authVerifyRoute = createRoute({
  method: "get",
  path: "/v1/auth/verify",
  summary: "認証確認（apps/mcpからの利用想定）",
  tags: ["meta"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "認証OK" },
    401: { description: "認証エラー" },
  },
});

app.openapi(authVerifyRoute, async (c) => {
  const authError = await checkApiKey(c);
  if (authError) return authError;
  return c.json({ ok: true });
});

registerSeminarApplicationRoutes(app);

app.doc("/v1/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "bitcraft CMS API",
    version: "0.0.0",
    description: "News/セミナーの追加・編集、セミナー申込の受付をAPI経由で行うためのCMS API。",
  },
});
app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  description: "api_keysテーブルで管理するAPIトークン。POST /v1/seminars/{slug}/applications（申込受付）のみ認証不要。",
});
app.get("/v1/docs", swaggerUI({ url: "/v1/openapi.json" }));

export default app;
