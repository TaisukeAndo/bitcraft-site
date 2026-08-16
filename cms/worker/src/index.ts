// bitcraft-site CMS用 Remote MCPサーバー（Cloudflare Workers + D1）。
//
// 注意: このファイルは `npm install` / `wrangler dev` で一度も実行検証していないscaffoldです
// （このリポジトリの開発環境にwrangler/Cloudflareアカウントの認証が無いため）。
// API呼び出し形（McpAgent.server.registerTool / McpAgent.serve等）はagents@0.20.1・
// @modelcontextprotocol/sdk@1.30.0の型定義ソースと照合済みだが、実行しての確認はできていない。
// Cloudflareアカウント準備後、必ず `cms/worker` で `npm install && npx wrangler dev` して
// 動作確認してから deploy すること。詳細手順は `cms/README.md` を参照。
//
// Phase 1のスコープ: news CRUD + publish のみ。seminar/profile/service用toolは
// tmp/cms-architecture.md のロードマップに沿って後続フェーズで追加する。

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createPublishRequest, getNewsBySlug, insertNews, listNews, updateNewsBySlug } from "./db";
import { requireBearerAuth } from "./auth";
import { dispatchBuildWorkflow } from "./github";
import { NewsCreateSchema, NewsUpdateSchema } from "./validation";

export interface Env {
  DB: D1Database;
  MCP_BEARER_TOKEN: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
}

// created_by の厳密なクライアント識別は未実装（TODO: Phase 2）。
// 複数エージェントを見分けたくなったら、クライアントごとにMCP_BEARER_TOKENを分けて発行し、
// リクエストヘッダから逆引きするか、OAuth化してprops経由でactorを受け取る形に拡張する。
const ACTOR = "mcp-client";

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

export class BitcraftCmsMcp extends McpAgent<Env> {
  server = new McpServer({ name: "bitcraft-cms", version: "0.1.0" });

  async init() {
    // `tool()`はSDK上deprecatedなため、非推奨扱いになっていない`registerTool()`で統一する。
    this.server.registerTool(
      "list_news",
      {
        description: "news記事の一覧を取得する。statusでdraft/publishedを絞り込める（省略時は全件、published_at降順）。",
        inputSchema: { status: z.enum(["draft", "published"]).optional() },
      },
      async ({ status }) => {
        const rows = await listNews(this.env.DB, status);
        return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
      }
    );

    this.server.registerTool(
      "get_news",
      {
        description: "slugを指定してnews記事1件の詳細を取得する。",
        inputSchema: { slug: z.string() },
      },
      async ({ slug }) => {
        const row = await getNewsBySlug(this.env.DB, slug);
        if (!row) {
          return { content: [{ type: "text", text: `記事が見つかりません: ${slug}` }], isError: true };
        }
        return { content: [{ type: "text", text: JSON.stringify(row, null, 2) }] };
      }
    );

    this.server.registerTool(
      "create_news",
      {
        description:
          "ニュース記事をdraftとして新規作成する。作成しただけでは公開されず、publish_newsを呼ぶまでdraftのまま残る。",
        inputSchema: NewsCreateSchema.shape,
      },
      async (input) => {
        try {
          const parsed = NewsCreateSchema.parse(input);
          const row = await insertNews(this.env.DB, parsed, ACTOR);
          return { content: [{ type: "text", text: JSON.stringify(row, null, 2) }] };
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    this.server.registerTool(
      "update_news",
      {
        description: "既存news記事(draft/published問わず)を部分更新する。渡したフィールドだけ更新される。",
        inputSchema: NewsUpdateSchema.shape,
      },
      async (input) => {
        try {
          const { slug, ...patch } = NewsUpdateSchema.parse(input);
          const row = await updateNewsBySlug(this.env.DB, slug, patch, ACTOR);
          return { content: [{ type: "text", text: JSON.stringify(row, null, 2) }] };
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    this.server.registerTool(
      "publish_news",
      {
        description: [
          "指定したslug群をpublishedにし、GitHub Actions(cms-news-build.yml)をworkflow_dispatchで起動する。",
          "ビルドはDB上のpublished記事全件からnews/以下とindex.htmlの#newsセクションを再生成し、",
          "Pull Requestを自動作成する（mainへの自動mergeはしない）。実際のサイト反映にはPRレビュー・",
          "mergeが別途必要（release-pr Skillの安全確認を経由すること）。",
        ].join("\n"),
        inputSchema: { slugs: z.array(z.string()).min(1) },
      },
      async ({ slugs }) => {
        try {
          for (const slug of slugs) {
            await updateNewsBySlug(this.env.DB, slug, { status: "published" }, ACTOR);
          }
          const requestId = await createPublishRequest(this.env.DB, "news", slugs, ACTOR);
          const dispatch = await dispatchBuildWorkflow(this.env, { requestId, slugs });
          return {
            content: [
              {
                type: "text",
                text: `公開ビルドを起動しました。GitHub Actions完了後にPull Requestが自動作成されます。\nrequest_id: ${requestId}\n${JSON.stringify(dispatch)}`,
              },
            ],
          };
        } catch (err) {
          return errorResult(err);
        }
      }
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const authError = requireBearerAuth(request, env);
    if (authError) return authError;
    return BitcraftCmsMcp.serve("/mcp").fetch(request, env, ctx);
  },
};
