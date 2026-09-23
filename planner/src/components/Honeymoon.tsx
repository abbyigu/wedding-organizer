"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import DestinationDialog from "@/components/DestinationDialog";
import HoneymoonPlan from "@/components/HoneymoonPlan";
import { VendorPhoto } from "@/components/VendorCard";
import { useConfirm } from "@/components/ConfirmProvider";
import { BTN, BTN_PRIMARY, FOCUS_RING } from "@/components/VendorUi";
import { createClient } from "@/lib/supabase/client";
import { photoSrc, fmtMoney } from "@/lib/vendors";
import type { IdeaImage } from "@/lib/registry";
import type { PlanningTask } from "@/lib/planning-tasks";
import type { Destination, HoneymoonItem, HoneymoonSettings } from "@/lib/honeymoon";

type Tab = "dream" | "plan";

export default function Honeymoon({
  initialDestinations,
  initialItems,
  initialSettings,
  ideas,
  decision,
  contributions,
  hasFund,
  giftAmountMissing,
  initialTasks,
  needsMigration,
}: {
  initialDestinations: Destination[];
  initialItems: HoneymoonItem[];
  initialSettings: HoneymoonSettings;
  ideas: IdeaImage[];
  decision: { id: string; finalDestinationId: string | null } | null;
  contributions: number;
  hasFund: boolean;
  giftAmountMissing: boolean;
  initialTasks: PlanningTask[];
  needsMigration: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const supabase = useMemo(() => createClient(), []);
  const [dests, setDests] = useState(initialDestinations);
  const chosen = dests.find((d) => d.is_selected) ?? null;
  const [tab, setTab] = useState<Tab>(chosen ? "plan" : "dream");
  const [dialog, setDialog] = useState<{ d?: Destination } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ideaMap = useMemo(() => new Map(ideas.map((i) => [i.id, i])), [ideas]);

  async function choose(id: string | null) {
    setError("");
    const clear = await supabase.from("honeymoon_destinations").update({ is_selected: false }).eq("is_selected", true);
    if (clear.error) return setError(clear.error.message);
    if (id) {
      const { error: err } = await supabase.from("honeymoon_destinations").update({ is_selected: true }).eq("id", id);
      if (err) return setError(err.message);
    }
    setDests((cur) => cur.map((d) => ({ ...d, is_selected: d.id === id })));
    if (id) setTab("plan");
  }

  async function react(d: Destination, who: "ariel" | "fred") {
    const key = `${who}_reaction` as const;
    const next = d[key] === "love" ? null : "love";
    setDests((cur) => cur.map((x) => (x.id === d.id ? { ...x, [key]: next } : x)));
    await supabase.from("honeymoon_destinations").update({ [key]: next }).eq("id", d.id);
  }

  async function remove(d: Destination) {
    if (!(await confirm(`Remove ${d.name} from the shortlist?`, "Remove"))) return;
    setDests((cur) => cur.filter((x) => x.id !== d.id));
    await supabase.from("honeymoon_destinations").delete().eq("id", d.id);
  }

  // The shortlist becomes a decision. Each option points back at its destination, so nothing is copied twice.
  async function startDecision() {
    setBusy(true);
    setError("");
    const { data: dec, error: err } = await supabase.from("decisions").insert({ title: "Where should we honeymoon?", category: "Honeymoon", option_type: "visual" }).select("id").single();
    if (err || !dec) {
      setBusy(false);
      return setError(err?.message ?? "Couldn't start the decision.");
    }
    const rows = dests.map((d, i) => ({ decision_id: dec.id, label: d.name, image_url: photoSrc(d.photo, ideaMap), notes: [d.country, d.est_cost != null ? `About ${fmtMoney(d.est_cost)}` : "", d.best_season && `Best in ${d.best_season}`, d.pros].filter(Boolean).join(" · "), sort_order: i }));
    const { data: opts, error: optErr } = await supabase.from("decision_options").insert(rows).select("id, sort_order");
    if (optErr || !opts) {
      setBusy(false);
      return setError(optErr?.message ?? "Couldn't add the options.");
    }
    await Promise.all(opts.map((o) => supabase.from("honeymoon_destinations").update({ decision_option_id: o.id }).eq("id", dests[o.sort_order].id)));
    router.push(`/decide/${dec.id}`);
  }

  const decided = decision?.finalDestinationId ? dests.find((d) => d.id === decision.finalDestinationId) : null;

  return (
    <div>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-2">After the wedding</p>
        <h1 className="mt-2 font-serif text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">Honeymoon</h1>
        <p className="mt-3 max-w-lg font-script text-2xl leading-snug text-ink-2">Somewhere for just the two of us.</p>
      </header>

      {needsMigration && <p role="status" className="mt-6 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] px-5 py-4 text-sm">The Honeymoon Planner needs one small database update (migration 051). Once it&apos;s run, this page comes alive.</p>}

      <div role="group" aria-label="Honeymoon phase" className="mt-6 flex flex-wrap gap-2">
        {([["dream", "Dream & decide"], ["plan", "Plan our trip"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`min-h-11 rounded-full border px-5 text-sm font-medium ${tab === k ? "border-surface-green bg-surface-green text-white" : "border-line bg-paper hover:border-sage-deep"} ${FOCUS_RING}`}>{label}</button>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-wine">{error}</p>}

      {tab === "dream" ? (
        <section aria-label="Dream and decide" className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-3xl font-light">Where could we go?</h2>
              <p className="text-ink-2">A shortlist of places. Add what you know; leave the rest blank.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {dests.length >= 2 && !decision && <button onClick={startDecision} disabled={busy} className={BTN}><Scale className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />{busy ? "Starting…" : "Decide together"}</button>}
              {decision && <Link href={`/decide/${decision.id}`} className={BTN}><Scale className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />Open the decision</Link>}
              <button onClick={() => setDialog({})} disabled={needsMigration} className={BTN_PRIMARY}><Plus className="h-4 w-4" strokeWidth={2} aria-hidden />Add a destination</button>
            </div>
          </div>

          {decided && !decided.is_selected && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-wine/25 bg-[color-mix(in_srgb,var(--wine)_6%,var(--paper))] px-5 py-4">
              <p><b>{decided.name}</b> won in Decide Together.</p>
              <button onClick={() => choose(decided.id)} className={BTN_PRIMARY}>Make it our destination</button>
            </div>
          )}

          {dests.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
              <p className="font-serif text-3xl font-light">Start a shortlist</p>
              <p className="mx-auto mt-2 max-w-md text-ink-2">Add a few places you keep coming back to. When you&apos;re ready, take them to Decide Together, or just choose one.</p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {dests.map((d) => (
                <li key={d.id} className={`flex flex-col overflow-hidden rounded-3xl border bg-paper ${d.is_selected ? "border-wine" : "border-line"}`}>
                  <div className="relative">
                    <VendorPhoto src={photoSrc(d.photo, ideaMap)} className="aspect-[4/3] w-full" />
                    {d.is_selected && <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-paper/95 px-3 py-1.5 text-xs font-semibold text-wine"><Heart className="h-3.5 w-3.5 fill-wine" strokeWidth={1.5} aria-hidden />Our destination</span>}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div>
                      <h3 className="font-serif text-2xl leading-tight">{d.name}</h3>
                      {d.country && <p className="text-sm text-ink-2">{d.country}</p>}
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                      {[["Cost", d.est_cost != null ? fmtMoney(d.est_cost) : "Unknown"], ["Best season", d.best_season || "—"], ["Getting there", d.travel_time || "—"]].map(([k, v]) => (
                        <div key={k}><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">{k}</dt><dd className={v === "Unknown" ? "text-wine" : ""}>{v}</dd></div>
                      ))}
                    </dl>
                    {d.pros && <p className="text-[15px]"><span className="font-medium">Love: </span>{d.pros}</p>}
                    {d.considerations && <p className="text-[15px] text-ink-2"><span className="font-medium text-ink">Consider: </span>{d.considerations}</p>}
                    <div className="flex gap-2" role="group" aria-label={`Who loves ${d.name}`}>
                      {(["ariel", "fred"] as const).map((who) => (
                        <button key={who} onClick={() => react(d, who)} aria-pressed={d[`${who}_reaction`] === "love"} className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm ${d[`${who}_reaction`] === "love" ? "border-wine text-wine" : "border-line text-ink-2"} ${FOCUS_RING}`}>
                          <Heart className={`h-4 w-4 ${d[`${who}_reaction`] === "love" ? "fill-wine" : ""}`} strokeWidth={1.5} aria-hidden />{who === "ariel" ? "Ariel" : "Fred"}
                        </button>
                      ))}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2 pt-1">
                      {d.is_selected ? <button onClick={() => choose(null)} className={BTN}>Not this one after all</button> : <button onClick={() => choose(d.id)} className={BTN_PRIMARY}>Choose this one</button>}
                      <button onClick={() => setDialog({ d })} aria-label={`Edit ${d.name}`} className={BTN}><Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />Edit</button>
                      <button onClick={() => remove(d)} aria-label={`Remove ${d.name}`} className={BTN}><Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : chosen ? (
        <HoneymoonPlan destination={chosen} initialSettings={initialSettings} initialItems={initialItems} contributions={contributions} hasFund={hasFund} giftAmountMissing={giftAmountMissing} initialTasks={initialTasks} onChangeDestination={() => setTab("dream")} />
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-serif text-3xl font-light">Choose where first</p>
          <p className="mx-auto mt-2 max-w-md text-ink-2">Once you&apos;ve picked a destination, this is where flights, stays, the itinerary, the budget and the packing list live.</p>
          <button onClick={() => setTab("dream")} className={`${BTN_PRIMARY} mx-auto mt-5 px-6`}>Back to the shortlist</button>
        </div>
      )}

      {dialog && <DestinationDialog destination={dialog.d} ideas={ideas} nextSort={dests.length} onClose={() => setDialog(null)} onSaved={(saved) => { setDests((cur) => (dialog.d ? cur.map((x) => (x.id === saved.id ? saved : x)) : [...cur, saved])); setDialog(null); }} />}
    </div>
  );
}
