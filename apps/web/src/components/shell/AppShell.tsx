"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloseIcon, MenuIcon, OverviewIcon, SettingsIcon } from "@/components/ui/icons";
import { Button, cx } from "@/components/ui/primitives";
import { DealList } from "./DealList";
import { InboxWatchCard } from "./InboxWatchCard";
import styles from "./shell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer after navigating.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Button variant="ghost" icon={<MenuIcon />} label="Open menu" onClick={() => setOpen(true)} />
        <Brand />
      </header>

      <div className={cx(styles.scrim, open && styles.scrimVisible)} onClick={() => setOpen(false)} aria-hidden />

      <aside className={cx(styles.sidebar, open && styles.sidebarOpen)} aria-label="Navigation">
        <div className={styles.sidebarHead}>
          <Brand />
          <Button
            variant="ghost"
            size="sm"
            icon={<CloseIcon />}
            label="Close menu"
            className={styles.closeButton}
            onClick={() => setOpen(false)}
          />
        </div>

        <div className={styles.sidebarSection}>
          <InboxWatchCard />
        </div>

        <nav className={styles.nav}>
          <NavLink href="/" active={pathname === "/"} icon={<OverviewIcon />}>
            Overview
          </NavLink>
        </nav>

        <DealList />

        <div className={styles.sidebarFoot}>
          <NavLink href="/settings" active={pathname.startsWith("/settings")} icon={<SettingsIcon />}>
            Settings
          </NavLink>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className={styles.brand}>
      <span className={styles.brandMark} aria-hidden>
        N
      </span>
      <span className={styles.brandText}>
        <span className={styles.brandName}>NovaCRM</span>
        <span className={styles.brandSub}>Onboarding desk</span>
      </span>
    </Link>
  );
}

function NavLink({ href, active, icon, children }: { href: string; active: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className={cx(styles.navLink, active && styles.navLinkActive)} aria-current={active ? "page" : undefined}>
      {icon}
      {children}
    </Link>
  );
}
