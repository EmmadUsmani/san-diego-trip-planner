import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./env";
import { loadSession } from "./lib/auth";
import { authRoutes } from "./routes/auth";
import { eventsRoutes } from "./routes/events";
import { legsRoutes } from "./routes/legs";
import { ideasRoutes, placesRoutes } from "./routes/places";
import { settingsRoutes } from "./routes/settings";
import { tripRoutes } from "./routes/trip";
import { weatherRoutes } from "./routes/weather";

const api = new Hono<AppEnv>()
  .use(loadSession)
  .route("/auth", authRoutes)
  .route("/places", placesRoutes)
  .route("/ideas", ideasRoutes)
  .route("/events", eventsRoutes)
  .route("/legs", legsRoutes)
  .route("/weather", weatherRoutes)
  .route("/settings", settingsRoutes)
  .route("/trip", tripRoutes);

const app = new Hono<AppEnv>().route("/api", api);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message, code: typeof err.cause === "string" ? err.cause : undefined }, err.status);
  }
  console.error(err);
  return c.json({ error: "Something went wrong" }, 500);
});
app.notFound((c) => c.json({ error: "Not found" }, 404));

export type Api = typeof api;
export default app;
