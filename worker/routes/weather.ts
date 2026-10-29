import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AIRBNB_COORDS } from "../../shared/prayers";
import { openMeteoUrl, parseOpenMeteo, type OpenMeteoResponse } from "../../shared/weather";
import type { Weather } from "../../shared/types";
import type { AppEnv } from "../env";

const TTL = 3600;

export const weatherRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const upstream = openMeteoUrl(AIRBNB_COORDS.lat, AIRBNB_COORDS.lng);
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(upstream);
  const hit = await cache.match(cacheKey);
  if (hit) return c.json((await hit.json()) as Weather);

  let weather: Weather;
  try {
    const res = await fetch(upstream);
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    weather = parseOpenMeteo((await res.json()) as OpenMeteoResponse, new Date().toISOString());
  } catch {
    throw new HTTPException(503, { message: "Weather unavailable" });
  }
  c.executionCtx.waitUntil(
    cache.put(cacheKey, new Response(JSON.stringify(weather), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${TTL}` } })),
  );
  return c.json(weather);
});
