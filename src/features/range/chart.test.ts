import { describe, expect, it } from "vitest";
import { computeRange } from "@shared/range";
import { laToUtc } from "@shared/time";
import type { Leg } from "@shared/types";
import { buildChart, DEFAULT_BOX, fmtPct, instantToX, pctToY } from "./chart";

const days = [
  { date: "2026-10-31", weekday: "Sat" },
  { date: "2026-11-01", weekday: "Sun" },
  { date: "2026-11-02", weekday: "Mon" },
  { date: "2026-11-03", weekday: "Tue" },
];
const keys = days.map((d) => d.date);
const leg = (id: string, day: string, dep: string, arr: string, miles: number): Leg => ({
  id, day, fromEventId: null, toEventId: null, fromPlaceId: "a", toPlaceId: "b", minutes: 0, miles, source: "osrm",
  departAt: laToUtc(day, dep), arriveAt: laToUtc(day, arr),
});
const legs = [leg("l1", "2026-10-31", "10:00", "13:00", 140), leg("l2", "2026-11-03", "10:30", "11:30", 200)];
const timeline = computeRange({
  startPct: 90,
  startAt: laToUtc("2026-10-31", "00:00"),
  efficiencyKwhPer100Mi: 24,
  legs: legs.map((l) => ({ id: l.id, at: l.arriveAt, miles: l.miles })),
  charges: [{ id: "c1", start: laToUtc("2026-11-02", "08:30"), end: laToUtc("2026-11-02", "09:00"), toPct: 80 }],
});

describe("chart scaling", () => {
  it("maps percent to y (100 top, 0 bottom, clamped)", () => {
    const b = DEFAULT_BOX;
    expect(pctToY(100, b)).toBe(b.padT);
    expect(pctToY(0, b)).toBe(b.height - b.padB);
    expect(pctToY(-20, b)).toBe(b.height - b.padB);
    expect(pctToY(50, b)).toBeCloseTo((b.padT + b.height - b.padB) / 2);
  });
  it("places instants in equal day columns, monotonic in time", () => {
    const b = DEFAULT_BOX;
    const col = (b.width - b.padL - b.padR) / 4;
    const satAfternoon = instantToX(laToUtc("2026-10-31", "14:00"), keys, b);
    expect(satAfternoon).toBeGreaterThan(b.padL);
    expect(satAfternoon).toBeLessThan(b.padL + col);
    const sunAfternoon = instantToX(laToUtc("2026-11-01", "14:00"), keys, b);
    expect(sunAfternoon - satAfternoon).toBeCloseTo(col);
    expect(instantToX(laToUtc("2026-10-31", "03:00"), keys, b)).toBe(b.padL);
  });
});

describe("buildChart", () => {
  const m = buildChart(timeline, legs, days);
  it("ramps drives and keeps x monotonic", () => {
    expect(m.points.length).toBeGreaterThan(timeline.points.length);
    for (let i = 1; i < m.points.length; i++) expect(m.points[i]!.x).toBeGreaterThanOrEqual(m.points[i - 1]!.x);
    expect(m.path.startsWith("M")).toBe(true);
  });
  it("labels start, charge, day ends and the final point", () => {
    const texts = m.labels.map((l) => l.text + (l.suffix ? ` ${l.suffix}` : ""));
    expect(texts[0]).toBe("90% start");
    expect(texts).toContain("80%");
    expect(texts.at(-1)).toMatch(/^~-?\d+% home$/);
    expect(m.labels.filter((l) => !l.suffix && l.text.startsWith("~")).length).toBe(3);
  });
  it("flags low labels under the threshold and has the 20% line", () => {
    expect(m.labels[0]!.low).toBe(false);
    expect(m.labels.at(-1)!.low).toBe(true);
    expect(m.lowY).toBeCloseTo(pctToY(20, DEFAULT_BOX));
    expect(m.charges).toHaveLength(1);
    expect(m.dayColumns.map((d) => d.label)).toEqual(["Sat", "Sun", "Mon", "Tue"]);
  });
  it("formats percents", () => {
    expect(fmtPct(37.6)).toBe("~38%");
    expect(fmtPct(90, false)).toBe("90%");
  });
});
