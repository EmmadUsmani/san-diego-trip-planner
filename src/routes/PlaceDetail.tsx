import { getRouteApi } from "@tanstack/react-router";
import { usePlace } from "../api/hooks";

const route = getRouteApi("/places/$placeId");

/** PLACEHOLDER: replace the body with the place detail screen. Keep the export name. */
export function PlaceDetailPage() {
  const { placeId } = route.useParams();
  const { data, isPending, error } = usePlace(placeId);
  return (
    <section data-testid="route-place-detail" className="stack">
      <h1>{isPending ? "Place" : error ? "Place not found" : data.place.name}</h1>
      <p className="muted">Placeholder for place {placeId}.</p>
    </section>
  );
}
