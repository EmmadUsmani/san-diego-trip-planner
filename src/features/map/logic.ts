import { heuristicTravel, haversineMiles, measure, type LatLng, type TravelEstimate } from "@shared/travel";
import type { Place, PlaceWithUsage, TripDay } from "@shared/types";

export type Layer = "plan" | "ideas" | "food" | "chargers";
export const LAYERS: { key: Layer; label: string }[] = [
  { key: "plan", label: "Plan" },
  { key: "ideas", label: "Ideas" },
  { key: "food", label: "Food" },
  { key: "chargers", label: "Chargers" },
];
export const DEFAULT_LAYERS: Record<Layer, boolean> = { plan: true, ideas: true, food: true, chargers: false };

export interface Stop {
  eventId: string;
  placeId: string;
  /** 1-based number on the map (only meaningful in single-day view). */
  order: number;
  title: string;
  start: string;
  place: PlaceWithUsage;
  /** Drive minutes/miles from the previous stop (or Airbnb), if a leg is known. */
  driveMinutes: number | null;
  driveMiles: number | null;
}

/** Numbered stops for one day: non-skipped events with a place, excluding lodging/home places. */
export function buildStops(day: TripDay, placesById: Map<string, PlaceWithUsage>): Stop[] {
  const stops: Stop[] = [];
  for (const ev of day.events) {
    if (ev.skipped || !ev.placeId) continue;
    const place = placesById.get(ev.placeId);
    if (!place || place.category === "lodging" || place.category === "home") continue;
    const leg = day.legs.find((l) => l.toEventId === ev.id);
    stops.push({
      eventId: ev.id,
      placeId: place.id,
      order: stops.length + 1,
      title: ev.title,
      start: ev.start,
      place,
      driveMinutes: leg ? leg.minutes : null,
      driveMiles: leg ? leg.miles : null,
    });
  }
  return stops;
}

/** [lng, lat] path Airbnb -> stops -> Airbnb. Empty when there are no stops. */
export function buildRoute(airbnb: LatLng | null, stops: Pick<Stop, "place">[]): [number, number][] {
  if (!airbnb || stops.length === 0) return [];
  const pt = (p: LatLng): [number, number] => [p.lng, p.lat];
  return [pt(airbnb), ...stops.map((s) => pt(s.place)), pt(airbnb)];
}

export type MarkerKind = "plan" | "idea" | "food" | "charger";
export interface MapMarker {
  key: string;
  placeId: string;
  kind: MarkerKind;
  name: string;
  lat: number;
  lng: number;
  /** Stop number (single-day plan markers only). */
  order?: number;
}

export interface MarkerInput {
  places: PlaceWithUsage[];
  ideaIds: string[];
  /** Days currently shown (one day, or all). */
  days: TripDay[];
  singleDay: boolean;
  layers: Record<Layer, boolean>;
}

/** Which markers to draw. Lodging is rendered separately as the Airbnb pin. */
export function buildMarkers({ places, ideaIds, days, singleDay, layers }: MarkerInput): MapMarker[] {
  const byId = new Map(places.map((p) => [p.id, p]));
  const planned = new Map<string, number | undefined>();
  for (const d of days) {
    for (const s of buildStops(d, byId)) if (!planned.has(s.placeId)) planned.set(s.placeId, singleDay ? s.order : undefined);
  }
  const ideas = new Set(ideaIds);
  const out: MapMarker[] = [];
  for (const p of places) {
    if (p.category === "lodging" || p.category === "home") continue;
    let kind: MarkerKind | null = null;
    if (planned.has(p.id)) kind = layers.plan ? "plan" : null;
    else if (p.category === "charger") kind = layers.chargers ? "charger" : null;
    else if (p.category === "food") kind = layers.food ? "food" : null;
    else if (p.category === "activity" && ideas.has(p.id)) kind = layers.ideas ? "idea" : null;
    if (!kind) continue;
    out.push({ key: `${kind}-${p.id}`, placeId: p.id, kind, name: p.name, lat: p.lat, lng: p.lng, order: planned.get(p.id) });
  }
  return out;
}

const KIND_LAYER: Record<MarkerKind, Layer> = { plan: "plan", idea: "ideas", food: "food", charger: "chargers" };

export function layerCounts(input: Omit<MarkerInput, "layers">): Record<Layer, number> {
  const all = buildMarkers({ ...input, layers: { plan: true, ideas: true, food: true, chargers: true } });
  const c: Record<Layer, number> = { plan: 0, ideas: 0, food: 0, chargers: 0 };
  for (const m of all) c[KIND_LAYER[m.kind]]++;
  return c;
}

export function fromAirbnb(airbnb: LatLng | null, p: Pick<Place, "lat" | "lng">): (TravelEstimate & { straight: number }) | null {
  if (!airbnb) return null;
  return { ...heuristicTravel(airbnb, p), straight: Math.round(haversineMiles(airbnb, p) * 10) / 10 };
}

export interface MeasurePoint extends LatLng {
  label: string;
}
export function measureResult(a: LatLng, b: LatLng) {
  return measure(a, b);
}

/** Bounds [[minLng,minLat],[maxLng,maxLat]] of the given points, or null. */
export function boundsOf(points: LatLng[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const p of points) {
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
