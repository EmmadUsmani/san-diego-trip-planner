import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { vi } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { seedEvents, seedPlaces, seedSettings } from "../../db/seed-data";
import app from "../app";

export const testDb = () => drizzle(env.DB, { schema });

/** Wipe every table and load the real seed (places, events, settings). */
export async function resetDb() {
  const db = testDb();
  await db.delete(schema.events);
  await db.delete(schema.travelLegs);
  await db.delete(schema.places);
  await db.delete(schema.settings);
  for (let i = 0; i < seedPlaces.length; i += 6) await db.insert(schema.places).values(seedPlaces.slice(i, i + 6));
  for (let i = 0; i < seedEvents.length; i += 8) await db.insert(schema.events).values(seedEvents.slice(i, i + 8));
  await db.insert(schema.settings).values(Object.entries(seedSettings).map(([key, v]) => ({ key, value: JSON.stringify(v) })));
}

export async function call(path: string, init: RequestInit & { json?: unknown; cookie?: string } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  if (init.cookie) headers.set("cookie", init.cookie);
  const req = new Request(`http://localhost${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const ctx = createExecutionContext();
  const res = await app.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

export async function login(password = "test-pass"): Promise<string> {
  const res = await call("/api/auth/login", { method: "POST", json: { password } });
  const set = res.headers.get("set-cookie") ?? "";
  return set.split(";")[0] ?? "";
}

/** Route all outbound fetches through `handler`; unmatched URLs throw so tests never touch the network. */
export function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response> | undefined) {
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const r = await handler(url, init);
    if (!r) throw new Error(`Unmocked fetch in test: ${url}`);
    return r;
  });
  return spy;
}

export const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
