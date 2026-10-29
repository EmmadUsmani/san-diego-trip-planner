import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const PLACE_CATEGORIES = ["activity", "food", "charger", "lodging", "home"] as const;
export const EVENT_KINDS = ["normal", "booked", "locked"] as const;

export type PlaceLink = { label: string; url: string };

const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export const places = sqliteTable("places", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", { enum: PLACE_CATEGORIES }).notNull(),
  address: text("address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  neighborhood: text("neighborhood").notNull().default(""),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  links: text("links", { mode: "json" }).$type<PlaceLink[]>().notNull().default(sql`'[]'`),
  defaultDurationMin: integer("default_duration_min"),
  hoursText: text("hours_text").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(nowIso),
  updatedAt: text("updated_at").notNull().default(nowIso),
});

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    placeId: text("place_id").references(() => places.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: EVENT_KINDS }).notNull().default("normal"),
    /** UTC ISO instant, e.g. 2026-10-31T16:30:00.000Z */
    start: text("start").notNull(),
    end: text("end").notNull(),
    skipped: integer("skipped", { mode: "boolean" }).notNull().default(false),
    chargeToPct: integer("charge_to_pct"),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(nowIso),
    updatedAt: text("updated_at").notNull().default(nowIso),
  },
  (t) => [index("events_start_idx").on(t.start), index("events_place_idx").on(t.placeId)],
);

export const travelLegs = sqliteTable(
  "travel_legs",
  {
    fromPlaceId: text("from_place_id").notNull(),
    toPlaceId: text("to_place_id").notNull(),
    minutes: integer("minutes").notNull(),
    miles: real("miles").notNull(),
    source: text("source", { enum: ["osrm", "heuristic"] }).notNull(),
    computedAt: text("computed_at").notNull().default(nowIso),
  },
  (t) => [primaryKey({ columns: [t.fromPlaceId, t.toPlaceId] })],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  /** JSON-encoded value */
  value: text("value").notNull(),
});
