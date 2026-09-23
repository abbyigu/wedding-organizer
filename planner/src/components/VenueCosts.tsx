"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { BUDGET_CEILING, fmt, GENERIC_LINES, SHARED_LINES, type Assumptions, type BudgetLine, type LineState, type Venue } from "@/lib/venues";
import { expenseAppliesTo, expenseTotal, linkedTotalFor, type BudgetExpense, type LinkedCost } from "@/lib/budget-extras";
import { BUCKETS, BUCKET_LABEL, LINE_STATE_LABEL, scenarioOf } from "@/lib/budget-scenarios";
import { CellView } from "@/components/ScenarioCompare";

const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-sage-deep";
const PANEL = "rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6";

export default function VenueCosts({
  v,
  assumptions,
  sharedVals,
  expenses,
  linked,
  update,
}: {
  v: Venue;
  assumptions: Assumptions;
  sharedVals: number[];
  expenses: BudgetExpense[];
  linked: LinkedCost[];
  update: (patch: Partial<Venue>, wait?: number) => void;
}) {
  const s = scenarioOf(v, assumptions, sharedVals, expenses, linkedTotalFor(linked, v.id));
  const left = BUDGET_CEILING - s.grand;
  const shared = [
    ...SHARED_LINES.map(([label, amount], i) => ({ label, amount: sharedVals[i] ?? amount })),
    ...expenses
      .filter((e) => e.category !== "Venue & catering" && expenseAppliesTo(e, v.id))
      .map((e) => ({ label: e.label, amount: expenseTotal(e, assumptions.adults, assumptions.kids, assumptions.svcPct, false) })),
  ];
  const balance = (v.contracted_total ?? v.quoted_total ?? 0) - v.deposit_amount;
  const num = (raw: string) => (raw === "" ? null : Number(raw));

  // The same budget_lines the Budget Builder edits: change one here and the scenario, Compare and Budget follow.
  const lines: BudgetLine[] = v.budget_lines.length ? v.budget_lines : GENERIC_LINES;
  const saveLines = (next: BudgetLine[], wait = 800) => update({ budget_lines: next }, wait);
  function patchLine(i: number, patch: { label?: string; rate?: number; unit?: BudgetLine[2]; state?: LineState | "priced" }, wait = 800) {
    saveLines(
      lines.map((l, j) => {
        if (j !== i) return l;
        const state = patch.state === undefined ? l[4] : patch.state === "priced" ? undefined : patch.state;
        const next: BudgetLine = [patch.label ?? l[0], patch.rate ?? l[1], patch.unit ?? l[2], l[3] ?? null];
        if (state) next.push(state);
        return next;
      }),
      wait,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={PANEL} aria-label="Venue costs">
        <h2 className="font-serif text-2xl font-medium">What this venue charges</h2>
        <p className="text-sm text-ink-2">Enter what you learn here. The budget works out totals from your guest count ({assumptions.adults} adults, {assumptions.kids} children), so you never enter it twice.</p>
        {(v.quoted_total != null || v.contracted_total != null) && (
          <p className="mt-2 rounded-lg bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] px-3 py-2 text-sm">A {v.contracted_total != null ? "contracted" : "quoted"} total is set, so the estimate uses that one number instead of the lines below. Clear it in Quick overview to price line by line.</p>
        )}
        <ul className="mt-4 flex flex-col gap-3">
          {lines.map((l, i) => (
            <li key={`${i}-${l[0]}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1.4fr)_9rem_6rem_8rem_auto]">
              <input aria-label="Cost name" value={l[0]} onChange={(e) => patchLine(i, { label: e.target.value })} className={`${FIELD} mt-0`} />
              <select aria-label={`${l[0]} status`} value={l[4] ?? "priced"} onChange={(e) => patchLine(i, { state: e.target.value as LineState | "priced" }, 0)} className={`${FIELD} mt-0`}>
                <option value="priced">Priced</option>
                {(Object.keys(LINE_STATE_LABEL) as LineState[]).map((k) => <option key={k} value={k}>{LINE_STATE_LABEL[k]}</option>)}
              </select>
              {l[4] ? <span className="hidden sm:col-span-2 sm:block" /> : (
                <>
                  <input aria-label={`${l[0]} price`} type="number" min={0} value={l[1]} onChange={(e) => patchLine(i, { rate: Number(e.target.value) || 0 })} className={`${FIELD} mt-0`} />
                  <select aria-label={`${l[0]} unit`} value={l[2]} onChange={(e) => patchLine(i, { unit: e.target.value as BudgetLine[2] }, 0)} className={`${FIELD} mt-0`}>
                    <option value="flat">flat</option><option value="adult">per adult</option><option value="kid">per child</option><option value="adult+kid">per guest</option>
                  </select>
                </>
              )}
              <button onClick={() => saveLines(lines.filter((_, j) => j !== i), 0)} aria-label={`Remove ${l[0]}`} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:text-wine"><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
            </li>
          ))}
        </ul>
        <button onClick={() => saveLines([...lines, ["New cost", 0, "flat", null, "unknown"]], 0)} className="mt-4 flex items-center gap-1.5 rounded-full border border-ink/25 px-5 py-2.5 text-sm font-semibold hover:bg-bg"><Plus className="h-4 w-4" aria-hidden />Add a cost</button>
        <p className="mt-3 text-xs text-ink-2">Service charge ({assumptions.svcPct}%) and taxes are added from the budget settings, shared by every venue. Set them in the <Link href={`/budget/builder?venue=${v.id}`} className="font-semibold text-green underline underline-offset-2">budget builder</Link>.</p>
      </section>

      <section className={PANEL} aria-label="If we choose this venue">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-wine">If we choose {v.name}</p>
        <div className="mt-3 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          <div className="bg-paper p-4"><p className="font-serif text-3xl font-medium">{s.unknownCount > 0 ? "≥ " : ""}{fmt(s.grand)}</p><p className="text-ink-2">Projected wedding total</p></div>
          <div className="bg-paper p-4"><p className="font-serif text-3xl font-medium">{fmt(s.perGuest)}</p><p className="text-ink-2">Per guest</p></div>
          <div className="bg-paper p-4"><p className={`font-serif text-3xl font-medium ${left < 0 ? "text-wine" : ""}`}>{fmt(Math.abs(left))}</p><p className="text-ink-2">{left < 0 ? "Over budget" : "Budget remaining"}</p></div>
        </div>
        {s.unknownCount > 0 && <p className="mt-3 text-sm text-wine">{s.unknownCount} cost{s.unknownCount === 1 ? " is" : "s are"} still unknown, so this is a minimum.</p>}
        <p className="mt-2 text-sm text-ink-2">Venue scenario + shared wedding costs + DIY, events &amp; wedding party + contingency. Read from the same budget as everywhere else.</p>
        <Link href={`/budget/builder?venue=${v.id}`} className="mt-3 inline-block rounded text-sm font-semibold text-green underline underline-offset-2">Edit breakdown in the budget builder →</Link>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className={PANEL} aria-label="Venue-specific costs">
          <h2 className="font-serif text-2xl font-medium">Costs that change with this venue</h2>
          <dl className="mt-4 divide-y divide-line">
            {BUCKETS.filter((b) => b !== "shared" && b !== "linked").map((b) => (
              <div key={b} className="flex items-baseline justify-between gap-3 py-2.5"><dt className="text-sm">{BUCKET_LABEL[b]}</dt><dd className="font-semibold"><CellView cell={s.cells[b]} /></dd></div>
            ))}
            <div className="flex items-baseline justify-between gap-3 py-2.5"><dt className="text-sm">Service charges</dt><dd className="font-semibold">{fmt(s.service)}</dd></div>
            <div className="flex items-baseline justify-between gap-3 py-2.5"><dt className="text-sm">Taxes</dt><dd className="font-semibold">{fmt(s.taxes)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-ink-2">Included = covered by another price. Not required = this venue doesn&apos;t need it. Unknown = still to find out. $0 = confirmed free.</p>
        </section>

        <section className={PANEL} aria-label="Shared wedding costs">
          <h2 className="font-serif text-2xl font-medium">Shared wedding costs</h2>
          <p className="text-sm text-ink-2">The same for every venue. Entered once in the budget.</p>
          <ul className="mt-4 divide-y divide-line">
            {shared.map((x, i) => (
              <li key={`${x.label}-${i}`} className="flex items-baseline justify-between gap-3 py-2 text-sm"><span className="min-w-0">{x.label}</span><span className="shrink-0 font-semibold">{fmt(x.amount)}</span></li>
            ))}
            {linked.map((l, i) => (
              <li key={`${l.label}-${i}`} className="flex items-baseline justify-between gap-3 py-2 text-sm"><Link href={l.href} className="min-w-0 underline-offset-2 hover:underline">{l.label} <span className="text-xs text-ink-2">· {l.source}</span></Link><span className="shrink-0 font-semibold">{fmt(l.amount)}</span></li>
            ))}
            <li className="flex items-baseline justify-between gap-3 py-2 text-sm"><span>Contingency ({assumptions.contPct}%)</span><span className="font-semibold">{fmt(s.contingency)}</span></li>
          </ul>
        </section>
      </div>

      <section className={PANEL} aria-label="Deposit and balance">
        <h2 className="font-serif text-2xl font-medium">Payments to the venue</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div><label htmlFor="vc-dep" className="text-sm font-semibold">Deposit amount</label><input id="vc-dep" type="number" min={0} value={v.deposit_amount || ""} onChange={(e) => update({ deposit_amount: num(e.target.value) ?? 0 })} className={FIELD} /></div>
          <div><label htmlFor="vc-depdue" className="text-sm font-semibold">Deposit due</label><input id="vc-depdue" type="date" value={v.deposit_due ?? ""} onChange={(e) => update({ deposit_due: e.target.value || null }, 0)} className={FIELD} /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={v.deposit_paid} onChange={(e) => update({ deposit_paid: e.target.checked }, 0)} className="h-4 w-4 accent-sage-deep" />Deposit paid</label>
          <div><span className="text-sm font-semibold">Balance <small className="font-normal text-ink-2">(auto)</small></span><p className="mt-1 rounded-lg border border-dashed border-line bg-bg px-3 py-2 text-sm">{balance > 0 ? fmt(balance) : "—"}</p></div>
          <div><label htmlFor="vc-baldue" className="text-sm font-semibold">Balance due</label><input id="vc-baldue" type="date" value={v.balance_due ?? ""} onChange={(e) => update({ balance_due: e.target.value || null }, 0)} className={FIELD} /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={v.balance_paid} onChange={(e) => update({ balance_paid: e.target.checked }, 0)} className="h-4 w-4 accent-sage-deep" />Balance paid</label>
        </div>
      </section>
    </div>
  );
}
