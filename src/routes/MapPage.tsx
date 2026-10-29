import { useTrip } from "../api/hooks";

/** PLACEHOLDER: replace the body of this component with the Map screen. Keep the export name. */
export function MapPage() {
  const { data, isPending, error } = useTrip();
  return (
    <section data-testid="route-map" className="stack">
      <h1>Map</h1>
      <p className="muted">
        {isPending ? "Loading..." : error ? "Couldn't load the trip." : `Placeholder. Trip loaded: ${data.days.length} days, ${data.places.length} places.`}
      </p>
    </section>
  );
}
