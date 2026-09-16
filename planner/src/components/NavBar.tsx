"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/guests", label: "Guests" },
  { href: "/board", label: "Status Board" },
  { href: "/compare", label: "Detailed Comparison" },
  { href: "/budget", label: "Budget" },
];

export default function NavBar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg lg:hidden"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <Link href="/" className="shrink-0 font-serif text-base font-medium">
          Our Wedding Room
        </Link>
        <nav className="hidden min-w-0 flex-1 gap-1 overflow-x-auto lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                isActive(l.href) ? "bg-green text-[#F7F3EA]" : "text-ink-2 hover:bg-bg hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1 lg:hidden" />
        <div className="relative shrink-0">
          <button
            onClick={() => setAccountOpen((o) => !o)}
            aria-label={`Account: ${userName}`}
            aria-expanded={accountOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-deep font-serif text-sm font-semibold text-[#F7F3EA]"
          >
            {userName.charAt(0) || "?"}
          </button>
          {accountOpen && (
            <>
              <button
                aria-label="Close menu"
                onClick={() => setAccountOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-xl border border-line bg-paper shadow-md">
                <p className="border-b border-line px-4 py-2.5 text-sm text-ink-2">
                  Signed in as <b className="text-ink">{userName}</b>
                </p>
                <Link
                  href="/decide"
                  onClick={() => setAccountOpen(false)}
                  className={`block border-b border-line px-4 py-2.5 text-sm font-semibold ${
                    isActive("/decide") ? "text-sage-deep" : "text-ink hover:bg-bg"
                  }`}
                >
                  Decide
                </Link>
                <form action="/logout" method="post">
                  <button className="w-full px-4 py-2.5 text-left text-sm font-semibold text-wine hover:bg-bg">
                    Sign out
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 lg:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive(l.href) ? "bg-green text-[#F7F3EA]" : "text-ink-2 hover:bg-bg hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
