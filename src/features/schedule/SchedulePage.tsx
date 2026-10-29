import { DndContext, DragOverlay, PointerSensor, pointerWithin, rectIntersection, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useCreateEvent, useDeleteEvent, useSkipEvent, useTrip, useUpdateEvent, useWeather } from "../../api/hooks";
import { useCanEdit } from "../../auth/useCanEdit";
import { useLoginDialog } from "../../auth/LoginDialog";
import { TRIP_DAYS, formatDayLabel, weekdayShort } from "@shared/time";
import type { Place, TripEvent } from "@shared/types";
import { DayColumn } from "./DayColumn";
import { EventBlock } from "./EventBlock";
import { IdeaCard, IdeasTray } from "./IdeasTray";
import { MobileAgenda } from "./MobileAgenda";
import { WeatherIcon } from "./WeatherIcon";
import { resolveDrop, type DragSource, type DropTarget } from "./dnd";
import { GRID_HEIGHT, HOUR_PX } from "./layout";
import s from "./schedule.module.css";

const route = getRouteApi("/schedule");

const mq = "(max-width: 719px)";
function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(mq);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(mq).matches,
    () => false,
  );
}

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

type Active = { source: "event"; event: TripEvent; width: number; height: number } | { source: "idea"; place: Place; width: number };

const hourLabel = (h: number) => (h === 12 ? "Noon" : `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`);

export function SchedulePage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const isMobile = useIsMobile();
  const { data: trip, isPending, error } = useTrip();
  const weather = useWeather();
  const canEdit = useCanEdit();
  const { openLogin } = useLoginDialog();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const remove = useDeleteEvent();
  const skip = useSkipEvent();
  const [active, setActive] = useState<Active | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const places = useMemo(() => new Map<string, Place>((trip?.places ?? []).map((p) => [p.id, p])), [trip]);
  const ideas = useMemo(() => (trip?.ideaIds ?? []).map((id) => places.get(id)).filter((p): p is Place => !!p), [trip, places]);
  const weatherByDay = useMemo(() => new Map((weather.data?.days ?? []).map((d) => [d.date, d])), [weather.data]);

  const { view, drive, prayers, rain } = search;
  const selectedDay = search.day ?? TRIP_DAYS[0];
  const setSearch = (patch: Partial<typeof search>) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const fail = (e: unknown) => setNotice(e instanceof Error ? e.message : "Something went wrong");
  const onSkip = (id: string, skipped: boolean) => {
    if (!canEdit) return openLogin();
    setNotice(null);
    skip.mutate({ id, skipped }, { onError: fail });
  };

  if (isPending) return <section data-testid="route-schedule"><h1>Schedule</h1><p className="muted">Loading...</p></section>;
  if (error || !trip) return <section data-testid="route-schedule"><h1>Schedule</h1><p className="error-text" role="alert">Couldn't load the schedule.</p></section>;

  const days = isMobile || view === "day" ? trip.days.filter((d) => d.date === selectedDay) : trip.days;
  const weatherNote = weather.isError ? "Weather unavailable" : null;

  const onDragStart = (ev: DragStartEvent) => {
    setNotice(null);
    const d = ev.active.data.current as { type: "event"; event: TripEvent } | { type: "idea"; place: Place };
    const r = ev.active.rect.current.initial;
    setActive(d.type === "event" ? { source: "event", event: d.event, width: r?.width ?? 150, height: r?.height ?? 60 } : { source: "idea", place: d.place, width: r?.width ?? 240 });
  };
  const onDragEnd = (ev: DragEndEvent) => {
    setActive(null);
    const d = ev.active.data.current as { type: "event"; event: TripEvent } | { type: "idea"; place: Place } | undefined;
    const overData = ev.over?.data.current as { type: "day"; day: string } | { type: "tray" } | undefined;
    const activeTop = ev.active.rect.current.translated?.top;
    if (!d || activeTop == null) return;
    const source: DragSource = d.type === "event" ? { type: "event", id: d.event.id, kind: d.event.kind, start: d.event.start } : { type: "idea", placeId: d.place.id };
    const target: DropTarget | null = !ev.over || !overData ? null : overData.type === "tray" ? { type: "tray" } : { type: "day", day: overData.day, top: ev.over.rect.top };
    const action = resolveDrop(source, target, activeTop);
    if (!action) return;
    if (action.kind === "move") update.mutate({ id: action.id, start: action.start }, { onError: fail });
    else if (action.kind === "schedule") create.mutate({ placeId: action.placeId, start: action.start }, { onError: fail });
    else remove.mutate(action.id, { onError: fail });
  };

  const toggle = (key: "drive" | "prayers" | "rain", label: string) => (
    <button type="button" className={`chip ${s.toggle}`} aria-pressed={search[key]} data-testid={`toggle-${key}`} onClick={() => setSearch({ [key]: !search[key] })}>
      {label}
    </button>
  );

  const dayPicker = (
    <div className={s.dayPicker} role="group" aria-label="Day">
      {trip.days.map((d) => {
        const w = weatherByDay.get(d.date);
        return (
          <button key={d.date} type="button" className={s.dayPick} aria-pressed={d.date === selectedDay} data-testid={`daypick-${d.date}`} onClick={() => setSearch({ day: d.date as (typeof TRIP_DAYS)[number] })}>
            <strong>{weekdayShort(d.date)}</strong>
            {w && w.hiF != null && (
              <span>
                {Math.round(w.hiF)}° · {w.precipMax ?? 0}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const selected = trip.days.find((d) => d.date === selectedDay)!;

  if (isMobile) {
    return (
      <section data-testid="route-schedule" className={s.mobile}>
        <h1>Schedule</h1>
        {dayPicker}
        {selected.clocksFallBack && <p className={s.clockNote}>Clocks fall back 1 hr at 2:00 am</p>}
        {weatherNote && <p className="muted">{weatherNote}</p>}
        {!canEdit && (
          <button type="button" className="btn" onClick={openLogin}>
            Log in to change the plan
          </button>
        )}
        {notice && <p className="error-text" role="alert">{notice}</p>}
        <MobileAgenda day={selected} places={places} drive={drive} prayers={prayers} canEdit={canEdit} onSkip={onSkip} />
      </section>
    );
  }

  const cols = `56px repeat(${days.length}, minmax(0, 1fr))`;
  return (
    <section data-testid="route-schedule" className={s.page}>
      <div className={s.top}>
        <h1>Schedule</h1>
        <div className={s.seg} role="group" aria-label="View">
          <button type="button" aria-pressed={view === "week"} onClick={() => setSearch({ view: "week" })}>Week</button>
          <button type="button" aria-pressed={view === "day"} onClick={() => setSearch({ view: "day", day: selectedDay })}>Day</button>
        </div>
        {view === "day" && dayPicker}
        <div className={s.spacer} />
        {!canEdit && (
          <button type="button" className="btn" onClick={openLogin}>
            Log in to change the plan
          </button>
        )}
        {toggle("drive", "Drive times")}
        {toggle("prayers", "Prayers")}
        {toggle("rain", "Rain")}
      </div>
      {notice && <p className="error-text" role="alert">{notice}</p>}
      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        <div className={s.layout}>
          <div className={`card ${s.gridCard}`}>
            <div className={s.grid} style={{ gridTemplateColumns: cols }} data-testid="week-grid">
              <div className={s.headGutter} />
              {days.map((d) => {
                const w = weatherByDay.get(d.date);
                return (
                  <div key={d.date} className={s.dayHead} data-testid={`day-head-${d.date}`}>
                    <div className={s.dayHeadTop}>
                      <div>
                        <span className={s.dow}>{d.weekday}</span>
                        <span className={s.dateBig}>{formatDayLabel(d.date).replace(/^\w+, /, "")}</span>
                      </div>
                      {w && <WeatherIcon code={w.code} />}
                    </div>
                    <div className={s.dayHeadSub}>
                      {w ? (
                        <>
                          {w.hiF != null && w.loF != null && <span>{Math.round(w.hiF)}° / {Math.round(w.loF)}°</span>} <span className={s.rainPct}>{w.precipMax ?? 0}% rain</span>
                        </>
                      ) : (
                        <span className="muted">{weatherNote ?? "Weather loading"}</span>
                      )}
                    </div>
                    {d.clocksFallBack && <div className={s.dayHeadNote}>Clocks fall back 1 hr</div>}
                  </div>
                );
              })}
              <div className={s.gutter} style={{ height: GRID_HEIGHT }}>
                {Array.from({ length: 19 }, (_, i) => i + 4).map((h) => (
                  <span key={h} style={{ top: (h - 4) * HOUR_PX }}>{hourLabel(h)}</span>
                ))}
              </div>
              {days.map((d) => (
                <DayColumn key={d.date} day={d} weather={weatherByDay.get(d.date)} places={places} drive={drive} prayers={prayers} rain={rain} canEdit={canEdit} onSkip={onSkip} />
              ))}
            </div>
          </div>
          <IdeasTray ideas={ideas} canEdit={canEdit} />
        </div>
        <DragOverlay dropAnimation={null}>
          {active?.source === "event" && <EventBlock overlay event={active.event} place={active.event.placeId ? places.get(active.event.placeId) : undefined} canEdit style={{ width: active.width, height: active.height }} />}
          {active?.source === "idea" && (
            <div style={{ width: active.width }}>
              <IdeaCard overlay place={active.place} canEdit />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
