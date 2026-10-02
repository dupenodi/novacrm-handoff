"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <nav className="app-sidebar__nav">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`app-sidebar__item${active ? " is-active" : ""}`}>
              <span className="app-sidebar__dot" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
