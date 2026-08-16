export interface AuthEnv {
  MCP_BEARER_TOKEN?: string;
}

/**
 * 共有Bearerトークンによる簡易認証。
 * 複数の外部エージェントに個別の権限スコープを配りたくなったら、
 * Cloudflareの `workers-oauth-provider` を使ったOAuth化に置き換える（tmp/cms-architecture.md §3.2参照）。
 */
export function requireBearerAuth(request: Request, env: AuthEnv): Response | null {
  if (!env.MCP_BEARER_TOKEN) {
    // トークン未設定のまま誤って無認証公開してしまう事故を避けるため、
    // 未設定は「常に拒否」として扱う（wrangler secret put MCP_BEARER_TOKEN が必須）。
    return new Response("MCP_BEARER_TOKEN is not configured on the server", { status: 500 });
  }

  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || token !== env.MCP_BEARER_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
