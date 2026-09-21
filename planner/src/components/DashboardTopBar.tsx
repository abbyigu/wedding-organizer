"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Search } from "lucide-react";

export type SearchItem = { label: string; hint: string; href: string };
export type Notice = { label: string; href: string };

const PAGES: SearchItem[] = [
  { label: "Decide Together", hint: "Page", href: "/decide" },
  { label: "Planning Board", hint: "Page", href: "/board" },
  { label: "Inspiration", hint: "Page", href: "/ideas" },
  { label: "Venues", hint: "Page", href: "/venues" },
  { label: "Vendors", hint: "Page", href: "/vendors" },
  { label: "Guest List", hint: "Page", href: "/guests" },
  { label: "Wedding Party", hint: "Page", href: "/wedding-party" },
  { label: "Budget", hint: "Page", href: "/budget" },
  { label: "Wedding Day", hint: "Page", href: "/wedding-day" },
  { label: "Registry", hint: "Page", href: "/registry" },
];

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function DashboardTopBar({
  userName,
  partner,
  items,
  notices,
  placeholder = "Search venues, tasks, ideas, pages…",
  onSelect,
}: {
  userName: string;
  partner: string;
  items: SearchItem[];
  notices: Notice[];
  placeholder?: string;
  // When given, results call this (with the item's href as a key) instead of navigating, and pages are left out.
  onSelect?: (item: SearchItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const results = q
    ? (onSelect ? items : [...PAGES, ...items]).filter((i) => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)).slice(0, 8)
    : [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setQuery("");
      setBellOpen(false);
      setAccountOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setQuery("");
        setBellOpen(false);
        setAccountOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const couple = [userName, partner].filter(Boolean).join(" & ");

  return (
    <div ref={wrapRef} className="flex items-center gap-3 sm:gap-5">
      <div className="relative min-w-0 flex-1">
        <label className="flex items-center gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--line)_45%,var(--paper))] px-4 py-3 text-ink-2 focus-within:ring-2 focus-within:ring-sage-deep">
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder.replace("…", "")}
            className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-2"
          />
        </label>
        {q && (
          <ul className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-line bg-paper p-1.5 shadow-md">
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-2">Nothing matches “{query.trim()}”.</li>
            ) : (
              results.map((r) => (
                <li key={`${r.hint}-${r.href}-${r.label}`}>
                  {onSelect ? (
                    <button
                      onClick={() => {
                        onSelect(r);
                        setQuery("");
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-bg ${FOCUS_RING}`}
                    >
                      <span className="truncate font-semibold text-ink">{r.label}</span>
                      <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-ink-2">{r.hint}</span>
                    </button>
                  ) : (
                  <Link
                    href={r.href}
                    onClick={() => setQuery("")}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-bg ${FOCUS_RING}`}
                  >
                    <span className="truncate font-semibold text-ink">{r.label}</span>
                    <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-ink-2">{r.hint}</span>
                  </Link>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => {
            setBellOpen((o) => !o);
            setAccountOpen(false);
          }}
          aria-label={notices.length ? `Notifications, ${notices.length} waiting` : "Notifications"}
          aria-expanded={bellOpen}
          className={`relative flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-bg ${FOCUS_RING}`}
        >
          <Bell className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          {notices.length > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-surface-rose ring-2 ring-paper" />}
        </button>
        {bellOpen && (
          <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-line bg-paper p-2 shadow-md">
            {notices.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-2">You&apos;re all caught up.</p>
            ) : (
              notices.map((n) => (
                <Link key={n.label} href={n.href} onClick={() => setBellOpen(false)} className={`block rounded-xl px-3 py-2 text-sm text-ink hover:bg-bg ${FOCUS_RING}`}>
                  {n.label}
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <div className="relative hidden border-l border-line pl-5 lg:block">
        <button
          onClick={() => {
            setAccountOpen((o) => !o);
            setBellOpen(false);
          }}
          aria-label={`${couple}, account menu`}
          aria-expanded={accountOpen}
          className={`flex items-center gap-3 rounded-full py-1 pr-2 hover:bg-bg ${FOCUS_RING}`}
        >
          <span className="flex -space-x-2" aria-hidden>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-paper bg-[color-mix(in_srgb,var(--sage)_35%,var(--paper))] font-serif text-sm font-semibold text-ink">
              {partner.charAt(0)}
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-paper bg-surface-wine font-serif text-sm font-semibold text-white">
              {userName.charAt(0) || "?"}
            </span>
          </span>
          <span className="hidden text-sm font-semibold text-ink md:inline">{couple}</span>
          <ChevronDown className="hidden h-4 w-4 text-ink md:block" strokeWidth={1.75} aria-hidden />
        </button>
        {accountOpen && (
          <div className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-2xl border border-line bg-paper shadow-md">
            <Link href="/private" onClick={() => setAccountOpen(false)} className="block border-b border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-bg">
              Private
            </Link>
            <form action="/logout" method="post">
              <button className="w-full px-4 py-2.5 text-left text-sm font-semibold text-wine hover:bg-bg">Sign out</button>
            </form>
          </div>
        )}
      </div>

      <p className="hidden text-[11px] uppercase leading-[1.7] tracking-[0.22em] text-ink-2 2xl:block">
        Good people
        <br />
        Great parties
        <br />
        Brighter tomorrows
      </p>
    </div>
  );
}
