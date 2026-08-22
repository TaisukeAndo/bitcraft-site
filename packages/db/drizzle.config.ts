import type { Config } from "drizzle-kit";

// database_id は Phase 1 の Terraform/Wrangler 実行後に確定する。
// 実装時は `wrangler d1 info bitcraft-cms` 等で確認して環境変数等から設定すること。
export default {
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1-http",
} satisfies Config;
