import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

maplibregl.setWorkerUrl(workerUrl);
import type { LatLng } from "@shared/travel";
import { boundsOf, type MapMarker, type MeasurePoint } from "./logic";
import styles from "./map.module.css";

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const SD_CENTER: [number, number] = [-117.19, 32.78];

interface Props {
  airbnb: (LatLng & { name: string }) | null;
  markers: MapMarker[];
  route: [number, number][];
  measurePoints: MeasurePoint[];
  selectedPlaceId: string | null;
  fitKey: string;
  measuring: boolean;
  onMarkerClick: (placeId: string) => void;
  onAirbnbClick: () => void;
  onMapClick: (p: LatLng) => void;
}

function el(tag: string, cls: string | undefined, testid?: string, text?: string) {
  const e = document.createElement(tag);
  e.className = cls ?? "";
  if (testid) e.dataset.testid = testid;
  if (text) e.textContent = text;
  return e;
}

export function MapView(props: Props) {
  const { airbnb, markers, route, measurePoints, selectedPlaceId, fitKey, measuring } = props;
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const mlMarkers = useRef<Marker[]>([]);

  useEffect(() => {
    if (!box.current) return;
    let map: MlMap;
    try {
      map = new maplibregl.Map({ container: box.current, style: STYLE_URL, center: SD_CENTER, zoom: 10.5, attributionControl: { compact: true } });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", () => {});
    map.on("click", (e) => live.current.onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "route-casing", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.9 } });
      map.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#2c6e91", "line-width": 4 } });
      map.addSource("measure", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "measure-line", type: "line", source: "measure", paint: { "line-color": "#ff7a59", "line-width": 3, "line-dasharray": [2, 2] } });
      setReady(true);
    });
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(box.current);
    return () => {
      ro.disconnect();
      mlMarkers.current = [];
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // DOM markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    mlMarkers.current.forEach((m) => m.remove());
    const next: Marker[] = [];
    const add = (node: HTMLElement, lat: number, lng: number) => {
      next.push(new maplibregl.Marker({ element: node }).setLngLat([lng, lat]).addTo(map));
    };
    if (airbnb) {
      const n = el("button", styles.pinAirbnb, "marker-airbnb", "⌂");
      n.setAttribute("aria-label", `${airbnb.name} (Airbnb)`);
      n.onclick = (e) => {
        e.stopPropagation();
        live.current.onAirbnbClick();
      };
      add(n, airbnb.lat, airbnb.lng);
    }
    for (const m of markers) {
      const n = el("button", `${styles.pin} ${styles[m.kind] ?? ""} ${selectedPlaceId === m.placeId ? styles.pinSel : ""}`, `marker-${m.kind}`, m.order ? String(m.order) : "");
      n.dataset.placeId = m.placeId;
      n.setAttribute("aria-label", m.name);
      n.title = m.name;
      n.onclick = (e) => {
        e.stopPropagation();
        live.current.onMarkerClick(m.placeId);
      };
      add(n, m.lat, m.lng);
    }
    for (const [i, p] of measurePoints.entries()) {
      add(el("div", styles.pinMeasure, `marker-measure`, i === 0 ? "A" : "B"), p.lat, p.lng);
    }
    mlMarkers.current = next;
  }, [markers, airbnb, selectedPlaceId, measurePoints]);

  // route + measure line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const line = (coords: [number, number][]) => ({
      type: "FeatureCollection" as const,
      features: coords.length > 1 ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: coords } }] : [],
    });
    (map.getSource("route") as maplibregl.GeoJSONSource | undefined)?.setData(line(route));
    (map.getSource("measure") as maplibregl.GeoJSONSource | undefined)?.setData(line(measurePoints.length === 2 ? measurePoints.map((p) => [p.lng, p.lat] as [number, number]) : []));
  }, [route, measurePoints, ready]);

  // fit when day/data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts: LatLng[] = [...(airbnb ? [airbnb] : []), ...markers.filter((m) => m.kind === "plan")];
    const b = boundsOf(pts.length > 1 ? pts : [...(airbnb ? [airbnb] : []), ...markers]);
    if (b) map.fitBounds(b, { padding: { top: 70, bottom: 70, left: 70, right: 70 }, maxZoom: 14, duration: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, !!airbnb]);

  return (
    <div className={`${styles.mapBox} ${measuring ? styles.measuring : ""}`} data-testid="map-canvas">
      <div ref={box} className={styles.mapEl} />
      {failed && <div className={styles.mapFail}>The map couldn't start in this browser. Stops are listed in the panel.</div>}
    </div>
  );
}
