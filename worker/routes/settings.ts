import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { settingsUpdateSchema } from "../../shared/schemas";
import type { AppEnv } from "../env";
import { requireAuthForWrites } from "../lib/auth";
import { getDb } from "../lib/db";
import { readSettings, writeSettings } from "../lib/settings";

export const settingsRoutes = new Hono<AppEnv>()
  .use(requireAuthForWrites)
  .get("/", async (c) => c.json(await readSettings(getDb(c), c.get("authed"))))
  .put("/", zValidator("json", settingsUpdateSchema), async (c) => {
    const db = getDb(c);
    await writeSettings(db, c.req.valid("json"));
    return c.json(await readSettings(db, true));
  });
