import { describe, expect, it } from "vitest";
import { parseOpenMeteo, weatherSummary, weatherIcon, openMeteoUrl } from "./weather";
import { laToUtc } from "./time";

const u = (day: string, hhmm: string) => Date.parse(laToUtc(day, hhmm)) / 1000;

describe("weather parsing", () => {
  it("buckets hourly data by LA local date and hour across the DST change", () => {
    const r = parseOpenMeteo(
      {
        daily: {
          time: [u("2026-10-31", "00:00"), u("2026-11-01", "00:00"), u("2026-11-02", "00:00"), u("2026-11-03", "00:00")],
          weather_code: [3, 63, 0, 1],
          temperature_2m_max: [71.4, 69, 79, 80],
          temperature_2m_min: [63, 61, 64, 67],
          precipitation_probability_max: [69, 87, 11, 5],
        },
        hourly: {
          time: [u("2026-10-31", "23:00"), u("2026-11-01", "00:00"), u("2026-11-01", "17:00"), u("2026-11-02", "00:00")],
          precipitation_probability: [69, 87, 25, 1],
          temperature_2m: [63, 62, 66, 60],
          weather_code: [3, 63, 3, 0],
        },
      },
      "now",
    );
    expect(r.days.map((d) => d.summary)).toEqual(["Cloudy", "Rain", "Sunny", "Mostly sunny"]);
    expect(r.days[0]!.hiF).toBe(71);
    expect(r.days[0]!.hourly.map((h) => h.hour)).toEqual([23]);
    expect(r.days[1]!.hourly.map((h) => h.hour)).toEqual([0, 17]);
    expect(r.days[2]!.hourly.map((h) => h.hour)).toEqual([0]);
    expect(r.days[1]!.precipMax).toBe(87);
  });
  it("labels", () => {
    expect(weatherSummary(95)).toBe("Thunderstorm");
    expect(weatherSummary(null)).toBe("Unknown");
    expect(weatherIcon(63)).toBe("rain");
    expect(weatherIcon(0)).toBe("sun");
  });
  it("url asks for unixtime in LA tz for the trip dates", () => {
    const url = openMeteoUrl(32.8, -117.2);
    expect(url).toContain("timeformat=unixtime");
    expect(url).toContain("start_date=2026-10-31");
    expect(url).toContain("end_date=2026-11-03");
  });
});
