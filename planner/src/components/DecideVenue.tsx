"use client";

import { useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { STATUSES, type Venue } from "@/lib/venues";
import {
  CRITERION_CONSIDERATIONS,
  CRITERION_HELP,
  blankScores,
  fmtScore,
  weightedScore,
  type Criterion,
  type DecisionEvent,
  type Rating,
} from "@/lib/decisions";
import { partnerName } from "@/lib/ideas";
import { BarChart3, Heart, HelpCircle, ListChecks, Lock, MapPin, Pencil, Star, Users, Utensils, Wallet, EyeOff } from "lucide-react";

const STEPS = ["Priorities", "Rate venues", "Reveal", "Final choice"];

const CRITERION_ICON: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  location: MapPin,
  budget: Wallet,
  food: Utensils,
  character: Heart,
  logistics: Users,
  gut: Star,
};

export default function DecideVenue({
  initialVenues,
  initialRatings,
  initialCriteria,
  initialEvents,
  userName,
  userId,
}: {
  initialVenues: Venue[];
  initialRatings: Rating[];
  initialCriteria: Criterion[];
  initialEvents: DecisionEvent[];
  userName: string;
  userId: string;
}) {
  const [venues, setVenues] = useState(initialVenues);
  const [ratings, setRatings] = useState(initialRatings);
  const [criteria, setCriteria] = useState(initialCriteria);
  const [events, setEvents] = useState(initialEvents);
  const [drafts, setDrafts] = useState<Record<string, Record<string, number>>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [finalVenueId, setFinalVenueId] = useState(venues.find((v) => v.is_final)?.id ?? "");
  const [finalReason, setFinalReason] = useState(venues.find((v) => v.is_final)?.final_reason ?? "");
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const active = venues.filter((v) => v.status !== "out");
  const finalVenue = venues.find((v) => v.is_final);

  function myRatingFor(venueId: string) {
    return ratings.find((r) => r.venue_id === venueId && r.rater_id === userId);
  }
  function partnerRatingFor(venueId: string) {
    return ratings.find((r) => r.venue_id === venueId && r.rater_id !== userId);
  }

  async function logEvent(venue: Venue | null, type: "rating" | "final", summary: string) {
    const { data } = await supabase
      .from("decision_events")
      .insert({ venue_id: venue?.id ?? null, venue_name: venue?.name ?? "", event_type: type, actor_name: userName, summary })
      .select()
      .single();
    if (data) setEvents((es) => [data as DecisionEvent, ...es]);
  }

  function saveCriteria(next: Criterion[]) {
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(async () => {
      const { error } = await supabase.from("decision_settings").update({ criteria: next }).eq("id", true);
      if (error) setError(error.message);
      else {
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2000);
      }
    }, 600);
  }

  function updateWeight(key: string, weight: number) {
    const next = criteria.map((c) => (c.key === key ? { ...c, weight } : c));
    setCriteria(next);
    saveCriteria(next);
  }

  function saveDraftNow() {
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    saveCriteria(criteria);
  }

  function updateDraftScore(venueId: string, key: string, value: number) {
    setDrafts((d) => ({ ...d, [venueId]: { ...(d[venueId] ?? blankScores(criteria)), [key]: value } }));
  }

  function updateMyScore(venue: Venue, key: string, value: number) {
    const mine = myRatingFor(venue.id);
    if (!mine) {
      updateDraftScore(venue.id, key, value);
      return;
    }
    const nextScores = { ...mine.scores, [key]: value };
    setRatings((rs) => rs.map((r) => (r.id === mine.id ? { ...r, scores: nextScores } : r)));
    const timerKey = mine.id + key;
    clearTimeout(timers.current[timerKey]);
    timers.current[timerKey] = setTimeout(async () => {
      const { error } = await supabase.from("venue_ratings").update({ scores: nextScores }).eq("id", mine.id);
      if (error) setError(error.message);
    }, 700);
  }

  function updateMyNote(venue: Venue, note: string) {
    const mine = myRatingFor(venue.id);
    if (!mine) {
      setNoteDrafts((d) => ({ ...d, [venue.id]: note }));
      return;
    }
    setRatings((rs) => rs.map((r) => (r.id === mine.id ? { ...r, note } : r)));
    const timerKey = mine.id + "note";
    clearTimeout(timers.current[timerKey]);
    timers.current[timerKey] = setTimeout(async () => {
      const { error } = await supabase.from("venue_ratings").update({ note }).eq("id", mine.id);
      if (error) setError(error.message);
    }, 700);
  }

  async function submitRating(venue: Venue) {
    const scores = drafts[venue.id] ?? blankScores(criteria);
    const note = noteDrafts[venue.id] ?? "";
    const { data, error } = await supabase
      .from("venue_ratings")
      .insert({ venue_id: venue.id, rater_id: userId, rater_name: userName, scores, note })
      .select()
      .single();
    if (!error && data) {
      setRatings((rs) => [...rs, data as Rating]);
      logEvent(venue, "rating", `${userName} rated ${venue.name} — ${fmtScore(weightedScore(scores, criteria))}/5`);
    }
  }

  async function setFinal() {
    const venue = venues.find((v) => v.id === finalVenueId);
    if (!venue) return;
    await supabase.from("venues").update({ is_final: false, final_reason: "" }).eq("is_final", true).neq("id", venue.id);
    await supabase.from("venues").update({ is_final: true, final_reason: finalReason }).eq("id", venue.id);
    setVenues((vs) =>
      vs.map((v) => (v.id === venue.id ? { ...v, is_final: true, final_reason: finalReason } : v.is_final ? { ...v, is_final: false, final_reason: "" } : v))
    );
    logEvent(venue, "final", `${userName} marked ${venue.name} as the final decision${finalReason ? `: "${finalReason}"` : ""}`);
  }

  const ranked = active
    .map((v) => {
      const mine = myRatingFor(v.id);
      const partner = partnerRatingFor(v.id);
      const myScore = mine ? weightedScore(mine.scores, criteria) : null;
      const partnerScore = partner ? weightedScore(partner.scores, criteria) : null;
      const combined = myScore != null && partnerScore != null ? (myScore + partnerScore) / 2 : null;
      return { v, mine, partner, myScore, partnerScore, combined };
    })
    .filter((r) => r.combined != null)
    .sort((a, b) => (b.combined ?? 0) - (a.combined ?? 0));

  const partner = partnerName(userName);
  const myRatedCount = active.filter((v) => myRatingFor(v.id)).length;
  const partnerRatedCount = active.filter((v) => partnerRatingFor(v.id)).length;
  const allRevealed = active.length > 0 && ranked.length === active.length;
  const dataStep = finalVenue ? 4 : allRevealed ? 3 : myRatedCount > 0 ? 2 : 1;
  const [step, setStep] = useState(dataStep);

  function statusFor(count: number) {
    if (active.length === 0) return "No venues yet";
    if (count === active.length) return "Submitted and locked";
    if (count > 0) return `In progress (${count}/${active.length})`;
    return "Not started";
  }

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/decide" className="text-sm text-ink-2 underline underline-offset-2">← All decisions</Link>
        <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">Decide together</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Make important choices independently, then reveal where you agree.
        </p>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        <div className="mt-6 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--sage)_14%,var(--paper))] p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Current decision</p>
              <h2 className="mt-1 font-serif text-2xl font-medium">Choose our wedding venue</h2>
              <p className="mt-1 text-sm text-ink-2">
                {active.length} venue{active.length === 1 ? "" : "s"} · {userName} and {partner}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { name: userName, count: myRatedCount, mine: true },
                { name: partner, count: partnerRatedCount, mine: false },
              ].map(({ name, count, mine }) => (
                <div key={name} className="flex items-center gap-2 text-sm">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-serif text-xs font-semibold ${
                      mine ? "bg-sage-deep text-white" : "bg-[color-mix(in_srgb,var(--sage)_35%,var(--paper))] text-sage-deep"
                    }`}
                  >
                    {name.charAt(0)}
                  </span>
                  <span className="font-semibold">{name}</span>
                  <span className="text-ink-2">{statusFor(count)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm text-ink-2">
            <Lock className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            {partner} cannot see your answers while voting.
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs font-semibold sm:text-sm">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = n < dataStep;
              const isCurrent = n === step;
              return (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(n)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        isCurrent ? "bg-sage-deep text-white" : done ? "bg-sage-deep/20 text-sage-deep" : "bg-line/60 text-ink-2"
                      }`}
                    >
                      {n}
                    </span>
                    <span className={isCurrent ? "text-ink" : "text-ink-2"}>{label}</span>
                  </button>
                  {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
                </div>
              );
            })}
          </div>
        </div>

        {finalVenue && (
          <div className="mt-6 rounded-2xl border border-gold bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] p-5 shadow-sm">
            <p className="font-serif text-xl">🎉 Final decision: {finalVenue.name}</p>
            {finalVenue.final_reason && <p className="mt-1 text-ink-2">{finalVenue.final_reason}</p>}
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
              <h3 className="font-serif text-xl font-medium">What matters most to you?</h3>
              <p className="mb-1 mt-1 text-sm text-ink-2">These priorities determine how much each category contributes to your venue scores.</p>
              <div className="mb-4 flex justify-between text-xs text-ink-2">
                <span>1 · Not important</span>
                <span>5 · Essential</span>
              </div>
              <div className="flex flex-col divide-y divide-line">
                {criteria.map((c) => {
                  const Icon = CRITERION_ICON[c.key];
                  const considerations = CRITERION_CONSIDERATIONS[c.key];
                  return (
                    <div key={c.key} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3">
                        {Icon && (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--sage)_20%,var(--paper))] text-sage-deep">
                            <Icon className="h-4 w-4" strokeWidth={1.75} />
                          </span>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold">{c.label}</span>
                            {considerations && (
                              <span
                                title={`Consider: ${considerations.join(", ")}`}
                                className="flex h-4 w-4 items-center justify-center rounded-full text-ink-2"
                              >
                                <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                              </span>
                            )}
                          </div>
                          {CRITERION_HELP[c.key] && <p className="mt-0.5 text-xs text-ink-2">{CRITERION_HELP[c.key]}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5 sm:ml-12">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => updateWeight(c.key, n)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                              c.weight === n ? "bg-sage-deep text-white" : "border border-line bg-bg text-ink-2 hover:bg-line/40"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
                <h3 className="mb-3 font-semibold">Before you continue</h3>
                <div className="flex flex-col gap-4">
                  {[
                    { icon: Heart, title: "Be honest — there are no right answers.", body: "This is about what matters to you." },
                    { icon: BarChart3, title: "Use the full 1–5 scale to show real priorities.", body: "It helps us find your best matches later." },
                    { icon: Pencil, title: "You can edit these until your venue ratings are submitted.", body: "Change your mind anytime before then." },
                  ].map(({ icon: Icon, title, body }) => (
                    <div key={title} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg text-sage-deep">
                        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </span>
                      <div className="text-sm">
                        <p className="font-semibold">{title}</p>
                        <p className="mt-0.5 text-ink-2">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-bg p-5">
                <h3 className="mb-3 flex items-center gap-1.5 font-semibold">
                  <Lock className="h-4 w-4" strokeWidth={1.75} aria-hidden /> What happens next?
                </h3>
                <p className="mb-3 text-sm text-ink-2">Rate each venue using the same criteria. Results unlock only after both votes are submitted.</p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-ink-2">
                  {[
                    { icon: ListChecks, label: "You both rate venues" },
                    { icon: EyeOff, label: "Results stay hidden" },
                    { icon: BarChart3, label: "We reveal your matches" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5">
                      <Icon className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-ink-2">
                <Lock className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {savedNotice ? "Saved." : `Saved privately · ${partner} cannot see this yet.`}
              </div>
              <div className="flex gap-2">
                <button onClick={saveDraftNow} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg">
                  Save draft
                </button>
                <button onClick={() => setStep(2)} className="rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white">
                  Continue to rate venues →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 flex flex-col gap-3">
            {active.map((v) => {
              const mine = myRatingFor(v.id);
              const partner = partnerRatingFor(v.id);
              const scores = mine?.scores ?? drafts[v.id] ?? blankScores(criteria);
              const note = mine?.note ?? noteDrafts[v.id] ?? "";
              const myScore = weightedScore(mine ? mine.scores : scores, criteria);
              const partnerScore = partner ? weightedScore(partner.scores, criteria) : null;

              return (
                <details key={v.id} className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
                  <summary className="cursor-pointer select-none list-none bg-bg px-4 py-3 font-serif text-lg font-medium marker:content-none">
                    <span className="mr-2 inline-block transition-transform [details[open]_&]:rotate-90">▸</span>
                    {v.is_favourite ? "★ " : ""}
                    {v.name}
                    <span className="ml-2 text-sm font-normal text-ink-2">
                      {STATUSES[v.status]} · {mine ? `you: ${fmtScore(myScore)}` : "not rated yet"}
                      {partner ? ` · them: ${fmtScore(partnerScore)}` : ""}
                    </span>
                  </summary>
                  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">Your rating</h4>
                      <div className="flex flex-col gap-2.5">
                        {criteria.map((c) => (
                          <div key={c.key}>
                            <div className="flex justify-between text-sm"><span>{c.label}</span><span className="font-serif">{scores[c.key] ?? 3}</span></div>
                            <input
                              type="range"
                              min={1}
                              max={5}
                              value={scores[c.key] ?? 3}
                              onChange={(e) => updateMyScore(v, c.key, +e.target.value)}
                              className="w-full accent-sage-deep"
                            />
                          </div>
                        ))}
                      </div>
                      <textarea
                        value={note}
                        onChange={(e) => updateMyNote(v, e.target.value)}
                        placeholder="Why this score? (only you see this until you submit)"
                        rows={2}
                        className="mt-2 w-full rounded-lg border border-line bg-bg p-2 text-sm"
                      />
                      {!mine && (
                        <button onClick={() => submitRating(v)} className="mt-2 rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white">
                          Submit my rating
                        </button>
                      )}
                    </div>
                    <div>
                      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">Their rating</h4>
                      {!mine ? (
                        <p className="text-sm italic text-ink-2">Hidden until you submit your own rating.</p>
                      ) : !partner ? (
                        <p className="text-sm italic text-ink-2">Waiting on their rating.</p>
                      ) : (
                        <>
                          <div className="flex flex-col gap-2.5">
                            {criteria.map((c) => (
                              <div key={c.key} className="flex items-center justify-between text-sm">
                                <span>{c.label}</span>
                                <span className="font-serif">{partner.scores[c.key] ?? "—"}</span>
                              </div>
                            ))}
                          </div>
                          {partner.note && <p className="mt-2 text-sm text-ink-2">&ldquo;{partner.note}&rdquo;</p>}
                          <p className="mt-3 border-t border-line pt-2 text-sm">
                            Combined: <b className="font-serif text-base">{fmtScore(myScore != null && partnerScore != null ? (myScore + partnerScore) / 2 : null)}</b>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}

            <div className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <button onClick={() => setStep(1)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg">
                ← Back
              </button>
              <button onClick={() => setStep(3)} className="rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white">
                Continue to reveal →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 flex flex-col gap-3">
            {ranked.length === 0 ? (
              <div className="rounded-2xl border border-line bg-bg p-5 text-sm text-ink-2 shadow-sm">
                🔒 <b className="text-ink">Results unlock after both of you have submitted a rating for a venue.</b>
                <p className="mt-1">You&apos;ll see your strongest matches, biggest differences and combined venue scores here.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
                <h3 className="mb-3 font-semibold">Shared results</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-2">
                      <th className="pb-2">Venue</th>
                      <th className="pb-2 text-right">You</th>
                      <th className="pb-2 text-right">Them</th>
                      <th className="pb-2 text-right">Combined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map(({ v, myScore, partnerScore, combined }, i) => (
                      <tr key={v.id} className="border-t border-line">
                        <td className="py-2 pr-2">{i === 0 ? "🏆 " : ""}{v.name}</td>
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
              <button onClick={() => setStep(2)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg">
                ← Back
              </button>
              <button onClick={() => setStep(4)} className="rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white">
                Continue to final decision →
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-3 font-semibold">Set the final decision</h3>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <select
                  value={finalVenueId}
                  onChange={(e) => setFinalVenueId(e.target.value)}
                  className="rounded-lg border border-line bg-bg px-3 py-2"
                >
                  <option value="">Choose a venue…</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
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
                  onClick={setFinal}
                  disabled={!finalVenueId}
                  className="rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Confirm our venue
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <button onClick={() => setStep(3)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg">
                ← Back
              </button>
              <span />
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Decision history</h3>
          {events.length === 0 ? (
            <p className="text-sm text-ink-2">Nothing yet — ratings and the final decision will show up here.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="border-t border-line pt-2 first:border-0 first:pt-0">
                  <span className="text-ink-2">{new Date(e.created_at).toLocaleDateString()}</span> — {e.summary}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
