"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { Home, Images, KanbanSquare, Scale, Table2, Users, Wallet } from "lucide-react";

const LINKS: { href: string; label: string; icon: ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/guests", label: "Guests", icon: Users },
  { href: "/board", label: "Status Board", icon: KanbanSquare },
  { href: "/compare", label: "Detailed Comparison", icon: Table2 },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/decide", label: "Decide", icon: Scale },
  { href: "/ideas", label: "Idea board", icon: Images },
];

function partnerName(name: string) {
  return name.trim().toLowerCase() === "ariel" ? "Fred" : "Ariel";
}

export default function NavBar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const partner = partnerName(userName);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
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
      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--paper)] bg-sage-deep font-serif text-sm font-semibold text-[#F7F3EA]">
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
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive(l.href) ? "bg-green text-[#F7F3EA]" : "text-ink-2 hover:bg-bg hover:text-ink"
              }`}
            >
              <l.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="relative border-t border-line p-3">
          <button
            onClick={() => setAccountOpen((o) => !o)}
            aria-label={`Account: ${userName}`}
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
            <button onClick={() => setAccountOpen((o) => !o)} aria-label={`Account: ${userName}`} aria-expanded={accountOpen}>
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
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive(l.href) ? "bg-green text-[#F7F3EA]" : "text-ink-2 hover:bg-bg hover:text-ink"
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
