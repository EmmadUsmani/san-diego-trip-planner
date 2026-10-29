import { describe, expect, it } from "vitest";
import { resolveDrop } from "./dnd";
import { minToY } from "./layout";

const sat = { type: "day", day: "2026-10-31", top: 100 } as const;
const ev = { type: "event", id: "e1", kind: "normal", start: "2026-10-31T16:00:00.000Z" } as const;

describe("resolveDrop", () => {
  it("moves an event, snapping to 15 min", () => {
    expect(resolveDrop(ev, sat, 100 + minToY(10 * 60 + 6))).toEqual({ kind: "move", id: "e1", start: "2026-10-31T17:00:00.000Z" });
  });
  it("moves across days with the DST offset of the target day", () => {
    const sun = { type: "day", day: "2026-11-01", top: 0 } as const;
    expect(resolveDrop(ev, sun, minToY(9 * 60))).toEqual({ kind: "move", id: "e1", start: "2026-11-01T17:00:00.000Z" });
  });
  it("ignores no-op moves", () => {
    expect(resolveDrop(ev, sat, 100 + minToY(9 * 60))).toBeNull();
  });
  it("never moves locked/booked or removes locked", () => {
    for (const kind of ["locked", "booked"] as const) {
      expect(resolveDrop({ ...ev, kind }, sat, 500)).toBeNull();
    }
    expect(resolveDrop({ ...ev, kind: "locked" }, { type: "tray" }, 0)).toBeNull();
  });
  it("schedules an idea and unschedules to the tray", () => {
    expect(resolveDrop({ type: "idea", placeId: "pl_x" }, sat, 100 + minToY(14 * 60))).toEqual({ kind: "schedule", placeId: "pl_x", start: "2026-10-31T21:00:00.000Z" });
    expect(resolveDrop(ev, { type: "tray" }, 0)).toEqual({ kind: "unschedule", id: "e1" });
    expect(resolveDrop({ type: "idea", placeId: "p" }, { type: "tray" }, 0)).toBeNull();
    expect(resolveDrop(ev, null, 0)).toBeNull();
  });
});
