import { asc } from "drizzle-orm";
import { prayerTimesFor } from "../../shared/prayers";
import { computeRange, pctAt } from "../../shared/range";
import { bucketByDay, computeLegSpecs } from "../../shared/schedule";
import { TRIP_DAYS, dayBounds, dstShiftOnDay, formatDayLabel, laOffsetMinutes, weekdayShort, addMinutes } from "../../shared/time";
import type { Place, PlaceWithUsage, Trip, TripDay } from "../../shared/types";
import type { Db } from "./db";
import { schema } from "./db";
import { resolveLegs } from "./legs";
import { readSettings } from "./settings";
import type { Env } from "../env";

export async function loadPlacesWithUsage(db: Db): Promise<PlaceWithUsage[]> {
  const [places, events] = await Promise.all([db.select().from(schema.places).orderBy(asc(schema.places.name)), db.select({ placeId: schema.events.placeId }).from(schema.events)]);
  const counts = new Map<string, number>();
  for (const e of events) if (e.placeId) counts.set(e.placeId, (counts.get(e.placeId) ?? 0) + 1);
  return places.map((p) => ({ ...p, eventCount: counts.get(p.id) ?? 0 }));
}

export const isIdeaPlace = (p: Pick<PlaceWithUsage, "eventCount" | "category">) => p.eventCount === 0 && (p.category === "activity" || p.category === "food");

export async function buildTrip(db: Db, env: Pick<Env, "OSRM_DISABLED">, includeSecret: boolean): Promise<Trip> {
  const [places, events, settings] = await Promise.all([loadPlacesWithUsage(db), db.select().from(schema.events), readSettings(db, includeSecret)]);
  const placesById = new Map<string, Place>(places.map((p) => [p.id, p]));
  const lodging = places.find((p) => p.category === "lodging") ?? null;
  const home = places.find((p) => p.category === "home") ?? null;
  const byDay = bucketByDay(events);
  const legs = await resolveLegs(db, env, computeLegSpecs(byDay, lodging?.id ?? null), placesById);

  const startAt = dayBounds(TRIP_DAYS[0]).start;
  const range = computeRange({
    startPct: settings.startChargePct,
    startAt,
    efficiencyKwhPer100Mi: settings.efficiencyKwhPer100Mi,
    legs: legs.map((l) => ({ id: l.id, at: l.arriveAt, miles: l.miles })),
    charges: events
      .filter((e) => !e.skipped && e.chargeToPct != null)
      .map((e) => ({ id: e.id, start: e.start, end: e.end, toPct: e.chargeToPct! })),
  });

  const days: TripDay[] = TRIP_DAYS.map((date) => {
    const { end } = dayBounds(date);
    return {
      date,
      weekday: weekdayShort(date),
      label: formatDayLabel(date),
      tzName: laOffsetMinutes(addMinutes(end, -1)) === -420 ? "PDT" : "PST",
      clocksFallBack: dstShiftOnDay(date) === 60,
      events: byDay.get(date) ?? [],
      legs: legs.filter((l) => l.day === date),
      prayers: prayerTimesFor(date),
      batteryEndPct: Math.round(pctAt(range, addMinutes(end, -1)) * 10) / 10,
    };
  });

  return {
    days,
    places,
    ideaIds: places.filter(isIdeaPlace).map((p) => p.id),
    settings,
    range,
    lodgingPlaceId: lodging?.id ?? null,
    homePlaceId: home?.id ?? null,
  };
}
