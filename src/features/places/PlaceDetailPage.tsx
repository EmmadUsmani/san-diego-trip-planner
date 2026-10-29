import { useState, type FormEvent } from "react";
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useDeleteEvent, useDeletePlace, usePlace, useTrip, useUpdateEvent, useUpdatePlace } from "../../api/hooks";
import { useCanEdit } from "../../auth/useCanEdit";
import { useLoginDialog } from "../../auth/LoginDialog";
import { formatDayLabel, formatTime, laDateKey } from "@shared/time";
import { canMove, canRemove } from "@shared/schedule";
import type { Place, PlaceWithUsage, TripEvent } from "@shared/types";
import { fromAirbnb, parseTags, tagLabel } from "./logic";
import { DayTimeForm, Modal } from "./shared";
import styles from "./places.module.css";

const route = getRouteApi("/places/$placeId");
const CATS: Place["category"][] = ["activity", "food", "charger", "lodging", "home"];
const catLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

export function PlaceDetailPage() {
  const { placeId } = route.useParams();
  const { data, isPending, error } = usePlace(placeId);
  const trip = useTrip();
  const canEdit = useCanEdit();
  const { openLogin } = useLoginDialog();

  if (isPending) return <section data-testid="route-place-detail" className="muted">Loading...</section>;
  if (error)
    return (
      <section data-testid="route-place-detail" className="stack">
        <Link to="/places" className={styles.back}>&larr; Places</Link>
        <h1>Place not found</h1>
      </section>
    );
  const { place, events } = data;
  const lodging = trip.data?.places.find((p) => p.id === trip.data?.lodgingPlaceId);
  const t = lodging && lodging.id !== place.id ? fromAirbnb(place, lodging) : null;

  return (
    <section data-testid="route-place-detail" className={styles.page}>
      <Link to="/places" className={styles.back}>
        &larr; Places
      </Link>
      <h1>{place.name}</h1>
      <div className={styles.tags}>
        <span className={`${styles.tag} ${place.category === "food" ? styles.tagFood : styles.tagAct}`}>{catLabel(place.category)}</span>
        {place.tags.map((x) => (
          <span key={x} className={`${styles.tag} ${x.startsWith("halal") ? styles.tagHalal : styles.tagNeutral}`}>
            {tagLabel(x)}
          </span>
        ))}
      </div>
      {!canEdit && (
        <p className="muted" style={{ margin: 0 }}>
          Read-only.{" "}
          <button type="button" className={styles.linkBtn} onClick={openLogin}>
            Log in to edit
          </button>
        </p>
      )}

      <div className={styles.detailGrid}>
        <div className={styles.detailMain}>
          <div className="card">
            <h2>Details</h2>
            <dl className={styles.dl}>
              <dt>Address</dt>
              <dd>{place.address}</dd>
              <dt>Hours</dt>
              <dd>{place.hoursText || "—"}</dd>
              <dt>From Airbnb</dt>
              <dd>{t ? `${t.miles} mi · ${t.minutes} min` : "—"}</dd>
              <dt>Links</dt>
              <dd>
                {place.links.length === 0
                  ? "—"
                  : place.links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className={styles.extLink}>
                        {l.label}
                      </a>
                    ))}
              </dd>
              <dt>Notes</dt>
              <dd>{place.notes || "—"}</dd>
            </dl>
          </div>
          <EditForm key={place.id} place={place} canEdit={canEdit} />
          <DeleteSection place={place} canEdit={canEdit} />
        </div>
        <aside className={styles.detailSide}>
          <MiniMap place={place} />
          <ScheduledCard events={events} place={place} canEdit={canEdit} />
        </aside>
      </div>
    </section>
  );
}

function MiniMap({ place }: { place: PlaceWithUsage | Place }) {
  return (
    <div className={`card ${styles.mapCard}`}>
      <svg viewBox="0 0 400 260" className={styles.miniMap} role="img" aria-label={`Map pin for ${place.name}`}>
        <rect width="400" height="260" fill="#efece6" />
        <path d="M0 0H120C150 60 110 130 150 260H0Z" fill="#dcebff" />
        <path d="M200 0V260M0 150H400M120 0C170 80 250 170 300 260" stroke="#fff" strokeWidth="6" fill="none" />
        <g transform="translate(205 150)">
          <path d="M0 0C-16-18-22-28-22-38a22 22 0 0 1 44 0c0 10-6 20-22 38Z" fill="#ff7a59" />
          <circle cy="-38" r="8" fill="#fff" />
        </g>
      </svg>
      <p className="muted" style={{ margin: "8px 8px 2px", fontSize: 13 }}>
        {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
      </p>
    </div>
  );
}

function EditForm({ place, canEdit }: { place: Place; canEdit: boolean }) {
  const update = useUpdatePlace();
  const [name, setName] = useState(place.name);
  const [category, setCategory] = useState(place.category);
  const [address, setAddress] = useState(place.address);
  const [duration, setDuration] = useState(place.defaultDurationMin?.toString() ?? "");
  const [tags, setTags] = useState(place.tags.join(", "));
  const [hours, setHours] = useState(place.hoursText);
  const [notes, setNotes] = useState(place.notes);
  const [saved, setSaved] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    update.mutate(
      {
        id: place.id,
        name,
        category,
        address,
        tags: parseTags(tags),
        hoursText: hours,
        notes,
        defaultDurationMin: duration.trim() === "" ? null : Number(duration),
      },
      { onSuccess: () => setSaved(true) },
    );
  }
  return (
    <form className="card" onSubmit={submit} aria-label="Edit place">
      <fieldset disabled={!canEdit} className={styles.fieldset}>
        <h2>Edit place</h2>
        <div className={styles.twoCol}>
          <label className="field">
            Name
            <input className="input" value={name} required onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            Category
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Place["category"])}>
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {catLabel(c)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Address
          <input className="input" value={address} required onChange={(e) => setAddress(e.target.value)} />
        </label>
        <div className={styles.twoCol}>
          <label className="field">
            Duration (min)
            <input className="input" type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>
          <label className="field">
            Tags
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
        </div>
        <label className="field">
          Hours
          <input className="input" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label className="field">
          Notes
          <textarea className="input" rows={3} value={notes} placeholder="Add a note" onChange={(e) => setNotes(e.target.value)} />
        </label>
        {update.error && (
          <p className="error-text" role="alert">
            {update.error.message}
          </p>
        )}
        <div className={styles.dialogActions} style={{ justifyContent: "flex-start", alignItems: "center" }}>
          <button type="submit" className="btn btn-primary" disabled={update.isPending}>
            Save
          </button>
          {saved && <span role="status" className="muted">Saved</span>}
        </div>
      </fieldset>
    </form>
  );
}

function DeleteSection({ place, canEdit }: { place: PlaceWithUsage | Place; canEdit: boolean }) {
  const del = useDeletePlace();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="card">
      <h2>Delete place</h2>
      <p className="muted">Removes this place and any schedule entries that use it.</p>
      {!confirm ? (
        <button type="button" className="btn" disabled={!canEdit} onClick={() => setConfirm(true)}>
          Delete place
        </button>
      ) : (
        <div className={styles.dialogActions} style={{ justifyContent: "flex-start" }}>
          <button type="button" className="btn btn-primary" disabled={del.isPending} onClick={() => del.mutate(place.id, { onSuccess: () => void navigate({ to: "/places" }) })}>
            Confirm delete
          </button>
          <button type="button" className="btn" onClick={() => setConfirm(false)}>
            Cancel
          </button>
        </div>
      )}
      {del.error && (
        <p className="error-text" role="alert">
          {del.error.message}
        </p>
      )}
    </div>
  );
}

function ScheduledCard({ events, place, canEdit }: { events: TripEvent[]; place: Place; canEdit: boolean }) {
  const [editing, setEditing] = useState<TripEvent | null>(null);
  const update = useUpdateEvent();
  const remove = useDeleteEvent();
  return (
    <div className="card" data-testid="scheduled-card">
      <div className="muted">{events.length ? "Scheduled" : "Not scheduled"}</div>
      {events.length === 0 && <p className="muted" style={{ margin: "6px 0 0" }}>This place is an idea. Add it to a day from the Places list or the Schedule tray.</p>}
      {events.map((e) => (
        <div key={e.id} className={styles.schedItem}>
          <div className={styles.schedWhen}>
            {formatDayLabel(laDateKey(e.start))}, {formatTime(e.start)}–{formatTime(e.end)}
            {e.skipped ? " (skipped)" : ""}
          </div>
          <div className={styles.dialogActions} style={{ justifyContent: "flex-start" }}>
            {canMove(e) && (
              <button type="button" className="btn" disabled={!canEdit} onClick={() => setEditing(e)}>
                Change time
              </button>
            )}
            {canRemove(e) && (
              <button type="button" className="btn" disabled={!canEdit || remove.isPending} onClick={() => remove.mutate(e.id)}>
                Move to ideas
              </button>
            )}
            {!canMove(e) && !canRemove(e) && <span className="muted">Fixed time</span>}
          </div>
        </div>
      ))}
      {remove.error && (
        <p className="error-text" role="alert">
          {remove.error.message}
        </p>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`Change time for ${place.name}`}>
        {editing && (
          <DayTimeForm
            initial={editing.start}
            submitLabel="Save time"
            pending={update.isPending}
            error={update.error?.message}
            onCancel={() => setEditing(null)}
            onSubmit={(start) => update.mutate({ id: editing.id, start }, { onSuccess: () => setEditing(null) })}
          />
        )}
      </Modal>
    </div>
  );
}
