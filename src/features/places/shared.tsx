import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { TRIP_DAYS, formatDayLabel, laDateKey, laParts, laToUtc } from "@shared/time";
import styles from "./places.module.css";

/** Native <dialog> modal. Children mount only while open so forms reset. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={styles.dialog} aria-label={title} onClose={onClose}>
      {open && (
        <div className={styles.dialogBody}>
          <h2>{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Pick a trip day + time. Submits the UTC ISO instant. */
export function DayTimeForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  submitLabel: string;
  pending: boolean;
  error?: string;
  onSubmit: (startIso: string) => void;
  onCancel: () => void;
}) {
  const p = initial ? laParts(initial) : null;
  const [day, setDay] = useState<string>(initial ? laDateKey(initial) : TRIP_DAYS[0]);
  const [time, setTime] = useState(p ? `${pad2(p.hour)}:${pad2(p.minute)}` : "10:00");
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(laToUtc(day, time));
  }
  return (
    <form onSubmit={submit} className={styles.dialogForm}>
      <label className="field">
        Day
        <select className="input" value={day} onChange={(e) => setDay(e.target.value)}>
          {TRIP_DAYS.map((d) => (
            <option key={d} value={d}>
              {formatDayLabel(d)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Time
        <input className="input" type="time" value={time} required onChange={(e) => setTime(e.target.value)} />
      </label>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className={styles.dialogActions}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
