import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { dayKeySchema, eventCreateSchema, eventUpdateSchema } from "../../shared/schemas";
import { RuleError, applyEventUpdate, assertRemovable, buildNewEvent, bucketByDay, sortEvents } from "../../shared/schedule";
import { TRIP_DAYS } from "../../shared/time";
import type { AppEnv } from "../env";
import { requireAuthForWrites } from "../lib/auth";
import { getDb, newId, schema, type Db } from "../lib/db";

const status = (e: RuleError) => (e.code === "invalid" ? 422 : 409);
const fromRule = (e: unknown): never => {
  if (e instanceof RuleError) throw new HTTPException(status(e), { message: e.message, cause: e.code });
  throw e;
};

async function getEvent(db: Db, id: string) {
  const [e] = await db.select().from(schema.events).where(eq(schema.events.id, id));
  if (!e) throw new HTTPException(404, { message: "Event not found" });
  return e;
}

async function patchEvent(db: Db, id: string, patch: z.infer<typeof eventUpdateSchema>) {
  const existing = await getEvent(db, id);
  let changes;
  try {
    changes = applyEventUpdate(existing, patch);
  } catch (e) {
    return fromRule(e);
  }
  if (changes.placeId) {
    const [p] = await db.select({ id: schema.places.id }).from(schema.places).where(eq(schema.places.id, changes.placeId));
    if (!p) throw new HTTPException(422, { message: "Unknown place" });
  }
  const [updated] = await db
    .update(schema.events)
    .set({ ...changes, updatedAt: new Date().toISOString() })
    .where(eq(schema.events.id, id))
    .returning();
  return updated!;
}

export const eventsRoutes = new Hono<AppEnv>()
  .use(requireAuthForWrites)
  .get("/", zValidator("query", z.object({ day: dayKeySchema.optional() })), async (c) => {
    const all = await getDb(c).select().from(schema.events);
    const { day } = c.req.valid("query");
    if (day) return c.json(bucketByDay(all, TRIP_DAYS).get(day) ?? []);
    return c.json(sortEvents(all));
  })
  .get("/:id", async (c) => c.json(await getEvent(getDb(c), c.req.param("id"))))
  .post("/", zValidator("json", eventCreateSchema), async (c) => {
    const db = getDb(c);
    const body = c.req.valid("json");
    let place = null;
    if (body.placeId) {
      [place = null] = await db.select().from(schema.places).where(eq(schema.places.id, body.placeId));
      if (!place) throw new HTTPException(422, { message: "Unknown place" });
    }
    let row;
    try {
      row = buildNewEvent(body, place, newId("ev"));
    } catch (e) {
      return fromRule(e);
    }
    const [created] = await db.insert(schema.events).values(row).returning();
    return c.json(created!, 201);
  })
  .patch("/:id", zValidator("json", eventUpdateSchema), async (c) => c.json(await patchEvent(getDb(c), c.req.param("id"), c.req.valid("json"))))
  .post("/:id/skip", async (c) => c.json(await patchEvent(getDb(c), c.req.param("id"), { skipped: true })))
  .post("/:id/unskip", async (c) => c.json(await patchEvent(getDb(c), c.req.param("id"), { skipped: false })))
  .delete("/:id", async (c) => {
    const db = getDb(c);
    const existing = await getEvent(db, c.req.param("id"));
    try {
      assertRemovable(existing);
    } catch (e) {
      return fromRule(e);
    }
    await db.delete(schema.events).where(eq(schema.events.id, existing.id));
    return c.json({ ok: true as const });
  });
