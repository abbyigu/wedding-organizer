"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const PRIMARY_TABS = [
  { href: "/guests", label: "Overview" },
  { href: "/guests/list", label: "Guest List" },
  { href: "/guests/rsvp", label: "RSVP" },
  { href: "/guests/seating", label: "Seating" },
  { href: "/guests/travel", label: "Travel & Stay" },
  { href: "/guests/events", label: "Events" },
];

const MORE_TABS = [
  { href: "/guests/communications", label: "Communications" },
  { href: "/guests/website", label: "Guest Website" },
];

export default function GuestsTabs() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (href: string) => (href === "/guests" ? pathname === "/guests" : pathname.startsWith(href));
  const moreActive = MORE_TABS.some((t) => isActive(t.href));

  return (
    <div className="mt-6 flex flex-wrap items-center gap-5 border-b border-line">
      {PRIMARY_TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`whitespace-nowrap border-b-2 pb-2.5 text-sm font-semibold ${isActive(t.href) ? "border-green text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
        >
          {t.label}
        </Link>
      ))}
      <div className="relative">
        <button
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={`flex items-center gap-1 whitespace-nowrap border-b-2 pb-2.5 text-sm font-semibold ${moreActive ? "border-green text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
        >
          More
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        </button>
        {moreOpen && (
          <>
            <button aria-label="Close menu" onClick={() => setMoreOpen(false)} className="fixed inset-0 z-40 cursor-default" />
            <div className="absolute left-0 top-full z-50 w-44 overflow-hidden rounded-xl border border-line bg-paper shadow-md">
              {MORE_TABS.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setMoreOpen(false)}
                  className={`block whitespace-nowrap px-4 py-2 text-sm font-semibold hover:bg-bg ${isActive(t.href) ? "text-sage-deep" : "text-ink"}`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
