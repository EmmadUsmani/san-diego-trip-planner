import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { api, unwrap } from "./client";
import type { Settings } from "@shared/schemas";
import type { PlaceCategory } from "@shared/types";

/** Query keys. Mutations invalidate by these prefixes. */
export const qk = {
  me: ["me"] as const,
  trip: ["trip"] as const,
  places: (category?: PlaceCategory) => ["places", category ?? "all"] as const,
  place: (id: string) => ["place", id] as const,
  ideas: ["ideas"] as const,
  weather: ["weather"] as const,
  settings: ["settings"] as const,
};

// ---------- Queries ----------

export const meOptions = queryOptions({
  queryKey: qk.me,
  queryFn: async () => unwrap(await api.auth.me.$get()),
  staleTime: 60_000,
});
/** { authenticated } - see also useCanEdit() in src/auth. */
export const useAuth = () => useQuery(meOptions);

export const tripOptions = queryOptions({
  queryKey: qk.trip,
  queryFn: async () => unwrap(await api.trip.$get()),
  placeholderData: keepPreviousData,
});
/** Everything for schedule/overview: days (events, legs, prayers, battery), places, ideaIds, settings, range timeline. */
export const useTrip = () => useQuery(tripOptions);

export const usePlaces = (category?: PlaceCategory) =>
  useQuery({
    queryKey: qk.places(category),
    queryFn: async () => unwrap(await api.places.$get({ query: category ? { category } : {} })),
  });

/** One place plus the events that reference it. */
export const usePlace = (id: string) =>
  useQuery({ queryKey: qk.place(id), queryFn: async () => unwrap(await api.places[":id"].$get({ param: { id } })) });

/** Activity/food places with no events. */
export const useIdeas = () => useQuery({ queryKey: qk.ideas, queryFn: async () => unwrap(await api.ideas.$get()) });

/** 503 -> query error: show "Weather unavailable". */
export const useWeather = () =>
  useQuery({
    queryKey: qk.weather,
    queryFn: async () => unwrap(await api.weather.$get()),
    staleTime: 30 * 60_000,
    retry: false,
  });

export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: async () => unwrap(await api.settings.$get()) });

// ---------- Mutations ----------

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.trip }),
      qc.invalidateQueries({ queryKey: ["places"] }),
      qc.invalidateQueries({ queryKey: ["place"] }),
      qc.invalidateQueries({ queryKey: qk.ideas }),
      qc.invalidateQueries({ queryKey: qk.settings }),
    ]);
}

export const useLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => unwrap(await api.auth.login.$post({ json: { password } })),
    // Logged-in users also see the door code in /trip and /settings.
    onSuccess: async () => {
      await qc.invalidateQueries();
    },
  });
};
export const useLogout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await api.auth.logout.$post()),
    onSuccess: async () => {
      await qc.invalidateQueries();
    },
  });
};

type CreateEventBody = InferRequestType<typeof api.events.$post>["json"];
type UpdateEventBody = InferRequestType<(typeof api.events)[":id"]["$patch"]>["json"];
type CreatePlaceBody = InferRequestType<typeof api.places.$post>["json"];
type UpdatePlaceBody = InferRequestType<(typeof api.places)[":id"]["$patch"]>["json"];

/** Schedule an idea or add a free event: { placeId?, title?, start (ISO), end? , kind?, chargeToPct? }. */
export const useCreateEvent = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: async (json: CreateEventBody) => unwrap(await api.events.$post({ json })), onSuccess: invalidate });
};
/** Move/edit: { id, ...patch }. Sending only `start` keeps the duration. Locked -> 409, booked time change -> 409. */
export const useUpdateEvent = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...json }: { id: string } & UpdateEventBody) => unwrap(await api.events[":id"].$patch({ param: { id }, json })),
    onSuccess: invalidate,
  });
};
/** Unschedule (place returns to Ideas). Locked -> 409. */
export const useDeleteEvent = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await api.events[":id"].$delete({ param: { id } })),
    onSuccess: invalidate,
  });
};
/** Booked events only. */
export const useSkipEvent = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, skipped }: { id: string; skipped: boolean }) =>
      unwrap(skipped ? await api.events[":id"].skip.$post({ param: { id } }) : await api.events[":id"].unskip.$post({ param: { id } })),
    onSuccess: invalidate,
  });
};

/** Geocodes when lat/lng are omitted (422 with a friendly message if not found). */
export const useCreatePlace = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: async (json: CreatePlaceBody) => unwrap(await api.places.$post({ json })), onSuccess: invalidate });
};
export const useUpdatePlace = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...json }: { id: string } & UpdatePlaceBody) => unwrap(await api.places[":id"].$patch({ param: { id }, json })),
    onSuccess: invalidate,
  });
};
export const useDeletePlace = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await api.places[":id"].$delete({ param: { id } })),
    onSuccess: invalidate,
  });
};

export const useUpdateSettings = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (json: Partial<Settings>) => unwrap(await api.settings.$put({ json })),
    onSuccess: invalidate,
  });
};
