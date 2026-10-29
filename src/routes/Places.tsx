import { useTrip } from "../api/hooks";

/** PLACEHOLDER: replace the body of this component with the Places screen. Keep the export name. */
export function PlacesPage() {
  const { data, isPending, error } = useTrip();
  return (
    <section data-testid="route-places" className="stack">
      <h1>Places</h1>
      <p className="muted">
        {isPending ? "Loading..." : error ? "Couldn't load the trip." : `Placeholder. Trip loaded: ${data.days.length} days, ${data.places.length} places.`}
      </p>
    </section>
  );
}
