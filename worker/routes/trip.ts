import { Hono } from "hono";
import type { AppEnv } from "../env";
import { getDb } from "../lib/db";
import { buildTrip } from "../lib/trip";

/** Everything the schedule/overview needs in one call. */
export const tripRoutes = new Hono<AppEnv>().get("/", async (c) => c.json(await buildTrip(getDb(c), c.env, c.get("authed"))));
