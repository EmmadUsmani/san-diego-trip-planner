import { useDraggable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import { formatTimeCompact } from "@shared/time";
import { canMove, canSkip } from "@shared/schedule";
import type { Place, TripEvent } from "@shared/types";
import { LockIcon, TicketIcon } from "../../components/icons";
import s from "./schedule.module.css";

export function toneClass(e: Pick<TripEvent, "kind">, place: Place | undefined): string {
  if (e.kind === "locked") return s.toneLocked!;
  if (e.kind === "booked") return s.toneBooked!;
  switch (place?.category) {
    case "activity":
      return s.toneActivity!;
    case "food":
      return s.toneFood!;
    case "charger":
      return s.toneCharger!;
    default:
      return s.toneNeutral!;
  }
}

export function displayTitle(e: Pick<TripEvent, "title">, place: Place | undefined): string {
  return place && e.title.endsWith(`: ${place.name}`) ? place.name : e.title;
}

export const timeRange = (e: Pick<TripEvent, "start" | "end">) => `${formatTimeCompact(e.start)} – ${formatTimeCompact(e.end)}`;

interface Props {
  event: TripEvent;
  place?: Place;
  canEdit: boolean;
  style?: CSSProperties;
  /** Rendered inside the drag overlay: no draggable wiring. */
  overlay?: boolean;
  compact?: boolean;
  onSkip?: (skipped: boolean) => void;
}

export function EventBlock({ event, place, canEdit, style, overlay, compact, onSkip }: Props) {
  const movable = canMove(event);
  const draggable = movable && canEdit && !overlay;
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `ev:${event.id}`,
    data: { type: "event", event },
    disabled: !draggable,
  });
  const showTimeOnly = event.kind === "locked" && !event.placeId;
  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={`${s.event} ${toneClass(event, place)} ${draggable ? s.draggable : ""} ${isDragging ? s.dragging : ""} ${overlay ? s.overlayEvent : ""} ${event.skipped ? s.skipped : ""} ${compact ? s.compact : ""}`}
      style={style}
      data-testid={overlay ? undefined : `event-${event.id}`}
      data-kind={event.kind}
      data-draggable={draggable}
      data-skipped={event.skipped}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
      <div className={s.eventHead}>
        <span className={s.eventTitle}>
          {event.kind === "booked" && <TicketIcon size={13} className={s.ticket} />} {displayTitle(event, place)}
        </span>
        {event.kind === "locked" && <LockIcon size={13} aria-label="Locked" />}
      </div>
      <div className={s.eventTime}>{showTimeOnly || compact ? formatTimeCompact(event.start) : timeRange(event)}</div>
      {canSkip(event) && onSkip && !overlay && (
        <button
          type="button"
          className={s.skipBtn}
          data-testid={`skip-${event.id}`}
          data-disabled={!canEdit}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSkip(!event.skipped)}
        >
          {event.skipped ? "Unskip" : "Skip"}
        </button>
      )}
    </div>
  );
}
