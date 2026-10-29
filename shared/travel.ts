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

/** Heuristic drive estimate: straight-line x 1.3; 25 mph <3 mi, 35 mph <15 mi, else 55 mph; +3 min. */
export function heuristicTravel(a: LatLng, b: LatLng): TravelEstimate {
  const straight = haversineMiles(a, b);
  const road = straight * ROAD_FACTOR;
  const mph = road < 3 ? 25 : road < 15 ? 35 : 55;
  return { miles: round1(road), minutes: Math.round((road / mph) * 60 + 3) };
}

/** Straight-line miles + heuristic drive time (for the map Measure tool). */
export function measure(a: LatLng, b: LatLng): { straightMiles: number; estimate: TravelEstimate } {
  return { straightMiles: round1(haversineMiles(a, b)), estimate: heuristicTravel(a, b) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
