"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { SHARED_LINES, calcVenue, fmt, type Assumptions, type BudgetLine, type Venue } from "@/lib/venues";

function unitLabel(u: BudgetLine[2]) {
  return u === "adult" ? "per adult" : u === "kid" ? "per child" : u === "adult+kid" ? "per guest" : "flat";
}

export default function Budget({ initialVenues, userName }: { initialVenues: Venue[]; userName: string }) {
  const [venues, setVenues] = useState(initialVenues);
  const [curId, setCurId] = useState(initialVenues[0]?.id ?? "");
  const [as, setAs] = useState<Assumptions>({ adults: 80, kids: 15, svcPct: 15, contPct: 8, tax: true });
  const [sharedVals, setSharedVals] = useState(SHARED_LINES.map((l) => l[1]));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const cur = venues.find((v) => v.id === curId) ?? venues[0];

  function updateLine(i: number, value: number) {
    if (!cur) return;
    const lines = cur.budget_lines.map((l, j) => (j === i ? ([l[0], value, l[2], l[3]] as BudgetLine) : l));
    setVenues((vs) => vs.map((v) => (v.id === cur.id ? { ...v, budget_lines: lines } : v)));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      supabase.from("venues").update({ budget_lines: lines }).eq("id", cur.id);
    }, 800);
  }

  if (!cur) {
    return (
      <div className="min-h-screen">
        <NavBar userName={userName} />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <p className="text-ink-2">No venues yet — add some from the dashboard first.</p>
        </div>
      </div>
    );
  }

  const calc = calcVenue(cur, as, sharedVals);
  const share = Math.round((calc.vt / calc.grand) * 100) || 0;
  const verdict =
    calc.grand <= 40000
      ? "On or under target."
      : calc.grand <= 42000
      ? "Inside the comfortable buffer."
      : calc.grand <= 45000
      ? "Under the preferred ceiling, but the surprise money is gone."
      : calc.grand <= 50000
      ? "Above the ceiling — something has to give."
      : "Danger zone.";

  return (
    <div className="min-h-screen">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-serif text-3xl font-medium">Full wedding budget builder</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Pick a venue, set the guest count, and edit any line — every venue keeps its own numbers.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => setCurId(v.id)}
              className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${
                v.id === curId ? "border-green bg-green text-[#F7F3EA]" : "border-line bg-paper text-ink hover:border-sage-deep"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
            {[
              { key: "adults" as const, label: "Adults", min: 60, max: 90 },
              { key: "kids" as const, label: "Children", min: 0, max: 25 },
            ].map((f) => (
              <div key={f.key} className="mb-3">
                <div className="flex justify-between"><label className="font-semibold">{f.label}</label><span className="font-serif text-lg">{as[f.key]}</span></div>
                <input
                  type="range"
                  min={f.min}
                  max={f.max}
                  value={as[f.key]}
                  onChange={(e) => setAs((p) => ({ ...p, [f.key]: +e.target.value }))}
                  className="w-full accent-sage-deep"
                />
              </div>
            ))}
            <div className="mb-3">
              <div className="flex justify-between"><label className="font-semibold">Venue service charge</label><span className="font-serif text-lg">{as.svcPct}%</span></div>
              <input type="range" min={0} max={20} value={as.svcPct} onChange={(e) => setAs((p) => ({ ...p, svcPct: +e.target.value }))} className="w-full accent-sage-deep" />
            </div>
            <div className="mb-3">
              <div className="flex justify-between"><label className="font-semibold">Contingency</label><span className="font-serif text-lg">{as.contPct}%</span></div>
              <input type="range" min={0} max={15} value={as.contPct} onChange={(e) => setAs((p) => ({ ...p, contPct: +e.target.value }))} className="w-full accent-sage-deep" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={as.tax} onChange={(e) => setAs((p) => ({ ...p, tax: e.target.checked }))} className="accent-sage-deep" />
              Apply Québec taxes (14.975%) to all lines
            </label>

            <div className="mt-5 border-t-2 border-gold pt-3">
              <div className="flex justify-between text-sm"><span>Venue, food &amp; bar</span><b>{fmt(calc.vt)}</b></div>
              <div className="flex justify-between text-sm"><span>Vendors &amp; personal</span><b>{fmt(calc.st)}</b></div>
              <div className="flex justify-between text-sm"><span>Contingency</span><b>{fmt(calc.cont)}</b></div>
              <div className="mt-2 flex justify-between border-t border-line pt-2 font-serif text-xl"><span>Estimated total</span><b>{fmt(calc.grand)}</b></div>
              <p className="mt-2 text-sm text-ink-2">{verdict} Venue, food and bar are {share}% of the total.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <h3 className="mb-1 font-semibold">Venue-dependent lines</h3>
            <p className="mb-3 text-sm text-ink-2">{cur.budget_note || "No pricing notes yet."}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-2"><th className="pb-2">Line</th><th className="pb-2">Rate</th><th></th><th className="pb-2 text-right">Total</th></tr>
              </thead>
              <tbody>
                {calc.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2 pr-2">{r.label}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={cur.budget_lines[i][1]}
                        onChange={(e) => updateLine(i, +e.target.value || 0)}
                        className="w-20 rounded border border-line bg-bg px-2 py-1 text-right"
                      />
                    </td>
                    <td className="py-2 pr-2 text-xs text-ink-2">{unitLabel(r.unit)}{r.noSvc ? <br /> : null}{r.noSvc ? "no service charge" : null}</td>
                    <td className="py-2 text-right font-serif">{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="mb-1 mt-6 font-semibold">Shared lines — same at every venue</h3>
            <table className="w-full text-sm">
              <tbody>
                {SHARED_LINES.map(([label, , note], i) => (
                  <tr key={label} className="border-t border-line">
                    <td className="py-2 pr-2">{label}{note && <small className="block text-ink-2">{note}</small>}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={sharedVals[i]}
                        onChange={(e) => setSharedVals((vs) => vs.map((v2, j) => (j === i ? +e.target.value || 0 : v2)))}
                        className="w-20 rounded border border-line bg-bg px-2 py-1 text-right"
                      />
                    </td>
                    <td className="py-2 text-right font-serif">{fmt(sharedVals[i] * (as.tax ? 1.14975 : 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
