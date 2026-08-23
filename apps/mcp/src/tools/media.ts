import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Bindings } from "../lib/bindings";
import { callApi, callApiForm } from "../lib/api-client";
import { apiResultToToolResult, jsonResult } from "../lib/tool-result";

const PURPOSES = ["news_og", "seminar_hero", "seminar_card", "seminar_speaker", "other"] as const;
const OWNER_TYPES = ["news", "seminar"] as const;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// R2メディアアップロードのMCPツール。apps/apiの /v1/media はmultipart/form-data
// だが、MCPツールの入力はJSONのみのため、Base64エンコードした画像データを
// 受け取ってFormDataに変換してから転送する（実装計画5章の「大容量はREST直接
// 利用を案内」の通り、大きなファイルはこのツールでなくREST APIを直接使うこと）。
export function registerMediaTools(server: McpServer, env: Bindings, token: string) {
  server.registerTool(
    "media_upload",
    {
      description:
        "画像をBase64エンコードした文字列としてR2へアップロードする。大きなファイルはPOST /v1/mediaへの直接アップロードを推奨",
      inputSchema: {
        dataBase64: z.string().describe("画像データをBase64エンコードした文字列"),
        filename: z.string(),
        contentType: z.string(),
        key: z.string().optional().describe("R2オブジェクトキー。省略時はpurpose/ownerType/ownerSlugから自動生成"),
        purpose: z.enum(PURPOSES).optional(),
        ownerType: z.enum(OWNER_TYPES).optional(),
        ownerSlug: z.string().optional(),
      },
    },
    async ({ dataBase64, filename, contentType, key, purpose, ownerType, ownerSlug }) => {
      let bytes: Uint8Array;
      try {
        bytes = base64ToBytes(dataBase64);
      } catch {
        return jsonResult({ error: "dataBase64のデコードに失敗しました" }, true);
      }
      const form = new FormData();
      form.append("file", new File([bytes], filename, { type: contentType }));
      if (key) form.append("key", key);
      if (purpose) form.append("purpose", purpose);
      if (ownerType) form.append("ownerType", ownerType);
      if (ownerSlug) form.append("ownerSlug", ownerSlug);
      return apiResultToToolResult(await callApiForm(env, token, "/v1/media", form));
    },
  );

  server.registerTool(
    "media_list",
    {
      description: "メディア一覧を取得する",
      inputSchema: { ownerType: z.enum(OWNER_TYPES).optional(), ownerSlug: z.string().optional() },
    },
    async ({ ownerType, ownerSlug }) => {
      const qs = new URLSearchParams();
      if (ownerType) qs.set("ownerType", ownerType);
      if (ownerSlug) qs.set("ownerSlug", ownerSlug);
      const query = qs.toString();
      return apiResultToToolResult(await callApi(env, token, "GET", `/v1/media${query ? `?${query}` : ""}`));
    },
  );

  server.registerTool(
    "media_delete",
    { description: "メディアを削除する（R2オブジェクトごと削除）", inputSchema: { key: z.string() } },
    async ({ key }) =>
      apiResultToToolResult(await callApi(env, token, "DELETE", `/v1/media?key=${encodeURIComponent(key)}`)),
  );
}
