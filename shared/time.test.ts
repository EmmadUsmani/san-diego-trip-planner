import { describe, expect, it } from "vitest";
import {
  dayBounds, dstShiftOnDay, formatTime, formatTimeCompact, formatDuration, laDateKey, laOffsetMinutes, laToUtc, snapInstant, addDays, formatDayLabel, weekdayShort, laMinutesOfDay,
} from "./time";

describe("time (America/Los_Angeles, DST)", () => {
  it("Saturday is PDT (-7), Sunday onward PST (-8)", () => {
    expect(laOffsetMinutes("2026-10-31T20:00:00Z")).toBe(-420);
    expect(laOffsetMinutes("2026-11-01T12:00:00Z")).toBe(-480);
    expect(laOffsetMinutes("2026-11-03T12:00:00Z")).toBe(-480);
  });
  it("converts LA wall time to UTC on both sides of the change", () => {
    expect(laToUtc("2026-10-31", "16:00")).toBe("2026-10-31T23:00:00.000Z");
    expect(laToUtc("2026-11-01", "09:00")).toBe("2026-11-01T17:00:00.000Z");
    expect(laToUtc("2026-11-03", "09:30")).toBe("2026-11-03T17:30:00.000Z");
    expect(laToUtc("2026-11-01", "00:30")).toBe("2026-11-01T07:30:00.000Z"); // still PDT
    expect(laToUtc("2026-11-01", "03:00")).toBe("2026-11-01T11:00:00.000Z"); // PST
  });
  it("day bounds: Sunday is 25 hours", () => {
    const sat = dayBounds("2026-10-31");
    const sun = dayBounds("2026-11-01");
    expect(sat.start).toBe("2026-10-31T07:00:00.000Z");
    expect(sun.start).toBe("2026-11-01T07:00:00.000Z");
    expect(sun.end).toBe("2026-11-02T08:00:00.000Z");
    expect(dstShiftOnDay("2026-11-01")).toBe(60);
    expect(dstShiftOnDay("2026-10-31")).toBe(0);
    expect(dstShiftOnDay("2026-11-02")).toBe(0);
  });
  it("buckets late-night instants by LA date, not UTC date", () => {
    expect(laDateKey("2026-11-01T03:30:00Z")).toBe("2026-10-31"); // 8:30 PM PDT Sat
    expect(laDateKey("2026-11-01T08:30:00Z")).toBe("2026-11-01"); // 12:30 AM PST Sun
    expect(laDateKey("2026-11-02T07:59:00Z")).toBe("2026-11-01"); // 11:59 PM PST Sun
    expect(laDateKey("2026-11-02T08:00:00Z")).toBe("2026-11-02");
  });
  it("handles the repeated 1 AM hour", () => {
    expect(laMinutesOfDay("2026-11-01T07:30:00Z")).toBe(30); // 12:30 AM PDT
    expect(laMinutesOfDay("2026-11-01T08:30:00Z")).toBe(90); // 1:30 AM PDT (first 1 AM hour)
    expect(laMinutesOfDay("2026-11-01T09:30:00Z")).toBe(90); // 1:30 AM PST (repeated hour)
    expect(laMinutesOfDay("2026-11-01T10:30:00Z")).toBe(150); // 2:30 AM PST
  });
  it("formats times in LA", () => {
    expect(formatTime("2026-10-31T23:00:00Z")).toBe("4:00 PM");
    expect(formatTime("2026-11-01T17:00:00Z")).toBe("9:00 AM");
    expect(formatTimeCompact("2026-11-01T17:00:00Z")).toBe("9a");
    expect(formatTimeCompact("2026-10-31T19:30:00Z")).toBe("12:30p");
  });
  it("snaps to 15 minutes", () => {
    expect(snapInstant("2026-11-01T17:07:00Z")).toBe("2026-11-01T17:00:00.000Z");
    expect(snapInstant("2026-11-01T17:08:00Z")).toBe("2026-11-01T17:15:00.000Z");
  });
  it("date helpers", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-03", -4)).toBe("2026-10-30");
    expect(formatDayLabel("2026-10-31")).toBe("Sat, Oct 31");
    expect(weekdayShort("2026-11-03")).toBe("Tue");
    expect(formatDuration(150)).toBe("2h 30m");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2h");
  });
});
