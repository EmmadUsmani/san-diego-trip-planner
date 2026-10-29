import { describe, expect, it } from "vitest";
import { prayerTimesFor, isEmphasizedPrayer } from "./prayers";
import { laMinutesOfDay } from "./time";

const hm = (h: number, m: number) => h * 60 + m;
function expectNear(iso: string, h: number, m: number, tol = 2) {
  expect(Math.abs(laMinutesOfDay(iso) - hm(h, m))).toBeLessThanOrEqual(tol);
}

describe("prayer times (ISNA, Airbnb coords, LA tz)", () => {
  it("Sat 10/31", () => {
    const t = prayerTimesFor("2026-10-31");
    expectNear(t.fajr, 5, 57);
    expectNear(t.dhuhr, 12, 32);
    expectNear(t.asr, 15, 36);
    expectNear(t.maghrib, 17, 58);
    expectNear(t.isha, 19, 8);
  });
  it("Sun 11/1 (after DST ends)", () => {
    const t = prayerTimesFor("2026-11-01");
    expectNear(t.fajr, 4, 58);
    expectNear(t.dhuhr, 11, 32);
    expectNear(t.asr, 14, 36);
    expectNear(t.maghrib, 16, 58);
    expectNear(t.isha, 18, 7);
  });
  it("Mon and Tue", () => {
    const mon = prayerTimesFor("2026-11-02");
    expectNear(mon.fajr, 4, 58);
    expectNear(mon.maghrib, 16, 57);
    const tue = prayerTimesFor("2026-11-03");
    expectNear(tue.dhuhr, 11, 32);
    expectNear(tue.isha, 18, 5);
  });
  it("emphasis", () => {
    expect(isEmphasizedPrayer("fajr")).toBe(true);
    expect(isEmphasizedPrayer("dhuhr")).toBe(true);
    expect(isEmphasizedPrayer("maghrib")).toBe(true);
    expect(isEmphasizedPrayer("asr")).toBe(false);
    expect(isEmphasizedPrayer("isha")).toBe(false);
  });
});
