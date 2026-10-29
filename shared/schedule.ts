import { TRIP_DAYS, addMinutes, diffMinutes, laDateKey, type DayKey } from "./time";
import type { EventCreate, EventUpdate } from "./schemas";
import type { Place, TripEvent } from "./types";

export class RuleError extends Error {
  constructor(
    public code: "locked" | "booked" | "invalid",
    message: string,
  ) {
    super(message);
  }
}

export const DEFAULT_EVENT_MIN = 60;

/** Stable ordering: start, end, id. */
export function sortEvents<T extends Pick<TripEvent, "start" | "end" | "id">>(evs: T[]): T[] {
  return [...evs].sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || Date.parse(a.end) - Date.parse(b.end) || a.id.localeCompare(b.id));
}

/** Bucket events into trip days by LA local date of start. Events outside the trip are dropped. */
export function bucketByDay<T extends Pick<TripEvent, "start" | "end" | "id">>(evs: T[], days: readonly DayKey[] = TRIP_DAYS): Map<DayKey, T[]> {
  const m = new Map<DayKey, T[]>(days.map((d) => [d, []]));
  for (const e of sortEvents(evs)) m.get(laDateKey(e.start))?.push(e);
  return m;
}

export const isInTrip = (instant: string) => (TRIP_DAYS as readonly string[]).includes(laDateKey(instant));

/** Events that participate in routing/range (not skipped). */
export const isActive = (e: Pick<TripEvent, "skipped">) => !e.skipped;

export function canMove(e: Pick<TripEvent, "kind">): boolean {
  return e.kind === "normal";
}
export function canRemove(e: Pick<TripEvent, "kind">): boolean {
  return e.kind !== "locked";
}
export function canSkip(e: Pick<TripEvent, "kind">): boolean {
  return e.kind === "booked";
}

function assertWindow(start: string, end: string) {
  if (!(Date.parse(end) > Date.parse(start))) throw new RuleError("invalid", "End must be after start");
  if (!isInTrip(start)) throw new RuleError("invalid", "Event must start during the trip (Oct 31 - Nov 3)");
}

/** Build the row for a new event. */
export function buildNewEvent(input: EventCreate, place: Place | null, id: string): Omit<TripEvent, "createdAt" | "updatedAt"> {
  const title = input.title ?? place?.name;
  if (!title) throw new RuleError("invalid", "Title or place required");
  const end = input.end ?? addMinutes(input.start, place?.defaultDurationMin ?? DEFAULT_EVENT_MIN);
  assertWindow(input.start, end);
  return {
    id,
    placeId: place?.id ?? null,
    title,
    kind: input.kind,
    start: input.start,
    end,
    skipped: false,
    chargeToPct: input.chargeToPct ?? null,
    notes: input.notes ?? "",
  };
}

/** Apply a patch to an event enforcing locked/booked semantics. Returns changed fields. */
export function applyEventUpdate(existing: TripEvent, patch: EventUpdate): Partial<TripEvent> {
  const out: Partial<TripEvent> = {};
  const touchesTime = patch.start !== undefined || patch.end !== undefined;
  const touchesPlaceOrTitle = patch.placeId !== undefined || patch.title !== undefined || patch.chargeToPct !== undefined;

  if (existing.kind === "locked") {
    if (touchesTime || touchesPlaceOrTitle || patch.skipped !== undefined) {
      throw new RuleError("locked", `"${existing.title}" is locked and can't be changed`);
    }
  }
  if (existing.kind === "booked" && touchesTime) {
    throw new RuleError("booked", `"${existing.title}" is booked at a fixed time; skip it instead`);
  }
  if (patch.skipped !== undefined) {
    if (existing.kind !== "booked") throw new RuleError("invalid", "Only booked events can be skipped");
    out.skipped = patch.skipped;
  }
  if (touchesTime) {
    let start = patch.start ?? existing.start;
    let end = patch.end ?? existing.end;
    if (patch.start !== undefined && patch.end === undefined) {
      end = addMinutes(patch.start, diffMinutes(existing.start, existing.end));
    }
    start = new Date(start).toISOString();
    end = new Date(end).toISOString();
    assertWindow(start, end);
    out.start = start;
    out.end = end;
  }
  if (patch.placeId !== undefined) out.placeId = patch.placeId;
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.chargeToPct !== undefined) out.chargeToPct = patch.chargeToPct;
  if (patch.notes !== undefined) out.notes = patch.notes;
  return out;
}

export function assertRemovable(e: Pick<TripEvent, "kind" | "title">) {
  if (!canRemove(e)) throw new RuleError("locked", `"${e.title}" is locked and can't be removed`);
}

// ---- Legs ----
export interface LegSpec {
  id: string;
  day: DayKey;
  fromEventId: string | null;
  toEventId: string | null;
  fromPlaceId: string;
  toPlaceId: string;
  /** End of the previous event; null when the leg starts at a virtual lodging stop (arrival is then arriveBy). */
  departAt: string | null;
  /** Start of the next event; null when the leg ends at a virtual lodging stop. */
  arriveBy: string | null;
}

/**
 * Drive legs between consecutive non-skipped events that have places, per day.
 * Days after the first start from the lodging; days before the last end at the lodging
 * (virtual stops, even without an event). Same-place hops produce no leg.
 */
export function computeLegSpecs(
  eventsByDay: Map<DayKey, TripEvent[]>,
  lodgingPlaceId: string | null,
  days: readonly DayKey[] = TRIP_DAYS,
): LegSpec[] {
  const specs: LegSpec[] = [];
  days.forEach((day, di) => {
    const stops = (eventsByDay.get(day) ?? []).filter((e) => isActive(e) && e.placeId);
    if (stops.length === 0) return;
    type Stop = { eventId: string | null; placeId: string; start: string | null; end: string | null };
    const seq: Stop[] = stops.map((e) => ({ eventId: e.id, placeId: e.placeId!, start: e.start, end: e.end }));
    if (lodgingPlaceId) {
      const first = seq[0]!;
      if (di > 0 && first.placeId !== lodgingPlaceId) {
        seq.unshift({ eventId: null, placeId: lodgingPlaceId, start: null, end: null });
      }
      const last = seq[seq.length - 1]!;
      if (di < days.length - 1 && last.placeId !== lodgingPlaceId) {
        seq.push({ eventId: null, placeId: lodgingPlaceId, start: null, end: null });
      }
    }
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i]!;
      const b = seq[i + 1]!;
      if (a.placeId === b.placeId) continue;
      specs.push({
        id: `${a.eventId ?? "lodging"}>${b.eventId ?? "lodging"}`,
        day,
        fromEventId: a.eventId,
        toEventId: b.eventId,
        fromPlaceId: a.placeId,
        toPlaceId: b.placeId,
        departAt: a.end,
        arriveBy: b.start,
      });
    }
  });
  return specs;
}
