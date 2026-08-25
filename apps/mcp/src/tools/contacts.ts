import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Bindings } from "../lib/bindings";
import { callApi } from "../lib/api-client";
import { apiResultToToolResult } from "../lib/tool-result";

// お問い合わせ管理のMCPツール。apps/apiの /v1/contacts* を1:1でラップする
// （実装計画5章）。お問い合わせの送信(POST /v1/contacts)自体は公開・認証不要の
// エンドポイントでサイト側のフォームから直接行うものなので、ここでは管理者向けの
// 一覧取得・対応状況更新のみをツール化する。
const statusEnum = z.enum(["received", "replied", "closed"]);

export function registerContactTools(server: McpServer, env: Bindings, token: string) {
  server.registerTool(
    "contact_list",
    {
      description: "お問い合わせ一覧を取得する（submittedAt降順）",
      inputSchema: { status: statusEnum.optional() },
    },
    async ({ status }) => {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      const query = qs.toString();
      return apiResultToToolResult(await callApi(env, token, "GET", `/v1/contacts${query ? `?${query}` : ""}`));
    },
  );

  server.registerTool(
    "contact_update_status",
    {
      description: "お問い合わせの対応状況(status)を更新する",
      inputSchema: { id: z.number().int().positive(), status: statusEnum },
    },
    async ({ id, status }) =>
      apiResultToToolResult(await callApi(env, token, "PATCH", `/v1/contacts/${id}/status`, { status })),
  );
}
