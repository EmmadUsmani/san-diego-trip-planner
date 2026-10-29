import { TRIP_DAYS, laDateKey, laParts, type DayKey } from "./time";
import type { Weather, WeatherDay } from "./types";

const WMO: Record<number, string> = {
  0: "Sunny",
  1: "Mostly sunny",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Snow",
  73: "Snow",
  75: "Snow",
  77: "Snow",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};
export const weatherSummary = (code: number | null) => (code == null ? "Unknown" : (WMO[code] ?? "Unknown"));

/** Icon bucket for the UI. */
export function weatherIcon(code: number | null): "sun" | "partly" | "cloud" | "rain" | "storm" | "fog" | "snow" {
  if (code == null) return "cloud";
  if (code <= 1) return "sun";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "storm";
  if (code >= 71 && code <= 86 && code !== 80 && code !== 81 && code !== 82) return "snow";
  return "rain";
}

export interface OpenMeteoResponse {
  hourly: {
    time: number[];
    precipitation_probability: (number | null)[];
    temperature_2m: (number | null)[];
    weather_code: (number | null)[];
  };
  daily: {
    time: number[];
    weather_code: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_probability_max: (number | null)[];
  };
}

export function openMeteoUrl(lat: number, lng: number): string {
  const first = TRIP_DAYS[0];
  const last = TRIP_DAYS[TRIP_DAYS.length - 1]!;
  const q = Object.entries({
    latitude: String(lat),
    longitude: String(lng),
    hourly: "precipitation_probability,temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "fahrenheit",
    timeformat: "unixtime",
    timezone: "America/Los_Angeles",
    start_date: first,
    end_date: last,
  })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

/** Convert an Open-Meteo unixtime response into trip days. Hours are bucketed by LA local date (DST-correct). */
export function parseOpenMeteo(r: OpenMeteoResponse, fetchedAt: string): Weather {
  const byDay = new Map<DayKey, WeatherDay>();
  for (const d of TRIP_DAYS) {
    byDay.set(d, { date: d, code: null, summary: "Unknown", hiF: null, loF: null, precipMax: null, hourly: [] });
  }
  r.daily.time.forEach((t, i) => {
    // Open-Meteo stamps daily rows at local midnight using the offset at the start of the range,
    // so after DST ends a "midnight" lands at 11 PM the previous day. Key by local noon instead.
    const day = byDay.get(laDateKey(t * 1000 + 12 * 3600 * 1000));
    if (!day) return;
    day.code = r.daily.weather_code[i] ?? null;
    day.summary = weatherSummary(day.code);
    const hi = r.daily.temperature_2m_max[i];
    const lo = r.daily.temperature_2m_min[i];
    day.hiF = hi == null ? null : Math.round(hi);
    day.loF = lo == null ? null : Math.round(lo);
    day.precipMax = r.daily.precipitation_probability_max[i] ?? null;
  });
  r.hourly.time.forEach((t, i) => {
    const key = laDateKey(t * 1000);
    const day = byDay.get(key);
    if (!day) return;
    const temp = r.hourly.temperature_2m[i];
    day.hourly.push({
      at: new Date(t * 1000).toISOString(),
      hour: laParts(t * 1000).hour,
      precipProb: r.hourly.precipitation_probability[i] ?? null,
      tempF: temp == null ? null : Math.round(temp),
      code: r.hourly.weather_code[i] ?? null,
    });
  });
  return { days: [...byDay.values()], fetchedAt };
}
