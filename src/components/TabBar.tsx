import { Link } from "@tanstack/react-router";
import styles from "./TabBar.module.css";

const TABS = [
  { to: "/", label: "Today", d: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { to: "/schedule", label: "Schedule", d: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { to: "/map", label: "Map", d: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" },
  { to: "/places", label: "Places", d: "M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11zM12 12a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" },
] as const;

/** Mobile bottom tab bar; hidden at >= 720px. */
export function TabBar() {
  return (
    <nav aria-label="Tabs" className={styles.bar}>
      {TABS.map((t) => (
        <Link key={t.to} to={t.to} className={styles.tab} activeProps={{ className: `${styles.tab} ${styles.active}` }} activeOptions={{ exact: t.to === "/" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={t.d} />
          </svg>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
