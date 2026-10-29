import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { categorySchema, placeCreateSchema, placeUpdateSchema } from "../../shared/schemas";
import { sortEvents } from "../../shared/schedule";
import type { AppEnv } from "../env";
import { requireAuthForWrites } from "../lib/auth";
import { getDb, newId, schema } from "../lib/db";
import { geocode } from "../lib/geocode";
import { invalidateLegsForPlace } from "../lib/legs";
import { isIdeaPlace, loadPlacesWithUsage } from "../lib/trip";

export const placesRoutes = new Hono<AppEnv>()
  .use(requireAuthForWrites)
  .get("/", zValidator("query", z.object({ category: categorySchema.optional() })), async (c) => {
    const { category } = c.req.valid("query");
    const all = await loadPlacesWithUsage(getDb(c));
    return c.json(category ? all.filter((p) => p.category === category) : all);
  })
  .get("/:id", async (c) => {
    const db = getDb(c);
    const id = c.req.param("id");
    const place = (await loadPlacesWithUsage(db)).find((p) => p.id === id);
    if (!place) throw new HTTPException(404, { message: "Place not found" });
    const events = sortEvents(await db.select().from(schema.events).where(eq(schema.events.placeId, id)));
    return c.json({ place, events });
  })
  .post("/", zValidator("json", placeCreateSchema), async (c) => {
    const body = c.req.valid("json");
    let { lat, lng } = body;
    if (lat === undefined || lng === undefined) {
      const hit = await geocode(body.address);
      if (!hit) throw new HTTPException(422, { message: "Couldn't find that address. Check it and try again." });
      lat = hit.lat;
      lng = hit.lng;
    }
    const row = {
      id: newId("pl"),
      name: body.name,
      category: body.category,
      address: body.address,
      lat,
      lng,
      neighborhood: body.neighborhood ?? "",
      tags: body.tags ?? [],
      links: body.links ?? [],
      defaultDurationMin: body.defaultDurationMin ?? null,
      hoursText: body.hoursText ?? "",
      notes: body.notes ?? "",
    };
    const [created] = await getDb(c).insert(schema.places).values(row).returning();
    return c.json({ ...created!, eventCount: 0 }, 201);
  })
  .patch("/:id", zValidator("json", placeUpdateSchema), async (c) => {
    const db = getDb(c);
    const id = c.req.param("id");
    const [existing] = await db.select().from(schema.places).where(eq(schema.places.id, id));
    if (!existing) throw new HTTPException(404, { message: "Place not found" });
    const patch = { ...c.req.valid("json") };
    if (patch.address !== undefined && patch.address !== existing.address && patch.lat === undefined && patch.lng === undefined) {
      const hit = await geocode(patch.address);
      if (!hit) throw new HTTPException(422, { message: "Couldn't find that address. Check it and try again." });
      patch.lat = hit.lat;
      patch.lng = hit.lng;
    }
    const moved = (patch.lat !== undefined && patch.lat !== existing.lat) || (patch.lng !== undefined && patch.lng !== existing.lng);
    await db.update(schema.places).set({ ...patch, updatedAt: new Date().toISOString() }).where(eq(schema.places.id, id));
    if (moved) await invalidateLegsForPlace(db, id);
    const place = (await loadPlacesWithUsage(db)).find((p) => p.id === id)!;
    return c.json(place);
  })
  .delete("/:id", async (c) => {
    const db = getDb(c);
    const id = c.req.param("id");
    const [existing] = await db.select().from(schema.places).where(eq(schema.places.id, id));
    if (!existing) throw new HTTPException(404, { message: "Place not found" });
    const evs = await db.select().from(schema.events).where(eq(schema.events.placeId, id));
    if (evs.some((e) => e.kind === "locked")) {
      throw new HTTPException(409, { message: "This place has a locked event (check-in/out) and can't be removed" });
    }
    await db.delete(schema.events).where(eq(schema.events.placeId, id));
    await db.delete(schema.places).where(eq(schema.places.id, id));
    await invalidateLegsForPlace(db, id);
    return c.json({ ok: true as const, removedEvents: evs.length });
  });

/** Ideas: activity/food places that no event references. */
export const ideasRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const all = await loadPlacesWithUsage(getDb(c));
  return c.json(all.filter(isIdeaPlace));
});
