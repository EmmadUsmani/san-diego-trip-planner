import { z } from "zod";
import { TRIP_DAYS } from "@shared/time";

/** /schedule?view=week|day&day=YYYY-MM-DD&drive=&prayers=&rain= (all optional; defaults below). */
export const scheduleSearchSchema = z.object({
  view: z.enum(["week", "day"]).default("week").catch("week"),
  day: z.enum(TRIP_DAYS).optional().catch(undefined),
  drive: z.boolean().default(true).catch(true),
  prayers: z.boolean().default(true).catch(true),
  rain: z.boolean().default(true).catch(true),
});
export type ScheduleSearch = z.infer<typeof scheduleSearchSchema>;

/** /map?day=YYYY-MM-DD */
export const mapSearchSchema = z.object({
  day: z.enum(TRIP_DAYS).optional().catch(undefined),
});
export type MapSearch = z.infer<typeof mapSearchSchema>;
