/** Time helpers. All instants are UTC ISO strings; display and day-bucketing use America/Los_Angeles. */
export const TZ = "America/Los_Angeles";

/** Local calendar dates of the trip (Sat PDT; DST ends Sun 2 AM, so Sun-Tue are PST). */
export const TRIP_DAYS = ["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"] as const;
export type DayKey = string; // YYYY-MM-DD in LA time

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

export interface LaParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
}

export function laParts(instant: string | number | Date): LaParts {
  const ms = toMs(instant);
  const o: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(new Date(ms))) o[p.type] = p.value;
  return {
    year: +o.year!,
    month: +o.month!,
    day: +o.day!,
    hour: +o.hour! % 24,
    minute: +o.minute!,
    second: +o.second!,
    weekday: o.weekday!,
  };
}

export function toMs(instant: string | number | Date): number {
  return instant instanceof Date ? instant.getTime() : typeof instant === "number" ? instant : Date.parse(instant);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** LA offset from UTC in minutes (negative: -420 PDT, -480 PST) at a given instant. */
export function laOffsetMinutes(instant: string | number | Date): number {
  const ms = toMs(instant);
  const p = laParts(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** LA calendar date (YYYY-MM-DD) of an instant. */
export function laDateKey(instant: string | number | Date): DayKey {
  const p = laParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes since local LA midnight (can be fractional-free; DST days are 25h so max 1500). */
export function laMinutesOfDay(instant: string | number | Date): number {
  const p = laParts(instant);
  return p.hour * 60 + p.minute;
}

/** Convert LA wall-clock date + time to a UTC ISO instant. Handles DST. */
export function laToUtc(day: DayKey, hhmm: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const [hh, mm] = hhmm.split(":").map(Number) as [number, number];
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  // Two-pass offset resolution (correct except for nonexistent/ambiguous wall times, where we pick the later offset).
  let ms = naive - laOffsetMinutes(naive) * 60000;
  ms = naive - laOffsetMinutes(ms) * 60000;
  return new Date(ms).toISOString();
}

/** UTC instants bounding an LA calendar day [start, end). Sun Nov 1 2026 is 25 hours. */
export function dayBounds(day: DayKey): { start: string; end: string } {
  return { start: laToUtc(day, "00:00"), end: laToUtc(addDays(day, 1), "00:00") };
}

export function addDays(day: DayKey, n: number): DayKey {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addMinutes(instant: string, minutes: number): string {
  return new Date(toMs(instant) + minutes * 60000).toISOString();
}

export function diffMinutes(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / 60000);
}

/** Snap an instant to the nearest N minutes of LA wall-clock time. */
export function snapInstant(instant: string, stepMin = 15): string {
  const ms = toMs(instant);
  const step = stepMin * 60000;
  // LA offsets are whole multiples of 15 minutes, so snapping UTC ms is equivalent.
  return new Date(Math.round(ms / step) * step).toISOString();
}

const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });

/** "9:30 AM" */
export function formatTime(instant: string | number | Date): string {
  return timeFmt.format(new Date(toMs(instant))).replace(/\u202f/g, " ");
}

/** "9:30a" / "12p" compact style used in design */
export function formatTimeCompact(instant: string | number | Date): string {
  const p = laParts(instant);
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const suffix = p.hour < 12 ? "a" : "p";
  return p.minute === 0 ? `${h12}${suffix}` : `${h12}:${pad(p.minute)}${suffix}`;
}

/** "Sat" */
export function weekdayShort(day: DayKey): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(new Date(`${day}T12:00:00Z`));
}

/** "Sat, Oct 31" */
export function formatDayLabel(day: DayKey): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}

/** "1h 30m" / "45 min" */
export function formatDuration(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/** True when the day has a DST change (clocks fall back on Sun Nov 1 2026). */
export function dstShiftOnDay(day: DayKey): number {
  const { start, end } = dayBounds(day);
  return diffMinutes(start, end) - 24 * 60; // +60 on fall-back days, -60 on spring-forward
}
