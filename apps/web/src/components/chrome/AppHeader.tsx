import Link from "next/link";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__mark" aria-hidden />
        <Link href="/" className="app-header__name">
          NovaCRM Handoff
        </Link>
      </div>
    </header>
  );
}
