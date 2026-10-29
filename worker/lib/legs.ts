import { eq, or } from "drizzle-orm";
import { addMinutes } from "../../shared/time";
import { heuristicTravel } from "../../shared/travel";
import type { LegSpec } from "../../shared/schedule";
import type { Leg, Place } from "../../shared/types";
import type { Db } from "./db";
import { schema } from "./db";
import type { Env } from "../env";

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const HEURISTIC_RETRY_MS = 6 * 3600_000;

export interface LegMetrics {
  minutes: number;
  miles: number;
  source: "osrm" | "heuristic";
}

export async function osrmRoute(a: Place, b: Place): Promise<LegMetrics | null> {
  try {
    const res = await fetch(`${OSRM}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { code?: string; routes?: { distance: number; duration: number }[] };
    const r = json.routes?.[0];
    if (json.code !== "Ok" || !r) return null;
    return { minutes: Math.max(1, Math.round(r.duration / 60)), miles: Math.round((r.distance / 1609.344) * 10) / 10, source: "osrm" };
  } catch {
    return null;
  }
}

/** Cached (from,to) metrics: OSRM first, heuristic fallback. Misses are computed in parallel and persisted. */
export async function resolveLegMetrics(
  db: Db,
  env: Pick<Env, "OSRM_DISABLED">,
  pairs: { from: Place; to: Place }[],
): Promise<Map<string, LegMetrics>> {
  const key = (f: string, t: string) => `${f}>${t}`;
  const out = new Map<string, LegMetrics>();
  const cached = await db.select().from(schema.travelLegs);
  const cacheMap = new Map(cached.map((r) => [key(r.fromPlaceId, r.toPlaceId), r]));
  const unique = new Map(pairs.map((p) => [key(p.from.id, p.to.id), p]));
  const misses: { k: string; from: Place; to: Place }[] = [];
  for (const [k, p] of unique) {
    const hit = cacheMap.get(k);
    const stale = hit && hit.source === "heuristic" && !env.OSRM_DISABLED && Date.now() - Date.parse(hit.computedAt) > HEURISTIC_RETRY_MS;
    if (hit && !stale) out.set(k, { minutes: hit.minutes, miles: hit.miles, source: hit.source });
    else misses.push({ k, from: p.from, to: p.to });
  }
  await Promise.all(
    misses.map(async ({ k, from, to }) => {
      const m = (!env.OSRM_DISABLED && (await osrmRoute(from, to))) || { ...heuristicTravel(from, to), source: "heuristic" as const };
      out.set(k, m);
      await db
        .insert(schema.travelLegs)
        .values({ fromPlaceId: from.id, toPlaceId: to.id, ...m, computedAt: new Date().toISOString() })
        .onConflictDoUpdate({
          target: [schema.travelLegs.fromPlaceId, schema.travelLegs.toPlaceId],
          set: { ...m, computedAt: new Date().toISOString() },
        });
    }),
  );
  return out;
}

export async function invalidateLegsForPlace(db: Db, placeId: string) {
  await db.delete(schema.travelLegs).where(or(eq(schema.travelLegs.fromPlaceId, placeId), eq(schema.travelLegs.toPlaceId, placeId)));
}

export async function resolveLegs(
  db: Db,
  env: Pick<Env, "OSRM_DISABLED">,
  specs: LegSpec[],
  placesById: Map<string, Place>,
): Promise<Leg[]> {
  const usable = specs.filter((s) => placesById.has(s.fromPlaceId) && placesById.has(s.toPlaceId));
  const metrics = await resolveLegMetrics(
    db,
    env,
    usable.map((s) => ({ from: placesById.get(s.fromPlaceId)!, to: placesById.get(s.toPlaceId)! })),
  );
  return usable.map((s) => {
    const m = metrics.get(`${s.fromPlaceId}>${s.toPlaceId}`)!;
    const arriveAt = s.arriveBy ?? addMinutes(s.departAt!, m.minutes);
    const departAt = s.departAt ?? addMinutes(s.arriveBy!, -m.minutes);
    return {
      id: s.id,
      day: s.day,
      fromEventId: s.fromEventId,
      toEventId: s.toEventId,
      fromPlaceId: s.fromPlaceId,
      toPlaceId: s.toPlaceId,
      minutes: m.minutes,
      miles: m.miles,
      source: m.source,
      departAt,
      arriveAt,
    };
  });
}

