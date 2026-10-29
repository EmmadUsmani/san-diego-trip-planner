import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useCreateEvent, useDeleteEvent, useSkipEvent, useTrip } from "../../api/hooks";
import { useCanEdit } from "../../auth/useCanEdit";
import { useLoginDialog } from "../../auth/LoginDialog";
import { BoltIcon, LockIcon, PlusIcon, TicketIcon } from "../../components/icons";
import { formatTimeCompact } from "@shared/time";
import { canRemove, canSkip } from "@shared/schedule";
import type { PlaceWithUsage, Trip } from "@shared/types";
import { AddPlaceDialog } from "./AddPlaceDialog";
import { FILTERS, fromAirbnb, groupSchedule, sectionPlaces, tagLabel, type PlaceFilter } from "./logic";
import { DayTimeForm, Modal } from "./shared";
import styles from "./places.module.css";

type Seg = "scheduled" | "ideas" | "food" | "chargers";
const SEGS: { id: Seg; label: string }[] = [
  { id: "scheduled", label: "Scheduled" },
  { id: "ideas", label: "Ideas" },
  { id: "food", label: "Food" },
  { id: "chargers", label: "Chargers" },
];

export function PlacesPage() {
  const { data, isPending, error } = useTrip();
  const canEdit = useCanEdit();
  const { openLogin } = useLoginDialog();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<PlaceFilter>("all");
  const [seg, setSeg] = useState<Seg>("scheduled");
  const [adding, setAdding] = useState(false);
  const [scheduling, setScheduling] = useState<PlaceWithUsage | null>(null);

  const groups = useMemo(() => (data ? groupSchedule(data.days, data.places, filter, q) : []), [data, filter, q]);
  const sections = useMemo(() => (data ? sectionPlaces(data.places, filter, q) : null), [data, filter, q]);

  if (isPending) return <section data-testid="route-places" className="muted">Loading places...</section>;
  if (error || !sections) return <section data-testid="route-places" className="error-text" role="alert">Couldn't load places.</section>;
  const lodging = data.places.find((p) => p.id === data.lodgingPlaceId);
  const empty = groups.length + sections.ideas.length + sections.food.length + sections.chargers.length === 0;
  const hide = (s: Seg) => (seg === s ? "" : styles.hideMobile);

  return (
    <section data-testid="route-places" className={styles.page}>
      <header className={styles.head}>
        <h1>Places</h1>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canEdit}
          title={canEdit ? undefined : "Log in to edit"}
          onClick={() => setAdding(true)}
        >
          <PlusIcon /> Add place
        </button>
      </header>
      {!canEdit && (
        <p className="muted" style={{ margin: 0 }}>
          Read-only.{" "}
          <button type="button" className={styles.linkBtn} onClick={openLogin}>
            Log in to edit
          </button>
        </p>
      )}

      <div className={styles.tools}>
        <label className={styles.search}>
          <span className="sr-only">Search places</span>
          <input className={styles.searchInput} type="search" placeholder="Search places" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className={styles.chips} role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.seg} role="tablist" aria-label="Section">
        {SEGS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={seg === s.id} className={styles.segBtn} onClick={() => setSeg(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {empty && <p className="muted">No places match.</p>}

      {groups.length > 0 && (
        <div className={hide("scheduled")} data-testid="sec-schedule">
          <h2 className={styles.secTitle}>On the schedule</h2>
          <div className={`card ${styles.sched}`}>
            {groups.map((g) => (
              <div key={g.day} className={styles.dayBlock}>
                <div className={styles.dayHead}>
                  <span className={styles.dayDot} />
                  <b>{g.weekday}</b>
                  <span className="muted">{g.label.replace(/^\w+, /, "")}</span>
                </div>
                {g.rows.map(({ event, place }) => (
                  <ScheduleRowView key={event.id} trip={data} event={event} place={place} canEdit={canEdit} weekday={g.weekday} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {sections.ideas.length > 0 && (
        <div className={hide("ideas")} data-testid="sec-ideas">
          <h2 className={styles.secTitle}>Ideas</h2>
          <div className={styles.cards}>
            {sections.ideas.map((p) => (
              <PlaceCard key={p.id} place={p} lodging={lodging} canEdit={canEdit} onAdd={() => setScheduling(p)} />
            ))}
          </div>
        </div>
      )}

      {sections.food.length > 0 && (
        <div className={hide("food")} data-testid="sec-food">
          <h2 className={styles.secTitle}>Food</h2>
          <div className={styles.cards}>
            {sections.food.map((p) => (
              <PlaceCard key={p.id} place={p} lodging={lodging} canEdit={canEdit} onAdd={() => setScheduling(p)} />
            ))}
          </div>
        </div>
      )}

      {sections.chargers.length > 0 && (
        <div className={hide("chargers")} data-testid="sec-chargers">
          <h2 className={styles.secTitle}>Chargers</h2>
          <ul className={`card ${styles.chargers}`}>
            {sections.chargers.map((p) => {
              const t = fromAirbnb(p, lodging);
              return (
                <li key={p.id}>
                  <span className={styles.bolt}>
                    <BoltIcon size={14} />
                  </span>
                  <Link to="/places/$placeId" params={{ placeId: p.id }} className={styles.name}>
                    {p.name}
                  </Link>
                  <span className={`muted ${styles.addr}`}>{p.address}</span>
                  {t && <span className="muted">~{Math.round(t.miles)} mi from Airbnb</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AddPlaceDialog open={adding} onClose={() => setAdding(false)} />
      <AddToDayDialog place={scheduling} onClose={() => setScheduling(null)} />
    </section>
  );
}

function ScheduleRowView({ trip, event, place, canEdit, weekday }: { trip: Trip; event: Trip["days"][number]["events"][number]; place: PlaceWithUsage | null; canEdit: boolean; weekday: string }) {
  const remove = useDeleteEvent();
  const skip = useSkipEvent();
  const leg = trip.days.flatMap((d) => d.legs).find((l) => l.toEventId === event.id);
  const dis = !canEdit;
  const err = remove.error ?? skip.error;
  const dot = place?.category === "food" ? styles.dotFood : place?.category === "activity" ? styles.dotAct : styles.dotFixed;
  return (
    <div className={`${styles.row} ${event.skipped ? styles.skipped : ""}`} data-testid={`sched-${event.id}`}>
      <span className={styles.time}>{formatTimeCompact(event.start)}</span>
      <span className={styles.rowName}>
        <span className={`${styles.dot} ${dot}`} />
        {place ? (
          <Link to="/places/$placeId" params={{ placeId: place.id }} className={styles.name}>
            {event.title}
          </Link>
        ) : (
          <span className={styles.name}>{event.title}</span>
        )}
        {event.kind === "booked" && (
          <span className={styles.badge}>
            <TicketIcon size={12} /> Booked
          </span>
        )}
        {event.skipped && <span className="muted">skipped</span>}
        <span className={styles.dayPill}>{weekday}</span>
      </span>
      <span className={`muted ${styles.hood}`}>{place?.neighborhood}</span>
      <span className={`muted ${styles.travel}`}>{leg && leg.fromEventId ? `~${leg.minutes} min` : ""}</span>
      <span className={styles.action}>
        {event.kind === "locked" ? (
          <span className="muted">
            <LockIcon size={13} /> Fixed
          </span>
        ) : (
          <>
            {canSkip(event) && (
              <button type="button" className={styles.textBtn} disabled={dis || skip.isPending} onClick={() => skip.mutate({ id: event.id, skipped: !event.skipped })}>
                {event.skipped ? "Unskip" : "Skip"}
              </button>
            )}
            {canRemove(event) && event.kind !== "booked" && (
              <button type="button" className={styles.textBtn} disabled={dis || remove.isPending} onClick={() => remove.mutate(event.id)}>
                Remove
              </button>
            )}
          </>
        )}
        {err && <span className="error-text" role="alert">{err.message}</span>}
      </span>
    </div>
  );
}

function PlaceCard({ place, lodging, canEdit, onAdd }: { place: PlaceWithUsage; lodging?: PlaceWithUsage; canEdit: boolean; onAdd: () => void }) {
  const t = fromAirbnb(place, lodging);
  return (
    <article className={`card ${styles.pcard}`} data-testid={`place-${place.id}`}>
      <h3>
        <Link to="/places/$placeId" params={{ placeId: place.id }} className={styles.cardName}>
          {place.name}
        </Link>
      </h3>
      <div className="muted">{place.neighborhood || place.address}</div>
      {t && <div className="muted">~{t.minutes} min from Airbnb</div>}
      <div className={styles.tags}>
        {place.tags
          .filter((x) => !["supercharger", "approx-location"].includes(x))
          .map((x) => (
            <span key={x} className={`${styles.tag} ${x.startsWith("halal") ? styles.tagHalal : place.category === "food" ? styles.tagFood : styles.tagAct}`}>
              {tagLabel(x)}
            </span>
          ))}
      </div>
      <button type="button" className="btn" disabled={!canEdit} title={canEdit ? undefined : "Log in to edit"} onClick={onAdd}>
        Add to day
      </button>
    </article>
  );
}

function AddToDayDialog({ place, onClose }: { place: PlaceWithUsage | null; onClose: () => void }) {
  const create = useCreateEvent();
  return (
    <Modal open={place !== null} onClose={onClose} title={place ? `Add ${place.name} to a day` : "Add to day"}>
      <DayTimeForm
        submitLabel="Add to day"
        pending={create.isPending}
        error={create.error?.message}
        onCancel={onClose}
        onSubmit={(start) => place && create.mutate({ placeId: place.id, start }, { onSuccess: onClose })}
      />
    </Modal>
  );
}
