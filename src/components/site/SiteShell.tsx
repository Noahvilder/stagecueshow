import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const PLANS = [
  { id: "monthly", name: "Månedlig", price: "79 kr.", per: "pr. måned", note: "Fleksibelt – stop når som helst" },
  { id: "yearly", name: "Årlig", price: "699 kr.", per: "pr. år", note: "Spar ca. 25%", featured: true },
  { id: "lifetime", name: "Lifetime", price: "1.499 kr.", per: "engangskøb", note: "Ej licensen for altid" },
] as const;

const NAV = [
  { to: "/", label: "Produkt" },
  { to: "/priser", label: "Priser" },
  { to: "/download", label: "Download" },
  { to: "/support", label: "Support" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" className="font-mono text-lg font-black tracking-widest text-go">STAGECUE</Link>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-bold" }}>{n.label}</Link>
            ))}
          </nav>
          <Link to="/view" search={{} as never} className="hidden rounded px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:block">🎸 Scenemonitor</Link>
          <Link to="/hub" className="rounded bg-go px-4 py-1.5 text-sm font-bold text-go-foreground">Åbn pulten</Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
          <span>© 2026 StageCue · Show control til Windows</span>
          <span className="flex gap-4"><Link to="/support">Kontakt</Link><Link to="/priser">Priser</Link><Link to="/download">Download</Link></span>
        </div>
      </footer>
    </div>
  );
}

export function meta(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
