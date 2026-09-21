"use client";

import Link from "next/link";
import { CirclePlus, CreditCard, Download, Users } from "lucide-react";

const ROW = "flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm hover:text-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep";

export default function BudgetActions({ rows }: { rows: [string, string, number][] }) {
  function exportCsv() {
    const csv = ["Category,Expense,Total", ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "wedding-budget.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <ul className="mt-3 flex flex-col">
      <li><Link href="/budget/builder" className={ROW}><CirclePlus className="h-5 w-5 text-sage-deep" strokeWidth={1.5} aria-hidden />Add a new expense</Link></li>
      <li><Link href="/vendors" className={ROW}><Users className="h-5 w-5 text-wine" strokeWidth={1.5} aria-hidden />View all vendors</Link></li>
      <li><Link href="/budget/payments" className={ROW}><CreditCard className="h-5 w-5 text-wine" strokeWidth={1.5} aria-hidden />Track a payment</Link></li>
      <li><button onClick={exportCsv} className={`${ROW} w-full text-left`}><Download className="h-5 w-5 text-wine" strokeWidth={1.5} aria-hidden />Export budget</button></li>
    </ul>
  );
}
