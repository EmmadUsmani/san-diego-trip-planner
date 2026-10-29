import { useDroppable } from "@dnd-kit/core";
import { formatDuration, formatTimeCompact, laDateKey } from "@shared/time";
import { isEmphasizedPrayer, PRAYER_NAMES } from "@shared/prayers";
import type { Place, TripDay, WeatherDay } from "@shared/types";
import { EventBlock } from "./EventBlock";
import { clampY, eventRect, GRID_HEIGHT, GRID_END_MIN, GRID_START_MIN, HOUR_PX, instantToY, minToY, rainAlpha } from "./layout";
import s from "./schedule.module.css";
import { CarIcon } from "../../components/icons";

interface Props {
  day: TripDay;
  weather?: WeatherDay;
  places: Map<string, Place>;
  drive: boolean;
  prayers: boolean;
  rain: boolean;
  canEdit: boolean;
  onSkip: (id: string, skipped: boolean) => void;
}

const hours = Array.from({ length: (GRID_END_MIN - GRID_START_MIN) / 60 }, (_, i) => i + GRID_START_MIN / 60);

export function DayColumn({ day, weather, places, drive, prayers, rain, canEdit, onSkip }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day.date}`, data: { type: "day", day: day.date } });
  const evStyleWidth = prayers ? "calc(100% - 82px)" : "calc(100% - 14px)";
  const wash = rain && weather ? weather.hourly.filter((h) => laDateKey(h.at) === day.date && h.hour >= 4 && h.hour < 22) : [];
  return (
    <div ref={setNodeRef} className={`${s.col} ${isOver ? s.colOver : ""}`} style={{ height: GRID_HEIGHT }} data-testid={`day-col-${day.date}`}>
      {hours.map((h) => (
        <div key={h} className={s.hourLine} style={{ top: (h - 4) * HOUR_PX }} />
      ))}
      {wash.map((h) => (
        <div
          key={h.at}
          className={s.rain}
          data-testid="rain-wash"
          style={{ top: minToY(h.hour * 60), height: HOUR_PX, background: `rgba(var(--rain-rgb), ${rainAlpha(h.precipProb)})` }}
        />
      ))}
      {prayers &&
        PRAYER_NAMES.map((p) => {
          const at = day.prayers[p];
          const y = instantToY(at);
          if (y < 0 || y > GRID_HEIGHT) return null;
          const strong = isEmphasizedPrayer(p);
          return (
            <div key={p} className={`${s.prayer} ${strong ? s.prayerStrong : ""}`} style={{ top: y }} data-testid={`prayer-${p}`}>
              <span className={s.prayerPill}>
                {p[0]!.toUpperCase() + p.slice(1)}
                <br />
                {formatTimeCompact(at).replace(/[ap]$/, "")}
              </span>
            </div>
          );
        })}
      {drive &&
        day.legs.map((l) => {
          const y0 = clampY(instantToY(l.departAt));
          const y1 = clampY(instantToY(l.arriveAt));
          if (y1 <= 0 || y0 >= GRID_HEIGHT) return null;
          // Legs from the lodging at day start depart before the grid: anchor the label to the arrival.
          const labelTop = instantToY(l.departAt) < 0 ? Math.max(0, y1 - 22) : y0 + 2;
          return (
            <div key={l.id} data-testid="drive-row" data-leg={l.id}>
              <div className={s.driveLine} style={{ top: y0, height: Math.max(0, y1 - y0), width: evStyleWidth }} />
              <div className={s.driveLabel} style={{ top: labelTop }}>
                <CarIcon size={12} /> ~{formatDuration(l.minutes)}
              </div>
            </div>
          );
        })}
      {day.events.map((e) => {
        const r = eventRect(e.start, e.end);
        if (instantToY(e.end) <= 0 || instantToY(e.start) >= GRID_HEIGHT) return null;
        return (
          <EventBlock
            key={e.id}
            event={e}
            place={e.placeId ? places.get(e.placeId) : undefined}
            canEdit={canEdit}
            compact={r.height < 48}
            onSkip={(sk) => onSkip(e.id, sk)}
            style={{ top: r.top, height: r.height, width: evStyleWidth }}
          />
        );
      })}
    </div>
  );
}
