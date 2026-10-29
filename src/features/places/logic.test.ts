import { describe, expect, it } from "vitest";
import type { PlaceWithUsage, TripDay, TripEvent } from "@shared/types";
import { groupSchedule, matchesFilter, matchesQuery, parseTags, sectionPlaces, tagLabel } from "./logic";

const mk = (id: string, name: string, category: PlaceWithUsage["category"], tags: string[] = [], eventCount = 0): PlaceWithUsage =>
  ({ id, name, category, tags, eventCount, address: `${name} St`, neighborhood: "La Jolla", lat: 32.8, lng: -117.2 }) as PlaceWithUsage;
const places = [
  mk("a", "Zoya", "food", ["halal"], 1),
  mk("b", "Rose Canyon", "activity", ["hike"]),
  mk("c", "Akhi", "food", ["halal"]),
  mk("d", "Geisel", "activity", ["indoor"]),
  mk("e", "Liberty", "charger", ["supercharger"]),
  mk("h", "Valencia", "home"),
  mk("l", "Airbnb", "lodging", [], 1),
];
const ev = (id: string, placeId: string | null, kind: TripEvent["kind"] = "normal", title = id): TripEvent =>
  ({ id, placeId, kind, title, start: "x", end: "y", skipped: false }) as TripEvent;
const days = [
  { date: "2026-10-31", weekday: "Sat", label: "Sat, Oct 31", events: [ev("1", "h"), ev("2", "a", "normal", "Zoya"), ev("3", "l", "locked", "Check-in")] },
  { date: "2026-11-03", weekday: "Tue", label: "Tue, Nov 3", events: [ev("4", null, "locked", "Check-out"), ev("5", null, "normal", "Brunch")] },
] as unknown as TripDay[];

describe("places logic", () => {
  it("filters", () => {
    expect(places.filter((p) => matchesFilter(p, "halal")).map((p) => p.id)).toEqual(["a", "c"]);
    expect(places.filter((p) => matchesFilter(p, "chargers")).map((p) => p.id)).toEqual(["e"]);
    expect(places.filter((p) => matchesFilter(p, "all"))).toHaveLength(7);
  });
  it("searches name, address, tags", () => {
    expect(matchesQuery(places[1]!, "CANYON")).toBe(true);
    expect(matchesQuery(places[1]!, "hike")).toBe(true);
    expect(matchesQuery(places[1]!, "zzz")).toBe(false);
    expect(matchesQuery(places[1]!, "  ")).toBe(true);
  });
  it("sections: ideas/food exclude scheduled", () => {
    const s = sectionPlaces(places, "all", "");
    expect(s.ideas.map((p) => p.id)).toEqual(["b", "d"]);
    expect(s.food.map((p) => p.id)).toEqual(["c"]);
    expect(s.chargers.map((p) => p.id)).toEqual(["e"]);
    expect(sectionPlaces(places, "halal", "").ideas).toEqual([]);
  });
  it("groups schedule: skips home and placeless normal; locked only under all", () => {
    const g = groupSchedule(days, places, "all", "");
    expect(g.map((x) => x.rows.map((r) => r.event.id))).toEqual([["2", "3"], ["4"]]);
    expect(groupSchedule(days, places, "food", "").map((x) => x.rows.length)).toEqual([1]);
    expect(groupSchedule(days, places, "all", "check-out").map((x) => x.day)).toEqual(["2026-11-03"]);
  });
  it("tags", () => {
    expect(tagLabel("approx-location")).toBe("Approx location");
    expect(parseTags("Halal, dinner, halal,")).toEqual(["halal", "dinner"]);
  });
});
