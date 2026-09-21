"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/budget", label: "Overview" },
  { href: "/budget/builder", label: "Budget builder" },
  { href: "/budget/payments", label: "Payments" },
  { href: "/budget/notes", label: "Notes" },
];

export default function BudgetTabs() {
  const pathname = usePathname();
  return (
    <div className="mt-8 flex flex-wrap gap-x-8 gap-y-1 border-b border-line">
      {TABS.map((t) => {
        const active = t.href === "/budget" ? pathname === "/budget" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap border-b-2 pb-3 text-lg ${active ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
