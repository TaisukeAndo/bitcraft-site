import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Bindings } from "../lib/bindings";
import { callApi } from "../lib/api-client";
import { apiResultToToolResult } from "../lib/tool-result";

// セミナーごとに複数設定できるメール（申込確認・事前準備案内・前日リマインド等）の
// MCPツール。apps/apiの /v1/seminars/{slug}/emails* を1:1でラップする（実装計画5章）。
// zod v3/v4混在の事情はtools/news.tsのコメント参照。
const emailTriggerShape = z.discriminatedUnion("type", [
  z.object({ type: z.literal("on_submit") }),
  z.object({
    type: z.literal("relative_to_event"),
    offsetDays: z.number().int().describe("開催日基準のオフセット日数。負=開催前、正=開催後"),
    timeJst: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:MM(JST)形式である必要があります"),
  }),
  z.object({ type: z.literal("absolute"), sendAt: z.string().describe("ISO 8601形式(UTC)の送信日時") }),
]);

const emailContentShape = {
  label: z.string().min(1),
  enabled: z.boolean().optional(),
  trigger: emailTriggerShape,
  fromName: z.string().min(1),
  fromEmail: z.string().email().describe("bitcraft.workドメインのアドレスである必要がある"),
  subject: z.string().min(1),
  bodyText: z.string().min(1),
  bodyHtml: z.string().optional(),
  cc: z.array(z.string().email()).optional().describe("Toに加えて常に写しを送りたい宛先"),
  bcc: z.array(z.string().email()).optional().describe("To/Ccに見せずに写しを送りたい宛先"),
};

export function registerEmailTools(server: McpServer, env: Bindings, token: string) {
  server.registerTool(
    "seminar_emails_list",
    { description: "セミナーのメールテンプレート一覧を取得する", inputSchema: { slug: z.string() } },
    async ({ slug }) => apiResultToToolResult(await callApi(env, token, "GET", `/v1/seminars/${slug}/emails`)),
  );

  server.registerTool(
    "seminar_emails_create",
    {
      description:
        "セミナーにメールテンプレートを追加する。trigger.typeは on_submit(申込直後即時) / relative_to_event(開催日基準、offsetDays+timeJstで指定) / absolute(特定日時) のいずれか",
      inputSchema: {
        slug: z.string(),
        key: z.string().min(1).regex(/^[a-z0-9_-]+$/, "keyは英小文字・数字・ハイフン・アンダースコアのみ使用できます"),
        ...emailContentShape,
      },
    },
    async ({ slug, ...body }) =>
      apiResultToToolResult(await callApi(env, token, "POST", `/v1/seminars/${slug}/emails`, body)),
  );

  server.registerTool(
    "seminar_emails_update",
    {
      description: "セミナーのメールテンプレートを更新する",
      inputSchema: {
        slug: z.string(),
        key: z.string(),
        label: emailContentShape.label.optional(),
        enabled: emailContentShape.enabled,
        trigger: emailTriggerShape.optional(),
        fromName: emailContentShape.fromName.optional(),
        fromEmail: emailContentShape.fromEmail.optional(),
        subject: emailContentShape.subject.optional(),
        bodyText: emailContentShape.bodyText.optional(),
        bodyHtml: emailContentShape.bodyHtml,
        cc: emailContentShape.cc,
        bcc: emailContentShape.bcc,
      },
    },
    async ({ slug, key, ...body }) =>
      apiResultToToolResult(await callApi(env, token, "PATCH", `/v1/seminars/${slug}/emails/${key}`, body)),
  );

  server.registerTool(
    "seminar_emails_delete",
    {
      description:
        "セミナーのメールテンプレートを削除する（送信履歴が既にある場合は削除できない。enabled:falseへのupdateで無効化すること）",
      inputSchema: { slug: z.string(), key: z.string() },
    },
    async ({ slug, key }) =>
      apiResultToToolResult(await callApi(env, token, "DELETE", `/v1/seminars/${slug}/emails/${key}`)),
  );
}
