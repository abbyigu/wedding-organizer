"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/budget", label: "Overview" },
  { href: "/budget/builder", label: "Budget builder" },
  { href: "/budget/payments", label: "Payments" },
];

export default function BudgetTabs() {
  const pathname = usePathname();
  return (
    <div className="mt-6 flex gap-5 border-b border-line">
      {TABS.map((t) => {
        const active = t.href === "/budget" ? pathname === "/budget" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`border-b-2 pb-2.5 text-sm font-semibold ${active ? "border-green text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
