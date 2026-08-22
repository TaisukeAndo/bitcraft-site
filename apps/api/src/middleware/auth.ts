import type { Context } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { apiKeys } from "@bitcraft/db";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// api_keysテーブルにハッシュ化トークンを複数保持する方式（実装計画4章）。
// 固定シークレット1本より、呼び出し元ごとのラベル付け・失効(revoked_at)を
// Worker再デプロイなしでAPI経由で行えることを優先した。
//
// Hono標準のミドルウェアチェーンではなく、ハンドラ内で呼び出すヘルパー関数と
// して実装している。POST /v1/seminars/:slug/applications（公開・認証不要）と
// GET /v1/seminars/:slug/applications（管理者のみ）のように、同一パスでも
// メソッドによって認可要件が異なるルートがあり、パス単位のミドルウェア適用
// では表現しづらいため。
export async function checkApiKey(c: Context<{ Bindings: Bindings }>): Promise<Response | null> {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const tokenHash = await sha256Hex(token);
  const db = getDb(c.env);
  const row = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.tokenHash, tokenHash), isNull(apiKeys.revokedAt)))
    .get();

  if (!row) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // last_used_at の更新は認証のクリティカルパスをブロックしないよう非同期に行う
  c.executionCtx.waitUntil(
    db.update(apiKeys).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiKeys.id, row.id)).run(),
  );

  return null;
}
