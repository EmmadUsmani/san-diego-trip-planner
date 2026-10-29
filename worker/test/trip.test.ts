import { describe, expect, it } from "vitest";
import { call, jsonRes, login, mockFetch, testDb } from "./helpers";
import { travelLegs } from "../../db/schema";
import { laToUtc } from "../../shared/time";
import type { Trip, Leg, Weather } from "../../shared/types";

const unix = (day: string) => Date.parse(laToUtc(day, "00:00")) / 1000;
const osrm = (url: string) => {
  if (!url.startsWith("https://router.project-osrm.org/route/v1/driving/")) return undefined;
  return jsonRes({ code: "Ok", routes: [{ distance: 16093.44, duration: 900 }] }); // 10 mi, 15 min
};

describe("legs", () => {
  it("falls back to the heuristic when OSRM is unreachable, and caches", async () => {
    const trip = (await (await call("/api/trip")).json()) as Trip;
    const legs = trip.days.flatMap((d) => d.legs);
    expect(legs.length).toBeGreaterThan(15);
    expect(legs.every((l) => l.source === "heuristic")).toBe(true);
    const rows = await testDb().select().from(travelLegs);
    expect(rows.length).toBeGreaterThan(10);
    expect(new Set(rows.map((r) => `${r.fromPlaceId}>${r.toPlaceId}`)).size).toBe(rows.length);
  });
  it("uses OSRM when available and serves later requests from the cache", async () => {
    const spy = mockFetch(osrm);
    const first = (await (await call("/api/legs?day=2026-11-01")).json()) as Leg[];
    expect(first.every((l) => l.source === "osrm" && l.minutes === 15 && l.miles === 10)).toBe(true);
    const calls = spy.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    await call("/api/legs?day=2026-11-01");
    expect(spy.mock.calls.length).toBe(calls);
  });
  it("legs connect Airbnb to Fig Tree on Sunday morning and carry timing", async () => {
    const legs = (await (await call("/api/legs?day=2026-11-01")).json()) as Leg[];
    expect(legs[0]).toMatchObject({ fromEventId: null, toEventId: "ev_sun_brunch", fromPlaceId: "pl_airbnb", toPlaceId: "pl_fig" });
    expect(Date.parse(legs[0]!.arriveAt) - Date.parse(legs[0]!.departAt)).toBe(legs[0]!.minutes * 60000);
    expect(legs.at(-1)).toMatchObject({ toEventId: null, toPlaceId: "pl_airbnb" });
  });
  it("skipping the harbor tour reconnects legs around it", async () => {
    const cookie = await login();
    await call("/api/events/ev_sun_harbor/skip", { method: "POST", cookie });
    const legs = (await (await call("/api/legs?day=2026-11-01")).json()) as Leg[];
    expect(legs.map((l) => l.toPlaceId)).toEqual(["pl_fig", "pl_birch", "pl_aladdin", "pl_airbnb"]);
  });
});

describe("GET /api/trip", () => {
  it("returns four days with events, legs, prayers and battery", async () => {
    const trip = (await (await call("/api/trip")).json()) as Trip;
    expect(trip.days.map((d) => d.date)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(trip.days.map((d) => d.tzName)).toEqual(["PDT", "PST", "PST", "PST"]);
    expect(trip.days.map((d) => d.clocksFallBack)).toEqual([false, true, false, false]);
    expect(trip.days.map((d) => d.events.length)).toEqual([6, 4, 5, 4]);
    expect(trip.days[0]!.prayers.fajr).toMatch(/Z$/);
    expect(trip.lodgingPlaceId).toBe("pl_airbnb");
    expect(trip.homePlaceId).toBe("pl_valencia");
    expect(trip.settings.startChargePct).toBe(90);
    expect(trip.ideaIds).toContain("pl_rose_canyon");
    expect(trip.places).toHaveLength(33);
    expect(trip.range.points[0]!.pct).toBe(90);
  });
  it("battery rises at the Monday charge stop and dips below the low line at the end", async () => {
    const trip = (await (await call("/api/trip")).json()) as Trip;
    const charge = trip.range.points.filter((p) => p.refId === "ev_mon_charge");
    expect(charge).toHaveLength(2);
    expect(charge[1]!.pct).toBe(80);
    expect(charge[0]!.pct).toBeLessThan(80);
    const [sat, sun, mon] = trip.days.map((d) => d.batteryEndPct);
    expect(sat!).toBeGreaterThan(sun!);
    expect(mon!).toBeGreaterThan(sun!);
    expect(trip.range.endPct).toBeLessThan(trip.range.lowPct + 10);
  });
  it("uses settings for the range and hides the door code from logged-out users", async () => {
    const cookie = await login();
    const anon = (await (await call("/api/trip")).json()) as Trip;
    expect(anon.settings.doorCode).toBeUndefined();
    const authed = (await (await call("/api/trip", { cookie })).json()) as Trip;
    expect(authed.settings.doorCode).toBe("8038");
    await call("/api/settings", { method: "PUT", cookie, json: { startChargePct: 100 } });
    const t2 = (await (await call("/api/trip")).json()) as Trip;
    expect(t2.range.points[0]!.pct).toBe(100);
    expect(t2.days[0]!.batteryEndPct).toBeGreaterThan(anon.days[0]!.batteryEndPct);
  });
});

describe("settings", () => {
  it("get returns defaults merged with stored values; put validates", async () => {
    const cookie = await login();
    const s = (await (await call("/api/settings")).json()) as Record<string, unknown>;
    expect(s).toMatchObject({ startChargePct: 90, efficiencyKwhPer100Mi: 24, homeLabel: "Valencia" });
    expect(s.doorCode).toBeUndefined();
    const res = await call("/api/settings", { method: "PUT", cookie, json: { efficiencyKwhPer100Mi: 28 } });
    expect(((await res.json()) as { efficiencyKwhPer100Mi: number }).efficiencyKwhPer100Mi).toBe(28);
    expect((await call("/api/settings", { method: "PUT", cookie, json: { startChargePct: 150 } })).status).toBe(400);
    expect((await (await call("/api/settings")).json() as { efficiencyKwhPer100Mi: number }).efficiencyKwhPer100Mi).toBe(28);
  });
});

describe("weather", () => {
  const sample = {
    daily: {
      time: ['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03'].map(unix),
      weather_code: [3, 63, 0, 1],
      temperature_2m_max: [71, 69, 79, 80],
      temperature_2m_min: [63, 61, 64, 67],
      precipitation_probability_max: [69, 87, 11, 5],
    },
    hourly: { time: [unix('2026-10-31'), unix('2026-10-31') + 3600], precipitation_probability: [2, 3], temperature_2m: [60, 61], weather_code: [0, 0] },
  };
  it("fetches Open-Meteo once and serves from the Cache API afterwards", async () => {
    const spy = mockFetch((url) => (url.startsWith("https://api.open-meteo.com/v1/forecast") ? jsonRes(sample) : undefined));
    const res = await call("/api/weather");
    expect(res.status).toBe(200);
    const w = (await res.json()) as Weather;
    expect(w.days).toHaveLength(4);
    expect(w.days[1]).toMatchObject({ summary: "Rain", hiF: 69, precipMax: 87 });
    expect(spy.mock.calls[0]![0]).toContain("timeformat=unixtime");
    const again = await call("/api/weather");
    expect(again.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
