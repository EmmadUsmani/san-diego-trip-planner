import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { dayKeySchema } from "../../shared/schemas";
import type { AppEnv } from "../env";
import { getDb } from "../lib/db";
import { buildTrip } from "../lib/trip";

/** Drive legs between consecutive stops (cached; OSRM then heuristic). */
export const legsRoutes = new Hono<AppEnv>().get("/", zValidator("query", z.object({ day: dayKeySchema.optional() })), async (c) => {
  const trip = await buildTrip(getDb(c), c.env, false);
  const { day } = c.req.valid("query");
  return c.json(trip.days.filter((d) => !day || d.date === day).flatMap((d) => d.legs));
});
