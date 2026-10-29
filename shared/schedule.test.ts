import { describe, expect, it } from "vitest";
import { seedEvents, seedPlaces } from "../db/seed-data";
import { applyEventUpdate, assertRemovable, buildNewEvent, bucketByDay, canMove, computeLegSpecs, RuleError, sortEvents } from "./schedule";
import type { Place, TripEvent } from "./types";

const stamp = { createdAt: "x", updatedAt: "x" };
const events = (): TripEvent[] => seedEvents.map((e) => ({ ...e, ...stamp }));
const ev = (id: string) => events().find((e) => e.id === id)!;
const place = (id: string): Place => ({ ...seedPlaces.find((p) => p.id === id)!, ...stamp });

describe("day bucketing and ordering", () => {
  it("buckets the seed into 4 days by LA date", () => {
    const m = bucketByDay(events());
    expect([...m.values()].map((v) => v.length)).toEqual([6, 4, 5, 4]);
    expect(m.get("2026-10-31")!.at(-1)!.id).toBe("ev_sat_dinner"); // 7 PM PDT = Nov 1 02:00Z but still Saturday
  });
  it("sorts by start, end, id", () => {
    const a = { id: "b", start: "2026-11-01T17:00:00.000Z", end: "2026-11-01T18:00:00.000Z" };
    const b = { id: "a", start: "2026-11-01T17:00:00.000Z", end: "2026-11-01T18:00:00.000Z" };
    const c = { id: "z", start: "2026-11-01T16:00:00.000Z", end: "2026-11-01T19:00:00.000Z" };
    expect(sortEvents([a, b, c]).map((e) => e.id)).toEqual(["z", "a", "b"]);
  });
});

describe("locked / booked / normal rules", () => {
  it("locked events cannot be moved, edited, skipped or removed", () => {
    const e = ev("ev_sat_checkin");
    expect(() => applyEventUpdate(e, { start: "2026-10-31T23:30:00.000Z" })).toThrow(RuleError);
    expect(() => applyEventUpdate(e, { title: "x" })).toThrow(/locked/);
    expect(() => applyEventUpdate(e, { skipped: true })).toThrow(RuleError);
    expect(() => assertRemovable(e)).toThrow(/locked/);
    expect(applyEventUpdate(e, { notes: "keys in lockbox" })).toEqual({ notes: "keys in lockbox" });
    expect(canMove(e)).toBe(false);
  });
  it("booked events keep their time but can be skipped, unskipped and removed", () => {
    const e = ev("ev_sun_harbor");
    expect(() => applyEventUpdate(e, { start: "2026-11-01T22:00:00.000Z" })).toThrow(/booked/);
    expect(applyEventUpdate(e, { skipped: true })).toEqual({ skipped: true });
    expect(applyEventUpdate({ ...e, skipped: true }, { skipped: false })).toEqual({ skipped: false });
    expect(() => assertRemovable(e)).not.toThrow();
    expect(canMove(e)).toBe(false);
  });
  it("normal events move freely; moving by start preserves duration", () => {
    const e = ev("ev_sun_birch"); // 10:15-13:45 PST
    const out = applyEventUpdate(e, { start: "2026-11-01T20:00:00.000Z" });
    expect(out.start).toBe("2026-11-01T20:00:00.000Z");
    expect(out.end).toBe("2026-11-01T23:30:00.000Z");
    expect(() => applyEventUpdate(e, { skipped: true })).toThrow(/booked/);
  });
  it("rejects end before start and events outside the trip", () => {
    const e = ev("ev_sun_birch");
    expect(() => applyEventUpdate(e, { start: "2026-11-01T20:00:00.000Z", end: "2026-11-01T19:00:00.000Z" })).toThrow(RuleError);
    expect(() => applyEventUpdate(e, { start: "2026-12-01T20:00:00.000Z" })).toThrow(/during the trip/);
  });
  it("buildNewEvent defaults title and duration from the place", () => {
    const row = buildNewEvent({ placeId: "pl_zoo", kind: "normal", start: "2026-11-02T18:00:00.000Z" }, place("pl_zoo"), "ev_new");
    expect(row.title).toBe("San Diego Zoo");
    expect(row.end).toBe("2026-11-02T22:30:00.000Z"); // 270 min
    const bare = buildNewEvent({ title: "Nap", kind: "normal", start: "2026-11-02T18:00:00.000Z" }, null, "ev_n2");
    expect(bare.end).toBe("2026-11-02T19:00:00.000Z");
    expect(() => buildNewEvent({ kind: "normal", start: "2026-11-02T18:00:00.000Z" }, null, "x")).toThrow(RuleError);
  });
});

describe("leg specs", () => {
  const specs = computeLegSpecs(bucketByDay(events()), "pl_airbnb");
  const pairs = (day: string) => specs.filter((s) => s.day === day).map((s) => `${s.fromPlaceId}>${s.toPlaceId}`);
  it("Saturday runs home to Airbnb to dinner and back", () => {
    expect(pairs("2026-10-31")).toEqual([
      "pl_valencia>pl_sylmar", "pl_sylmar>pl_sugar", "pl_sugar>pl_seacliff", "pl_seacliff>pl_airbnb", "pl_airbnb>pl_zoya", "pl_zoya>pl_airbnb",
    ]);
  });
  it("middle days start and end at the lodging", () => {
    expect(pairs("2026-11-01")[0]).toBe("pl_airbnb>pl_fig");
    expect(pairs("2026-11-01").at(-1)).toBe("pl_aladdin>pl_airbnb");
    expect(pairs("2026-11-02")[0]).toBe("pl_airbnb>pl_sc_liberty");
  });
  it("last day ends at home with no return leg; events without places add no stops", () => {
    expect(pairs("2026-11-03")).toEqual(["pl_airbnb>pl_sylmar", "pl_sylmar>pl_valencia"]);
  });
  it("skipped booked events drop out and legs reconnect", () => {
    const evs = events().map((e) => (e.id === "ev_sun_harbor" ? { ...e, skipped: true } : e));
    const s = computeLegSpecs(bucketByDay(evs), "pl_airbnb").filter((x) => x.day === "2026-11-01");
    expect(s.map((x) => `${x.fromPlaceId}>${x.toPlaceId}`)).toEqual(["pl_airbnb>pl_fig", "pl_fig>pl_birch", "pl_birch>pl_aladdin", "pl_aladdin>pl_airbnb"]);
  });
  it("virtual lodging legs have null departAt/arriveBy; ids are unique", () => {
    const first = specs.find((s) => s.id === "lodging>ev_sun_brunch")!;
    expect(first.departAt).toBeNull();
    expect(first.arriveBy).toBe(ev("ev_sun_brunch").start);
    expect(new Set(specs.map((s) => s.id)).size).toBe(specs.length);
  });
  it("same-place hops produce no leg (checkout then nothing)", () => {
    const evs = events().filter((e) => !["ev_tue_dropoff", "ev_tue_home"].includes(e.id));
    expect(computeLegSpecs(bucketByDay(evs), "pl_airbnb").filter((s) => s.day === "2026-11-03")).toEqual([]);
  });
});
