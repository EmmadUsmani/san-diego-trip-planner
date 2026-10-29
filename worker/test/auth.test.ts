import { describe, expect, it } from "vitest";
import { call, login } from "./helpers";
import { signSession, verifySession } from "../lib/auth";

describe("auth", () => {
  it("me is unauthenticated by default", async () => {
    const res = await call("/api/auth/me");
    expect(await res.json()).toEqual({ authenticated: false });
  });
  it("rejects a wrong password and sets no cookie", async () => {
    const res = await call("/api/auth/login", { method: "POST", json: { password: "nope" } });
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
  it("login sets a 90-day HttpOnly cookie and me reflects it", async () => {
    const res = await call("/api/auth/login", { method: "POST", json: { password: "test-pass" } });
    expect(res.status).toBe(200);
    const set = res.headers.get("set-cookie")!;
    expect(set).toContain("HttpOnly");
    expect(set).toContain(`Max-Age=${90 * 86400}`);
    expect(set).toContain("SameSite=Lax");
    const cookie = set.split(";")[0]!;
    expect(await (await call("/api/auth/me", { cookie })).json()).toEqual({ authenticated: true });
  });
  it("validates the login body", async () => {
    const res = await call("/api/auth/login", { method: "POST", json: {} });
    expect(res.status).toBe(400);
  });
  it("logout clears the cookie", async () => {
    const cookie = await login();
    const res = await call("/api/auth/logout", { method: "POST", cookie });
    expect(res.headers.get("set-cookie")).toMatch(/sdtp_session=;/);
  });
  it("rejects tampered and expired tokens", async () => {
    const t = await signSession("test-secret");
    expect(await verifySession(t, "test-secret")).toBe(true);
    expect(await verifySession(t, "other-secret")).toBe(false);
    expect(await verifySession(t.slice(0, -1) + (t.endsWith("a") ? "b" : "a"), "test-secret")).toBe(false);
    expect(await verifySession(t, "test-secret", Date.now() + 91 * 86400_000)).toBe(false);
    expect(await verifySession(undefined, "test-secret")).toBe(false);
    expect(await verifySession("garbage", "test-secret")).toBe(false);
  });
  it("every mutation route requires auth; reads are public", async () => {
    const mutations: [string, string, unknown?][] = [
      ["POST", "/api/places", { name: "x", category: "food", address: "y", lat: 1, lng: 1 }],
      ["PATCH", "/api/places/pl_zoo", { notes: "x" }],
      ["DELETE", "/api/places/pl_zoo"],
      ["POST", "/api/events", { title: "x", start: "2026-11-02T18:00:00Z" }],
      ["PATCH", "/api/events/ev_mon_zoo", { notes: "x" }],
      ["POST", "/api/events/ev_sun_harbor/skip"],
      ["POST", "/api/events/ev_sun_harbor/unskip"],
      ["DELETE", "/api/events/ev_mon_zoo"],
      ["PUT", "/api/settings", { startChargePct: 80 }],
    ];
    for (const [method, path, json] of mutations) {
      const res = await call(path, { method, json });
      expect(res.status, `${method} ${path}`).toBe(401);
    }
    for (const path of ["/api/places", "/api/ideas", "/api/events", "/api/trip", "/api/legs", "/api/settings", "/api/places/pl_zoo", "/api/events/ev_mon_zoo"]) {
      expect((await call(path)).status, path).toBe(200);
    }
  });
});
