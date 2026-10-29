import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { places, events, travelLegs, PLACE_CATEGORIES, EVENT_KINDS } from "../db/schema";
import { TRIP_DAYS } from "./time";

const isoInstant = z.string().refine((s) => !Number.isNaN(Date.parse(s)) && /Z$|[+-]\d\d:\d\d$/.test(s), "Expected ISO instant");
const normInstant = isoInstant.transform((s) => new Date(s).toISOString());

export const placeLinkSchema = z.object({ label: z.string().min(1).max(80), url: z.url() });
export const categorySchema = z.enum(PLACE_CATEGORIES);
export const eventKindSchema = z.enum(EVENT_KINDS);

// ---- Rows (drizzle-zod) ----
export const placeSchema = createSelectSchema(places, {
  tags: z.array(z.string()),
  links: z.array(placeLinkSchema),
});
export const eventSchema = createSelectSchema(events);
export const travelLegRowSchema = createSelectSchema(travelLegs);

// ---- Inputs ----
const placeFields = {
  name: z.string().trim().min(1).max(120),
  category: categorySchema,
  address: z.string().trim().min(1).max(250),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  neighborhood: z.string().max(80),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  links: z.array(placeLinkSchema).max(10),
  defaultDurationMin: z.number().int().min(5).max(1440).nullable(),
  hoursText: z.string().max(200),
  notes: z.string().max(2000),
};

/** Create a place. lat/lng optional: when omitted the worker geocodes the address (Nominatim). */
export const placeCreateSchema = z.object({
  name: placeFields.name,
  category: placeFields.category,
  address: placeFields.address,
  lat: placeFields.lat.optional(),
  lng: placeFields.lng.optional(),
  neighborhood: placeFields.neighborhood.optional(),
  tags: placeFields.tags.optional(),
  links: placeFields.links.optional(),
  defaultDurationMin: placeFields.defaultDurationMin.optional(),
  hoursText: placeFields.hoursText.optional(),
  notes: placeFields.notes.optional(),
});
export const placeUpdateSchema = z.object(placeFields).partial();

export const eventCreateSchema = z.object({
  placeId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(160).optional(),
  kind: z.enum(["normal", "booked"]).default("normal"),
  start: normInstant,
  /** Optional: defaults to start + place.defaultDurationMin (or 60). */
  end: normInstant.optional(),
  chargeToPct: z.number().int().min(1).max(100).nullable().optional(),
  notes: z.string().max(2000).optional(),
});
export const eventUpdateSchema = z.object({
  placeId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(160).optional(),
  /** If only `start` is sent, the duration is preserved (end shifts with it). */
  start: normInstant.optional(),
  end: normInstant.optional(),
  chargeToPct: z.number().int().min(1).max(100).nullable().optional(),
  notes: z.string().max(2000).optional(),
  skipped: z.boolean().optional(),
});

export const settingsSchema = z.object({
  startChargePct: z.number().min(0).max(100),
  efficiencyKwhPer100Mi: z.number().min(8).max(60),
  homeLabel: z.string().max(80),
  /** Only returned to authenticated users. */
  doorCode: z.string().max(40).optional(),
});
export const settingsUpdateSchema = settingsSchema.partial();
export type Settings = z.infer<typeof settingsSchema>;
export const DEFAULT_SETTINGS: Settings = { startChargePct: 90, efficiencyKwhPer100Mi: 24, homeLabel: "Valencia" };

export const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const tripDaySchema = z.enum(TRIP_DAYS);

export const loginSchema = z.object({ password: z.string().min(1).max(200) });

export type PlaceInput = z.infer<typeof placeCreateSchema>;
export type PlaceUpdate = z.infer<typeof placeUpdateSchema>;
export type EventCreate = z.infer<typeof eventCreateSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;
