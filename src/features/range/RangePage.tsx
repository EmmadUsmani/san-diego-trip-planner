import { useEffect, useMemo, useState } from "react";
import { computeRange, pctForMiles } from "@shared/range";
import { dayBounds, TRIP_DAYS } from "@shared/time";
import { heuristicTravel } from "@shared/travel";
import type { Place, Trip } from "@shared/types";
import { useTrip, useUpdateSettings } from "../../api/hooks";
import { useCanEdit } from "../../auth/useCanEdit";
import { RangeChart } from "./RangeChart";
import styles from "./Range.module.css";

export const shortName = (name: string) =>
  name.replace(/^Supercharger:\s*/, "").replace(/\s*\(.*\)$/, "").replace(/^(Brunch|Dinner):\s*/, "").replace(/ Coastal Bluff Trail$/, "");

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

export function RangeView({ trip }: { trip: Trip }) {
  const canEdit = useCanEdit();
  const update = useUpdateSettings();
  const [start, setStart] = useState(String(trip.settings.startChargePct));
  const [eff, setEff] = useState(String(trip.settings.efficiencyKwhPer100Mi));
  const startN = num(start);
  const effN = num(eff);
  const valid = startN >= 0 && startN <= 100 && effN >= 8 && effN <= 60;

  const placesById = useMemo(() => new Map<string, Place>(trip.places.map((p) => [p.id, p])), [trip.places]);
  const legs = useMemo(() => trip.days.flatMap((d) => d.legs), [trip.days]);
  const timeline = useMemo(() => {
    if (!valid) return trip.range;
    return computeRange({
      startPct: startN,
      startAt: dayBounds(TRIP_DAYS[0]).start,
      efficiencyKwhPer100Mi: effN,
      legs: legs.map((l) => ({ id: l.id, at: l.arriveAt, miles: l.miles })),
      charges: trip.days
        .flatMap((d) => d.events)
        .filter((e) => !e.skipped && e.chargeToPct != null)
        .map((e) => ({ id: e.id, start: e.start, end: e.end, toPct: e.chargeToPct! })),
    });
  }, [valid, startN, effN, legs, trip.days, trip.range]);

  // Persist (debounced) when logged in and the values differ from what's saved.
  const savedStart = trip.settings.startChargePct;
  const savedEff = trip.settings.efficiencyKwhPer100Mi;
  const { mutate } = update;
  useEffect(() => {
    if (!canEdit || !valid) return;
    if (startN === savedStart && effN === savedEff) return;
    const t = setTimeout(() => mutate({ startChargePct: startN, efficiencyKwhPer100Mi: effN }), 500);
    return () => clearTimeout(t);
  }, [canEdit, valid, startN, effN, savedStart, savedEff, mutate]);

  const lodging = trip.lodgingPlaceId ? placesById.get(trip.lodgingPlaceId) : undefined;
  const chargers = trip.places
    .filter((p) => p.category === "charger")
    .map((p) => ({ p, miles: lodging ? heuristicTravel(lodging, p).miles : 0 }))
    .sort((a, b) => a.miles - b.miles);
  const eff1 = valid ? effN : trip.settings.efficiencyKwhPer100Mi;
  const endPct = timeline.endPct;

  return (
    <section data-testid="route-range" className="stack" style={{ gap: 24 }}>
      <div className={styles.head}>
        <h1>Range</h1>
        <p className={styles.sub}>2026 Model 3 Standard · 321 mi EPA</p>
      </div>

      <div className={styles.controls}>
        <label className={styles.ctl}>
          Starting charge
          <span className={styles.ctlBox}>
            <input type="number" inputMode="decimal" min={0} max={100} step={1} value={start} onChange={(e) => setStart(e.target.value)} aria-label="Starting charge" />%
          </span>
        </label>
        <label className={styles.ctl}>
          Efficiency
          <span className={styles.ctlBox}>
            <input type="number" inputMode="decimal" min={8} max={60} step={0.5} value={eff} onChange={(e) => setEff(e.target.value)} aria-label="Efficiency" />
            kWh/100 mi
          </span>
        </label>
        <span className={styles.hint} data-testid="range-save-hint" role="status">
          {!valid ? "Enter 0-100% and 8-60 kWh/100 mi" : canEdit ? (update.isPending || startN !== savedStart || effN !== savedEff ? "Saving..." : "Saved to the trip") : "Preview only. Log in to save."}
        </span>
        <div className={styles.stats}>
          <div className={styles.stat}>
            Lowest
            <b className={timeline.minPct < timeline.lowPct ? styles.low : undefined} data-testid="range-min-pct">
              {Math.round(timeline.minPct)}%
            </b>
          </div>
          <div className={styles.stat}>
            Ends at
            <b className={endPct < timeline.lowPct ? styles.low : undefined} data-testid="range-end-pct">
              {Math.round(endPct)}%
            </b>
          </div>
        </div>
      </div>

      <div className={`card ${styles.chartCard}`}>
        <h2>Battery, Saturday to Tuesday</h2>
        <RangeChart timeline={timeline} legs={legs} days={trip.days} />
      </div>

      <div className={styles.lower}>
        <div className={`card ${styles.panel}`}>
          <h2>Drives</h2>
          <div className={styles.days}>
            {trip.days.map((d) => {
              const miles = d.legs.reduce((s, l) => s + l.miles, 0);
              return (
                <div key={d.date} data-testid={`range-day-${d.date}`}>
                  <div className={styles.dayHead}>
                    <h3>{{ Sat: "Saturday", Sun: "Sunday", Mon: "Monday", Tue: "Tuesday" }[d.weekday] ?? d.weekday}</h3>
                    <span>
                      <span>~{Math.round(miles)} mi</span>
                      <span>{Math.round(pctForMiles(miles, eff1))}%</span>
                    </span>
                  </div>
                  {d.legs.length === 0 ? (
                    <p className={styles.empty}>No drives</p>
                  ) : (
                    <ul className={styles.legs}>
                      {d.legs.map((l) => (
                        <li key={l.id} className={styles.leg}>
                          <span>
                            {shortName(placesById.get(l.fromPlaceId)?.name ?? "?")}
                            <span className={styles.arrow}>→</span>
                            {shortName(placesById.get(l.toPlaceId)?.name ?? "?")}
                          </span>
                          <span className={styles.legNums}>
                            <span>~{Math.round(l.miles)} mi</span>
                            <b>{Math.round(pctForMiles(l.miles, eff1))}%</b>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>
            <h2>Chargers nearby</h2>
            <span>from the Airbnb</span>
          </div>
          <ul className={styles.chargers}>
            {chargers.map(({ p, miles }) => (
              <li key={p.id} className={styles.charger}>
                <div>
                  <b>{shortName(p.name)}</b>
                  <small>{[p.address.split(",")[0], p.notes?.match(/\d+ stalls/)?.[0], p.notes?.match(/in a mall/i)?.[0]?.toLowerCase()].filter(Boolean).join(" · ")}</small>
                </div>
                <span className={styles.dist}>~{Math.round(miles * 2) / 2} mi</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function RangePage() {
  const { data, isPending, error } = useTrip();
  if (data) return <RangeView trip={data} />;
  return (
    <section data-testid="route-range" className="stack">
      <h1>Range</h1>
      <p className="muted">{isPending ? "Loading..." : error ? "Couldn't load the trip." : ""}</p>
    </section>
  );
}
