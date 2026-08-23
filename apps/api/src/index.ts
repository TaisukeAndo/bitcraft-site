import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import type { Bindings } from "./lib/bindings";
import { checkApiKey } from "./middleware/auth";
import { registerSeminarApplicationRoutes } from "./routes/seminars";
import { registerEmailTemplateRoutes } from "./routes/emails";
import { runScheduledEmailSweep } from "./scheduled";

// CMS API。news/seminarsのCRUD等はPhase 5で引き続き実装していく
// （実装計画 4章）。ここではOpenAPIHonoによるSwagger UI (/v1/docs) の配線・
// ヘルスチェック・認証確認・セミナー申込/メールテンプレート関連エンドポイントを持つ。
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
registerEmailTemplateRoutes(app);

const emailSweepRoute = createRoute({
  method: "post",
  path: "/v1/admin/email-sweep",
  summary: "開催日基準/絶対日時メールの配信スイープを即時実行する（管理者向け・動作確認/緊急実行用）",
  tags: ["meta"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "スイープ結果",
      content: {
        "application/json": {
          schema: z.object({ checked: z.number(), sent: z.number(), failed: z.number() }),
        },
      },
    },
    401: { description: "認証エラー" },
  },
});

app.openapi(emailSweepRoute, async (c) => {
  const authError = await checkApiKey(c);
  if (authError) return authError;
  const result = await runScheduledEmailSweep(c.env);
  return c.json(result, 200);
});

app.doc("/v1/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "bitcraft CMS API",
    version: "0.0.0",
    description: "News/セミナーの追加・編集、セミナー申込・確認/リマインドメールの受付/配信をAPI経由で行うためのCMS API。",
  },
});
app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  description: "api_keysテーブルで管理するAPIトークン。POST /v1/seminars/{slug}/applications（申込受付）のみ認証不要。",
});
app.get("/v1/docs", swaggerUI({ url: "/v1/openapi.json" }));

export default {
  fetch: app.fetch,
  // Cronトリガー(wrangler.jsonc triggers.crons)から定期的に呼ばれ、開催日基準/
  // 絶対日時のメール(email_templates)の配信要否をチェックする。
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      runScheduledEmailSweep(env).then((result) => {
        console.log(`[scheduled] email sweep: checked=${result.checked} sent=${result.sent} failed=${result.failed}`);
      }),
    );
  },
};
