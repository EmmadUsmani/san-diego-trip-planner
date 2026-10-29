import { describe, expect, it } from "vitest";
import { prayerTimesFor } from "@shared/prayers";
import { laToUtc } from "@shared/time";
import type { TripDay, TripEvent } from "@shared/types";
import { countdownLabel, daysUntilTrip, nowNext, todayIndex, tripPhase } from "./today";

const ev = (id: string, day: string, s: string, e: string, skipped = false): TripEvent =>
  ({ id, placeId: null, title: id, kind: "normal", start: laToUtc(day, s), end: laToUtc(day, e), skipped, chargeToPct: null, notes: null }) as TripEvent;
const mkDay = (date: string, events: TripEvent[]): TripDay =>
  ({ date, weekday: "Sun", label: "", tzName: "PST", clocksFallBack: false, events, legs: [], prayers: prayerTimesFor(date), batteryEndPct: 50 });
const SUN = "2026-11-01";
const day = mkDay(SUN, [ev("brunch", SUN, "09:00", "10:00"), ev("birch", SUN, "10:15", "13:45"), ev("harbor", SUN, "16:15", "17:15"), ev("skipme", SUN, "14:00", "15:00", true), ev("dinner", SUN, "18:15", "19:30")]);
const at = (d: string, hhmm: string) => laToUtc(d, hhmm);

describe("trip phase and countdown", () => {
  it("classifies before / during / after (DST day included)", () => {
    expect(tripPhase(at("2026-10-28", "12:00"))).toBe("before");
    expect(tripPhase(at("2026-10-31", "00:30"))).toBe("during");
    expect(tripPhase(at(SUN, "23:30"))).toBe("during");
    expect(tripPhase(at("2026-11-03", "23:59"))).toBe("during");
    expect(tripPhase(at("2026-11-04", "00:01"))).toBe("after");
  });
  it("counts days in LA time", () => {
    expect(daysUntilTrip(at("2026-10-28", "20:00"))).toBe(3);
    expect(countdownLabel(at("2026-10-28", "20:00"))).toBe("3 days to go");
    expect(countdownLabel(at("2026-10-30", "09:00"))).toBe("Tomorrow");
    expect(countdownLabel(at(SUN, "09:00"))).toBe("Day 2 of 4");
    expect(countdownLabel(at("2026-11-10", "09:00"))).toBe("Trip complete");
  });
});

describe("today view selection", () => {
  const days = ["2026-10-31", SUN, "2026-11-02", "2026-11-03"].map((d) => ({ date: d }));
  it("shows Day 1 before the trip, the last day after, today during", () => {
    expect(todayIndex(at("2026-10-01", "12:00"), days)).toBe(0);
    expect(todayIndex(at("2026-12-01", "12:00"), days)).toBe(3);
    expect(todayIndex(at(SUN, "11:10"), days)).toBe(1);
  });
  it("finds the current and next event, skipping skipped ones", () => {
    const r = nowNext(day, at(SUN, "11:10"), "during");
    expect(r.current?.id).toBe("birch");
    expect(r.next?.id).toBe("harbor");
    expect(r.nextPrayer?.name).toBe("dhuhr");
    const items = r.upcoming.map((u) => (u.kind === "prayer" ? u.name : u.event.id));
    expect(items).toEqual(["dhuhr", "asr", "maghrib", "isha", "dinner"]);
  });
  it("between events there is no current", () => {
    const r = nowNext(day, at(SUN, "14:30"), "during");
    expect(r.current).toBeNull();
    expect(r.next?.id).toBe("harbor");
  });
  it("before the trip shows the first event as next and Fajr", () => {
    const r = nowNext(day, at("2026-10-20", "12:00"), "before");
    expect(r.current).toBeNull();
    expect(r.next?.id).toBe("brunch");
    expect(r.nextPrayer?.name).toBe("fajr");
  });
  it("after the trip has nothing next", () => {
    const r = nowNext(day, at("2026-12-01", "12:00"), "after");
    expect(r.next).toBeNull();
    expect(r.nextPrayer).toBeNull();
    expect(r.upcoming).toEqual([]);
  });
  it("after the last prayer there is no next prayer", () => {
    expect(nowNext(day, at(SUN, "21:00"), "during").nextPrayer).toBeNull();
  });
});
