// MCPサーバー本体（agents/mcp の McpAgent、apps/api への Service Binding経由委譲、
// /v1/auth/verify を使った認証）はPhase 6で実装する（実装計画 5章）。
// 現時点ではデプロイ可能な最小のfetchハンドラのみを置く。
export default {
  async fetch(): Promise<Response> {
    return new Response(JSON.stringify({ ok: true, service: "bitcraft-mcp" }), {
      headers: { "content-type": "application/json" },
    });
  },
};
