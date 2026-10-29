export interface LatLng {
  lat: number;
  lng: number;
}

export const ROAD_FACTOR = 1.3;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface TravelEstimate {
  miles: number;
  minutes: number;
}

/**
 * Road-distance factor over straight-line miles. Calibrated against OSRM on the seed itinerary:
 * short urban hops wind more (~1.3-1.4), long freeway drives are nearly direct (~1.1).
 */
export function roadFactor(straightMiles: number): number {
  if (straightMiles < 5) return 1.4;
  if (straightMiles < 20) return ROAD_FACTOR;
  if (straightMiles >= 100) return 1.12;
  return ROAD_FACTOR - ((straightMiles - 20) / 80) * (ROAD_FACTOR - 1.12);
}

/** Average speed (mph) by road distance: city streets, arterials, mixed, freeway. */
export function speedMph(roadMiles: number): number {
  if (roadMiles < 3) return 24;
  if (roadMiles < 15) return 38;
  if (roadMiles < 40) return 46;
  return 54;
}

/** Heuristic drive estimate: straight-line x distance-banded road factor, banded speed, +2 min. */
export function heuristicTravel(a: LatLng, b: LatLng): TravelEstimate {
  const straight = haversineMiles(a, b);
  const road = straight * roadFactor(straight);
  return { miles: round1(road), minutes: Math.round((road / speedMph(road)) * 60 + 2) };
}

/** Straight-line miles + heuristic drive time (for the map Measure tool). */
export function measure(a: LatLng, b: LatLng): { straightMiles: number; estimate: TravelEstimate } {
  return { straightMiles: round1(haversineMiles(a, b)), estimate: heuristicTravel(a, b) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
