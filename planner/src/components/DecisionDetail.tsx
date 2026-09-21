"use client";

import { useConfirm } from "@/components/ConfirmProvider";
import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { Plus, Trash2 } from "lucide-react";
import DecisionOptionsStep from "@/components/DecisionOptionsStep";
import {
  DECISION_CATEGORIES,
  blankScores,
  blankOption,
  fmtScore,
  optionTypeOf,
  type IdeaRef,
  type OptionType,
  type VendorRef,
  type VenueRef,
  type WeddingStyle,
  slugCriterionKey,
  weightedScore,
  type DecisionOption,
  type DecisionVote,
  type GenericDecision,
} from "@/lib/decisions";
import { partnerName } from "@/lib/ideas";

const STEPS = ["Overview", "Criteria", "Options", "Private vote", "Reveal", "Final choice"];

export default function DecisionDetail({
  initialDecision,
  initialOptions,
  initialVotes,
  ideas,
  venueRefs,
  vendorRefs,
  weddingStyle,
  userName,
  userId,
}: {
  initialDecision: GenericDecision;
  initialOptions: DecisionOption[];
  initialVotes: DecisionVote[];
  ideas: IdeaRef[];
  venueRefs: VenueRef[];
  vendorRefs: VendorRef[];
  weddingStyle: WeddingStyle | null;
  userName: string;
  userId: string;
}) {
  const confirm = useConfirm();
  const [decision, setDecision] = useState(initialDecision);
  const [options, setOptions] = useState(initialOptions);
  const [votes, setVotes] = useState(initialVotes);
  const [drafts, setDrafts] = useState<Record<string, Record<string, number>>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [finalOptionId, setFinalOptionId] = useState(decision.final_option_id ?? "");
  const [finalReason, setFinalReason] = useState(decision.final_reason ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [style, setStyle] = useState(weddingStyle);
  const [chosenVenueId, setChosenVenueId] = useState(venueRefs.find((v) => v.isFinal)?.id ?? "");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const decisionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const partner = partnerName(userName || "Ariel");
  const active = options.filter((o) => o.status !== "out");

  function myVoteFor(optionId: string) {
    return votes.find((v) => v.option_id === optionId && v.voter_id === userId);
  }
  function partnerVoteFor(optionId: string) {
    return votes.find((v) => v.option_id === optionId && v.voter_id !== userId);
  }

  function saveDecision(patch: Partial<GenericDecision>) {
    setDecision((d) => ({ ...d, ...patch }));
    if (decisionTimer.current) clearTimeout(decisionTimer.current);
    decisionTimer.current = setTimeout(async () => {
      const { error } = await supabase.from("decisions").update(patch).eq("id", decision.id);
      if (error) setError(error.message);
    }, 600);
  }

  function updateWeight(key: string, weight: number) {
    saveDecision({ criteria: decision.criteria.map((c) => (c.key === key ? { ...c, weight } : c)) });
  }

  function addCriterion() {
    const key = slugCriterionKey("New criterion", decision.criteria.map((c) => c.key));
    saveDecision({ criteria: [...decision.criteria, { key, label: "New criterion", weight: 3 }] });
  }

  function updateCriterionLabel(key: string, label: string) {
    saveDecision({ criteria: decision.criteria.map((c) => (c.key === key ? { ...c, label } : c)) });
  }

  function removeCriterion(key: string) {
    if (decision.criteria.length <= 1) return;
    saveDecision({ criteria: decision.criteria.filter((c) => c.key !== key) });
  }

  async function addOption() {
    const { data, error } = await supabase
      .from("decision_options")
      .insert(blankOption(decision.id, options.length))
      .select()
      .single();
    if (error) setError(error.message);
    else setOptions((os) => [...os, data as DecisionOption]);
  }

  function flashSaved() {
    setSaved("Saved");
    setTimeout(() => setSaved((x) => (x === "Saved" ? "" : x)), 1800);
  }

  function updateOption(id: string, patch: Partial<DecisionOption>) {
    setOptions((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    setSaved("Saving…");
    clearTimeout(timers.current["opt" + id]);
    timers.current["opt" + id] = setTimeout(async () => {
      const { error } = await supabase.from("decision_options").update(patch).eq("id", id);
      if (error) {
        setError(error.message);
        setSaved("");
      } else flashSaved();
    }, 600);
  }

  async function removeOption(id: string) {
    if (!(await confirm("Remove this option?"))) return;
    const { error } = await supabase.from("decision_options").delete().eq("id", id);
    if (error) setError(error.message);
    else setOptions((os) => os.filter((o) => o.id !== id));
  }

  async function duplicateOption(id: string) {
    const src = options.find((o) => o.id === id);
    if (!src) return;
    const { id: _id, created_at, updated_at, ...rest } = src;
    void _id; void created_at; void updated_at;
    const { data, error } = await supabase.from("decision_options").insert({ ...rest, label: `${src.label} (copy)`, sort_order: options.length }).select().single();
    if (error) setError(error.message);
    else setOptions((os) => [...os, data as DecisionOption]);
  }

  async function reorderOptions(ids: string[]) {
    const order = new Map(ids.map((id, i) => [id, i]));
    setOptions((os) => [...os].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).map((o) => ({ ...o, sort_order: order.get(o.id) ?? o.sort_order })));
    setSaved("Saving…");
    const results = await Promise.all(ids.map((id, i) => supabase.from("decision_options").update({ sort_order: i }).eq("id", id)));
    const failed = results.find((r) => r.error);
    if (failed?.error) setError(failed.error.message);
    else flashSaved();
  }

  async function applyWeddingPalette(opt: DecisionOption) {
    const row = { id: true, palette: opt.swatches ?? [], palette_name: opt.label, source_decision_id: decision.id, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("wedding_style").upsert(row, { onConflict: "id" });
    if (error) setError(error.message);
    else setStyle({ palette: row.palette, palette_name: row.palette_name, source_decision_id: decision.id });
  }

  // Same two updates the venue decision uses when a venue is chosen.
  async function chooseVenue(venueId: string) {
    const a = await supabase.from("venues").update({ is_final: false, final_reason: "" }).eq("is_final", true).neq("id", venueId);
    const b = await supabase.from("venues").update({ is_final: true }).eq("id", venueId);
    if (a.error || b.error) setError((a.error ?? b.error)!.message);
    else setChosenVenueId(venueId);
  }

  function updateDraftScore(optionId: string, key: string, value: number) {
    setDrafts((d) => ({ ...d, [optionId]: { ...(d[optionId] ?? blankScores(decision.criteria)), [key]: value } }));
  }

  function updateMyScore(optionId: string, key: string, value: number) {
    const mine = myVoteFor(optionId);
    if (!mine) {
      updateDraftScore(optionId, key, value);
      return;
    }
    const nextScores = { ...mine.scores, [key]: value };
    setVotes((vs) => vs.map((v) => (v.id === mine.id ? { ...v, scores: nextScores } : v)));
    const timerKey = mine.id + key;
    clearTimeout(timers.current[timerKey]);
    timers.current[timerKey] = setTimeout(async () => {
      const { error } = await supabase.from("decision_votes").update({ scores: nextScores }).eq("id", mine.id);
      if (error) setError(error.message);
    }, 700);
  }

  function updateMyNote(optionId: string, note: string) {
    const mine = myVoteFor(optionId);
    if (!mine) {
      setNoteDrafts((d) => ({ ...d, [optionId]: note }));
      return;
    }
    setVotes((vs) => vs.map((v) => (v.id === mine.id ? { ...v, note } : v)));
    const timerKey = mine.id + "note";
    clearTimeout(timers.current[timerKey]);
    timers.current[timerKey] = setTimeout(async () => {
      const { error } = await supabase.from("decision_votes").update({ note }).eq("id", mine.id);
      if (error) setError(error.message);
    }, 700);
  }

  async function submitVote(optionId: string) {
    const scores = drafts[optionId] ?? blankScores(decision.criteria);
    const note = noteDrafts[optionId] ?? "";
    const { data, error } = await supabase
      .from("decision_votes")
      .insert({ decision_id: decision.id, option_id: optionId, voter_id: userId, voter_name: userName, scores, note })
      .select()
      .single();
    if (!error && data) setVotes((vs) => [...vs, data as DecisionVote]);
  }

  async function confirmFinal() {
    if (!finalOptionId) return;
    const patch = { is_final: true, final_option_id: finalOptionId, final_reason: finalReason };
    const { error } = await supabase.from("decisions").update(patch).eq("id", decision.id);
    if (error) setError(error.message);
    else setDecision((d) => ({ ...d, ...patch }));
  }

  const ranked = active
    .map((o) => {
      const mine = myVoteFor(o.id);
      const partnerVote = partnerVoteFor(o.id);
      const myScore = mine ? weightedScore(mine.scores, decision.criteria) : null;
      const partnerScore = partnerVote ? weightedScore(partnerVote.scores, decision.criteria) : null;
      const combined = myScore != null && partnerScore != null ? (myScore + partnerScore) / 2 : null;
      return { o, mine, partnerVote, myScore, partnerScore, combined };
    })
    .filter((r) => r.combined != null)
    .sort((a, b) => (b.combined ?? 0) - (a.combined ?? 0));

  const myVoteCount = active.filter((o) => myVoteFor(o.id)).length;
  const allRevealed = active.length > 0 && ranked.length === active.length;
  const dataStep = decision.is_final ? 6 : allRevealed ? 5 : myVoteCount > 0 ? 4 : active.length > 0 ? 4 : 3;
  const [step, setStep] = useState(dataStep);

  const finalOption = options.find((o) => o.id === decision.final_option_id);
  const optionType: OptionType = optionTypeOf(decision);
  const pickedOption = options.find((o) => o.id === (decision.is_final ? decision.final_option_id : finalOptionId));

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.webp" alt="" aria-hidden className="pointer-events-none absolute right-0 top-0 hidden h-28 w-auto rotate-6 opacity-50 md:block" />
          <p aria-hidden className="pointer-events-none absolute right-24 top-3 hidden -rotate-6 font-script text-3xl leading-tight text-ink-2 md:block">It all<br />comes together ♡</p>
          <Link href="/decide" className="text-sm text-wine underline underline-offset-2">← All decisions</Link>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">{decision.category}</p>
          <h1 className="mt-1 font-serif text-4xl font-medium tracking-[-0.01em] sm:text-5xl">{decision.title}</h1>
        </div>
        {decision.description && <p className="mt-2 max-w-2xl text-ink-2">{decision.description}</p>}
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        <div role="tablist" aria-label="Decision steps" className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold sm:text-sm">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < dataStep;
            const isCurrent = n === step;
            return (
              <div key={label} className="flex flex-1 shrink-0 items-center gap-2">
                <button type="button" role="tab" aria-selected={isCurrent} onClick={() => setStep(n)} className="flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isCurrent ? "bg-surface-wine text-white" : done ? "bg-sage/40 text-sage-deep" : "bg-line/60 text-ink-2"
                    }`}
                  >
                    {n}
                  </span>
                  <span className={`${isCurrent ? "inline text-ink" : "hidden text-ink-2 lg:inline"}`}>{label}</span>
                </button>
                {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
              </div>
            );
          })}
        </div>

        {decision.is_final && finalOption && (
          <div className="mt-6 rounded-2xl border border-gold bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] p-5 shadow-sm">
            <p className="font-serif text-xl">🎉 Decided: {finalOption.label}</p>
            {decision.final_reason && <p className="mt-1 text-ink-2">{decision.final_reason}</p>}
            {optionType === "palette" && (finalOption.swatches?.length ?? 0) > 0 && (
              <div className="mt-4 border-t border-gold/40 pt-4">
                <p className="font-script text-3xl text-wine">We found our colours ♡</p>
                <ul className="mt-3 flex flex-wrap gap-3" aria-label="Chosen palette">
                  {finalOption.swatches!.map((hex, i) => <li key={`${i}-${hex}`} className="h-14 w-14 rounded-full border border-line shadow-sm" style={{ backgroundColor: hex }} title={hex} />)}
                </ul>
                {style?.source_decision_id === decision.id && style.palette.join() === finalOption.swatches!.join() ? (
                  <p className="mt-3 text-sm font-semibold text-sage-deep">✓ This is our wedding palette. Other pages can use it as a reference.</p>
                ) : (
                  <button onClick={() => applyWeddingPalette(finalOption)} className="mt-3 rounded-full bg-surface-wine px-5 py-2.5 text-sm font-semibold text-white">Use as our wedding palette</button>
                )}
              </div>
            )}
            {finalOption.venue_id && (
              <div className="mt-4 border-t border-gold/40 pt-4">
                {chosenVenueId === finalOption.venue_id ? (
                  <p className="text-sm font-semibold text-sage-deep">✓ {finalOption.label} is our chosen venue. The Dashboard and Budget follow it.</p>
                ) : (
                  <button onClick={() => chooseVenue(finalOption.venue_id!)} className="rounded-full bg-surface-wine px-5 py-2.5 text-sm font-semibold text-white">Make {finalOption.label} our chosen venue</button>
                )}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 flex max-w-4xl flex-col gap-3">
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-3 font-semibold">What are you deciding?</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="decision-title" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Title</label>
                  <input
                    id="decision-title"
                    value={decision.title}
                    onChange={(e) => saveDecision({ title: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="decision-category" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Category</label>
                  <select
                    id="decision-category"
                    value={decision.category}
                    onChange={(e) => saveDecision({ category: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2"
                  >
                    {DECISION_CATEGORIES.filter((c) => c !== "Venue").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="decision-description" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Why it matters (optional)</label>
                  <textarea
                    id="decision-description"
                    value={decision.description}
                    onChange={(e) => saveDecision({ description: e.target.value })}
                    rows={2}
                    placeholder="What this decision affects, when it's needed, anything you both should keep in mind."
                    className="mt-1 w-full rounded-lg border border-line bg-bg p-2"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <button onClick={() => setStep(2)} className="rounded-full bg-surface-wine px-4 py-2 text-sm font-semibold text-white">
                Continue to criteria →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 flex max-w-4xl flex-col gap-3">
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="font-semibold">What matters most to you?</h3>
              <p className="mb-3 mt-1 text-sm text-ink-2">Add what you want to weigh this decision on, and how important each one is.</p>
              <div className="flex flex-col divide-y divide-line">
                {decision.criteria.map((c) => (
                  <div key={c.key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <input
                      aria-label="Criterion name"
                      value={c.label}
                      onChange={(e) => updateCriterionLabel(c.key, e.target.value)}
                      className="rounded-lg border border-line bg-bg px-3 py-1.5 text-sm font-semibold sm:w-64"
                    />
                    <div className="flex shrink-0 items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateWeight(c.key, n)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                            c.weight === n ? "bg-surface-sage-deep text-white" : "border border-line bg-bg text-ink-2 hover:bg-line/40"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={() => removeCriterion(c.key)}
                        disabled={decision.criteria.length <= 1}
                        className="ml-1 rounded-lg p-2.5 text-ink-2 hover:bg-bg disabled:opacity-30"
                        aria-label={`Remove ${c.label}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addCriterion} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-sage-deep">
                <Plus className="h-4 w-4" strokeWidth={2} /> Add a criterion
              </button>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <button onClick={() => setStep(1)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg">
                ← Back
              </button>
              <button onClick={() => setStep(3)} className="rounded-full bg-surface-wine px-4 py-2 text-sm font-semibold text-white">
                Continue to options →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <DecisionOptionsStep
            decision={decision}
            type={optionType}
            options={options}
            ideas={ideas}
            venueRefs={venueRefs}
            vendorRefs={vendorRefs}
            saved={saved}
            onSetType={(t) => saveDecision({ option_type: t })}
            onAdd={addOption}
            onUpdate={updateOption}
            onRemove={removeOption}
            onDuplicate={duplicateOption}
            onReorder={reorderOptions}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <div className="mt-6 flex max-w-4xl flex-col gap-3">
            {active.length === 0 ? (
              <p className="rounded-2xl border border-line bg-bg p-5 text-sm text-ink-2 shadow-sm">
                Add at least one option before you can vote — go back to the Options step.
              </p>
            ) : (
              active.map((o) => {
                const mine = myVoteFor(o.id);
                const partnerVote = partnerVoteFor(o.id);
                const scores = mine?.scores ?? drafts[o.id] ?? blankScores(decision.criteria);
                const note = mine?.note ?? noteDrafts[o.id] ?? "";
                const myScore = weightedScore(mine ? mine.scores : scores, decision.criteria);
                const partnerScore = partnerVote ? weightedScore(partnerVote.scores, decision.criteria) : null;

                return (
                  <details key={o.id} className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
                    <summary className="cursor-pointer select-none list-none bg-bg px-4 py-3 font-serif text-lg font-medium marker:content-none">
                      <span className="mr-2 inline-block transition-transform [details[open]_&]:rotate-90">▸</span>
                      {o.label}
                      <span className="ml-2 text-sm font-normal text-ink-2">
                        {mine ? `you: ${fmtScore(myScore)}` : "not rated yet"}
                        {partnerVote ? ` · them: ${fmtScore(partnerScore)}` : ""}
                      </span>
                    </summary>
                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                      <div>
                        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">Your rating</h4>
                        <div className="flex flex-col gap-2.5">
                          {decision.criteria.map((c) => (
                            <div key={c.key}>
                              <div className="flex justify-between text-sm"><span>{c.label}</span><span className="font-serif">{scores[c.key] ?? 3}</span></div>
                              <input
                                type="range"
                                min={1}
                                max={5}
                                value={scores[c.key] ?? 3}
                                onChange={(e) => updateMyScore(o.id, c.key, +e.target.value)}
                                className="w-full accent-sage-deep"
                              />
                            </div>
                          ))}
                        </div>
                        <textarea
                          value={note}
                          onChange={(e) => updateMyNote(o.id, e.target.value)}
                          placeholder="Why this score? (only you see this until you submit)"
                          rows={2}
                          className="mt-2 w-full rounded-lg border border-line bg-bg p-2 text-sm"
                        />
                        {!mine && (
                          <button onClick={() => submitVote(o.id)} className="mt-2 rounded-full bg-surface-wine px-4 py-2 text-sm font-semibold text-white">
                            Submit my vote
                          </button>
                        )}
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">Their rating</h4>
                        {!mine ? (
                          <p className="text-sm italic text-ink-2">Hidden until you submit your own vote.</p>
                        ) : !partnerVote ? (
                          <p className="text-sm italic text-ink-2">Waiting on {partner}&apos;s vote.</p>
                        ) : (
                          <>
                            <div className="flex flex-col gap-2.5">
                              {decision.criteria.map((c) => (
                                <div key={c.key} className="flex items-center justify-between text-sm">
                                  <span>{c.label}</span>
                                  <span className="font-serif">{partnerVote.scores[c.key] ?? "—"}</span>
                                </div>
                              ))}
                            </div>
                            {partnerVote.note && <p className="mt-2 text-sm text-ink-2">&ldquo;{partnerVote.note}&rdquo;</p>}
                            <p className="mt-3 border-t border-line pt-2 text-sm">
                              Combined: <b className="font-serif text-base">{fmtScore(myScore != null && partnerScore != null ? (myScore + partnerScore) / 2 : null)}</b>
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </details>
                );
              })
            )}
            <div className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <button onClick={() => setStep(3)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg">
                ← Back
              </button>
              <button onClick={() => setStep(5)} className="rounded-full bg-surface-wine px-4 py-2 text-sm font-semibold text-white">
                Continue to reveal →
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="mt-6 flex max-w-4xl flex-col gap-3">
            {ranked.length === 0 ? (
              <div className="rounded-2xl border border-line bg-bg p-5 text-sm text-ink-2 shadow-sm">
                🔒 <b className="text-ink">Results unlock after both of you have voted on an option.</b>
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
                <h3 className="mb-3 font-semibold">Shared results</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-2">
                      <th className="pb-2">Option</th>
                      <th className="pb-2 text-right">You</th>
                      <th className="pb-2 text-right">Them</th>
                      <th className="pb-2 text-right">Combined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map(({ o, myScore, partnerScore, combined }, i) => (
                      <tr key={o.id} className="border-t border-line">
                        <td className="py-2 pr-2">{i === 0 ? "🏆 " : ""}{o.label}</td>
                        <td className="py-2 text-right">{fmtScore(myScore)}</td>
                        <td className="py-2 text-right">{fmtScore(partnerScore)}</td>
                        <td className="py-2 text-right font-serif font-semibold">{fmtScore(combined)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <button onClick={() => setStep(4)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg">
                ← Back
              </button>
              <button onClick={() => setStep(6)} className="rounded-full bg-surface-wine px-4 py-2 text-sm font-semibold text-white">
                Continue to final choice →
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="mt-6 flex max-w-4xl flex-col gap-3">
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-3 font-semibold">Make it official</h3>
              {!decision.is_final && (pickedOption?.swatches?.length ?? 0) > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2" aria-label="Palette of the chosen option">
                  {pickedOption!.swatches!.map((hex, i) => <li key={`${i}-${hex}`} className="h-9 w-9 rounded-full border border-line" style={{ backgroundColor: hex }} title={hex} />)}
                </ul>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <select
                  value={finalOptionId}
                  onChange={(e) => setFinalOptionId(e.target.value)}
                  className="rounded-lg border border-line bg-bg px-3 py-2"
                >
                  <option value="">Choose an option…</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <textarea
                  value={finalReason}
                  onChange={(e) => setFinalReason(e.target.value)}
                  placeholder="Why this one?"
                  rows={2}
                  className="flex-1 rounded-lg border border-line bg-bg p-2"
                />
                <button
                  onClick={confirmFinal}
                  disabled={!finalOptionId}
                  className="rounded-full bg-surface-wine px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Confirm decision
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <button onClick={() => setStep(5)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg">
                ← Back
              </button>
              <span />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
