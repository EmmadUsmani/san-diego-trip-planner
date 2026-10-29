import { useTrip } from "../api/hooks";

/** PLACEHOLDER: replace the body of this component with the Overview screen. Keep the export name. */
export function OverviewPage() {
  const { data, isPending, error } = useTrip();
  return (
    <section data-testid="route-overview" className="stack">
      <h1>Overview</h1>
      <p className="muted">
        {isPending ? "Loading..." : error ? "Couldn't load the trip." : `Placeholder. Trip loaded: ${data.days.length} days, ${data.places.length} places.`}
      </p>
    </section>
  );
}
