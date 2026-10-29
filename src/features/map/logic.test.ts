import { describe, expect, it } from "vitest";
import type { PlaceWithUsage, TripDay } from "@shared/types";
import { boundsOf, buildMarkers, buildRoute, buildStops, DEFAULT_LAYERS, measureResult } from "./logic";

const pl = (id: string, category: string, lat: number, lng: number): PlaceWithUsage =>
  ({ id, name: id, category, lat, lng, eventCount: 0 }) as unknown as PlaceWithUsage;
const places = [
  pl("bnb", "lodging", 32.8, -117.2),
  pl("a", "activity", 32.7, -117.1),
  pl("b", "food", 32.75, -117.15),
  pl("i", "activity", 32.6, -117.0),
  pl("f", "food", 32.5, -117.0),
  pl("c", "charger", 32.4, -117.0),
  pl("h", "home", 34, -118),
];
const day = {
  events: [
    { id: "e1", placeId: "h", title: "home", start: "x", skipped: false },
    { id: "e2", placeId: "a", title: "A", start: "x", skipped: false },
    { id: "e3", placeId: "b", title: "B", start: "x", skipped: true },
    { id: "e4", placeId: "b", title: "B2", start: "x", skipped: false },
  ],
  legs: [{ toEventId: "e2", minutes: 12, miles: 5 }],
} as unknown as TripDay;
const byId = new Map(places.map((p) => [p.id, p]));

describe("map logic", () => {
  it("builds numbered stops skipping home/skipped", () => {
    const stops = buildStops(day, byId);
    expect(stops.map((s) => [s.placeId, s.order])).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
    expect(stops[0]!.driveMinutes).toBe(12);
    expect(stops[1]!.driveMinutes).toBeNull();
  });
  it("route goes Airbnb -> stops -> Airbnb", () => {
    const r = buildRoute({ lat: 32.8, lng: -117.2 }, buildStops(day, byId));
    expect(r).toHaveLength(4);
    expect(r[0]).toEqual(r[3]);
    expect(buildRoute(null, buildStops(day, byId))).toEqual([]);
    expect(buildRoute({ lat: 1, lng: 1 }, [])).toEqual([]);
  });
  it("filters markers by layer", () => {
    const base = { places, ideaIds: ["a", "i"], days: [day], singleDay: true };
    const kinds = (layers = DEFAULT_LAYERS) => buildMarkers({ ...base, layers }).map((m) => m.kind).sort();
    expect(kinds()).toEqual(["food", "idea", "plan", "plan"]);
    expect(kinds({ ...DEFAULT_LAYERS, chargers: true })).toContain("charger");
    expect(kinds({ plan: false, ideas: false, food: false, chargers: false })).toEqual([]);
  });
  it("measures and bounds", () => {
    const m = measureResult({ lat: 32.7, lng: -117.1 }, { lat: 32.8, lng: -117.2 });
    expect(m.straightMiles).toBeGreaterThan(8);
    expect(m.estimate.minutes).toBeGreaterThan(0);
    expect(boundsOf([])).toBeNull();
    expect(
      boundsOf([
        { lat: 1, lng: 2 },
        { lat: 3, lng: 0 },
      ]),
    ).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });
});
