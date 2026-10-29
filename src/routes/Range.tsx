import { useTrip } from "../api/hooks";

/** PLACEHOLDER: replace the body of this component with the Range screen. Keep the export name. */
export function RangePage() {
  const { data, isPending, error } = useTrip();
  return (
    <section data-testid="route-range" className="stack">
      <h1>Range</h1>
      <p className="muted">
        {isPending ? "Loading..." : error ? "Couldn't load the trip." : `Placeholder. Trip loaded: ${data.days.length} days, ${data.places.length} places.`}
      </p>
    </section>
  );
}
