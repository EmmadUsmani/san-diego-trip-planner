import { laMinutesOfDay, laToUtc, type DayKey } from "@shared/time";

/** Grid runs 4 AM - 10 PM LA wall-clock. DST-safe: nothing between 4 AM and 10 PM is ambiguous. */
export const GRID_START_MIN = 4 * 60;
export const GRID_END_MIN = 22 * 60;
export const HOUR_PX = 80;
export const PX_PER_MIN = HOUR_PX / 60;
export const SNAP_MIN = 15;
export const GRID_HEIGHT = (GRID_END_MIN - GRID_START_MIN) * PX_PER_MIN;
export const MIN_BLOCK_PX = 28;

export const minToY = (min: number) => (min - GRID_START_MIN) * PX_PER_MIN;
export const yToMin = (y: number) => y / PX_PER_MIN + GRID_START_MIN;
export const clampY = (y: number) => Math.min(GRID_HEIGHT, Math.max(0, y));

/** Y offset (px) of an instant within its day column; may be outside the grid. */
export const instantToY = (instant: string) => minToY(laMinutesOfDay(instant));

export function eventRect(start: string, end: string): { top: number; height: number } {
  const top = clampY(instantToY(start));
  const bottom = clampY(instantToY(end));
  return { top, height: Math.max(MIN_BLOCK_PX, bottom - top) };
}

export const snapMinutes = (min: number, step = SNAP_MIN) => Math.round(min / step) * step;

/** Convert a drop position (px from top of the day column) to a UTC instant on `day`, snapped to 15 min and kept on the grid. */
export function dropToStart(day: DayKey, y: number): string {
  const snapped = snapMinutes(yToMin(y));
  const min = Math.min(GRID_END_MIN - 60, Math.max(GRID_START_MIN, snapped));
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return laToUtc(day, `${hh}:${mm}`);
}

/** Rain wash alpha for a precipitation probability (0-100): 0.06 .. 0.24. */
export function rainAlpha(prob: number | null | undefined): number {
  if (prob == null || prob < 10) return 0;
  return Math.round((0.06 + (Math.min(100, prob) / 100) * 0.18) * 1000) / 1000;
}
