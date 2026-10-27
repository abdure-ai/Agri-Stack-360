import { recordVisit } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { LogoMark } from "@/icons";
import { cn } from "@/utils";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { BUTTON, visitSource } from "./site";

// Public website pages (landing, feedback, privacy): English first for the exhibition, light theme only,
// no sign-in. Visitors arrive by QR code on a phone over mobile data, so these stay small.

/** Count one view per page per visit (page and source only: no cookies, no personal data). */
function usePageView(path: string) {
  const { search } = useLocation();
  useEffect(() => {
    const source = visitSource(search);
    const key = `as360_viewed:${path}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private window: count every load */
    }
    recordVisit(path, source);
  }, [path, search]);
}

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#results", label: "Results" },
  { href: "/#partners", label: "Partners" },
  { href: "/#contact", label: "Contact" },
];

/** The app's Logo has dark-mode colours; the public pages are always light, so they draw their own. */
function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="size-9 shrink-0" aria-hidden="true" />
      <span className="text-xl font-semibold tracking-tight whitespace-nowrap text-gray-900">
        Agri-Stack <span className="text-brand-600">360</span>
      </span>
    </span>
  );
}

export default function PublicLayout({ path, children }: { path: string; children: ReactNode }) {
  usePageView(path);
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const appLink = isAuthenticated
    ? { to: "/dashboard", label: "Open the app" }
    : { to: "/signin", label: "Log in" };

  return (
    <div lang="en" className="min-h-screen bg-white font-outfit text-base text-gray-800">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3">
          <Link to="/" aria-label="Agri-Stack 360 home" className="mr-auto flex min-h-11 items-center">
            <Brand />
          </Link>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-gray-700 hover:text-brand-700">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <Link to={appLink.to} className="hidden min-h-11 items-center rounded-lg px-3 font-medium text-brand-800 hover:underline sm:inline-flex">
            {appLink.label}
          </Link>
          <Link to="/feedback" className={cn(BUTTON.accent, "px-3 text-sm whitespace-nowrap sm:px-4 sm:text-base")}>
            Give feedback
          </Link>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="public-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        {menuOpen && (
          <nav id="public-menu" aria-label="Main" className="border-t border-gray-100 bg-white lg:hidden">
            <ul className="mx-auto max-w-6xl px-4 py-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center text-lg font-medium text-gray-800">
                    {n.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to={appLink.to} className="flex min-h-12 items-center text-lg font-medium text-brand-800">
                  {appLink.label}
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main id="main">{children}</main>

      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Brand />
            <p className="mt-3 text-sm text-gray-600">Powered by Debbal</p>
          </div>
          {[
            {
              title: "For farmers",
              links: [
                { to: appLink.to, label: appLink.label },
                { to: "/#how-it-works", label: "How it works" },
              ],
            },
            {
              title: "For partners",
              links: [
                { to: "/feedback?type=partner", label: "Partner with us" },
                { to: "/feedback", label: "Give feedback" },
              ],
            },
            {
              title: "Agri-Stack 360",
              links: [
                { to: "/#contact", label: "Contact" },
                { to: "/privacy", label: "Privacy" },
              ],
            },
          ].map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-bold text-gray-900">{col.title}</h2>
              <ul className="mt-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to.includes("#") ? (
                      // a plain link, so the browser scrolls to the section
                      <a href={l.to} className="inline-flex min-h-11 items-center text-gray-700 hover:text-brand-700">{l.label}</a>
                    ) : (
                      <Link to={l.to} className="inline-flex min-h-11 items-center text-gray-700 hover:text-brand-700">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-gray-200">
          <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-gray-600">© 2026 Agri-Stack 360 · Addis Ababa, Ethiopia</p>
        </div>
      </footer>
    </div>
  );
}
