"use client";

import { useMemo, useState } from "react";
import { Camera, ChevronDown } from "lucide-react";
import { BTN, BTN_PRIMARY, FIELD } from "@/components/VendorUi";
import { createClient } from "@/lib/supabase/client";
import { explainDifference, money, snapshotOf, type ScenarioResult, type SnapshotRow } from "@/lib/wedding-scenarios";

// A snapshot freezes the selections, prices, total and gaps as they were. Later price changes never touch it.
export default function ScenarioSnapshots({ scenarioId, current, initial, needsMigration }: { scenarioId: string; current: ScenarioResult; initial: SnapshotRow[]; needsMigration: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initial);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.from("scenario_snapshots").insert({ scenario_id: scenarioId, name: name.trim(), note: note.trim(), data: snapshotOf(current) }).select("*").single();
    setBusy(false);
    if (err || !data) return setError(err?.message ?? "Couldn't save the snapshot.");
    setRows((cur) => [data as SnapshotRow, ...cur]);
    setNaming(false);
    setNote("");
  }

  async function remove(id: string) {
    const { error: err } = await supabase.from("scenario_snapshots").delete().eq("id", id);
    if (err) return setError(err.message);
    setRows((cur) => cur.filter((r) => r.id !== id));
  }

  const suggested = `${new Date().toLocaleDateString("en-CA", { month: "long", year: "numeric" })} estimate`;

  return (
    <section id="snapshots" aria-labelledby="snap-h" className="scroll-mt-4 rounded-3xl border border-line bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="snap-h" className="font-serif text-2xl font-light">Snapshots</h3>
          <p className="text-sm text-ink-2">Save where this scenario stands today. Later price changes won&apos;t alter it.</p>
        </div>
        {!naming && !needsMigration && (
          <button onClick={() => { setName(suggested); setNaming(true); }} className={BTN}>
            <Camera className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Save snapshot
          </button>
        )}
      </div>

      {needsMigration && <p role="status" className="mt-3 rounded-xl bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] px-4 py-3 text-sm">Snapshots need one more small database update (migration 048).</p>}

      {naming && (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="mt-4 grid gap-3 rounded-2xl border border-line bg-bg p-4">
          <div>
            <label htmlFor="snap-name" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Name</label>
            <input id="snap-name" required value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
          </div>
          <div>
            <label htmlFor="snap-note" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Note <span className="font-normal normal-case">(optional)</span></label>
            <input id="snap-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why now?" className={FIELD} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setNaming(false)} className={BTN}>Cancel</button>
            <button type="submit" disabled={busy || !name.trim()} className={BTN_PRIMARY}>{busy ? "Saving…" : "Save snapshot"}</button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-wine">{error}</p>}

      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-line">
          {rows.map((s) => {
            const d = explainDifference({ lines: s.data.lines, contingency: s.data.contingency, projected: s.data.projected }, current);
            const isOpen = openId === s.id;
            return (
              <li key={s.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-ink-2">
                      {new Date(s.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      {s.data.venueName ? ` · ${s.data.venueName}` : ""}
                      {` · ${s.data.confidence.pct}% confirmed`}
                      {s.data.unknownCount > 0 ? ` · ${s.data.unknownCount} unknown` : ""}
                    </p>
                    {s.note && <p className="text-sm text-ink-2">{s.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-2xl font-light">{s.data.unknownCount > 0 && <span className="text-ink-2">≥ </span>}{money(s.data.projected)}</p>
                    <p className={`text-sm ${Math.abs(d.delta) < 1 ? "text-ink-2" : d.delta > 0 ? "text-wine" : "text-sage-deep"}`}>
                      {Math.abs(d.delta) < 1 ? "Same as now" : `Now ${d.delta > 0 ? "+" : "−"}${money(Math.abs(d.delta))}`}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => setOpenId(isOpen ? null : s.id)} aria-expanded={isOpen} className={BTN}>
                    What changed since <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.75} aria-hidden />
                  </button>
                  <button onClick={() => remove(s.id)} aria-label={`Delete snapshot ${s.name}`} className={BTN}>Delete</button>
                </div>
                {isOpen && (
                  <ul className="mt-2 divide-y divide-line rounded-2xl bg-bg px-4">
                    {d.reasons.map((x) => (
                      <li key={x.label} className="flex items-baseline justify-between gap-4 py-2">
                        <span><span className="font-medium">{x.label}</span><span className="block text-sm text-ink-2">{x.detail}</span></span>
                        <span className={`shrink-0 font-medium tabular-nums ${x.delta > 0 ? "text-wine" : "text-sage-deep"}`}>{x.delta > 0 ? "+" : "−"}{money(Math.abs(x.delta))}</span>
                      </li>
                    ))}
                    {d.reasons.length === 0 && <li className="py-2 text-ink-2">Nothing has changed since this snapshot.</li>}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
