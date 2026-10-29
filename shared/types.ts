import type { places, events } from "../db/schema";
import type { PrayerTimesDay } from "./prayers";
import type { RangeTimeline } from "./range";
import type { Settings } from "./schemas";
import type { DayKey } from "./time";

export type { PlaceLink } from "../db/schema";
export type Place = typeof places.$inferSelect;
export type TripEvent = typeof events.$inferSelect;
export type PlaceCategory = Place["category"];
export type EventKind = TripEvent["kind"];

/** Place plus whether any event references it. */
export type PlaceWithUsage = Place & { eventCount: number };

export interface Leg {
  /** Stable id: `${fromEventId ?? "lodging"}>${toEventId ?? "lodging"}` */
  id: string;
  day: DayKey;
  fromEventId: string | null;
  toEventId: string | null;
  fromPlaceId: string;
  toPlaceId: string;
  minutes: number;
  miles: number;
  source: "osrm" | "heuristic";
  /** Departure (end of the previous event, or day start) and arrival instants. */
  departAt: string;
  arriveAt: string;
}

export interface TripDay {
  date: DayKey;
  /** "Sat" */
  weekday: string;
  /** "Sat, Oct 31" */
  label: string;
  /** UTC offset label: "PDT" | "PST" */
  tzName: string;
  /** True on the day clocks fall back (Sun Nov 1). */
  clocksFallBack: boolean;
  /** Non-skipped and skipped events, ordered by start. */
  events: TripEvent[];
  legs: Leg[];
  prayers: PrayerTimesDay;
  /** Battery % at the end of the day. */
  batteryEndPct: number;
}

export interface Trip {
  days: TripDay[];
  places: PlaceWithUsage[];
  /** Ids of places with no events (activity|food only). */
  ideaIds: string[];
  settings: Settings;
  range: RangeTimeline;
  lodgingPlaceId: string | null;
  homePlaceId: string | null;
}

export interface WeatherHour {
  at: string;
  /** LA local hour 0-23 */
  hour: number;
  precipProb: number | null;
  tempF: number | null;
  code: number | null;
}
export interface WeatherDay {
  date: DayKey;
  code: number | null;
  summary: string;
  hiF: number | null;
  loF: number | null;
  precipMax: number | null;
  hourly: WeatherHour[];
}
export interface Weather {
  days: WeatherDay[];
  fetchedAt: string;
}

export interface Me {
  authenticated: boolean;
}
