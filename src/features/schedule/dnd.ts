import { canMove, canRemove } from "@shared/schedule";
import type { DayKey } from "@shared/time";
import type { EventKind } from "@shared/types";
import { dropToStart } from "./layout";

export type DragSource = { type: "event"; id: string; kind: EventKind; start: string } | { type: "idea"; placeId: string };
export type DropTarget = { type: "day"; day: DayKey; top: number } | { type: "tray" };
export type DropAction =
  | { kind: "move"; id: string; start: string }
  | { kind: "schedule"; placeId: string; start: string }
  | { kind: "unschedule"; id: string }
  | null;

/**
 * Decide what a finished drag means. `activeTop` is the viewport top of the dragged element,
 * `target.top` the viewport top of the day column (4 AM), so their difference is the y offset on the grid.
 */
export function resolveDrop(source: DragSource, target: DropTarget | null, activeTop: number): DropAction {
  if (!target) return null;
  if (target.type === "tray") {
    return source.type === "event" && canRemove(source) ? { kind: "unschedule", id: source.id } : null;
  }
  const start = dropToStart(target.day, activeTop - target.top);
  if (source.type === "idea") return { kind: "schedule", placeId: source.placeId, start };
  if (!canMove(source) || start === source.start) return null;
  return { kind: "move", id: source.id, start };
}
