import { useState, type FormEvent } from "react";
import { useCreatePlace } from "../../api/hooks";
import { Modal } from "./shared";
import { parseTags } from "./logic";
import styles from "./places.module.css";

export function AddPlaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Add place">
      <AddPlaceForm onClose={onClose} />
    </Modal>
  );
}

function AddPlaceForm({ onClose }: { onClose: () => void }) {
  const create = useCreatePlace();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState<"activity" | "food" | "charger">("activity");
  const [tags, setTags] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const hasCoords = lat.trim() !== "" && lng.trim() !== "";
    create.mutate(
      { name, address, category, tags: parseTags(tags), ...(hasCoords ? { lat: Number(lat), lng: Number(lng) } : {}) },
      { onSuccess: onClose },
    );
  }
  return (
    <form onSubmit={submit} className={styles.dialogForm}>
      <label className="field">
        Name
        <input className="input" value={name} required onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        Address
        <input className="input" value={address} required onChange={(e) => setAddress(e.target.value)} />
      </label>
      <label className="field">
        Category
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          <option value="activity">Activity</option>
          <option value="food">Food</option>
          <option value="charger">Charger</option>
        </select>
      </label>
      <label className="field">
        Tags
        <input className="input" value={tags} placeholder="halal, indoor" onChange={(e) => setTags(e.target.value)} />
      </label>
      <div className={styles.twoCol}>
        <label className="field">
          Latitude (optional)
          <input className="input" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
        </label>
        <label className="field">
          Longitude (optional)
          <input className="input" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} />
        </label>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        We look up the address for the pin unless you give coordinates.
      </p>
      {create.error && (
        <p className="error-text" role="alert">
          {create.error.message}
        </p>
      )}
      <div className={styles.dialogActions}>
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={create.isPending}>
          {create.isPending ? "Adding..." : "Add place"}
        </button>
      </div>
    </form>
  );
}
