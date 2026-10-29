const UA = "sd-trip-planner/1.0 (emmadusmani@berkeley.edu)";

export interface GeoHit {
  lat: number;
  lng: number;
  displayName: string;
}

/** Nominatim search (one request per call; callers create places one at a time, well under 1 req/s). */
export async function geocode(address: string): Promise<GeoHit | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = json[0];
    if (!hit) return null;
    return { lat: Number(hit.lat), lng: Number(hit.lon), displayName: hit.display_name };
  } catch {
    return null;
  }
}
