import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import type { DayKey } from "./time";

export const AIRBNB_COORDS = { lat: 32.82951, lng: -117.21718 };

export const PRAYER_NAMES = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];
/** Fajr/Dhuhr/Maghrib are emphasized in the UI; Asr/Isha are light. */
export const EMPHASIZED_PRAYERS: readonly PrayerName[] = ["fajr", "dhuhr", "maghrib"];
export const isEmphasizedPrayer = (p: PrayerName) => EMPHASIZED_PRAYERS.includes(p);

export type PrayerTimesDay = Record<PrayerName, string> & { sunrise: string };

/** ISNA prayer times (UTC ISO instants) for an LA calendar day at the given coordinates. */
export function prayerTimesFor(day: DayKey, coords: { lat: number; lng: number } = AIRBNB_COORDS): PrayerTimesDay {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  // adhan reads the local Y/M/D of the Date it is given; building it from components is runtime-TZ independent.
  const pt = new PrayerTimes(new Coordinates(coords.lat, coords.lng), new Date(y, m - 1, d), CalculationMethod.NorthAmerica());
  return {
    fajr: pt.fajr.toISOString(),
    sunrise: pt.sunrise.toISOString(),
    dhuhr: pt.dhuhr.toISOString(),
    asr: pt.asr.toISOString(),
    maghrib: pt.maghrib.toISOString(),
    isha: pt.isha.toISOString(),
  };
}
