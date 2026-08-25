import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { CONTACT_EMAIL_TOKENS } from "@bitcraft/shared";
import type { Bindings } from "../lib/bindings";
import { callApi } from "../lib/api-client";
import { apiResultToToolResult } from "../lib/tool-result";

// お問い合わせの通知メール(notification)・自動返信メール(confirmation)の文面
// 設定のMCPツール。apps/apiの /v1/contact-email-templates* を1:1でラップする
// （実装計画5章）。tools/emails.tsのemailContentShapeと共通のフィールド構成だが、
// Contactはキー固定・常に即時送信のためtrigger/keyは持たない
// （zod v3/v4混在の事情はtools/news.tsのコメント参照。CONTACT_EMAIL_TOKENSは
// zodを含まない素のstring[]なのでこの制約と無関係にimportできる）。
const keyEnum = z.enum(["notification", "confirmation"]);

// プレースホルダー一覧はCONTACT_EMAIL_TOKENS（apps/api/src/routes/
// contact-emails.tsの未知トークン検証と同じ単一の情報源）から動的に生成する
// （tools/emails.tsのSEMINAR_TOKEN_HINTと同じ理由。ハードコードした一覧と
// コード上の実態がずれる事故を防ぐ）。
const CONTACT_TOKEN_HINT = `使えるプレースホルダー: ${CONTACT_EMAIL_TOKENS.map((t) => `{{${t}}}`).join(", ")}（それ以外の{{...}}は送信時に空文字になる）`;

const contentShape = {
  label: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  fromName: z.string().min(1).optional(),
  fromEmail: z.string().email().describe("bitcraft.workドメインのアドレスである必要がある").optional(),
  subject: z.string().min(1).optional(),
  bodyText: z.string().min(1).optional(),
  bodyHtml: z.string().optional(),
  cc: z.array(z.string().email()).optional().describe("Toに加えて常に写しを送りたい宛先"),
  bcc: z.array(z.string().email()).optional().describe("To/Ccに見せずに写しを送りたい宛先"),
  testSendTo: z
    .string()
    .email()
    .optional()
    .describe("指定すると保存と同時にこのアドレス宛のテスト送信も行う（実際の問い合わせには記録されない）"),
};

export function registerContactEmailTools(server: McpServer, env: Bindings, token: string) {
  server.registerTool(
    "contact_email_templates_list",
    {
      description:
        "お問い合わせの通知・自動返信メール設定を取得する（未設定のキーはデフォルト文面を返す）",
      inputSchema: {},
    },
    async () => apiResultToToolResult(await callApi(env, token, "GET", "/v1/contact-email-templates")),
  );

  server.registerTool(
    "contact_email_templates_update",
    {
      description: `お問い合わせの通知(notification)・自動返信(confirmation)メールの文面を更新する（未設定なら新規作成）。${CONTACT_TOKEN_HINT}`,
      inputSchema: { key: keyEnum, ...contentShape },
    },
    async ({ key, ...body }) =>
      apiResultToToolResult(await callApi(env, token, "PATCH", `/v1/contact-email-templates/${key}`, body)),
  );
}
