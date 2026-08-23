import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Bindings } from "../lib/bindings";
import { callApi } from "../lib/api-client";
import { apiResultToToolResult, jsonResult } from "../lib/tool-result";

// News記事CRUDのMCPツール。apps/apiの /v1/news* を1:1でラップする（実装計画5章）。
//
// inputSchemaはpackages/sharedのzodスキーマを再利用したいところだが、
// @modelcontextprotocol/serverのregisterTool()はzod v4のZodRawShapeを要求する一方
// packages/shared・apps/apiはzod v3系（@hono/zod-openapiの制約）で統一している
// ため、apps/mcpだけzod v4を別途インストールしてここに同じ形を再定義している
// （package.json参照）。実際のバリデーションの正はapps/api側のzod v3スキーマに
// あり、ここでの定義はMCPクライアントへ提示するツール入力形状の説明に過ぎない。
const newsCreateShape = {
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slugは英小文字・数字・ハイフンのみ使用できます"),
  status: z.enum(["draft", "published"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式である必要があります"),
  tag: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  metaDescription: z.string().min(1),
  metaKeywords: z.string().optional(),
  ogImageKey: z.string().optional(),
  bodyHtml: z.string().min(1),
  relatedSeminarSlug: z.string().optional(),
};

const newsUpdateShape = {
  status: newsCreateShape.status,
  date: newsCreateShape.date.optional(),
  tag: newsCreateShape.tag.optional(),
  title: newsCreateShape.title.optional(),
  summary: newsCreateShape.summary,
  metaDescription: newsCreateShape.metaDescription.optional(),
  metaKeywords: newsCreateShape.metaKeywords,
  ogImageKey: newsCreateShape.ogImageKey,
  bodyHtml: newsCreateShape.bodyHtml.optional(),
  relatedSeminarSlug: newsCreateShape.relatedSeminarSlug,
};

export function registerNewsTools(server: McpServer, env: Bindings, token: string) {
  server.registerTool(
    "news_list",
    {
      description: "News記事の一覧を取得する（date降順）",
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
      return apiResultToToolResult(await callApi(env, token, "GET", `/v1/news${query ? `?${query}` : ""}`));
    },
  );

  server.registerTool(
    "news_get",
    { description: "News記事を1件取得する", inputSchema: { slug: z.string() } },
    async ({ slug }) => apiResultToToolResult(await callApi(env, token, "GET", `/v1/news/${slug}`)),
  );

  server.registerTool(
    "news_create",
    { description: "News記事を新規作成する", inputSchema: newsCreateShape },
    async (input) => apiResultToToolResult(await callApi(env, token, "POST", "/v1/news", input)),
  );

  server.registerTool(
    "news_update",
    { description: "News記事を部分更新する", inputSchema: { slug: z.string(), ...newsUpdateShape } },
    async ({ slug, ...body }) => apiResultToToolResult(await callApi(env, token, "PATCH", `/v1/news/${slug}`, body)),
  );

  server.registerTool(
    "news_delete",
    {
      description: "News記事を削除する（confirm=trueの指定が必須）",
      inputSchema: { slug: z.string(), confirm: z.boolean() },
    },
    async ({ slug, confirm }) => {
      if (!confirm) return jsonResult({ error: "confirm=trueの指定が必要です" }, true);
      return apiResultToToolResult(await callApi(env, token, "DELETE", `/v1/news/${slug}?confirm=true`));
    },
  );
}
