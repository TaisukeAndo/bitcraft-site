import { createMcpHandler } from "agents/mcp/server";
import type { Bindings } from "./lib/bindings";
import { createServer } from "./server";

// MCPサーバー（実装計画5章）。apps/apiへのService Binding経由でCMS APIを
// ラップし、認証は`/v1/auth/verify`（apps/api）に一本化する（「mcpはapiに
// 聞くだけ」、認証ロジックの二重実装をしない）。
//
// McpAgent(Durable Object化)ではなく、agents SDK 0.21時点で現行推奨の
// createMcpHandler()（ステートレス、DO不要）を採用している。McpAgentは
// 既存のステートフルなSDK v1デプロイ向けに残された非推奨・機能凍結の
// legacyパスになったため（agents/docs/mcp-servers.md参照）。
function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext): Promise<Response> {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!token) return unauthorized();

    // 認証確認はapps/api側のapi_keysテーブル照合に一本化する。ここでは
    // 「未認証者にtools/listすら見せない」ための事前ゲートとしてのみ使う。
    const verifyRes = await env.API.fetch("https://internal/v1/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!verifyRes.ok) return unauthorized();

    // ステートレス設計のため、リクエストごとに(env, token)をクロージャで
    // 保持したfactoryを都度生成する。McpServer自体の構築コストは軽く、
    // ツール呼び出しの実処理は毎回apps/apiへのfetchで完結するため問題ない。
    const handler = createMcpHandler(() => createServer(env, token));
    return handler(request, env, ctx);
  },
};
