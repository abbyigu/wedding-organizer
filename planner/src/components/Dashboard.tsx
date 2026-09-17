"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Landmark, ListChecks, MapPin, Users, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import {
  BUDGET_CEILING,
  GUEST_CAPACITY,
  STARTERS,
  STATUS_ORDER,
  STATUSES,
  blankVenue,
  calcVenue,
  checklistPercent,
  fmt,
  type Assumptions,
  type Venue,
} from "@/lib/venues";
import { normalizeUrl } from "@/lib/ideas";
import { nextVenueAction, type ActionItem } from "@/lib/dashboard";

const CARD_COLORS = ["var(--sage-deep)", "var(--wood)", "var(--wine)", "var(--green)", "var(--gold)", "var(--sage)"];
const MAX_COMPARE = 3;
const CARD_TRANSITION = "transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:transform-none";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

type IdeaThumb = { id: string; title: string; image_url: string };

export default function Dashboard({
  initialVenues,
  userName,
  greetingText,
  photoUrls,
  assumptions,
  sharedVals,
  daysUntilWedding,
  guestTotal,
  guestAdults,
  guestKids,
  ideaThumbs,
  ideaCount,
  ideaCategories,
  decisionsWaitingCount,
  decisionsWaitingVenue,
  roadmap,
  actionItems,
}: {
  initialVenues: Venue[];
  userName: string;
  greetingText: string;
  photoUrls: Record<string, string>;
  assumptions: Assumptions;
  sharedVals: number[];
  daysUntilWedding: number;
  guestTotal: number;
  guestAdults: number;
  guestKids: number;
  ideaThumbs: IdeaThumb[];
  ideaCount: number;
  ideaCategories: string[];
  decisionsWaitingCount: number;
  decisionsWaitingVenue: string | null;
  roadmap: { phaseLabel: string; step: number; totalSteps: number; nextMilestone: string };
  actionItems: ActionItem[];
}) {
  const router = useRouter();
  const [venues, setVenues] = useState(initialVenues);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const as = assumptions;

  const stats = useMemo(() => {
    const active = venues.filter((v) => v.status !== "out");
    const withCost = active
      .map((v) => ({ v, g: calcVenue(v, as, sharedVals).grand }))
      .sort((a, b) => a.g - b.g);
    const needQuote = active.filter((v) => !v.quote_received).length;
    return {
      active: active.length,
      lowestNumeric: withCost[0]?.g ?? 0,
      lowest: withCost[0] ? fmt(withCost[0].g) : "—",
      needQuote,
      quotesReceived: active.length - needQuote,
      nextAction: nextVenueAction(venues),
    };
  }, [venues, as, sharedVals]);

  const sorted = useMemo(() => {
    return [...venues].sort((a, b) => {
      const oa = STATUS_ORDER.indexOf(a.status), ob = STATUS_ORDER.indexOf(b.status);
      if (oa !== ob) return oa - ob;
      return calcVenue(a, as, sharedVals).grand - calcVenue(b, as, sharedVals).grand;
    });
  }, [venues, as, sharedVals]);

  async function seed() {
    setSeeding(true);
    setError("");
    const supabase = createClient();
    const rows = STARTERS.map((s) => blankVenue(s));
    const { data, error } = await supabase.from("venues").insert(rows).select();
    if (error) setError(error.message);
    else if (data) setVenues((v) => [...v, ...(data as Venue[])]);
    setSeeding(false);
  }

  async function addPlace() {
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("venues")
      .insert(blankVenue({ name: "New place", sort_order: venues.length + 1 }))
      .select()
      .single();
    if (error) setError(error.message);
    else if (data) setVenues((v) => [...v, data as Venue]);
  }

  function toggleCompare(id: string) {
    setCompareIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= MAX_COMPARE) return ids;
      return [...ids, id];
    });
  }

  async function toggleFavourite(v: Venue) {
    const next = !v.is_favourite;
    setVenues((vs) => vs.map((x) => (x.id === v.id ? { ...x, is_favourite: next } : x)));
    const supabase = createClient();
    await supabase.from("venues").update({ is_favourite: next }).eq("id", v.id);
  }

  const guestOver = guestTotal - GUEST_CAPACITY;
  const budgetRemaining = BUDGET_CEILING - stats.lowestNumeric;
  const budgetPct = Math.min(100, Math.max(0, (stats.lowestNumeric / BUDGET_CEILING) * 100));
  const roadmapPct = Math.round((roadmap.step / roadmap.totalSteps) * 100);

  return (
    <div className="min-h-screen pb-20">
      <NavBar userName={userName} />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-serif italic text-wine">Come as you are, stay as long as you like.</p>
            <h1 className="mt-1 font-serif text-3xl font-medium sm:text-4xl">{greetingText}</h1>
            <p className="mt-2 text-ink-2">Your wedding at a glance · early September 2029</p>
          </div>
          <div className="text-right">
            <b className="block font-serif text-3xl">{daysUntilWedding} days</b>
            <span className="block text-xs font-semibold uppercase tracking-wide text-ink-2">until the wedding</span>
          </div>
        </div>

        {venues.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
            <h2 className="font-serif text-2xl">Nothing here yet</h2>
            <p className="mt-2 text-ink-2">Start with the six venues from the original research, or add your own.</p>
            <button
              onClick={seed}
              disabled={seeding}
              className={`mt-4 rounded-full bg-sage-deep px-4 py-2 font-semibold text-[#F7F3EA] disabled:opacity-60 ${FOCUS_RING}`}
            >
              {seeding ? "Adding…" : "Add the 6 shortlisted venues"}
            </button>
            {error && <p className="mt-3 text-sm text-wine">{error}</p>}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Link href="/guests" className={`rounded-2xl border border-line bg-paper p-5 shadow-sm ${CARD_TRANSITION} ${FOCUS_RING}`}>
                    <div className="flex items-center justify-between">
                      <Users className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">Guests</span>
                    </div>
                    <b className="mt-3 block font-serif text-3xl">{guestTotal}</b>
                    <p className={`mt-1 text-sm ${guestOver > 0 ? "font-semibold text-wine" : "text-ink-2"}`}>
                      {guestOver > 0 ? `${guestOver} over the ${GUEST_CAPACITY} target` : `${guestAdults} adults + ${guestKids} kids`}
                    </p>
                  </Link>

                  <Link href="/budget" className={`rounded-2xl border border-line bg-paper p-5 shadow-sm ${CARD_TRANSITION} ${FOCUS_RING}`}>
                    <div className="flex items-center justify-between">
                      <Wallet className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">Budget</span>
                    </div>
                    <b className="mt-3 block font-serif text-3xl">{stats.lowest}</b>
                    <p className="mt-1 text-sm text-ink-2">
                      {budgetRemaining >= 0 ? `${fmt(budgetRemaining)} below the ceiling` : `${fmt(-budgetRemaining)} over the ceiling`}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${budgetPct}%` }} />
                    </div>
                  </Link>

                  <Link href="#venues" className={`rounded-2xl border border-line bg-paper p-5 shadow-sm ${CARD_TRANSITION} ${FOCUS_RING}`}>
                    <div className="flex items-center justify-between">
                      <Landmark className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">Venues</span>
                    </div>
                    <b className="mt-3 block font-serif text-3xl">{stats.active} active</b>
                    <p className="mt-1 text-sm text-ink-2">
                      {stats.quotesReceived > 0
                        ? `${stats.quotesReceived} received · ${stats.needQuote} needed`
                        : `${stats.needQuote} complete quote${stats.needQuote === 1 ? "" : "s"} needed`}
                    </p>
                  </Link>

                  <Link href="#next-actions" className={`rounded-2xl border border-line bg-paper p-5 shadow-sm ${CARD_TRANSITION} ${FOCUS_RING}`}>
                    <div className="flex items-center justify-between">
                      <ListChecks className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">Tasks</span>
                    </div>
                    <b className="mt-3 block font-serif text-3xl">{actionItems.length}</b>
                    <p className="mt-1 text-sm text-ink-2">need your attention</p>
                  </Link>
                </div>

                <div id="next-actions" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-paper p-5 shadow-sm">
                  <h2 className="font-serif text-xl font-medium">What to do next</h2>
                  {actionItems.length === 0 ? (
                    <p className="mt-4 text-sm text-ink-2">Nothing urgent — you&apos;re all caught up.</p>
                  ) : (
                    <ol className="mt-4 flex flex-col gap-3">
                      {actionItems.slice(0, 3).map((item, i) => (
                        <li key={item.title} className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-bg p-3 sm:flex-nowrap">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-deep text-xs font-semibold text-[#F7F3EA]">
                            {i + 1}
                          </span>
                          <Link href={item.href} className={`min-w-0 flex-1 rounded ${FOCUS_RING}`}>
                            <p className="font-semibold">{item.title}</p>
                            <p className="text-sm text-ink-2">{item.description}</p>
                          </Link>
                          <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--gold)_20%,var(--paper))] px-2.5 py-1 text-xs font-semibold text-[var(--wood)]">
                            {item.person} · {item.effort}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-medium">Planning phase</h3>
                    <Link href="/board" className={`text-sm font-semibold text-sage-deep rounded ${FOCUS_RING}`}>Roadmap →</Link>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--sage)_25%,var(--paper))] text-sage-deep">
                      <MapPin className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold">{roadmap.phaseLabel}</p>
                      <p className="text-sm text-ink-2">Step {roadmap.step} of {roadmap.totalSteps}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-green" style={{ width: `${roadmapPct}%` }} />
                  </div>
                  <p className="mt-3 border-t border-line pt-3 text-sm text-ink-2">
                    <b className="text-ink">Next milestone:</b> {roadmap.nextMilestone}
                  </p>
                </div>

                <Link href="/ideas" className={`flex items-center gap-3 rounded-2xl border border-line bg-paper p-4 shadow-sm ${CARD_TRANSITION} ${FOCUS_RING}`}>
                  <div className="grid shrink-0 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-xl" style={{ width: 64, height: 64 }}>
                    {ideaThumbs.length === 0 ? (
                      <div className="col-span-2 row-span-2 flex items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--wine)_12%,var(--paper))] text-lg">📌</div>
                    ) : (
                      ideaThumbs.map((thumb) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={thumb.id} src={normalizeUrl(thumb.image_url)} alt="" className="h-full w-full object-cover" />
                      ))
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-medium">Idea Board</h3>
                    <p className="truncate text-sm text-ink-2">
                      {ideaCount} idea{ideaCount === 1 ? "" : "s"}
                      {ideaCategories.length ? ` · ${ideaCategories.join(", ")}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-sage-deep">Open →</span>
                </Link>

                <Link href="/decide" className={`flex items-center gap-3 rounded-2xl border border-line bg-paper p-4 shadow-sm ${CARD_TRANSITION} ${FOCUS_RING}`}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--wine)_15%,var(--paper))] text-wine">
                    <Heart className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-medium">Decisions waiting</h3>
                    <p className="truncate text-sm text-ink-2">
                      {decisionsWaitingCount === 0
                        ? "You're all caught up"
                        : `${decisionsWaitingCount} private vote${decisionsWaitingCount === 1 ? "" : "s"} need${decisionsWaitingCount === 1 ? "s" : ""} your answer${decisionsWaitingVenue ? ` — ${decisionsWaitingVenue}` : ""}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-sage-deep">Review →</span>
                </Link>
              </div>
            </div>

            <div id="venues" className="mt-10 scroll-mt-20 flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-serif text-2xl font-medium">Venue shortlist</h2>
                <p className="mt-1 text-sm text-ink-2">Choose 2–3 venues to compare side by side</p>
              </div>
              <button onClick={addPlace} className={`rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-[#F7F3EA] ${FOCUS_RING}`}>
                ＋ Add a place
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((v, i) => {
                const calc = calcVenue(v, as, sharedVals);
                const photo = v.photos?.[0];
                const pct = checklistPercent(v);
                const checked = compareIds.includes(v.id);
                const compareDisabled = !checked && compareIds.length >= MAX_COMPARE;
                return (
                  <div key={v.id} className={`flex flex-col overflow-hidden rounded-[20px] border border-line bg-paper shadow-sm ${CARD_TRANSITION}`}>
                    <Link href={`/venues/${v.id}`} className={`relative block aspect-video rounded-t-[18px] bg-line ${FOCUS_RING}`}>
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrls[photo.path]} alt={v.name} className="h-full w-full object-cover" />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center font-serif text-4xl text-white"
                          style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
                        >
                          {v.name.charAt(0)}
                        </div>
                      )}
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-[color-mix(in_srgb,var(--paper)_85%,transparent)] px-2.5 py-0.5 text-xs font-semibold text-ink shadow-sm">
                        {STATUSES[v.status]}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-2.5 pt-7">
                        <span className="block font-serif text-lg font-semibold text-white">{v.name}</span>
                      </div>
                    </Link>

                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex items-center justify-between text-sm text-ink-2">
                        <span>
                          {calc.venueSource === "estimated" ? "≈ " : ""}
                          <b className="text-ink">{fmt(calc.grand)}</b>
                          {calc.venueSource !== "estimated" && (
                            <span className="ml-1 text-xs font-semibold text-sage-deep">({calc.venueSource})</span>
                          )}
                        </span>
                        <span>Capacity <b className="text-ink">{v.capacity || "TBD"}</b></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-sage-deep" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-ink-2">{pct}% researched</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
                        <label className={`flex items-center gap-1.5 text-sm font-semibold ${compareDisabled ? "text-ink-2 opacity-50" : "text-ink-2"}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={compareDisabled}
                            onChange={() => toggleCompare(v.id)}
                            className={`h-4 w-4 accent-sage-deep ${FOCUS_RING}`}
                          />
                          Compare
                        </label>
                        <button
                          onClick={() => toggleFavourite(v)}
                          aria-label={v.is_favourite ? "Remove favourite" : "Mark as favourite"}
                          aria-pressed={v.is_favourite}
                          className={`flex items-center gap-1.5 text-sm font-semibold text-ink-2 ${FOCUS_RING}`}
                        >
                          <Heart
                            className={`h-4 w-4 ${v.is_favourite ? "fill-wine text-wine" : "text-ink-2"}`}
                            strokeWidth={1.5}
                            aria-hidden
                          />
                          Favourite
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {compareIds.length >= 2 && (
        <button
          onClick={() => router.push(`/compare?ids=${compareIds.join(",")}`)}
          className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-green px-5 py-3 text-sm font-semibold text-[#F7F3EA] shadow-md ${FOCUS_RING}`}
        >
          Compare {compareIds.length} venue{compareIds.length === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}
