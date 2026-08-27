import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Bindings } from "../lib/bindings";
import { callApi } from "../lib/api-client";
import { apiResultToToolResult, jsonResult } from "../lib/tool-result";

// トップページ#idea(表示名はProduct)セクションCRUDのMCPツール。apps/apiの
// /v1/products* を1:1でラップする（news.tsと同じ理由でzod v4形状を再定義している）。
const productCreateShape = {
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slugは英小文字・数字・ハイフンのみ使用できます"),
  status: z.enum(["draft", "published"]).optional(),
  sortOrder: z.number().int().optional(),
  title: z.string().min(1),
  subTitle: z.string().optional(),
  description: z.string().min(1),
  imageUrl: z.string().optional(),
  imageKey: z.string().optional(),
  href: z.string().optional(),
  linkTitle: z.string().optional(),
};

const productUpdateShape = {
  status: productCreateShape.status,
  sortOrder: productCreateShape.sortOrder,
  title: productCreateShape.title.optional(),
  subTitle: productCreateShape.subTitle,
  description: productCreateShape.description.optional(),
  imageUrl: productCreateShape.imageUrl,
  imageKey: productCreateShape.imageKey,
  href: productCreateShape.href,
  linkTitle: productCreateShape.linkTitle,
};

export function registerProductTools(server: McpServer, env: Bindings, token: string) {
  server.registerTool(
    "product_list",
    {
      description: "トップページ#ideaセクション(Product)の一覧を取得する（sortOrder昇順）",
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
      return apiResultToToolResult(await callApi(env, token, "GET", `/v1/products${query ? `?${query}` : ""}`));
    },
  );

  server.registerTool(
    "product_get",
    { description: "Productを1件取得する", inputSchema: { slug: z.string() } },
    async ({ slug }) => apiResultToToolResult(await callApi(env, token, "GET", `/v1/products/${slug}`)),
  );

  server.registerTool(
    "product_create",
    { description: "Productを新規作成する", inputSchema: productCreateShape },
    async (input) => apiResultToToolResult(await callApi(env, token, "POST", "/v1/products", input)),
  );

  server.registerTool(
    "product_update",
    { description: "Productを部分更新する", inputSchema: { slug: z.string(), ...productUpdateShape } },
    async ({ slug, ...body }) =>
      apiResultToToolResult(await callApi(env, token, "PATCH", `/v1/products/${slug}`, body)),
  );

  server.registerTool(
    "product_delete",
    {
      description: "Productを削除する（confirm=trueの指定が必須）",
      inputSchema: { slug: z.string(), confirm: z.boolean() },
    },
    async ({ slug, confirm }) => {
      if (!confirm) return jsonResult({ error: "confirm=trueの指定が必要です" }, true);
      return apiResultToToolResult(await callApi(env, token, "DELETE", `/v1/products/${slug}?confirm=true`));
    },
  );
}
