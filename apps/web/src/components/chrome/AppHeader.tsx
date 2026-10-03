"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, navItems } from "./nav";

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__mark" aria-hidden />
        <Link href="/" className="app-header__name">
          Nova
        </Link>
      </div>
      <nav className="app-header__nav">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={isNavActive(item, pathname) ? "is-active" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
