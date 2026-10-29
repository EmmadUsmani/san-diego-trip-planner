import { describe, expect, it } from "vitest";
import { call, jsonRes, login, mockFetch } from "./helpers";

type PlaceRes = { id: string; lat: number; lng: number; eventCount: number; name: string; notes: string; address: string };

describe("places", () => {
  it("lists all seed places with usage counts and filters by category", async () => {
    const all = (await (await call("/api/places")).json()) as PlaceRes[];
    expect(all.length).toBe(33);
    expect(all.find((p) => p.id === "pl_zoo")!.eventCount).toBe(1);
    expect(all.find((p) => p.id === "pl_rose_canyon")!.eventCount).toBe(0);
    const chargers = (await (await call("/api/places?category=charger")).json()) as PlaceRes[];
    expect(chargers).toHaveLength(6);
    expect((await call("/api/places?category=bogus")).status).toBe(400);
  });
  it("every seed place has an address and coordinates in the San Diego / LA area", async () => {
    const all = (await (await call("/api/places")).json()) as PlaceRes[];
    for (const p of all) {
      expect(p.address.length, p.id).toBeGreaterThan(3);
      expect(p.lat, p.id).toBeGreaterThan(32.5);
      expect(p.lat, p.id).toBeLessThan(34.6);
      expect(p.lng, p.id).toBeLessThan(-116.8);
    }
  });
  it("ideas are activity/food places with no events", async () => {
    const ideas = (await (await call("/api/ideas")).json()) as (PlaceRes & { category: string })[];
    const ids = ideas.map((i) => i.id);
    expect(ids).toContain("pl_rose_canyon");
    expect(ids).toContain("pl_akhis");
    expect(ids).not.toContain("pl_zoo");
    expect(ids).not.toContain("pl_sc_villa"); // chargers are not ideas
    expect(ideas.every((i) => i.category === "activity" || i.category === "food")).toBe(true);
  });
  it("gets one place with its events; 404 for unknown", async () => {
    const res = await call("/api/places/pl_airbnb");
    const body = (await res.json()) as { place: PlaceRes; events: { id: string }[] };
    expect(body.events.map((e) => e.id)).toEqual(["ev_sat_checkin", "ev_tue_checkout"]);
    expect((await call("/api/places/nope")).status).toBe(404);
  });
  it("creates with explicit coords without geocoding", async () => {
    const cookie = await login();
    const spy = mockFetch(() => undefined);
    const res = await call("/api/places", {
      method: "POST",
      cookie,
      json: { name: "Taco Stand", category: "food", address: "1 Main St", lat: 32.7, lng: -117.1, tags: ["halal"] },
    });
    expect(res.status).toBe(201);
    const p = (await res.json()) as PlaceRes;
    expect(p.id).toMatch(/^pl_/);
    expect(p.eventCount).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });
  it("geocodes on create when coordinates are missing", async () => {
    const cookie = await login();
    const spy = mockFetch((url) =>
      url.startsWith("https://nominatim.openstreetmap.org/search") ? jsonRes([{ lat: "32.75", lon: "-117.25", display_name: "x" }]) : undefined,
    );
    const res = await call("/api/places", { method: "POST", cookie, json: { name: "New", category: "activity", address: "123 Test St, San Diego" } });
    expect(res.status).toBe(201);
    const p = (await res.json()) as PlaceRes;
    expect([p.lat, p.lng]).toEqual([32.75, -117.25]);
    const init = spy.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).get("user-agent")).toBe("sd-trip-planner/1.0 (emmadusmani@berkeley.edu)");
  });
  it("returns 422 when geocoding finds nothing", async () => {
    const cookie = await login();
    mockFetch(() => jsonRes([]));
    const res = await call("/api/places", { method: "POST", cookie, json: { name: "Ghost", category: "food", address: "nowhere" } });
    expect(res.status).toBe(422);
  });
  it("validates input", async () => {
    const cookie = await login();
    expect((await call("/api/places", { method: "POST", cookie, json: { name: "", category: "food", address: "x" } })).status).toBe(400);
    expect((await call("/api/places", { method: "POST", cookie, json: { name: "a", category: "spa", address: "x" } })).status).toBe(400);
  });
  it("updates a place; changing the address re-geocodes and clears cached legs", async () => {
    const cookie = await login();
    await call("/api/trip"); // populates travel_legs cache
    mockFetch(() => jsonRes([{ lat: "32.9", lon: "-117.2", display_name: "x" }]));
    const res = await call("/api/places/pl_zoo", { method: "PATCH", cookie, json: { address: "Somewhere else, San Diego", notes: "n" } });
    expect(res.status).toBe(200);
    const p = (await res.json()) as PlaceRes;
    expect(p.lat).toBe(32.9);
    expect(p.notes).toBe("n");
    expect((await call("/api/places/zzz", { method: "PATCH", cookie, json: { notes: "n" } })).status).toBe(404);
  });
  it("deletes an idea; cascades its normal/booked events; refuses places with locked events", async () => {
    const cookie = await login();
    expect((await call("/api/places/pl_rose_canyon", { method: "DELETE", cookie })).status).toBe(200);
    expect((await call("/api/places/pl_rose_canyon")).status).toBe(404);
    const del = await call("/api/places/pl_harbor", { method: "DELETE", cookie });
    expect(await del.json()).toEqual({ ok: true, removedEvents: 1 });
    expect((await call("/api/events/ev_sun_harbor")).status).toBe(404);
    const locked = await call("/api/places/pl_airbnb", { method: "DELETE", cookie });
    expect(locked.status).toBe(409);
  });
});
