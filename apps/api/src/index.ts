import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";

// CMS API。news/seminars/media/api-keysの各エンドポイントはPhase 5で実装する
// （実装計画 4章）。ここでは OpenAPIHono による Swagger UI (/v1/docs) の配線と
// ヘルスチェックのみを用意し、以降のフェーズはこの土台にルートを積み増していく。
const app = new OpenAPIHono();

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

app.doc("/v1/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "bitcraft CMS API",
    version: "0.0.0",
    description: "News/セミナーの追加・編集をAPI経由で行うためのCMS API。",
  },
});
app.get("/v1/docs", swaggerUI({ url: "/v1/openapi.json" }));

export default app;
