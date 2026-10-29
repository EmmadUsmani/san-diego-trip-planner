import { describe, expect, it } from "vitest";
import { haversineMiles, heuristicTravel, measure, roadFactor, speedMph, type LatLng } from "./travel";

const airbnb = { lat: 32.82951, lng: -117.21718 };
const liberty = { lat: 32.82208, lng: -117.18436 };
const sylmar = { lat: 34.32522, lng: -118.49443 };

describe("travel heuristic", () => {
  it("haversine sanity", () => {
    expect(haversineMiles(airbnb, airbnb)).toBe(0);
    expect(haversineMiles(sylmar, airbnb)).toBeGreaterThan(115);
    expect(haversineMiles(sylmar, airbnb)).toBeLessThan(130);
  });
  it("short hop uses 24 mph + 2 min and the 1.4 factor", () => {
    const e = heuristicTravel(airbnb, liberty);
    const straight = haversineMiles(airbnb, liberty);
    expect(straight).toBeLessThan(5);
    const road = straight * 1.4;
    expect(road).toBeLessThan(3);
    expect(e.minutes).toBe(Math.round((road / 24) * 60 + 2));
  });
  it("road factor falls with distance", () => {
    expect(roadFactor(2)).toBe(1.4);
    expect(roadFactor(10)).toBe(1.3);
    expect(roadFactor(60)).toBeCloseTo(1.21, 2);
    expect(roadFactor(125)).toBe(1.12);
    expect(speedMph(2)).toBe(24);
    expect(speedMph(10)).toBe(38);
    expect(speedMph(25)).toBe(46);
    expect(speedMph(120)).toBe(54);
  });
  // Calibration against real OSRM results (fetched once; no network here).
  const OSRM_CASES: [string, LatLng, LatLng, number, number][] = [
    ["Sylmar -> Airbnb", sylmar, airbnb, 137.8, 166],
    ["Valencia -> Airbnb", { lat: 34.44168, lng: -118.55611 }, airbnb, 148.7, 179],
    ["Sylmar -> Sugar and Scribe", sylmar, { lat: 32.84284, lng: -117.27486 }, 137.7, 168],
    ["Sultan Baklava -> Airbnb", { lat: 32.7948, lng: -116.9625 }, airbnb, 19.7, 25],
    ["Birch Aquarium -> Harbor", { lat: 32.8659, lng: -117.25063 }, { lat: 32.72759, lng: -117.17792 }, 12.5, 19],
    ["Shorehouse -> Zoo", { lat: 32.85396, lng: -117.25461 }, { lat: 32.73599, lng: -117.15065 }, 14, 23],
    ["Airbnb -> Zoya", airbnb, { lat: 32.84753, lng: -117.27494 }, 4.8, 9],
  ];
  it.each(OSRM_CASES)("is within 25%% of OSRM: %s", (_n, a, b, miles, minutes) => {
    const e = heuristicTravel(a, b);
    expect(Math.abs(e.miles - miles) / miles).toBeLessThan(0.25);
    expect(Math.abs(e.minutes - minutes) / minutes).toBeLessThan(0.25);
  });
  it("long drive no longer overestimates (Sylmar -> Airbnb)", () => {
    const e = heuristicTravel(sylmar, airbnb);
    expect(e.miles).toBeLessThan(150);
    expect(e.minutes).toBeLessThan(175);
  });
  it("zero distance costs only the fixed 2 minutes", () => {
    expect(heuristicTravel(airbnb, airbnb)).toEqual({ miles: 0, minutes: 2 });
  });
  it("measure returns straight miles and estimate", () => {
    const m = measure(airbnb, liberty);
    expect(m.straightMiles).toBeGreaterThan(1);
    expect(m.estimate.miles).toBeCloseTo(m.straightMiles * 1.4, 0);
  });
});
