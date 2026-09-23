"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { FOCUS_RING } from "@/components/VendorUi";
import { COMPARE_ROWS, computeScenario, explainDifference, feeTotals, money, rowCells, type ChoiceRow, type RowCell, type ScenarioRow, type World } from "@/lib/wedding-scenarios";

const MIN = 2;
const MAX = 4;

function Cell({ c }: { c: RowCell }) {
  if (c.kind === "amount") return <span className="font-medium tabular-nums">{money(c.base)}{c.partial && <span className="block text-xs font-normal text-wine">+ some unknown</span>}</span>;
  const text = { none: "Not added", unknown: "Unknown", included: "Included", na: "Not required", zero: "$0" }[c.kind];
  return <span className={`text-sm ${c.kind === "unknown" ? "font-medium text-wine" : c.kind === "included" ? "text-sage-deep" : "text-ink-2"}`}>{text}</span>;
}

export default function WeddingScenarioCompare({ world, scenarios, choices, photoUrls, initialIds }: { world: World; scenarios: ScenarioRow[]; choices: ChoiceRow[]; photoUrls: Record<string, string>; initialIds: string[] }) {
  const router = useRouter();
  const [ids, setIds] = useState(() => initialIds.filter((id) => scenarios.some((s) => s.id === id)).slice(0, MAX));
  const [baseId, setBaseId] = useState<string | null>(null);

  const cols = useMemo(
    () => ids.map((id) => scenarios.find((s) => s.id === id)).filter((s): s is ScenarioRow => Boolean(s)).map((s) => ({ s, r: computeScenario(s, choices, world) })),
    [ids, scenarios, choices, world],
  );
  const sync = (next: string[]) => {
    setIds(next);
    router.replace(next.length ? `/budget/scenarios/compare?ids=${next.join(",")}` : "/budget/scenarios/compare", { scroll: false });
  };
  const toggle = (id: string) => sync(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX ? ids : [...ids, id]);

  const grid = { gridTemplateColumns: `repeat(${Math.max(cols.length, 1)}, minmax(15rem, 1fr))` };
  const lowest = cols.length > 1 ? Math.min(...cols.map((c) => c.r.projected)) : null;
  const base = cols.find((c) => c.s.id === baseId) ?? cols[0];
  const cells = cols.map((c) => rowCells(c.r));
  const fees = cols.map((c) => feeTotals(c.r));

  const band = (label: string, cell: (i: number) => React.ReactNode) => (
    <section key={label} className="mt-5 border-t border-line pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-2">{label}</h3>
      <div className="mt-2 grid gap-x-6 gap-y-3" style={grid}>
        {cols.map((c, i) => (
          <div key={c.s.id} className="text-[15px]">
            <span className="sr-only">{c.s.name}: </span>
            {cell(i)}
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div>
      <Link href="/budget/scenarios" className={`inline-flex min-h-11 items-center gap-1.5 rounded text-sm text-ink-2 hover:text-ink ${FOCUS_RING}`}>
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden /> All scenarios
      </Link>
      <header className="mt-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-2">Side by side</p>
        <h2 className="mt-2 font-serif text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl">Compare scenarios</h2>
        <p className="mt-2 text-ink-2">Pick {MIN} to {MAX}. Every number comes from the same records the scenarios use.</p>
      </header>

      <div role="group" aria-label="Scenarios to compare" className="mt-5 flex flex-wrap gap-2">
        {scenarios.map((s) => {
          const on = ids.includes(s.id);
          return (
            <button key={s.id} onClick={() => toggle(s.id)} aria-pressed={on} disabled={!on && ids.length >= MAX} className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium disabled:opacity-40 ${on ? "border-surface-green bg-surface-green text-white" : "border-line bg-paper hover:border-sage-deep"} ${FOCUS_RING}`}>
              {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
              {s.name}
            </button>
          );
        })}
        {scenarios.length === 0 && <p className="text-ink-2">No scenarios yet. <Link href="/budget/scenarios" className={`rounded font-medium text-green underline ${FOCUS_RING}`}>Build one first</Link>.</p>}
      </div>

      {cols.length < MIN ? (
        <p className="mt-8 rounded-3xl border border-dashed border-line px-6 py-12 text-center text-ink-2">Pick at least {MIN} scenarios to see them side by side.</p>
      ) : (
        <div className="mt-8 overflow-x-auto pb-4">
          <div className="min-w-min">
            <div className="grid gap-x-6" style={grid}>
              {cols.map(({ s, r }) => {
                const cover = r.venue?.photos[0]?.path ? photoUrls[r.venue.photos[0].path] : "";
                return (
                  <div key={s.id}>
                    <Link href={`/budget/scenarios/${s.id}`} className={`block rounded-2xl ${FOCUS_RING}`}>
                      <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {cover ? <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span aria-hidden className="absolute inset-0 flex items-center justify-center px-3 text-center font-script text-2xl text-sage-deep/70">{r.venue?.name ?? "Venue still to choose"}</span>}
                      </span>
                      <span className="mt-3 block font-serif text-2xl leading-tight">{s.name}</span>
                    </Link>
                    <p className="text-sm text-ink-2">{r.venue?.name ?? "No venue yet"}</p>
                    <p className="mt-2 font-serif text-4xl font-light leading-none">{r.unknownCount > 0 && <span className="text-ink-2">≥ </span>}{money(r.projected)}</p>
                    <p className="text-sm text-ink-2">{money(r.perGuest)} per invited guest</p>
                    <p className="mt-1 text-sm text-ink-2">{r.confidence.confirmed + r.confidence.estimated > 0 ? `${r.confidence.pct}% confirmed pricing` : "No prices yet"}</p>
                    {r.unknownCount > 0 && <p className="text-sm font-medium text-wine">{r.unknownCount} unknown cost{r.unknownCount === 1 ? "" : "s"}</p>}
                  </div>
                );
              })}
            </div>

            {band("Guests priced", (i) => `${cols[i].r.setup.adults} adults, ${cols[i].r.setup.kids} children`)}
            {COMPARE_ROWS.map((row) => band(row.label, (i) => <Cell c={cells[i][row.key]} />))}
            {band("Service charges", (i) => <span className="tabular-nums">{money(fees[i].service)}</span>)}
            {band("Taxes", (i) => <span className="tabular-nums">{money(fees[i].tax)}</span>)}
            {band("Contingency", (i) => <span className="tabular-nums">{money(cols[i].r.contingency)}{" "}<span className="text-sm text-ink-2">({cols[i].r.setup.contPct}%)</span></span>)}
            {band("Projected total", (i) => {
              const r = cols[i].r;
              return (
                <>
                  <span className={`font-serif text-3xl font-light ${lowest === r.projected ? "text-sage-deep" : ""}`}>{r.unknownCount > 0 ? "≥ " : ""}{money(r.projected)}</span>
                  {lowest === r.projected && <span className="block text-sm font-medium text-sage-deep">{r.unknownCount > 0 ? "Lowest so far, not complete" : "Lowest total"}</span>}
                  <span className={`block text-sm ${r.remaining < 0 ? "text-wine" : "text-ink-2"}`}>{r.remaining < 0 ? `${money(-r.remaining)} over` : `${money(r.remaining)} under`} the {money(r.setup.target)} target</span>
                </>
              );
            })}
          </div>
        </div>
      )}

      {cols.length >= MIN && base && (
        <section aria-labelledby="whatsdiff" className="mt-8 rounded-3xl border border-line bg-[color-mix(in_srgb,var(--gold)_10%,var(--paper))] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 id="whatsdiff" className="font-serif text-3xl font-light">What&apos;s different?</h3>
            <div>
              <label htmlFor="cmp-base" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Measured against</label>
              <select id="cmp-base" value={base.s.id} onChange={(e) => setBaseId(e.target.value)} className="mt-1 block h-11 rounded-lg border border-line bg-bg px-3 text-sm">
                {cols.map((c) => <option key={c.s.id} value={c.s.id}>{c.s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {cols.filter((c) => c.s.id !== base.s.id).map((c) => {
              const d = explainDifference(base.r, c.r);
              return (
                <div key={c.s.id}>
                  <p className="text-ink-2">{base.s.name} <span aria-hidden>→</span><span className="sr-only">to</span> {c.s.name}</p>
                  <p className="font-serif text-3xl font-light">{Math.abs(d.delta) < 1 ? "Same total" : `${d.delta > 0 ? "+" : "−"}${money(Math.abs(d.delta))}`}</p>
                  {d.incomplete && <p className="text-sm text-wine">Some costs are still unknown, so this is only the difference in what&apos;s priced.</p>}
                  <ul className="mt-2 divide-y divide-line">
                    {d.reasons.map((x) => (
                      <li key={x.label} className="flex items-baseline justify-between gap-4 py-2">
                        <span><span className="font-medium">{x.label}</span><span className="block text-sm text-ink-2">{x.detail}</span></span>
                        <span className={`shrink-0 font-medium tabular-nums ${x.delta > 0 ? "text-wine" : "text-sage-deep"}`}>{x.delta > 0 ? "+" : "−"}{money(Math.abs(x.delta))}</span>
                      </li>
                    ))}
                    {d.reasons.length === 0 && <li className="py-2 text-ink-2">Nothing differs.</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
