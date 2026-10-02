import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppHeader />
      <div className="app-shell__body">
        <AppSidebar />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
