import { describe, expect, it } from "vitest";
import { dropToStart, eventRect, GRID_HEIGHT, HOUR_PX, instantToY, minToY, rainAlpha, yToMin } from "./layout";

describe("schedule layout", () => {
  it("maps time to pixels, 4 AM at the top", () => {
    expect(minToY(240)).toBe(0);
    expect(minToY(5 * 60)).toBe(HOUR_PX);
    expect(GRID_HEIGHT).toBe(18 * HOUR_PX);
    expect(yToMin(HOUR_PX * 5)).toBe(540);
  });
  it("places events by LA wall time (PDT Sat, PST Sun)", () => {
    expect(instantToY("2026-10-31T16:00:00.000Z")).toBe(5 * HOUR_PX); // 9:00 PDT
    expect(instantToY("2026-11-01T17:00:00.000Z")).toBe(5 * HOUR_PX); // 9:00 PST
    expect(eventRect("2026-11-01T17:00:00.000Z", "2026-11-01T18:30:00.000Z")).toEqual({ top: 5 * HOUR_PX, height: 1.5 * HOUR_PX });
  });
  it("clamps and enforces a min height", () => {
    expect(eventRect("2026-10-31T16:00:00.000Z", "2026-10-31T16:05:00.000Z").height).toBeGreaterThanOrEqual(28);
    expect(eventRect("2026-10-31T09:00:00.000Z", "2026-10-31T16:00:00.000Z").top).toBe(0);
  });
  it("snaps drops to 15 minutes and converts with the right offset", () => {
    expect(dropToStart("2026-10-31", minToY(9 * 60 + 7))).toBe("2026-10-31T16:00:00.000Z");
    expect(dropToStart("2026-11-01", minToY(9 * 60 + 8))).toBe("2026-11-01T17:15:00.000Z");
    expect(dropToStart("2026-11-02", minToY(14 * 60))).toBe("2026-11-02T22:00:00.000Z");
  });
  it("keeps drops on the grid", () => {
    expect(dropToStart("2026-10-31", -500)).toBe("2026-10-31T11:00:00.000Z"); // 4:00 PDT
    expect(dropToStart("2026-11-01", 99999)).toBe("2026-11-02T05:00:00.000Z"); // 9:00 PM PST
  });
  it("rain alpha scales 0.06-0.24", () => {
    expect(rainAlpha(0)).toBe(0);
    expect(rainAlpha(100)).toBe(0.24);
    expect(rainAlpha(null)).toBe(0);
  });
});
