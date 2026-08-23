import { McpServer } from "@modelcontextprotocol/server";
import type { Bindings } from "./lib/bindings";
import { registerNewsTools } from "./tools/news";
import { registerSeminarTools } from "./tools/seminars";
import { registerEmailTools } from "./tools/emails";
import { registerMediaTools } from "./tools/media";
import { registerApiKeyTools } from "./tools/api-keys";

// bitcraft CMS APIをラップするMCPサーバー本体。ツールごとの実処理は
// apps/apiへのService Binding経由HTTP呼び出しに委譲し、ここではツール定義
// （inputSchema・description）の集約のみを行う（実装計画5章）。
export function createServer(env: Bindings, token: string): McpServer {
  const server = new McpServer({ name: "bitcraft-cms", version: "1.0.0" });
  registerNewsTools(server, env, token);
  registerSeminarTools(server, env, token);
  registerEmailTools(server, env, token);
  registerMediaTools(server, env, token);
  registerApiKeyTools(server, env, token);
  return server;
}
