import { PRAYER_NAMES, type PrayerName } from "@shared/prayers";
import { pctAt, type RangeTimeline } from "@shared/range";
import { dayBounds, laDateKey, toMs, TRIP_DAYS } from "@shared/time";
import type { TripDay, TripEvent } from "@shared/types";

export type TripPhase = "before" | "during" | "after";

export function tripPhase(now: Date | number | string, days: readonly string[] = TRIP_DAYS): TripPhase {
  const t = toMs(now);
  if (t < toMs(dayBounds(days[0]!).start)) return "before";
  if (t >= toMs(dayBounds(days[days.length - 1]!).end)) return "after";
  return "during";
}

/** Whole calendar days (LA) from `now` until the first trip day; negative once it started. */
export function daysUntilTrip(now: Date | number | string, first: string = TRIP_DAYS[0]): number {
  const a = Date.parse(`${laDateKey(now)}T00:00:00Z`);
  const b = Date.parse(`${first}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function countdownLabel(now: Date | number | string): string {
  const phase = tripPhase(now);
  if (phase === "after") return "Trip complete";
  if (phase === "during") {
    const idx = TRIP_DAYS.indexOf(laDateKey(now) as (typeof TRIP_DAYS)[number]);
    return `Day ${idx + 1} of ${TRIP_DAYS.length}`;
  }
  const n = daysUntilTrip(now);
  return n === 1 ? "Tomorrow" : `${n} days to go`;
}

/** Index of the day the Today view shows: before the trip Day 1, after the trip the last day. */
export function todayIndex(now: Date | number | string, days: readonly { date: string }[]): number {
  const phase = tripPhase(now, days.map((d) => d.date));
  if (phase === "before") return 0;
  if (phase === "after") return days.length - 1;
  const idx = days.findIndex((d) => d.date === laDateKey(now));
  return idx < 0 ? 0 : idx;
}

export interface NowNext {
  phase: TripPhase;
  day: TripDay;
  /** Event in progress (during the trip only). */
  current: TripEvent | null;
  /** Next event that hasn't started. */
  next: TripEvent | null;
  /** Remaining items today after `next`: events and prayers, in time order. */
  upcoming: UpcomingItem[];
  nextPrayer: { name: PrayerName; at: string } | null;
}
export type UpcomingItem = { kind: "prayer"; name: PrayerName; at: string } | { kind: "event"; event: TripEvent; at: string };

export function nowNext(day: TripDay, now: Date | number | string, phase: TripPhase): NowNext {
  const t = phase === "before" ? toMs(dayBounds(day.date).start) : toMs(now);
  const active = day.events.filter((e) => !e.skipped).sort((a, b) => a.start.localeCompare(b.start));
  const current = phase === "during" ? (active.find((e) => toMs(e.start) <= t && t < toMs(e.end)) ?? null) : null;
  const rest = phase === "after" ? [] : active.filter((e) => toMs(e.start) > t);
  const next = rest[0] ?? null;
  const prayers = PRAYER_NAMES.map((name) => ({ name, at: day.prayers[name] })).filter((p) => phase !== "after" && toMs(p.at) > t);
  const upcoming: UpcomingItem[] = [
    ...prayers.map((p) => ({ kind: "prayer" as const, ...p })),
    ...rest.slice(1).map((event) => ({ kind: "event" as const, event, at: event.start })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return { phase, day, current, next, upcoming, nextPrayer: prayers[0] ?? null };
}

/** Battery % "now": start charge before the trip, end value after it. */
export function batteryNow(range: RangeTimeline, now: Date | number | string, phase: TripPhase): number {
  if (phase === "before") return range.points[0]!.pct;
  if (phase === "after") return range.endPct;
  return pctAt(range, new Date(toMs(now)).toISOString());
}
