import { drizzle } from "drizzle-orm/d1";
import * as schema from "@bitcraft/db";
import type { Bindings } from "./bindings";

// apps/web はD1に対して読み取り専用で使う（コード規約上、SELECT以外は
// apps/api側からのみ発行する。マイグレーション適用もapps/api側のみが担う。
// 実装計画 2章）。
export function getDb(env: Bindings) {
  return drizzle(env.DB, { schema });
}
