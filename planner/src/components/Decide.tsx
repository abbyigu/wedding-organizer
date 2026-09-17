"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { STATUSES, type Venue } from "@/lib/venues";
import { blankScores, fmtScore, weightedScore, type Criterion, type DecisionEvent, type Rating } from "@/lib/decisions";

export default function Decide({
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

  function updateWeight(key: string, weight: number) {
    const next = criteria.map((c) => (c.key === key ? { ...c, weight } : c));
    setCriteria(next);
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      supabase.from("decision_settings").update({ criteria: next }).eq("id", true);
    }, 600);
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
    timers.current[timerKey] = setTimeout(() => {
      supabase.from("venue_ratings").update({ scores: nextScores }).eq("id", mine.id);
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
    timers.current[timerKey] = setTimeout(() => {
      supabase.from("venue_ratings").update({ note }).eq("id", mine.id);
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

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Decide, together but blind</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Rate each venue on your own — you won&apos;t see the other person&apos;s answer until you&apos;ve cast yours.
        </p>

        {finalVenue && (
          <div className="mt-6 rounded-2xl border border-gold bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] p-5 shadow-sm">
            <p className="font-serif text-xl">🎉 Final decision: {finalVenue.name}</p>
            {finalVenue.final_reason && <p className="mt-1 text-ink-2">{finalVenue.final_reason}</p>}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">What matters, and how much</h3>
          <div className="flex flex-col gap-3">
            {criteria.map((c) => (
              <div key={c.key}>
                <div className="flex justify-between"><label className="text-sm font-semibold">{c.label}</label><span className="font-serif">{c.weight}/5</span></div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={c.weight}
                  onChange={(e) => updateWeight(c.key, +e.target.value)}
                  className="w-full accent-sage-deep"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Shared results</h3>
          {ranked.length === 0 ? (
            <p className="text-sm text-ink-2">Nothing to show yet — results for a venue appear here once you&apos;ve both rated it.</p>
          ) : (
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
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-paper p-5 shadow-sm">
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
              className="rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-[#F7F3EA] disabled:opacity-50"
            >
              Mark as final
            </button>
          </div>
        </div>

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
                      <button onClick={() => submitRating(v)} className="mt-2 rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-[#F7F3EA]">
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
        </div>

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
