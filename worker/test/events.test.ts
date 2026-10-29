import { describe, expect, it } from "vitest";
import { call, login } from "./helpers";

type Ev = { id: string; title: string; start: string; end: string; kind: string; skipped: boolean; placeId: string | null };
type Err = { error: string; code?: string };

describe("events", () => {
  it("lists in order and filters by LA day", async () => {
    const all = (await (await call("/api/events")).json()) as Ev[];
    expect(all).toHaveLength(19);
    expect(all[0]!.id).toBe("ev_sat_leave");
    const sun = (await (await call("/api/events?day=2026-11-01")).json()) as Ev[];
    expect(sun.map((e) => e.id)).toEqual(["ev_sun_brunch", "ev_sun_birch", "ev_sun_harbor", "ev_sun_dinner"]);
    const sat = (await (await call("/api/events?day=2026-10-31")).json()) as Ev[];
    expect(sat.at(-1)!.id).toBe("ev_sat_dinner"); // 7 PM PDT is Nov 1 UTC
  });
  it("seed instants respect DST", async () => {
    const e = (await (await call("/api/events/ev_sat_checkin")).json()) as Ev;
    expect(e.start).toBe("2026-10-31T23:00:00.000Z"); // 4 PM PDT
    const h = (await (await call("/api/events/ev_sun_harbor")).json()) as Ev;
    expect(h.start).toBe("2026-11-02T00:15:00.000Z"); // 4:15 PM PST
    expect(h.kind).toBe("booked");
  });
  it("creates an event from an idea using the place default duration", async () => {
    const cookie = await login();
    const res = await call("/api/events", { method: "POST", cookie, json: { placeId: "pl_rose_canyon", start: "2026-11-02T17:00:00Z" } });
    expect(res.status).toBe(201);
    const e = (await res.json()) as Ev;
    expect(e.title).toBe("Rose Canyon Open Space Park");
    expect(e.end).toBe("2026-11-02T18:30:00.000Z");
    expect(e.kind).toBe("normal");
    const ideas = (await (await call("/api/ideas")).json()) as { id: string }[];
    expect(ideas.map((i) => i.id)).not.toContain("pl_rose_canyon");
  });
  it("defaults to 60 min without a place, rejects bad input", async () => {
    const cookie = await login();
    const ok = await call("/api/events", { method: "POST", cookie, json: { title: "Nap", start: "2026-11-02T20:00:00Z" } });
    expect(((await ok.json()) as Ev).end).toBe("2026-11-02T21:00:00.000Z");
    expect((await call("/api/events", { method: "POST", cookie, json: { start: "2026-11-02T20:00:00Z" } })).status).toBe(422);
    expect((await call("/api/events", { method: "POST", cookie, json: { title: "x", start: "2026-12-25T20:00:00Z" } })).status).toBe(422);
    expect((await call("/api/events", { method: "POST", cookie, json: { title: "x", start: "2026-11-02T20:00:00Z", end: "2026-11-02T19:00:00Z" } })).status).toBe(422);
    expect((await call("/api/events", { method: "POST", cookie, json: { title: "x", start: "not-a-date" } })).status).toBe(400);
    expect((await call("/api/events", { method: "POST", cookie, json: { title: "x", kind: "locked", start: "2026-11-02T20:00:00Z" } })).status).toBe(400);
    expect((await call("/api/events", { method: "POST", cookie, json: { placeId: "nope", start: "2026-11-02T20:00:00Z" } })).status).toBe(422);
  });
  it("moves a normal event, preserving duration when only start is sent", async () => {
    const cookie = await login();
    const res = await call("/api/events/ev_sun_birch", { method: "PATCH", cookie, json: { start: "2026-11-01T20:00:00Z" } });
    const e = (await res.json()) as Ev;
    expect(e.start).toBe("2026-11-01T20:00:00.000Z");
    expect(e.end).toBe("2026-11-01T23:30:00.000Z");
  });
  it("locked events cannot be moved, renamed, skipped or deleted (409)", async () => {
    const cookie = await login();
    for (const body of [{ start: "2026-10-31T23:30:00Z" }, { title: "x" }, { skipped: true }]) {
      const res = await call("/api/events/ev_sat_checkin", { method: "PATCH", cookie, json: body });
      expect(res.status).toBe(409);
      expect(((await res.json()) as Err).code).toBe("locked");
    }
    expect((await call("/api/events/ev_tue_checkout", { method: "DELETE", cookie })).status).toBe(409);
    expect((await call("/api/events/ev_sat_checkin/skip", { method: "POST", cookie })).status).toBe(409);
    const still = (await (await call("/api/events/ev_sat_checkin")).json()) as Ev;
    expect(still.start).toBe("2026-10-31T23:00:00.000Z");
  });
  it("booked events keep their time but can be skipped, unskipped, and removed", async () => {
    const cookie = await login();
    const move = await call("/api/events/ev_sun_harbor", { method: "PATCH", cookie, json: { start: "2026-11-02T01:00:00Z" } });
    expect(move.status).toBe(409);
    expect(((await move.json()) as Err).code).toBe("booked");
    const skip = await call("/api/events/ev_sun_harbor/skip", { method: "POST", cookie });
    expect(((await skip.json()) as Ev).skipped).toBe(true);
    const un = await call("/api/events/ev_sun_harbor/unskip", { method: "POST", cookie });
    expect(((await un.json()) as Ev).skipped).toBe(false);
    expect((await call("/api/events/ev_sun_harbor", { method: "DELETE", cookie })).status).toBe(200);
    expect((await call("/api/events/ev_sun_harbor")).status).toBe(404);
  });
  it("normal events cannot be skipped; deleting a normal event returns the place to ideas", async () => {
    const cookie = await login();
    expect((await call("/api/events/ev_mon_zoo/skip", { method: "POST", cookie })).status).toBe(422);
    expect((await call("/api/events/ev_mon_zoo", { method: "DELETE", cookie })).status).toBe(200);
    const ideas = (await (await call("/api/ideas")).json()) as { id: string }[];
    expect(ideas.map((i) => i.id)).toContain("pl_zoo");
    expect((await call("/api/events/missing", { method: "DELETE", cookie })).status).toBe(404);
  });
});
