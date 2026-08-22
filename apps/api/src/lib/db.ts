import { drizzle } from "drizzle-orm/d1";
import * as schema from "@bitcraft/db";
import type { Bindings } from "./bindings";

export function getDb(env: Bindings) {
  return drizzle(env.DB, { schema });
}
