import { Outlet } from "@tanstack/react-router";
import { Header } from "./components/Header";
import { TabBar } from "./components/TabBar";
import { LoginDialogProvider } from "./auth/LoginDialog";

/** Root layout: header nav (desktop), content, bottom tab bar (mobile). Routes render inside <main className="page">. */
export function App() {
  return (
    <LoginDialogProvider>
      <Header />
      <main className="page">
        <Outlet />
      </main>
      <TabBar />
    </LoginDialogProvider>
  );
}
