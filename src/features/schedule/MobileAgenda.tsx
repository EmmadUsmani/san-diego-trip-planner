import { useMemo } from "react";
import { formatDuration, formatTimeCompact, toMs } from "@shared/time";
import { isEmphasizedPrayer, PRAYER_NAMES } from "@shared/prayers";
import { canSkip } from "@shared/schedule";
import type { Leg, Place, TripDay, TripEvent } from "@shared/types";
import { CarIcon, TicketIcon } from "../../components/icons";
import { displayTitle, toneClass } from "./EventBlock";
import s from "./schedule.module.css";

type Item =
  | { t: "event"; at: string; event: TripEvent }
  | { t: "leg"; at: string; leg: Leg }
  | { t: "prayer"; at: string; name: (typeof PRAYER_NAMES)[number] };

interface Props {
  day: TripDay;
  places: Map<string, Place>;
  drive: boolean;
  prayers: boolean;
  canEdit: boolean;
  onSkip: (id: string, skipped: boolean) => void;
}

export function MobileAgenda({ day, places, drive, prayers, canEdit, onSkip }: Props) {
  const items = useMemo(() => {
    const out: Item[] = day.events.map((event) => ({ t: "event", at: event.start, event }));
    if (drive) day.legs.forEach((leg) => out.push({ t: "leg", at: leg.arriveAt, leg }));
    if (prayers) PRAYER_NAMES.forEach((name) => out.push({ t: "prayer", at: day.prayers[name], name }));
    // Legs sort just before the event they lead to; same-instant ties: prayer, leg, event.
    const rank = { prayer: 0, leg: 1, event: 2 } as const;
    return out.sort((a, b) => toMs(a.at) - toMs(b.at) || rank[a.t] - rank[b.t]);
  }, [day, drive, prayers]);

  return (
    <div className={s.agenda} data-testid="mobile-agenda">
      {items.length === 0 && <p className="muted">Nothing planned yet.</p>}
      {items.map((it) => {
        if (it.t === "prayer") {
          const strong = isEmphasizedPrayer(it.name);
          const label = it.name[0]!.toUpperCase() + it.name.slice(1);
          return (
            <div key={it.name} className={s.agRow} data-testid={`agenda-prayer-${it.name}`}>
              <span className={s.agTime}>{formatTimeCompact(it.at).replace(/[ap]$/, "")}</span>
              {strong ? <span className={s.prayerPill}>{label}</span> : <span className={s.agPrayerLight}>{label}</span>}
              <span className={strong ? s.agLineStrong : s.agLineLight} />
            </div>
          );
        }
        if (it.t === "leg") {
          return (
            <div key={it.leg.id} className={`${s.agRow} ${s.agDrive}`} data-testid="drive-row">
              <span className={s.agTime} />
              <span className={s.driveText}>
                <CarIcon size={13} /> ~{formatDuration(it.leg.minutes)}
              </span>
            </div>
          );
        }
        const e = it.event;
        return (
          <div key={e.id} className={s.agRow}>
            <span className={s.agTime}>{formatTimeCompact(e.start).replace(/[ap]$/, "")}</span>
            <div className={`${s.agCard} ${toneClass(e, e.placeId ? places.get(e.placeId) : undefined)} ${e.skipped ? s.skipped : ""}`} data-testid={`event-${e.id}`} data-kind={e.kind}>
              <div>
                <div className={s.agTitle}>{displayTitle(e, e.placeId ? places.get(e.placeId) : undefined)}</div>
                <div className={s.eventTime}>until {formatTimeCompact(e.end)}</div>
              </div>
              {e.kind === "booked" && <TicketIcon size={16} className={s.ticket} />}
              {canSkip(e) && (
                <button type="button" className={s.skipBtn} data-testid={`skip-${e.id}`} data-disabled={!canEdit} onClick={() => onSkip(e.id, !e.skipped)}>
                  {e.skipped ? "Unskip" : "Skip"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
