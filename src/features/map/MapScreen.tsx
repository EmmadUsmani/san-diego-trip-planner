import { useMemo, useState } from "react";
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useCreateEvent, useTrip } from "../../api/hooks";
import { useCanEdit } from "../../auth/useCanEdit";
import { useLoginDialog } from "../../auth/LoginDialog";
import { laToUtc, formatTimeCompact, type DayKey } from "@shared/time";
import type { LatLng } from "@shared/travel";
import { CloseIcon } from "../../components/icons";
import type { MapSearch } from "../../lib/search";
import { MapView } from "./MapView";
import { LAYERS, DEFAULT_LAYERS, buildMarkers, buildRoute, buildStops, fromAirbnb, layerCounts, measureResult, type Layer, type MeasurePoint } from "./logic";
import styles from "./map.module.css";

const routeApi = getRouteApi("/map");

export function MapScreen() {
  const { data: trip, isPending, error } = useTrip();
  const { day } = routeApi.useSearch();
  const navigate = useNavigate();
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [mpoints, setMpoints] = useState<MeasurePoint[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const placesById = useMemo(() => new Map((trip?.places ?? []).map((p) => [p.id, p])), [trip]);
  const airbnbPlace = trip?.lodgingPlaceId ? placesById.get(trip.lodgingPlaceId) : undefined;
  const airbnb = useMemo(() => (airbnbPlace ? { lat: airbnbPlace.lat, lng: airbnbPlace.lng, name: airbnbPlace.name } : null), [airbnbPlace]);

  const shownDays = useMemo(() => (trip ? (day ? trip.days.filter((d) => d.date === day) : trip.days) : []), [trip, day]);
  const markerInput = useMemo(
    () => ({ places: trip?.places ?? [], ideaIds: trip?.ideaIds ?? [], days: shownDays, singleDay: !!day }),
    [trip, shownDays, day],
  );
  const markers = useMemo(() => buildMarkers({ ...markerInput, layers }), [markerInput, layers]);
  const counts = useMemo(() => layerCounts(markerInput), [markerInput]);
  const stopsByDay = useMemo(() => shownDays.map((d) => ({ day: d, stops: buildStops(d, placesById) })), [shownDays, placesById]);
  const route = useMemo(() => (day && stopsByDay[0] ? buildRoute(airbnb, stopsByDay[0].stops) : []), [day, stopsByDay, airbnb]);

  if (isPending) return <section data-testid="route-map" className="page"><p className="muted">Loading map...</p></section>;
  if (error || !trip) return <section data-testid="route-map" className="page"><p className="muted">Couldn't load the trip.</p></section>;

  const selPlace = selected ? placesById.get(selected) : undefined;
  const setDay = (d: DayKey | undefined) => {
    setSelected(null);
    void navigate({ to: "/map", search: { day: d as MapSearch["day"] } });
  };

  const addMeasurePoint = (p: LatLng, label: string) =>
    setMpoints((cur) => (cur.length >= 2 ? [{ ...p, label }] : [...cur, { ...p, label }]));
  const onMarkerClick = (placeId: string) => {
    const p = placesById.get(placeId);
    if (!p) return;
    if (measuring) addMeasurePoint(p, p.name);
    else setSelected(placeId);
  };
  const toggleMeasure = () => {
    setMeasuring((m) => !m);
    setMpoints([]);
    setSelected(null);
  };
  const result = mpoints.length === 2 ? measureResult(mpoints[0]!, mpoints[1]!) : null;

  return (
    <section data-testid="route-map" className={styles.root}>
      <div className={styles.mapWrap}>
        <MapView
          airbnb={airbnb}
          markers={markers}
          route={route}
          measurePoints={mpoints}
          selectedPlaceId={selected}
          fitKey={day ?? "all"}
          measuring={measuring}
          onMarkerClick={onMarkerClick}
          onAirbnbClick={() => airbnbPlace && onMarkerClick(airbnbPlace.id)}
          onMapClick={(p) => measuring && addMeasurePoint(p, `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`)}
        />

        <div className={styles.toolbar}>
          <div className={styles.chips} role="group" aria-label="Day">
            <button className="chip" aria-pressed={!day} onClick={() => setDay(undefined)}>All</button>
            {trip.days.map((d) => (
              <button key={d.date} className="chip" aria-pressed={day === d.date} onClick={() => setDay(d.date)}>
                {d.weekday}
              </button>
            ))}
          </div>
          <div className={styles.chips} role="group" aria-label="Layers">
            {LAYERS.map((l) => (
              <button
                key={l.key}
                className="chip"
                aria-pressed={layers[l.key]}
                onClick={() => setLayers((cur) => ({ ...cur, [l.key]: !cur[l.key] }))}
                data-testid={`layer-${l.key}`}
              >
                {l.label} <span className={styles.count}>{counts[l.key as Layer]}</span>
              </button>
            ))}
            <button className="chip" aria-pressed={measuring} onClick={toggleMeasure} data-testid="measure-toggle">
              Measure
            </button>
          </div>
        </div>

        {measuring && (
          <div className={styles.floatCard} data-testid="measure-panel">
            {result ? (
              <p data-testid="measure-result">
                <strong>{result.straightMiles} mi</strong> straight line, about <strong>{result.estimate.minutes} min</strong> drive ({result.estimate.miles} mi by road)
                <span className="muted"> {mpoints[0]!.label} to {mpoints[1]!.label}</span>
              </p>
            ) : (
              <p className="muted">{mpoints.length === 0 ? "Click two places or points on the map." : "Click a second place or point."}</p>
            )}
          </div>
        )}

        {selPlace && !measuring && (
          <PopupCard
            key={selPlace.id}
            place={selPlace}
            isAirbnb={selPlace.id === trip.lodgingPlaceId}
            airbnb={airbnb}
            defaultDay={day ?? trip.days[0]?.date}
            days={trip.days.map((d) => ({ date: d.date, weekday: d.weekday }))}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      <aside className={`${styles.panel} ${sheetOpen ? styles.sheetOpen : ""}`} data-testid="stop-panel" aria-label="Stops">
        <button className={styles.handle} onClick={() => setSheetOpen((o) => !o)} aria-expanded={sheetOpen} aria-label="Toggle stop list" data-testid="sheet-handle">
          <span />
        </button>
        <h2 className={styles.panelTitle}>
          {day ? `${trip.days.find((d) => d.date === day)?.label ?? ""}` : "All days"}
          <span className="muted"> · {stopsByDay.reduce((n, s) => n + s.stops.length, 0)} stops</span>
        </h2>
        <div className={styles.stopScroll}>
          {stopsByDay.map(({ day: d, stops }) => (
            <div key={d.date} className={styles.dayGroup}>
              {!day && <h3 className={styles.dayHead}>{d.label}</h3>}
              {stops.length === 0 && <p className="muted">No stops planned.</p>}
              <ol className={styles.stops}>
                {stops.map((s) => (
                  <li key={s.eventId}>
                    <button className={`${styles.stop} ${selected === s.placeId ? styles.stopSel : ""}`} onClick={() => { setSelected(s.placeId); setMeasuring(false); }} data-testid="stop-item">
                      <span className={`${styles.num} ${s.place.category === "food" ? styles.numFood : ""}`}>{day ? s.order : ""}</span>
                      <span className={styles.stopText}>
                        <span className={styles.stopTitle}>{s.title}</span>
                        <span className="muted">
                          {formatTimeCompact(s.start)}
                          {s.driveMinutes != null && ` · ${s.driveMinutes} min drive`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function PopupCard(props: {
  place: NonNullable<ReturnType<typeof useTrip>["data"]>["places"][number];
  isAirbnb: boolean;
  airbnb: LatLng | null;
  defaultDay: DayKey | undefined;
  days: { date: DayKey; weekday: string }[];
  onClose: () => void;
}) {
  const { place, isAirbnb, airbnb } = props;
  const canEdit = useCanEdit();
  const { openLogin } = useLoginDialog();
  const create = useCreateEvent();
  const [addDay, setAddDay] = useState<DayKey | undefined>(props.defaultDay);
  const [added, setAdded] = useState(false);
  const est = isAirbnb ? null : fromAirbnb(airbnb, place);
  const addable = place.category === "activity" || place.category === "food" || place.category === "charger";

  const add = () => {
    if (!canEdit) return openLogin();
    if (!addDay) return;
    create.mutate({ placeId: place.id, start: laToUtc(addDay, "12:00") }, { onSuccess: () => setAdded(true) });
  };

  return (
    <div className={`${styles.floatCard} ${styles.popup}`} data-testid="map-popup" role="dialog" aria-label={place.name}>
      <button className={styles.close} onClick={props.onClose} aria-label="Close"><CloseIcon /></button>
      <h3 className={styles.popupName}>{place.name}</h3>
      <p className="muted">{place.address}</p>
      {est && (
        <p data-testid="popup-distance">
          <strong>{est.miles} mi</strong> · about <strong>{est.minutes} min</strong> from the Airbnb
        </p>
      )}
      <div className={styles.popupActions}>
        {addable && (
          <>
            <select className="input" aria-label="Day" value={addDay} onChange={(e) => setAddDay(e.target.value as DayKey)}>
              {props.days.map((d) => <option key={d.date} value={d.date}>{d.weekday}</option>)}
            </select>
            <button className="btn btn-primary" onClick={add} disabled={create.isPending || added} data-testid="popup-add">
              {added ? "Added" : canEdit ? "Add to day" : "Log in to add"}
            </button>
          </>
        )}
        <Link className="btn" to="/places/$placeId" params={{ placeId: place.id }} data-testid="popup-details">Details</Link>
      </div>
      {create.error && <p role="alert" className={styles.err}>{create.error.message}</p>}
    </div>
  );
}
