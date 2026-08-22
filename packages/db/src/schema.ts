// D1（bitcraft-cms）スキーマ定義の単一ソース。
//
// news / seminars / media / api_keys の各テーブル定義は Phase 2 で実装する
// （drizzle-orm/sqlite-core の sqliteTable を使用）。
// マイグレーションSQLは `pnpm --filter @bitcraft/db generate` で ./migrations に
// 生成し、適用は `wrangler d1 migrations apply bitcraft-cms --remote` で行う
// （Drizzle Kitでは適用しない。履歴管理をWranglerの d1_migrations テーブルに一本化するため）。
export {};
