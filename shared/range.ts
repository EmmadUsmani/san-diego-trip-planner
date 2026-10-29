import { toMs } from "./time";

export const BATTERY_KWH = 69.5;
export const DEFAULT_EFFICIENCY_KWH_PER_100MI = 24;
export const EPA_RANGE_MI = 321;
export const LOW_THRESHOLD_PCT = 20;
export const DEFAULT_START_CHARGE_PCT = 90;

export interface RangeLeg {
  id: string;
  /** Instant the drive ends (arrival). Consumption is applied at this instant. */
  at: string;
  miles: number;
}
export interface RangeCharge {
  id: string;
  /** Charge start and end instants. */
  start: string;
  end: string;
  toPct: number;
}
export interface RangeInput {
  startPct: number;
  startAt: string;
  efficiencyKwhPer100Mi: number;
  batteryKwh?: number;
  lowPct?: number;
  legs: RangeLeg[];
  charges: RangeCharge[];
}
export interface RangePoint {
  at: string;
  pct: number;
  kind: "start" | "leg" | "charge-start" | "charge-end";
  refId: string | null;
}
export interface RangeTimeline {
  points: RangePoint[];
  lowPct: number;
  minPct: number;
  endPct: number;
  /** First point below the low threshold, or null. */
  firstLow: RangePoint | null;
}

/** Percent of battery used by driving `miles`. */
export function pctForMiles(miles: number, efficiencyKwhPer100Mi: number, batteryKwh = BATTERY_KWH): number {
  return ((miles * efficiencyKwhPer100Mi) / 100 / batteryKwh) * 100;
}

/** Battery % timeline in time order. Percent may go negative (not clamped) so "would run out" is visible. */
export function computeRange(input: RangeInput): RangeTimeline {
  const batteryKwh = input.batteryKwh ?? BATTERY_KWH;
  const lowPct = input.lowPct ?? LOW_THRESHOLD_PCT;
  type Item = { at: number; order: number; run: (pct: number) => RangePoint[] };
  const items: Item[] = [];
  for (const leg of input.legs) {
    items.push({
      at: toMs(leg.at),
      order: 0,
      run: (pct) => [
        { at: leg.at, pct: pct - pctForMiles(leg.miles, input.efficiencyKwhPer100Mi, batteryKwh), kind: "leg", refId: leg.id },
      ],
    });
  }
  for (const c of input.charges) {
    items.push({
      at: toMs(c.start),
      order: 1,
      run: (pct) => [
        { at: c.start, pct, kind: "charge-start", refId: c.id },
        { at: c.end, pct: Math.max(pct, c.toPct), kind: "charge-end", refId: c.id },
      ],
    });
  }
  items.sort((a, b) => a.at - b.at || a.order - b.order);
  let pct = input.startPct;
  const points: RangePoint[] = [{ at: input.startAt, pct, kind: "start", refId: null }];
  for (const it of items) {
    const pts = it.run(pct);
    points.push(...pts);
    pct = pts[pts.length - 1]!.pct;
  }
  const minPct = Math.min(...points.map((p) => p.pct));
  return {
    points,
    lowPct,
    minPct,
    endPct: pct,
    firstLow: points.find((p) => p.pct < lowPct) ?? null,
  };
}

/** Battery % at an instant (last point at or before it). */
export function pctAt(timeline: RangeTimeline, instant: string): number {
  const t = toMs(instant);
  let pct = timeline.points[0]?.pct ?? 0;
  for (const p of timeline.points) {
    if (toMs(p.at) <= t) pct = p.pct;
    else break;
  }
  return pct;
}
