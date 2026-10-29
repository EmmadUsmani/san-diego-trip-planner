import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLogin } from "../api/hooks";
import styles from "./LoginDialog.module.css";

const Ctx = createContext<{ openLogin: () => void }>({ openLogin: () => {} });
/** Call openLogin() from any "Log in to edit" affordance. */
export const useLoginDialog = () => useContext(Ctx);

export function LoginDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openLogin = useCallback(() => setOpen(true), []);
  return (
    <Ctx.Provider value={{ openLogin }}>
      {children}
      <LoginDialog open={open} onClose={() => setOpen(false)} />
    </Ctx.Provider>
  );
}

export function LoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState("");
  const login = useLogin();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    login.mutate(password, {
      onSuccess: () => {
        setPassword("");
        login.reset();
        onClose();
      },
    });
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-labelledby="login-title">
      <form onSubmit={submit} className={styles.form}>
        <h2 id="login-title">Log in to edit</h2>
        <p className="muted" style={{ margin: 0 }}>
          Anyone can look around. Editing needs the shared password.
        </p>
        <label className="field">
          Password
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </label>
        {login.error ? (
          <span className="error-text" role="alert">
            {login.error.message}
          </span>
        ) : null}
        <div className={styles.actions}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={login.isPending || password.length === 0}>
            Log in
          </button>
        </div>
      </form>
    </dialog>
  );
}
