import { describe, expect, it } from "vitest";
import { computeRange, pctAt, pctForMiles, BATTERY_KWH } from "./range";

describe("range timeline", () => {
  it("converts miles to percent", () => {
    // 100 mi at 24 kWh/100mi = 24 kWh = 34.5% of 69.5
    expect(pctForMiles(100, 24)).toBeCloseTo((24 / BATTERY_KWH) * 100, 5);
  });
  const base = { startPct: 90, startAt: "2026-10-31T16:00:00Z", efficiencyKwhPer100Mi: 24, batteryKwh: 69.5 };
  it("drains through legs in time order regardless of input order", () => {
    const t = computeRange({
      ...base,
      legs: [
        { id: "b", at: "2026-10-31T20:00:00Z", miles: 100 },
        { id: "a", at: "2026-10-31T18:00:00Z", miles: 50 },
      ],
      charges: [],
    });
    expect(t.points.map((p) => p.refId)).toEqual([null, "a", "b"]);
    expect(t.endPct).toBeCloseTo(90 - pctForMiles(150, 24), 5);
    expect(t.firstLow).toBeNull();
  });
  it("charger raises to chargeToPct but never lowers", () => {
    const t = computeRange({
      ...base,
      legs: [{ id: "l1", at: "2026-10-31T18:00:00Z", miles: 200 }],
      charges: [
        { id: "c1", start: "2026-10-31T19:00:00Z", end: "2026-10-31T19:30:00Z", toPct: 80 },
        { id: "c2", start: "2026-10-31T21:00:00Z", end: "2026-10-31T21:30:00Z", toPct: 10 },
      ],
    });
    const c1 = t.points.find((p) => p.refId === "c1" && p.kind === "charge-end")!;
    const c2 = t.points.find((p) => p.refId === "c2" && p.kind === "charge-end")!;
    expect(c1.pct).toBe(80);
    expect(c2.pct).toBe(80);
  });
  it("flags the first point below the low line and allows negative", () => {
    const t = computeRange({ ...base, legs: [{ id: "x", at: "2026-10-31T18:00:00Z", miles: 300 }], charges: [] });
    expect(t.endPct).toBeLessThan(0);
    expect(t.firstLow?.refId).toBe("x");
    expect(t.minPct).toBe(t.endPct);
    expect(t.lowPct).toBe(20);
  });
  it("pctAt returns the last known value", () => {
    const t = computeRange({ ...base, legs: [{ id: "x", at: "2026-10-31T18:00:00Z", miles: 100 }], charges: [] });
    expect(pctAt(t, "2026-10-31T17:00:00Z")).toBe(90);
    expect(pctAt(t, "2026-10-31T19:00:00Z")).toBeCloseTo(90 - pctForMiles(100, 24), 5);
  });
});
