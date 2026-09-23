"use client";

import Link from "next/link";
import { AlertTriangle, CircleHelp } from "lucide-react";
import { FOCUS_RING } from "@/components/VendorUi";
import { money, SUMMARY_GROUPS, type ScenarioResult } from "@/lib/wedding-scenarios";

export default function ScenarioSummary({ name, r, onJump }: { name: string; r: ScenarioResult; onJump: (categoryKey: string) => void }) {
  const c = r.confidence;
  const rows: [string, number][] = [...SUMMARY_GROUPS.map((g) => [g, r.groups[g]] as [string, number]), ["Contingency", r.contingency]];
  const top = Math.max(...rows.map(([, v]) => v), 1);
  const unknown = r.missing.filter((m) => m.kind === "unknown");
  const warnings = r.missing.filter((m) => m.kind === "warning");
  const over = r.remaining < 0;

  const link = (m: (typeof r.missing)[number]) =>
    m.href.startsWith("#cat-") ? (
      <button type="button" onClick={() => onJump(m.href.slice(5))} className={`rounded text-left underline-offset-2 hover:underline ${FOCUS_RING}`}>{m.text}</button>
    ) : (
      <Link href={m.href} className={`rounded underline-offset-2 hover:underline ${FOCUS_RING}`}>{m.text}</Link>
    );

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Scenario summary" className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-2">{name}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-2">Projected wedding total</p>
        <p className="font-serif text-5xl font-light leading-none tracking-[-0.02em]" aria-live="polite">
          {r.unknownCount > 0 && <span className="text-ink-2">≥ </span>}
          {money(r.projected)}
        </p>
        <p className="mt-1 text-ink-2">{money(r.perGuest)} per invited guest</p>
        {r.unknownCount > 0 && <p className="mt-1 text-sm text-wine">A minimum. {r.unknownCount} cost{r.unknownCount === 1 ? " is" : "s are"} still unknown.</p>}

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">Target budget</dt>
            <dd className="font-serif text-2xl font-light">{money(r.setup.target)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">{over ? "Over by" : "Remaining"}</dt>
            <dd className={`font-serif text-2xl font-light ${over ? "text-wine" : "text-sage-deep"}`}>{money(Math.abs(r.remaining))}</dd>
          </div>
        </dl>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-2">Where it goes</h3>
        <ul className="mt-2 flex flex-col gap-2.5">
          {rows.map(([label, value]) => (
            <li key={label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={value === 0 ? "text-ink-2" : ""}>{label}</span>
                <span className="tabular-nums">{money(value)}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--gold)_18%,var(--line))]" aria-hidden>
                <div className={label === "Contingency" ? "h-full bg-gold" : "h-full bg-sage-deep"} style={{ width: `${(value / top) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Pricing confidence" className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-2">Pricing confidence</h3>
        <p className="mt-2 font-serif text-3xl font-light leading-tight">
          {c.confirmed + c.estimated > 0 ? `${c.pct}%` : "No prices yet"}
          {c.confirmed + c.estimated > 0 && <span className="ml-2 font-sans text-base text-ink-2">based on confirmed pricing</span>}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--gold)_22%,var(--line))]" role="img" aria-label={`${c.pct}% of projected spending is confirmed`}>
          <div className="h-full bg-sage-deep" style={{ width: `${c.pct}%` }} />
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink-2">
          <li><span className="font-medium text-ink">{r.unknownCount}</span> still unknown</li>
          <li><span className="font-medium text-ink">{c.estimateCount}</span> estimate{c.estimateCount === 1 ? "" : "s"} only</li>
          <li><span className="font-medium text-ink">{c.quoteCount}</span> confirmed quote{c.quoteCount === 1 ? "" : "s"}</li>
          <li><span className="font-medium text-ink">{c.contractedCount}</span> contracted</li>
        </ul>
      </section>

      {(unknown.length > 0 || warnings.length > 0) && (
        <section aria-label="Still missing" className="rounded-3xl border border-line bg-[color-mix(in_srgb,var(--gold)_10%,var(--paper))] p-5 sm:p-6">
          <h3 className="font-serif text-2xl font-light">Still missing</h3>
          {unknown.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {unknown.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-[15px]">
                  <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-wine" strokeWidth={1.75} aria-hidden />
                  {link(m)}
                </li>
              ))}
            </ul>
          )}
          {warnings.length > 0 && (
            <>
              <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-2">Worth checking</h4>
              <ul className="mt-2 flex flex-col gap-2">
                {warnings.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-wine" strokeWidth={1.75} aria-hidden />
                    {link(m)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
