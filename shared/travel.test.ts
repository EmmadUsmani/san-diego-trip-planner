import { describe, expect, it } from "vitest";
import { haversineMiles, heuristicTravel, measure } from "./travel";

const airbnb = { lat: 32.82951, lng: -117.21718 };
const liberty = { lat: 32.82208, lng: -117.18436 };
const sylmar = { lat: 34.32522, lng: -118.49443 };

describe("travel heuristic", () => {
  it("haversine sanity", () => {
    expect(haversineMiles(airbnb, airbnb)).toBe(0);
    expect(haversineMiles(sylmar, airbnb)).toBeGreaterThan(115);
    expect(haversineMiles(sylmar, airbnb)).toBeLessThan(130);
  });
  it("short hop uses 25 mph + 3 min", () => {
    const e = heuristicTravel(airbnb, liberty);
    const straight = haversineMiles(airbnb, liberty);
    expect(straight * 1.3).toBeLessThan(3);
    expect(e.minutes).toBe(Math.round(((straight * 1.3) / 25) * 60 + 3));
  });
  it("mid hop uses 35 mph, long hop 55 mph", () => {
    const mid = { lat: 32.73, lng: -117.15 }; // ~ 10 mi
    const em = heuristicTravel(airbnb, mid);
    const road = haversineMiles(airbnb, mid) * 1.3;
    expect(road).toBeGreaterThan(3);
    expect(road).toBeLessThan(15);
    expect(em.minutes).toBe(Math.round((road / 35) * 60 + 3));
    const el = heuristicTravel(sylmar, airbnb);
    const lroad = haversineMiles(sylmar, airbnb) * 1.3;
    expect(el.minutes).toBe(Math.round((lroad / 55) * 60 + 3));
    expect(el.miles).toBeCloseTo(lroad, 0);
  });
  it("zero distance costs only the fixed 3 minutes", () => {
    expect(heuristicTravel(airbnb, airbnb)).toEqual({ miles: 0, minutes: 3 });
  });
  it("measure returns straight miles and estimate", () => {
    const m = measure(airbnb, liberty);
    expect(m.straightMiles).toBeGreaterThan(1);
    expect(m.estimate.miles).toBeCloseTo(m.straightMiles * 1.3, 0);
  });
});
