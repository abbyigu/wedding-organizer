"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  CalendarDays,
  ChartPie,
  Coffee,
  Crown,
  FileText,
  Gift,
  Hammer,
  Handshake,
  Heart,
  House,
  Lightbulb,
  MapPin,
  PartyPopper,
  Plane,
  SquareCheckBig,
  Sun,
  Wine,
} from "lucide-react";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;
type NavLink = { href: string; label: string; icon: Icon; match?: (p: string) => boolean; children?: NavLink[] };

const NAV: NavLink[] = [
  { href: "/", label: "Dashboard", icon: House, match: (p) => p === "/" },
  { href: "/decide", label: "Decide Together", icon: Heart },
  { href: "/board", label: "Planning Board", icon: SquareCheckBig },
  { href: "/ideas", label: "Inspiration", icon: Lightbulb },
  { href: "/venues", label: "Venues", icon: MapPin },
  { href: "/vendors", label: "Vendors", icon: Handshake },
  { href: "/guests", label: "Guest List", icon: FileText, match: (p) => p.startsWith("/guests") && !p.startsWith("/guests/events") },
  { href: "/wedding-party", label: "Wedding Party", icon: Crown },
  {
    href: "/guests/events",
    label: "Events",
    icon: CalendarDays,
    match: (p) => p.startsWith("/guests/events") || p.startsWith("/events"),
    children: [
      { href: "/events/welcome-party", label: "Welcome Party", icon: PartyPopper },
      { href: "/events/rehearsal-dinner", label: "Rehearsal Dinner", icon: Wine },
      { href: "/events/brunch", label: "Brunch", icon: Coffee },
    ],
  },
  { href: "/budget", label: "Budget", icon: ChartPie },
  { href: "/wedding-day", label: "Wedding Day", icon: Sun },
];

const MORE: NavLink[] = [
  { href: "/registry", label: "Registry", icon: Gift },
  { href: "/diy", label: "DIY Projects", icon: Hammer },
  { href: "/honeymoon", label: "Honeymoon", icon: Plane },
];

const FLAT: NavLink[] = [...NAV.flatMap((l) => [l, ...(l.children ?? [])]), ...MORE];

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function partnerName(name: string) {
  return name.trim().toLowerCase() === "ariel" ? "Fred" : "Ariel";
}

export default function NavBar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const partner = partnerName(userName);

  function isActive(l: NavLink) {
    return l.match ? l.match(pathname) : pathname.startsWith(l.href);
  }

  const linkClass = (active: boolean, child = false) =>
    `flex items-center gap-3.5 rounded-xl py-2.5 text-[15px] transition-colors ${child ? "ml-6 pl-3 text-sm" : "px-3.5"} ${FOCUS_RING} ${
      active ? "bg-surface-wine font-medium text-white" : "text-ink hover:bg-bg"
    }`;

  const accountItems = (
    <>
      <Link
        href="/private"
        onClick={() => setAccountOpen(false)}
        className={`block border-b border-line px-4 py-2.5 text-sm font-semibold ${
          pathname.startsWith("/private") ? "text-sage-deep" : "text-ink hover:bg-bg"
        }`}
      >
        Private
      </Link>
      <form action="/logout" method="post">
        <button className="w-full px-4 py-2.5 text-left text-sm font-semibold text-wine hover:bg-bg">Sign out</button>
      </form>
    </>
  );

  const avatarPair = (
    <span className="flex shrink-0 items-center -space-x-2">
      <span
        title={partner}
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--paper)] bg-[color-mix(in_srgb,var(--sage)_35%,var(--paper))] font-serif text-xs font-semibold text-ink"
      >
        {partner.charAt(0)}
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--paper)] bg-surface-wine font-serif text-sm font-semibold text-white">
        {userName.charAt(0) || "?"}
      </span>
    </span>
  );

  function renderLink(l: NavLink, child = false) {
    return (
      <Link key={l.href} href={l.href} className={linkClass(isActive(l), child)}>
        <l.icon className={child ? "h-4 w-4 shrink-0" : "h-5 w-5 shrink-0"} strokeWidth={1.5} aria-hidden />
        {l.label}
      </Link>
    );
  }

  return (
    <>
      {/* Desktop / tablet-landscape sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-paper lg:flex">
        <Link href="/" className={`relative block shrink-0 px-6 pb-5 pt-9 text-center ${FOCUS_RING}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.webp" width={350} height={420} alt="" aria-hidden className="pointer-events-none absolute -left-5 -top-3 h-24 w-auto -rotate-12 -scale-x-100 opacity-60" />
          <span className="relative block text-[11px] uppercase tracking-[0.32em] text-ink">The</span>
          <span className="relative block font-serif text-[1.7rem] font-light uppercase leading-[1.05] tracking-[0.06em] text-ink">Wedding</span>
          <span className="relative block font-serif text-[1.7rem] font-light uppercase leading-[1.05] tracking-[0.06em] text-ink">Room</span>
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
          {NAV.map((l) => (
            <div key={l.href} className="flex flex-col gap-0.5">
              {renderLink(l)}
              {l.children && isActive(l) && l.children.map((c) => renderLink(c, true))}
            </div>
          ))}
          <div className="mx-3.5 my-3 h-px bg-line" />
          {MORE.map((l) => renderLink(l))}
          <p className="pointer-events-none mt-auto hidden -rotate-6 px-3 pt-6 font-script text-[1.65rem] leading-[1.05] text-sage-deep [@media(min-height:900px)]:block">
            a more beautiful
            <br />
            way to plan
            <br />
            together
          </p>
        </nav>
        <div className="relative border-t border-line p-3">
          <button
            onClick={() => setAccountOpen((o) => !o)}
            aria-label={`${userName}, account menu`}
            aria-expanded={accountOpen}
            className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-bg ${FOCUS_RING}`}
          >
            {avatarPair}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{userName}</span>
          </button>
          {accountOpen && (
            <>
              <button aria-label="Close menu" tabIndex={-1} onClick={() => setAccountOpen(false)} className="fixed inset-0 z-40 cursor-default" />
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
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg ${FOCUS_RING}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <Link href="/" className="shrink-0 font-serif text-base font-medium uppercase tracking-[0.12em]">
            The Wedding Room
          </Link>
          <div className="flex-1" />
          <div className="relative shrink-0">
            <button
              onClick={() => setAccountOpen((o) => !o)}
              aria-label={`${userName}, account menu`}
              aria-expanded={accountOpen}
              className={`rounded-full ${FOCUS_RING}`}
            >
              {avatarPair}
            </button>
            {accountOpen && (
              <>
                <button aria-label="Close menu" tabIndex={-1} onClick={() => setAccountOpen(false)} className="fixed inset-0 z-40 cursor-default" />
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
          <nav aria-label="Main" className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto border-t border-line px-4 py-3">
            {FLAT.map((l) => {
              const child = NAV.some((n) => n.children?.some((c) => c.href === l.href));
              return (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className={linkClass(isActive(l), child)}>
                  <l.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </>
  );
}
