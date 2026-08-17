// bitcraft-site CMS用 Worker。2つの役割を1つのWorkerが兼ねる:
//   1. `/mcp` — Remote MCPサーバー（他エージェントからのnews CRUD/publish操作）
//   2. `/`・`/news`・`/news/<slug>/` — 動的SSR（D1の内容をリクエスト毎にHTMLへレンダリング）
// それ以外のパス（/service/, /contact/, /image/等、CMS管理下にない既存の静的ページ）は
// すべてオリジン（GitHub Pages）へそのまま素通しする。DBを更新した瞬間から本番に反映され、
// 旧cms/build/のような「ビルド→PR→merge」の待ち時間は無い。
//
// 本番運用にはCloudflare側でこのWorkerを bitcraft.work の `/`・`/news`・`/news/*` に
// Route登録し、ドメインのDNSをCloudflare経由（proxied）にする必要がある。詳細はcms/README.md参照。
//
// ローカルDocker環境で実際に動作検証済み（tools/list・news CRUD・SSR描画・オリジン素通し）。
// 実際のCloudflare Route登録・DNS切替は未検証（この環境に認証情報が無いため）。

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getNewsBySlug, insertNews, listNews, updateNewsBySlug } from "./db";
import { requireBearerAuth } from "./auth";
import { NewsCreateSchema, NewsUpdateSchema } from "./validation";
import { patchHomepageNews, renderNewsDetailPage, renderNewsListPage, selectTopRows, type NewsRow } from "./render";

export interface Env {
  DB: D1Database;
  MCP_BEARER_TOKEN: string;
  // ローカル/検証環境専用。設定されている間は素通し先をこのURLに固定する
  // （本番ではCloudflareのRoute経由の`fetch(request)`が正しいオリジンに届くため未設定のままでよい）。
  ORIGIN_BASE_URL?: string;
}

// created_by の厳密なクライアント識別は未実装（TODO: Phase 2）。
// 複数エージェントを見分けたくなったら、クライアントごとにMCP_BEARER_TOKENを分けて発行し、
// リクエストヘッダから逆引きするか、OAuth化してprops経由でactorを受け取る形に拡張する。
const ACTOR = "mcp-client";

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function htmlResponse(html: string, init: ResponseInit = {}): Response {
  return new Response(html, {
    ...init,
    headers: { "content-type": "text/html; charset=UTF-8", ...init.headers },
  });
}

/**
 * CMS管理下でないパス（/service/, /contact/, /image/, /news/配下の静的アセット等）を
 * オリジン(GitHub Pages)へ素通しする。
 */
async function fetchOrigin(request: Request, env: Env): Promise<Response> {
  if (env.ORIGIN_BASE_URL) {
    const url = new URL(request.url);
    return fetch(`${env.ORIGIN_BASE_URL}${url.pathname}${url.search}`);
  }
  // 本番（Cloudflareがゾーンの手前にいる想定）ではfetch(request)がこのWorkerを再度呼ばず、
  // 本来のオリジンへ届く（Cloudflareが「同一ゾーン・同一Routeへのfetch」の標準パターンとして
  // ドキュメント化している挙動）。ローカルdevでは必ずORIGIN_BASE_URLを設定すること
  // （さもないと自分自身への再帰fetchになってしまう）。
  return fetch(request);
}

async function handleHomepage(request: Request, env: Env): Promise<Response> {
  const originRes = await fetchOrigin(request, env);
  if (!originRes.ok) return originRes;
  const html = await originRes.text();
  const rows = (await listNews(env.DB, "published")) as NewsRow[];
  const patched = patchHomepageNews(html, selectTopRows(rows));
  return htmlResponse(patched, { status: originRes.status });
}

async function handleNewsList(env: Env): Promise<Response> {
  const rows = (await listNews(env.DB, "published")) as NewsRow[];
  return htmlResponse(renderNewsListPage(rows));
}

async function handleNewsDetail(env: Env, slug: string): Promise<Response> {
  const row = await getNewsBySlug(env.DB, slug);
  if (!row || row.status !== "published") {
    return new Response("Not Found", { status: 404 });
  }
  return htmlResponse(renderNewsDetailPage(row as NewsRow));
}

export class BitcraftCmsMcp extends McpAgent<Env> {
  server = new McpServer({ name: "bitcraft-cms", version: "0.2.0" });

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
          "指定したslug群をpublishedにする。DBを更新した直後から https://bitcraft.work/news/ 以下に",
          "動的に反映される（ビルド・Pull Request・デプロイは不要、mainブランチへのgit操作も発生しない）。",
        ].join("\n"),
        inputSchema: { slugs: z.array(z.string()).min(1) },
      },
      async ({ slugs }) => {
        try {
          const updated = [];
          for (const slug of slugs) {
            updated.push(await updateNewsBySlug(this.env.DB, slug, { status: "published" }, ACTOR));
          }
          return {
            content: [
              {
                type: "text",
                text: `公開しました。次のアクセスから本番に反映されます。\n${JSON.stringify(updated, null, 2)}`,
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
    const url = new URL(request.url);

    if (url.pathname === "/mcp") {
      const authError = requireBearerAuth(request, env);
      if (authError) return authError;
      return BitcraftCmsMcp.serve("/mcp").fetch(request, env, ctx);
    }

    if (request.method === "GET" || request.method === "HEAD") {
      if (url.pathname === "/") {
        return handleHomepage(request, env);
      }
      if (url.pathname === "/news" || url.pathname === "/news/") {
        return handleNewsList(env);
      }
      const detailMatch = url.pathname.match(/^\/news\/([a-z0-9][a-z0-9-]*)\/?$/);
      if (detailMatch) {
        return handleNewsDetail(env, detailMatch[1]);
      }
    }

    // /news/配下の静的アセット(css/画像)や、CMS管理下でないその他すべてのパスはオリジンへ素通し。
    return fetchOrigin(request, env);
  },
};
