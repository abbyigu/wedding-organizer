"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import { GitCompare, Home, Images, KanbanSquare, Landmark, Scale, Users, Wallet } from "lucide-react";

type NavLink = { href: string; label: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; indent?: boolean };

const NAV_GROUPS: { label: string | null; links: NavLink[] }[] = [
  { label: null, links: [{ href: "/", label: "Dashboard", icon: Home }] },
  {
    label: "Plan",
    links: [
      { href: "/board", label: "Planning Board", icon: KanbanSquare },
      { href: "/budget", label: "Budget", icon: Wallet },
    ],
  },
  { label: "People", links: [{ href: "/guests", label: "Guests", icon: Users }] },
  {
    label: "Create",
    links: [
      { href: "/venues", label: "Venue", icon: Landmark },
      { href: "/venues?tab=compare", label: "Compare venues", icon: GitCompare, indent: true },
      { href: "/ideas", label: "Inspiration Board", icon: Images },
    ],
  },
  { label: "Together", links: [{ href: "/decide", label: "Decide", icon: Scale }] },
];

const LINKS: NavLink[] = NAV_GROUPS.flatMap((g) => g.links);

function partnerName(name: string) {
  return name.trim().toLowerCase() === "ariel" ? "Fred" : "Ariel";
}

export default function NavBar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const partner = partnerName(userName);

  function isActive(href: string) {
    const [path, query] = href.split("?");
    const pathMatches = path === "/" ? pathname === "/" : pathname.startsWith(path);
    if (!pathMatches) return false;
    // /venues and /venues?tab=compare share a pathname — disambiguate by the tab param
    // so only one of "Venue Shortlist" / "Compare venues" is highlighted at a time.
    if (path === "/venues") {
      const wantTab = query ? new URLSearchParams(query).get("tab") : null;
      const actualTab = searchParams.get("tab");
      return wantTab ? actualTab === wantTab : !actualTab;
    }
    return true;
  }

  const accountItems = (
    <>
      <Link
        href="/private"
        onClick={() => setAccountOpen(false)}
        className={`block border-b border-line px-4 py-2.5 text-sm font-semibold ${
          isActive("/private") ? "text-sage-deep" : "text-ink hover:bg-bg"
        }`}
      >
        Private
      </Link>
      <form action="/logout" method="post">
        <button className="w-full px-4 py-2.5 text-left text-sm font-semibold text-wine hover:bg-bg">
          Sign out
        </button>
      </form>
    </>
  );

  const avatarPair = (
    <span className="flex shrink-0 items-center -space-x-2">
      <span
        title={partner}
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--paper)] bg-[color-mix(in_srgb,var(--sage)_35%,var(--paper))] font-serif text-xs font-semibold text-sage-deep"
      >
        {partner.charAt(0)}
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--paper)] bg-sage-deep font-serif text-sm font-semibold text-white">
        {userName.charAt(0) || "?"}
      </span>
    </span>
  );

  return (
    <>
      {/* Desktop / tablet-landscape sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-paper lg:flex">
        <Link href="/" className="border-b border-line px-5 py-5 font-serif text-lg font-medium">
          Our Wedding Room
        </Link>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label ?? group.links[0].href} className="flex flex-col gap-1">
              {group.label && (
                <span className="px-3 text-[10px] font-semibold uppercase tracking-wide text-ink-2/70">{group.label}</span>
              )}
              {group.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-2.5 rounded-lg py-2 text-sm font-semibold transition-colors ${l.indent ? "ml-3 border-l border-line pl-2.5 text-[13px]" : "px-3"} ${
                    isActive(l.href) ? "bg-green text-white" : "text-ink-2 hover:bg-bg hover:text-ink"
                  }`}
                >
                  <l.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="relative border-t border-line p-3">
          <button
            onClick={() => setAccountOpen((o) => !o)}
            aria-label={`${userName}, account menu`}
            aria-expanded={accountOpen}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-bg"
          >
            {avatarPair}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{userName}</span>
          </button>
          {accountOpen && (
            <>
              <button aria-label="Close menu" onClick={() => setAccountOpen(false)} className="fixed inset-0 z-40 cursor-default" />
              <div className="absolute bottom-16 left-3 right-3 z-50 overflow-hidden rounded-xl border border-line bg-paper shadow-md">
                {accountItems}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile / tablet-portrait top bar */}
      <div className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <Link href="/" className="shrink-0 font-serif text-base font-medium">
            Our Wedding Room
          </Link>
          <div className="flex-1" />
          <div className="relative shrink-0">
            <button onClick={() => setAccountOpen((o) => !o)} aria-label={`${userName}, account menu`} aria-expanded={accountOpen}>
              {avatarPair}
            </button>
            {accountOpen && (
              <>
                <button aria-label="Close menu" onClick={() => setAccountOpen(false)} className="fixed inset-0 z-40 cursor-default" />
                <div className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-xl border border-line bg-paper shadow-md">
                  <p className="border-b border-line px-4 py-2.5 text-sm text-ink-2">
                    Signed in as <b className="text-ink">{userName}</b>
                  </p>
                  {accountItems}
                </div>
              </>
            )}
          </div>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-line px-4 py-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg py-2 text-sm font-semibold transition-colors ${l.indent ? "ml-3 border-l border-line pl-2.5 text-[13px]" : "px-3"} ${
                  isActive(l.href) ? "bg-green text-white" : "text-ink-2 hover:bg-bg hover:text-ink"
                }`}
              >
                <l.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
