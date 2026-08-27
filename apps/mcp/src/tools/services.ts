import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Bindings } from "../lib/bindings";
import { callApi } from "../lib/api-client";
import { apiResultToToolResult, jsonResult } from "../lib/tool-result";

// トップページ#serviceセクションCRUDのMCPツール。apps/apiの /v1/services* を
// 1:1でラップする（products.ts/news.tsと同じ理由でzod v4形状を再定義している）。
const serviceCreateShape = {
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slugは英小文字・数字・ハイフンのみ使用できます"),
  status: z.enum(["draft", "published"]).optional(),
  sortOrder: z.number().int().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().optional(),
  imageKey: z.string().optional(),
  href: z.string().optional(),
  linkTitle: z.string().optional(),
};

const serviceUpdateShape = {
  status: serviceCreateShape.status,
  sortOrder: serviceCreateShape.sortOrder,
  title: serviceCreateShape.title.optional(),
  description: serviceCreateShape.description.optional(),
  imageUrl: serviceCreateShape.imageUrl,
  imageKey: serviceCreateShape.imageKey,
  href: serviceCreateShape.href,
  linkTitle: serviceCreateShape.linkTitle,
};

export function registerServiceTools(server: McpServer, env: Bindings, token: string) {
  server.registerTool(
    "service_list",
    {
      description: "トップページ#serviceセクションの一覧を取得する（sortOrder昇順）",
      inputSchema: {
        status: z.enum(["draft", "published"]).optional(),
        limit: z.number().int().positive().max(100).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async ({ status, limit, offset }) => {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (limit !== undefined) qs.set("limit", String(limit));
      if (offset !== undefined) qs.set("offset", String(offset));
      const query = qs.toString();
      return apiResultToToolResult(await callApi(env, token, "GET", `/v1/services${query ? `?${query}` : ""}`));
    },
  );

  server.registerTool(
    "service_get",
    { description: "Serviceを1件取得する", inputSchema: { slug: z.string() } },
    async ({ slug }) => apiResultToToolResult(await callApi(env, token, "GET", `/v1/services/${slug}`)),
  );

  server.registerTool(
    "service_create",
    { description: "Serviceを新規作成する", inputSchema: serviceCreateShape },
    async (input) => apiResultToToolResult(await callApi(env, token, "POST", "/v1/services", input)),
  );

  server.registerTool(
    "service_update",
    { description: "Serviceを部分更新する", inputSchema: { slug: z.string(), ...serviceUpdateShape } },
    async ({ slug, ...body }) =>
      apiResultToToolResult(await callApi(env, token, "PATCH", `/v1/services/${slug}`, body)),
  );

  server.registerTool(
    "service_delete",
    {
      description: "Serviceを削除する（confirm=trueの指定が必須）",
      inputSchema: { slug: z.string(), confirm: z.boolean() },
    },
    async ({ slug, confirm }) => {
      if (!confirm) return jsonResult({ error: "confirm=trueの指定が必要です" }, true);
      return apiResultToToolResult(await callApi(env, token, "DELETE", `/v1/services/${slug}?confirm=true`));
    },
  );
}
