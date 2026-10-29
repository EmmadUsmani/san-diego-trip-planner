import { pctAt, type RangeTimeline } from "@shared/range";
import { addMinutes, dayBounds, laDateKey, laMinutesOfDay, toMs, type DayKey } from "@shared/time";
import type { Leg } from "@shared/types";

export interface ChartBox {
  width: number;
  height: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
}
export const DEFAULT_BOX: ChartBox = { width: 1180, height: 400, padL: 56, padR: 20, padT: 44, padB: 20 };
/** Visible hours of each day column (minutes after midnight). */
export const DAY_START_MIN = 6 * 60;
export const DAY_END_MIN = 22 * 60;

export interface XY {
  x: number;
  y: number;
  pct: number;
  at: string;
}
export interface ChartLabel {
  x: number;
  y: number;
  text: string;
  suffix?: string;
  anchor: "start" | "middle" | "end";
  low: boolean;
  kind: "start" | "charge" | "day-end" | "end";
}
export interface ChartModel {
  box: ChartBox;
  points: XY[];
  path: string;
  /** y of the low threshold line */
  lowY: number;
  yTicks: { pct: number; y: number }[];
  dayColumns: { day: DayKey; x0: number; x1: number; label: string }[];
  labels: ChartLabel[];
  charges: { x: number; y: number }[];
}

export const clampPct = (p: number) => Math.max(0, Math.min(100, p));

export function pctToY(pct: number, box: ChartBox): number {
  return box.padT + (1 - clampPct(pct) / 100) * (box.height - box.padT - box.padB);
}

export function instantToX(instant: string, days: readonly DayKey[], box: ChartBox): number {
  const colW = (box.width - box.padL - box.padR) / days.length;
  let idx = days.indexOf(laDateKey(instant));
  let frac: number;
  if (idx < 0) {
    idx = toMs(instant) < toMs(dayBounds(days[0]!).start) ? 0 : days.length - 1;
    frac = idx === 0 ? 0 : 1;
  } else {
    frac = Math.max(0, Math.min(1, (laMinutesOfDay(instant) - DAY_START_MIN) / (DAY_END_MIN - DAY_START_MIN)));
  }
  return box.padL + (idx + frac) * colW;
}

export const fmtPct = (p: number, approx = true) => `${approx ? "~" : ""}${Math.round(p)}%`;

/** Expand the timeline so each drive is a ramp from its departure to its arrival instead of a jump. */
export function expandSeries(timeline: RangeTimeline, legs: readonly Leg[]): { at: string; pct: number }[] {
  const legById = new Map(legs.map((l) => [l.id, l]));
  const out: { at: string; pct: number }[] = [];
  for (const p of timeline.points) {
    const leg = p.kind === "leg" && p.refId ? legById.get(p.refId) : undefined;
    const prev = out[out.length - 1];
    if (leg && prev && toMs(leg.departAt) > toMs(prev.at)) out.push({ at: leg.departAt, pct: prev.pct });
    out.push({ at: p.at, pct: p.pct });
  }
  return out;
}

export function buildChart(
  timeline: RangeTimeline,
  legs: readonly Leg[],
  days: readonly { date: DayKey; weekday: string }[],
  box: ChartBox = DEFAULT_BOX,
): ChartModel {
  const keys = days.map((d) => d.date);
  const colW = (box.width - box.padL - box.padR) / keys.length;
  const series = expandSeries(timeline, legs);
  const points: XY[] = series.map((s) => ({ x: instantToX(s.at, keys, box), y: pctToY(s.pct, box), pct: s.pct, at: s.at }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const labels: ChartLabel[] = [];
  const first = timeline.points[0]!;
  const last = timeline.points[timeline.points.length - 1]!;
  const low = (p: number) => p < timeline.lowPct;
  labels.push({ x: instantToX(first.at, keys, box), y: pctToY(first.pct, box) - 12, text: fmtPct(first.pct, false), suffix: "start", anchor: "start", low: low(first.pct), kind: "start" });
  const charges = timeline.points.filter((p) => p.kind === "charge-end");
  for (const c of charges) {
    labels.push({ x: instantToX(c.at, keys, box), y: pctToY(c.pct, box) - 12, text: fmtPct(c.pct, false), anchor: "middle", low: low(c.pct), kind: "charge" });
  }
  // End of each day (except the last, which gets the "home" label).
  keys.slice(0, -1).forEach((day) => {
    const end = addMinutes(dayBounds(day).end, -1);
    const inDay = timeline.points.filter((p) => laDateKey(p.at) === day);
    const lastInDay = inDay[inDay.length - 1];
    const px = lastInDay ? lastInDay.at : end;
    const pct = pctAt(timeline, end);
    labels.push({ x: instantToX(px, keys, box), y: pctToY(pct, box) + 22, text: fmtPct(pct), anchor: "middle", low: low(pct), kind: "day-end" });
  });
  labels.push({ x: instantToX(last.at, keys, box) + 14, y: pctToY(last.pct, box) + 4, text: fmtPct(last.pct), suffix: "home", anchor: "start", low: low(last.pct), kind: "end" });

  return {
    box,
    points,
    path,
    lowY: pctToY(timeline.lowPct, box),
    yTicks: [0, 20, 50, 100].map((pct) => ({ pct, y: pctToY(pct, box) })),
    dayColumns: days.map((d, i) => ({ day: d.date, x0: box.padL + i * colW, x1: box.padL + (i + 1) * colW, label: d.weekday })),
    labels,
    charges: charges.map((c) => {
      const s = timeline.points.find((p) => p.refId === c.refId && p.kind === "charge-start")!;
      return { x: (instantToX(s.at, keys, box) + instantToX(c.at, keys, box)) / 2, y: (pctToY(s.pct, box) + pctToY(c.pct, box)) / 2 };
    }),
  };
}
