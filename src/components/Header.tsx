import { Link } from "@tanstack/react-router";
import { useAuth, useLogout } from "../api/hooks";
import { useLoginDialog } from "../auth/LoginDialog";
import { LogoMark } from "./icons";
import styles from "./Header.module.css";

export const NAV = [
  { to: "/", label: "Overview" },
  { to: "/schedule", label: "Schedule" },
  { to: "/map", label: "Map" },
  { to: "/places", label: "Places" },
  { to: "/range", label: "Range" },
] as const;

export function Header() {
  const { data } = useAuth();
  const logout = useLogout();
  const { openLogin } = useLoginDialog();
  const authed = data?.authenticated === true;
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        <LogoMark />
        <span className={styles.brandText}>la jolla ’26</span>
      </Link>
      <nav aria-label="Main" className={styles.nav}>
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={styles.navLink} activeProps={{ className: `${styles.navLink} ${styles.active}` }} activeOptions={{ exact: n.to === "/" }}>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className={styles.right}>
        {authed ? (
          <button type="button" className={styles.session} onClick={() => logout.mutate()}>
            Log out
          </button>
        ) : (
          <button type="button" className={styles.session} onClick={openLogin}>
            Log in to edit
          </button>
        )}
        <div className={styles.avatars}>
          <span title="Emmad" className={`${styles.avatar} ${styles.e}`}>
            E
          </span>
          <span title="Ömer" className={`${styles.avatar} ${styles.o}`}>
            Ö
          </span>
        </div>
      </div>
    </header>
  );
}
