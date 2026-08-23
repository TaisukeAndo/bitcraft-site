import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Bindings } from "../lib/bindings";
import { callApi } from "../lib/api-client";
import { apiResultToToolResult } from "../lib/tool-result";

// APIキー管理のMCPツール。apps/apiの /v1/api-keys* を1:1でラップする（実装計画5章）。
export function registerApiKeyTools(server: McpServer, env: Bindings, token: string) {
  server.registerTool(
    "api_keys_list",
    { description: "APIキー一覧を取得する（トークン自体は含まれない）", inputSchema: {} },
    async () => apiResultToToolResult(await callApi(env, token, "GET", "/v1/api-keys")),
  );

  server.registerTool(
    "api_keys_create",
    {
      description: "APIキーを新規発行する。生トークンはこの応答でのみ表示され、二度と取得できない",
      inputSchema: { label: z.string().min(1) },
    },
    async ({ label }) => apiResultToToolResult(await callApi(env, token, "POST", "/v1/api-keys", { label })),
  );

  server.registerTool(
    "api_keys_revoke",
    { description: "APIキーを失効させる", inputSchema: { id: z.number().int().positive() } },
    async ({ id }) => apiResultToToolResult(await callApi(env, token, "DELETE", `/v1/api-keys/${id}`)),
  );
}
