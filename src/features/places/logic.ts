import type { DayKey } from "@shared/time";
import { heuristicTravel } from "@shared/travel";
import type { PlaceWithUsage, TripDay, TripEvent } from "@shared/types";

export type PlaceFilter = "all" | "activities" | "food" | "halal" | "chargers";
export const FILTERS: { id: PlaceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "activities", label: "Activities" },
  { id: "food", label: "Food" },
  { id: "halal", label: "Halal" },
  { id: "chargers", label: "Chargers" },
];

export function matchesFilter(p: Pick<PlaceWithUsage, "category" | "tags">, f: PlaceFilter): boolean {
  switch (f) {
    case "all":
      return true;
    case "activities":
      return p.category === "activity";
    case "food":
      return p.category === "food";
    case "halal":
      return p.tags.includes("halal");
    case "chargers":
      return p.category === "charger";
  }
}

export function matchesQuery(p: Pick<PlaceWithUsage, "name" | "address" | "neighborhood" | "tags">, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [p.name, p.address, p.neighborhood, ...p.tags].some((s) => s.toLowerCase().includes(needle));
}

export interface ScheduleRow {
  event: TripEvent;
  place: PlaceWithUsage | null;
}
export interface ScheduleGroup {
  day: DayKey;
  weekday: string;
  label: string;
  rows: ScheduleRow[];
}

/** Events shown under "On the schedule": place-backed events plus locked ones (check-in/out). Home trips are hidden. */
export function groupSchedule(days: TripDay[], places: PlaceWithUsage[], f: PlaceFilter, q: string): ScheduleGroup[] {
  const byId = new Map(places.map((p) => [p.id, p]));
  const needle = q.trim().toLowerCase();
  return days
    .map((d) => {
      const rows: ScheduleRow[] = [];
      for (const event of d.events) {
        const place = event.placeId ? (byId.get(event.placeId) ?? null) : null;
        if (place?.category === "home") continue;
        if (!place && event.kind !== "locked") continue;
        const titleHit = event.title.toLowerCase().includes(needle);
        const ok = place ? matchesFilter(place, f) && (matchesQuery(place, q) || titleHit) : f === "all" && titleHit;
        if (ok) rows.push({ event, place });
      }
      return { day: d.date, weekday: d.weekday, label: d.label, rows };
    })
    .filter((g) => g.rows.length > 0);
}

export interface PlaceSections {
  ideas: PlaceWithUsage[];
  food: PlaceWithUsage[];
  chargers: PlaceWithUsage[];
}

export function sectionPlaces(places: PlaceWithUsage[], f: PlaceFilter, q: string): PlaceSections {
  const vis = places.filter((p) => matchesFilter(p, f) && matchesQuery(p, q));
  return {
    ideas: vis.filter((p) => p.category === "activity" && p.eventCount === 0),
    food: vis.filter((p) => p.category === "food" && p.eventCount === 0),
    chargers: vis.filter((p) => p.category === "charger"),
  };
}

export function fromAirbnb(p: PlaceWithUsage, lodging: PlaceWithUsage | undefined) {
  return lodging ? heuristicTravel(lodging, p) : null;
}

/** Display label for a tag: "approx-location" -> "Approx location". */
export function tagLabel(t: string): string {
  const s = t.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseTags(s: string): string[] {
  return [...new Set(s.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
}
