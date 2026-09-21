"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/vendors", label: "Potential" },
  { href: "/vendors/booked", label: "Booked" },
];

export default function VendorsTabs() {
  const pathname = usePathname();
  return (
    <div className="mt-8 flex gap-8 border-b border-line">
      {TABS.map((t) => {
        const active = t.href === "/vendors" ? pathname === "/vendors" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`border-b-2 pb-3 text-lg ${active ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
