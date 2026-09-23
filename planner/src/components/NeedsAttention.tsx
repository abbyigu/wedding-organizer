"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import type { AttentionItem } from "@/lib/needs-attention";
import type { PlanSummary } from "@/lib/plan";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const DOT = { urgent: "bg-wine", soon: "bg-gold", info: "bg-sage" } as const;
const TONE_WORD = { urgent: "Urgent", soon: "Soon", info: "Good to know" } as const;

export default function NeedsAttention({ items, plan }: { items: AttentionItem[]; plan: Pick<PlanSummary, "id" | "name" | "projected" | "unknownCount" | "venueName"> | null }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 5);
  return (
    <section aria-labelledby="needs-attention" className="mt-9 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <h2 id="needs-attention" className="font-serif text-xl font-medium">Needs attention</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">Nothing needs you right now. Payments, follow-ups, votes and unknown costs will show up here when they do.</p>
        ) : (
          <>
            <ul className="mt-3 flex flex-col divide-y divide-line">
              {shown.map((it) => (
                <li key={it.id}>
                  <Link href={it.href} className={`flex min-h-11 items-center gap-3 rounded py-2 hover:bg-bg ${FOCUS_RING}`}>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[it.tone]}`} aria-hidden />
                    <span className="min-w-0 flex-1 text-[15px]">
                      {it.text}
                      <span className="sr-only"> ({TONE_WORD[it.tone]}, {it.area})</span>
                    </span>
                    <span className="hidden shrink-0 text-xs text-ink-2 sm:block">{it.area}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            {items.length > 5 && (
              <button onClick={() => setAll((v) => !v)} aria-expanded={all} className={`mt-2 min-h-11 rounded text-sm font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>
                {all ? "Show fewer" : `Show all ${items.length}`}
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col justify-center rounded-2xl border border-wine/25 bg-[color-mix(in_srgb,var(--wine)_5%,var(--paper))] p-5 shadow-sm">
        {plan ? (
          <>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-wine"><Heart className="h-4 w-4 fill-wine" strokeWidth={1.5} aria-hidden />Our wedding plan</p>
            <p className="mt-2 font-serif text-2xl font-light">{plan.name}</p>
            <p className="text-ink-2">{plan.venueName ?? "No venue yet"} · {plan.unknownCount > 0 ? "≥ " : ""}${Math.round(plan.projected).toLocaleString("en-CA")} projected{plan.unknownCount > 0 ? ` · ${plan.unknownCount} unknown` : ""}</p>
            <Link href={`/budget/scenarios/${plan.id}`} className={`mt-3 inline-flex min-h-11 w-fit items-center gap-1.5 rounded font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Open the plan <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /></Link>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Wedding scenarios</p>
            <p className="mt-2 font-serif text-2xl font-light">See what a version of the day would cost</p>
            <p className="text-ink-2">Build a scenario from your venues and vendors, then make one our wedding.</p>
            <Link href="/budget/scenarios" className={`mt-3 inline-flex min-h-11 w-fit items-center gap-1.5 rounded font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Build a scenario <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /></Link>
          </>
        )}
        <Link href="/style" className={`mt-1 inline-flex min-h-11 w-fit items-center rounded text-sm font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Our wedding style</Link>
      </div>
    </section>
  );
}
