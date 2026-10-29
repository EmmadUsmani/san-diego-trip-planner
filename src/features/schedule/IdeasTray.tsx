import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import type { Place } from "@shared/types";
import s from "./schedule.module.css";

function subtitle(p: Place) {
  const tag = p.tags.find((t) => ["halal", "indoor", "outdoor"].includes(t));
  return [p.neighborhood, tag].filter(Boolean).join(" · ");
}

export function IdeaCard({
  place,
  canEdit,
  overlay,
}: {
  place: Place;
  canEdit: boolean;
  overlay?: boolean;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `idea:${place.id}`,
    data: { type: "idea", place },
    disabled: !canEdit || overlay,
  });
  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={`${s.idea} ${place.category === "food" ? s.ideaFood : s.ideaActivity} ${canEdit ? s.draggable : ""} ${isDragging ? s.dragging : ""} ${overlay ? s.overlayIdea : ""}`}
      data-testid={overlay ? undefined : `idea-${place.id}`}
      data-draggable={canEdit}
      {...(canEdit && !overlay ? { ...listeners, ...attributes } : {})}
    >
      <span className={s.grip} aria-hidden>
        ⠿
      </span>
      <div>
        <div className={s.ideaName}>{place.name}</div>
        <div className={s.ideaSub}>{subtitle(place)}</div>
      </div>
    </div>
  );
}

export function IdeasTray({
  ideas,
  canEdit,
}: {
  ideas: Place[];
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "tray",
    data: { type: "tray" },
  });
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      ideas.filter((p) =>
        p.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [ideas, q],
  );
  const groups = [
    {
      label: "Activities",
      items: filtered.filter((p) => p.category !== "food"),
    },
    { label: "Food", items: filtered.filter((p) => p.category === "food") },
  ];
  return (
    <aside
      ref={setNodeRef}
      className={`card ${s.tray} ${isOver ? s.trayOver : ""}`}
      data-testid="ideas-tray"
      aria-label="Ideas"
    >
      <h2>Ideas</h2>
      <input
        className={`input ${s.traySearch}`}
        placeholder="Search ideas"
        aria-label="Search ideas"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className={s.trayScroll}>
        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <section key={g.label}>
                <div className={s.trayLabel}>{g.label}</div>
                <div className={s.trayList}>
                  {g.items.map((p) => (
                    <IdeaCard key={p.id} place={p} canEdit={canEdit} />
                  ))}
                </div>
              </section>
            ),
        )}
        {filtered.length === 0 && (
          <p className="muted">
            {ideas.length
              ? "No matches."
              : "No ideas left. Everything is scheduled."}
          </p>
        )}
      </div>
      <div
        className={`${s.dropHint} ${isOver ? s.dropHintOver : ""}`}
        data-testid="tray-drop"
      >
        Drop here to unschedule
      </div>
    </aside>
  );
}
