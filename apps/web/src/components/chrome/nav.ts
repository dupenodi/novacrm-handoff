export type NavItem = {
  href: string;
  label: string;
  /** Other paths that highlight this item. */
  matches?: string[];
};

export const navItems: NavItem[] = [
  { href: "/", label: "Clients", matches: ["/clients"] },
  { href: "/settings", label: "Settings" },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) return true;
  return (item.matches ?? []).some((prefix) => pathname.startsWith(prefix));
}
