import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import type { Context } from "hono";
import type { AppEnv } from "../env";

export const getDb = (c: Context<AppEnv>) => drizzle(c.env.DB, { schema });
export type Db = ReturnType<typeof getDb>;
export { schema };

export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
