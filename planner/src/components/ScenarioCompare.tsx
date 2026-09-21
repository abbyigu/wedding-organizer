"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BUDGET_CEILING, fmt, resolveAssumptions, type BudgetSettings, type Venue } from "@/lib/venues";
import type { BudgetExpense } from "@/lib/budget-extras";
import { BUCKETS, BUCKET_LABEL, CELL_TEXT, scenarioOf, type Cell } from "@/lib/budget-scenarios";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const MIN = 2;
const MAX = 4;

export function CellView({ cell }: { cell: Cell }) {
  if (cell.kind === "amount") {
    return (
      <span>
        {fmt(cell.amount)}
        {cell.partial && <span className="block text-xs font-normal text-wine">+ some unknown</span>}
      </span>
    );
  }
  const tone = cell.kind === "unknown" ? "text-wine" : cell.kind === "included" ? "text-sage-deep" : "text-ink-2";
  return <span className={`text-sm font-normal ${tone}`}>{CELL_TEXT[cell.kind]}</span>;
}

export default function ScenarioCompare({
  venues,
  settings,
  guestSummary,
  expenses,
  linkedTotal,
  onOpen,
}: {
  venues: Venue[];
  settings: BudgetSettings;
  guestSummary: { adults: number; kids: number; confirmedAdults: number; confirmedKids: number };
  expenses: BudgetExpense[];
  linkedTotal: number;
  onOpen: (id: string) => void;
}) {
  const candidates = venues.filter((v) => v.status !== "out");
  const [ids, setIds] = useState<string[]>(() =>
    [...candidates].sort((a, b) => Number(b.is_final) - Number(a.is_final) || Number(b.is_favourite) - Number(a.is_favourite)).slice(0, 3).map((v) => v.id),
  );
  const as = resolveAssumptions(settings, guestSummary);
  const cols = ids.map((id) => venues.find((v) => v.id === id)).filter((v): v is Venue => Boolean(v)).map((v) => ({ v, s: scenarioOf(v, as, settings.shared_line_amounts, expenses, linkedTotal) }));
  const lowest = cols.length > 1 ? Math.min(...cols.map((c) => c.s.grand)) : null;

  function toggle(id: string) {
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX ? cur : [...cur, id]));
  }

  const ROW = "border-t border-line";
  const TH = "px-4 py-3 text-left text-sm font-normal text-ink-2";

  return (
    <section aria-label="Compare scenarios" className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-3xl font-medium">Compare scenarios</h2>
        <p className="text-ink-2">The likely total cost of the whole wedding at each venue. Pick {MIN}–{MAX}.</p>
      </div>

      <div role="group" aria-label="Venues to compare" className="flex flex-wrap gap-2">
        {candidates.map((v) => {
          const on = ids.includes(v.id);
          const full = !on && ids.length >= MAX;
          return (
            <button
              key={v.id}
              onClick={() => toggle(v.id)}
              aria-pressed={on}
              disabled={full}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold disabled:opacity-40 ${on ? "border-surface-green bg-surface-green text-white" : "border-line bg-paper hover:border-sage-deep"} ${FOCUS_RING}`}
            >
              {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
              {v.name}
            </button>
          );
        })}
      </div>

      {cols.length < MIN ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-2">Pick at least {MIN} venues to compare them side by side.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper shadow-sm">
          <table className="w-full min-w-[34rem] border-collapse">
            <thead>
              <tr>
                <th className={TH} scope="col"><span className="sr-only">Cost</span></th>
                {cols.map(({ v, s }) => (
                  <th key={v.id} scope="col" className="px-4 py-4 text-left align-bottom">
                    <p className="font-serif text-xl font-medium">{v.name}</p>
                    <p className="text-xs font-normal text-ink-2">
                      {v.is_final ? "Chosen venue" : s.source === "contracted" ? "Contracted total" : s.source === "quoted" ? "Quoted total" : "Estimated from line items"}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className={ROW}>
                <th scope="row" className="px-4 py-4 text-left font-serif text-lg font-medium">Total estimated wedding cost</th>
                {cols.map(({ v, s }) => (
                  <td key={v.id} className="px-4 py-4">
                    <p className={`font-serif text-3xl font-medium ${lowest === s.grand ? "text-sage-deep" : ""}`}>{s.unknownCount > 0 ? "≥ " : ""}{fmt(s.grand)}</p>
                    {lowest === s.grand && <p className="text-xs font-semibold text-sage-deep">{s.unknownCount > 0 ? "Lowest so far — not complete" : "Lowest total"}</p>}
                    {s.unknownCount > 0 && <p className="text-xs text-wine">{s.unknownCount} cost{s.unknownCount === 1 ? "" : "s"} still unknown</p>}
                  </td>
                ))}
              </tr>
              <tr className={ROW}>
                <th scope="row" className={TH}>Cost per guest</th>
                {cols.map(({ v, s }) => <td key={v.id} className="px-4 py-3 font-semibold">{fmt(s.perGuest)}</td>)}
              </tr>
              <tr className={ROW}>
                <th scope="row" className={TH}>Remaining budget</th>
                {cols.map(({ v, s }) => {
                  const left = BUDGET_CEILING - s.grand;
                  return <td key={v.id} className={`px-4 py-3 font-semibold ${left < 0 ? "text-wine" : ""}`}>{left < 0 ? `${fmt(-left)} over` : fmt(left)}</td>;
                })}
              </tr>
              {BUCKETS.map((b) => (
                <tr key={b} className={ROW}>
                  <th scope="row" className={TH}>
                    {BUCKET_LABEL[b]}
                    {b === "shared" && <span className="block text-xs">Photography, attire, flowers… same in every scenario</span>}
                  </th>
                  {cols.map(({ v, s }) => <td key={v.id} className="px-4 py-3 font-semibold"><CellView cell={s.cells[b]} /></td>)}
                </tr>
              ))}
              <tr className={ROW}>
                <th scope="row" className={TH}>Service charges</th>
                {cols.map(({ v, s }) => <td key={v.id} className="px-4 py-3 font-semibold">{fmt(s.service)}</td>)}
              </tr>
              <tr className={ROW}>
                <th scope="row" className={TH}>Taxes</th>
                {cols.map(({ v, s }) => <td key={v.id} className="px-4 py-3 font-semibold">{fmt(s.taxes)}</td>)}
              </tr>
              <tr className={ROW}>
                <th scope="row" className={TH}>Contingency</th>
                {cols.map(({ v, s }) => <td key={v.id} className="px-4 py-3 font-semibold">{fmt(s.contingency)}</td>)}
              </tr>
              <tr className={ROW}>
                <th scope="row" className="px-4 py-4"><span className="sr-only">Actions</span></th>
                {cols.map(({ v }) => (
                  <td key={v.id} className="px-4 py-4">
                    <button onClick={() => onOpen(v.id)} className={`flex items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>
                      Open scenario <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <dl className="grid gap-x-8 gap-y-2 rounded-2xl bg-[color-mix(in_srgb,var(--sage)_16%,var(--paper))] px-5 py-4 text-sm sm:grid-cols-2 sm:px-6">
        <div><dt className="inline font-semibold">Included</dt> <dd className="inline text-ink-2">— covered by another price or the quote, so no extra cost.</dd></div>
        <div><dt className="inline font-semibold">Not required</dt> <dd className="inline text-ink-2">— this venue doesn&apos;t need it.</dd></div>
        <div><dt className="inline font-semibold text-wine">Unknown</dt> <dd className="inline text-ink-2">— still to find out. The total is a minimum until it&apos;s filled in.</dd></div>
        <div><dt className="inline font-semibold">$0</dt> <dd className="inline text-ink-2">— confirmed to cost nothing.</dd></div>
      </dl>

      <p className="text-sm text-ink-2">
        Ready to decide?{" "}
        <Link href="/decide/venue" className={`rounded font-semibold text-green underline underline-offset-2 ${FOCUS_RING}`}>Take it to Decide Together →</Link>
      </p>
    </section>
  );
}
