import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { App } from "./App";
import { mapSearchSchema, scheduleSearchSchema } from "./lib/search";
import { MapPage } from "./routes/MapPage";
import { OverviewPage } from "./routes/Overview";
import { PlaceDetailPage } from "./routes/PlaceDetail";
import { PlacesPage } from "./routes/Places";
import { RangePage } from "./routes/Range";
import { SchedulePage } from "./routes/Schedule";

const rootRoute = createRootRoute({ component: App });

const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: OverviewPage });
const scheduleRoute = createRoute({ getParentRoute: () => rootRoute, path: "/schedule", validateSearch: scheduleSearchSchema, component: SchedulePage });
const mapRoute = createRoute({ getParentRoute: () => rootRoute, path: "/map", validateSearch: mapSearchSchema, component: MapPage });
const placesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/places", component: PlacesPage });
const placeDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: "/places/$placeId", component: PlaceDetailPage });
const rangeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/range", component: RangePage });

const routeTree = rootRoute.addChildren([overviewRoute, scheduleRoute, mapRoute, placesRoute, placeDetailRoute, rangeRoute]);

export const router = createRouter({ routeTree, defaultPreload: "intent", scrollRestoration: true });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
