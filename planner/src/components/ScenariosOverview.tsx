"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArchiveRestore, Archive, ArrowRight, Copy, Plus, Scale } from "lucide-react";
import ScenarioDialog, { type ScenarioDialogMode } from "@/components/ScenarioDialog";
import { BTN, BTN_PRIMARY, FOCUS_RING } from "@/components/VendorUi";
import { createClient } from "@/lib/supabase/client";
import { computeScenario, money, setupOf, type ChoiceRow, type ScenarioRow, type World } from "@/lib/wedding-scenarios";

export default function ScenariosOverview({
  world,
  initialScenarios,
  initialChoices,
  photoUrls,
  needsMigration,
}: {
  world: World;
  initialScenarios: ScenarioRow[];
  initialChoices: ChoiceRow[];
  photoUrls: Record<string, string>;
  needsMigration: boolean;
}) {
  const router = useRouter();
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [choices, setChoices] = useState(initialChoices);
  const [dialog, setDialog] = useState<{ mode: ScenarioDialogMode; scenario?: ScenarioRow } | null>(null);
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const togglePick = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? cur : [...cur, id]));

  const results = useMemo(() => new Map(scenarios.map((s) => [s.id, computeScenario(s, choices, world)])), [scenarios, choices, world]);
  const live = scenarios.filter((s) => !s.archived);
  const archived = scenarios.filter((s) => s.archived);
  const blank = useMemo(() => setupOf({ adults: null, kids: null, invited: null, expected: null, target_budget: null, contingency_pct: null } as ScenarioRow, world), [world]);

  async function setArchived(s: ScenarioRow, value: boolean) {
    setError("");
    const { error: err } = await createClient().from("wedding_scenarios").update({ archived: value }).eq("id", s.id);
    if (err) return setError(err.message);
    setScenarios((cur) => cur.map((x) => (x.id === s.id ? { ...x, archived: value } : x)));
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-2">If we built it this way</p>
          <h2 className="mt-2 font-serif text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl">Wedding scenarios</h2>
          <p className="mt-3 max-w-lg font-script text-2xl leading-snug text-ink-2">Build different versions of your wedding and see what each one could really cost.</p>
        </div>
        <button onClick={() => setDialog({ mode: "create" })} disabled={needsMigration} className={`${BTN_PRIMARY} shrink-0 px-6`}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          Build a scenario
        </button>
      </header>

      {needsMigration && (
        <p role="status" className="mt-6 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] px-5 py-4 text-sm">
          Scenarios need one small update to the database first (migration 047). Once it&apos;s run, this page comes alive.
        </p>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-wine">{error}</p>}

      {!needsMigration && live.length === 0 && (
        <div className="mt-10 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-serif text-3xl font-light">Try a version of the day</p>
          <p className="mx-auto mt-2 max-w-md text-ink-2">
            Pick a venue and the vendors you&apos;re considering, and see the whole wedding priced from what you&apos;ve already collected. Nothing is entered twice.
          </p>
          <button onClick={() => setDialog({ mode: "create" })} className={`${BTN_PRIMARY} mx-auto mt-5 px-6`}>Build your first scenario</button>
        </div>
      )}

      {live.length > 0 && (
        <ul className="mt-8 grid gap-6 lg:grid-cols-2">
          {live.map((s) => {
            const r = results.get(s.id)!;
            const cover = r.venue?.photos[0]?.path ? photoUrls[r.venue.photos[0].path] : "";
            const picks = r.lines.filter((l) => l.source === "Vendor" && l.refId).map((l) => l.label);
            const c = r.confidence;
            const hasPrices = c.confirmed + c.estimated > 0;
            const guests = `${r.setup.invited} invited · ${r.setup.expected} expected`;
            return (
              <li key={s.id} className="flex flex-col overflow-hidden rounded-3xl border border-line bg-paper">
                <Link href={`/budget/scenarios/${s.id}`} className={`group relative block aspect-[16/9] overflow-hidden bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))] ${FOCUS_RING}`} aria-label={`Open ${s.name}`}>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                  ) : (
                    <span aria-hidden className="absolute inset-0 flex items-center justify-center font-script text-3xl text-sage-deep/70">{r.venue ? r.venue.name : "Venue still to choose"}</span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <span className="absolute inset-x-5 bottom-4">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">{[s.season, s.wedding_date && new Date(s.wedding_date + "T12:00").toLocaleDateString("en-CA", { month: "long", year: "numeric" })].filter(Boolean).join(" · ") || "Scenario"}</span>
                    <span className="mt-1 block font-serif text-3xl font-light leading-tight text-white sm:text-4xl">{s.name}</span>
                  </span>
                </Link>

                <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                  {(r.venue || s.description) && (
                    <p className="text-ink-2">
                      {r.venue && <span className="font-medium text-ink">{r.venue.name}</span>}
                      {r.venue && s.description && " · "}
                      {s.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Projected total</p>
                      <p className="font-serif text-5xl font-light leading-none">{r.unknownCount > 0 && <span className="text-ink-2">≥ </span>}{money(r.projected)}</p>
                      <p className="mt-1 text-ink-2">{money(r.perGuest)} per invited guest · {guests}</p>
                    </div>
                    <p className={`text-sm ${r.remaining < 0 ? "font-medium text-wine" : "text-ink-2"}`}>
                      {r.remaining < 0 ? `${money(-r.remaining)} over` : `${money(r.remaining)} under`} the {money(r.setup.target)} target
                    </p>
                  </div>

                  <div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--gold)_22%,var(--line))]" role="img" aria-label={hasPrices ? `${c.pct}% of the projected spending is based on confirmed pricing` : "No prices yet"}>
                      <div className="bg-sage-deep" style={{ width: `${c.pct}%` }} />
                    </div>
                    <p className="mt-1.5 text-sm text-ink-2">
                      {hasPrices ? `${c.pct}% based on confirmed pricing` : "No prices in yet"}
                      {r.unknownCount > 0 && <span className="font-medium text-wine"> · {r.unknownCount} unknown cost{r.unknownCount === 1 ? "" : "s"}</span>}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Key selections</p>
                    <p className="mt-1">
                      {picks.length ? picks.slice(0, 4).join(" · ") + (picks.length > 4 ? ` · +${picks.length - 4} more` : "") : <span className="text-ink-2">No vendors chosen yet</span>}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <Link href={`/budget/scenarios/${s.id}`} className={BTN_PRIMARY}>
                      Open <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    </Link>
                    <button onClick={() => setDialog({ mode: "duplicate", scenario: s })} className={BTN}>
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Duplicate
                    </button>
                    <button onClick={() => togglePick(s.id)} aria-pressed={picked.includes(s.id)} className={`${BTN} ${picked.includes(s.id) ? "!border-sage-deep text-sage-deep" : ""}`}>
                      <Scale className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {picked.includes(s.id) ? "Comparing" : "Compare"}
                    </button>
                    <button onClick={() => setArchived(s, true)} className={BTN}>
                      <Archive className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Archive
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="mt-10 border-t border-line pt-5">
          <button onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived} className={`flex min-h-11 items-center gap-2 rounded text-sm font-medium text-ink-2 hover:text-ink ${FOCUS_RING}`}>
            {showArchived ? "Hide" : "Show"} {archived.length} archived
          </button>
          {showArchived && (
            <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-paper">
              {archived.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
                  <span>
                    <span className="font-serif text-xl">{s.name}</span>
                    <span className="ml-2 text-sm text-ink-2">{money(results.get(s.id)!.projected)}</span>
                  </span>
                  <button onClick={() => setArchived(s, false)} className={BTN}>
                    <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="mt-10 text-sm text-ink-2">
        Looking for the venue-by-venue cost comparison? It&apos;s still in the{" "}
        <Link href="/budget/builder" className={`rounded font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Budget builder</Link>.
      </p>

      {picked.length > 0 && (
        <div className="sticky bottom-20 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-3 shadow-sm lg:bottom-4">
          <p className="text-sm">{picked.length === 1 ? "Pick one more to compare." : `${picked.length} scenarios picked.`}</p>
          <div className="flex gap-2">
            <button onClick={() => setPicked([])} className={BTN}>Clear</button>
            {picked.length >= 2 && <Link href={`/budget/scenarios/compare?ids=${picked.join(",")}`} className={BTN_PRIMARY}>Compare {picked.length} <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /></Link>}
          </div>
        </div>
      )}

      {dialog && (
        <ScenarioDialog
          mode={dialog.mode}
          scenario={dialog.scenario}
          choices={dialog.scenario ? choices.filter((c) => c.scenario_id === dialog.scenario!.id) : undefined}
          defaults={blank}
          venues={world.venues.filter((v) => v.status !== "out").map((v) => ({ id: v.id, name: v.name }))}
          nextSort={scenarios.length}
          onClose={() => setDialog(null)}
          onSaved={(row, copied) => {
            setScenarios((cur) => [...cur, row]);
            if (copied?.length) setChoices((cur) => [...cur, ...copied]);
            setDialog(null);
            router.push(`/budget/scenarios/${row.id}`);
          }}
        />
      )}
    </div>
  );
}
