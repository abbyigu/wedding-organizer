"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import {
  STARTERS,
  STATUS_ORDER,
  STATUSES,
  blankVenue,
  calcVenue,
  checklistPercent,
  fmt,
  type Assumptions,
  type Status,
  type Venue,
} from "@/lib/venues";

const STATUS_STYLE: Record<Status, string> = {
  researching: "bg-[color-mix(in_srgb,var(--sage)_20%,var(--paper))] text-ink-2",
  contacted: "bg-[color-mix(in_srgb,var(--new,#4A6C8A)_25%,var(--paper))] text-[var(--new,#4A6C8A)]",
  tour_booked: "bg-[color-mix(in_srgb,var(--gold)_30%,var(--paper))] text-[var(--wood)]",
  quote_received: "bg-[color-mix(in_srgb,var(--wood)_25%,var(--paper))] text-[var(--wood)]",
  finalist: "bg-[color-mix(in_srgb,var(--sage)_35%,var(--paper))] text-[var(--sage-deep)]",
  out: "bg-[color-mix(in_srgb,var(--wine)_20%,var(--paper))] text-wine",
};

const CARD_COLORS = ["var(--sage-deep)", "var(--wood)", "var(--wine)", "var(--green)", "var(--gold)", "var(--sage)"];
const MAX_COMPARE = 3;

function firstLine(s: string) {
  return s.split(/\r?\n/).map((x) => x.trim()).find(Boolean);
}

export default function Dashboard({
  initialVenues,
  userName,
  photoUrls,
  assumptions,
  sharedVals,
}: {
  initialVenues: Venue[];
  userName: string;
  photoUrls: Record<string, string>;
  assumptions: Assumptions;
  sharedVals: number[];
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
    const favourite = active.find((v) => v.is_favourite) ?? withCost.find((x) => x.v.status === "finalist")?.v;
    const needQuote = active.filter((v) => !v.quote_received).length;
    const finalistNoQuote = active.find((v) => v.status === "finalist" && !v.quote_received);
    const inProgress = active.find((v) => (v.status === "contacted" || v.status === "tour_booked") && !v.quote_received);
    const missingCapacity = active.find((v) => !v.capacity);
    const nextAction = finalistNoQuote
      ? `Get the quote from ${finalistNoQuote.name}`
      : inProgress
      ? `Follow up on ${inProgress.name}`
      : missingCapacity
      ? `Confirm capacity at ${missingCapacity.name}`
      : "All active venues have quotes — time to compare and decide.";
    return {
      active: active.length,
      favourite: favourite?.name ?? "—",
      lowest: withCost[0] ? fmt(withCost[0].g) : "—",
      needQuote,
      nextAction,
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

  return (
    <div className="min-h-screen pb-20">
      <NavBar userName={userName} />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="font-serif italic text-wine">Come as you are, stay as long as you like.</p>
        <h1 className="mt-1 font-serif text-3xl font-medium sm:text-4xl">Where do Ariel &amp; Fred get married?</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          {as.adults + as.kids} guests ({as.adults} adults + {as.kids} kids) · early Sept 2029 · $40K target, $45K ceiling.
        </p>

        {venues.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
            <h2 className="font-serif text-2xl">Nothing here yet</h2>
            <p className="mt-2 text-ink-2">Start with the six venues from the original research, or add your own.</p>
            <button
              onClick={seed}
              disabled={seeding}
              className="mt-4 rounded-full bg-sage-deep px-4 py-2 font-semibold text-[#F7F3EA] disabled:opacity-60"
            >
              {seeding ? "Adding…" : "Add the 6 shortlisted venues"}
            </button>
            {error && <p className="mt-3 text-sm text-wine">{error}</p>}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-sm sm:grid-cols-4">
              <div className="bg-paper p-4">
                <span className="text-lg">🏛️</span>
                <b className="mt-1 block font-serif text-2xl">{stats.active}</b>
                <span className="mt-0.5 block text-xs uppercase tracking-wide text-ink-2">Active venues</span>
              </div>
              <div className="bg-paper p-4">
                <span className="text-lg">💛</span>
                <b className="mt-1 block font-serif text-2xl leading-tight">{stats.favourite}</b>
                <span className="mt-0.5 block text-xs uppercase tracking-wide text-ink-2">Current favourite</span>
              </div>
              <div className="bg-paper p-4">
                <span className="text-lg">💰</span>
                <b className="mt-1 block font-serif text-2xl">{stats.lowest}</b>
                <span className="mt-0.5 block text-xs uppercase tracking-wide text-ink-2">Lowest estimate</span>
              </div>
              <div className="bg-paper p-4">
                <span className="text-lg">📄</span>
                <b className="mt-1 block font-serif text-2xl">{stats.needQuote}</b>
                <span className="mt-0.5 block text-xs uppercase tracking-wide text-ink-2">Quotes needed</span>
              </div>
              <div className="col-span-2 bg-paper p-4 sm:col-span-4">
                <span className="text-lg">👉</span>
                <b className="mt-1 block text-wine">{stats.nextAction}</b>
                <span className="mt-0.5 block text-xs uppercase tracking-wide text-ink-2">Next action</span>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-ink-2">
                {venues.length} venue{venues.length === 1 ? "" : "s"} · tick <b>Compare</b> on 2–3 to see them side by side
              </p>
              <button onClick={addPlace} className="rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-[#F7F3EA]">
                ＋ Add a place
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((v, i) => {
                const calc = calcVenue(v, as, sharedVals);
                const photo = v.photos?.[0];
                const love = firstLine(v.pros);
                const warn = firstLine(v.cons) || (!v.capacity ? "Capacity not confirmed" : undefined);
                const pct = checklistPercent(v);
                const checked = compareIds.includes(v.id);
                const compareDisabled = !checked && compareIds.length >= MAX_COMPARE;
                return (
                  <div
                    key={v.id}
                    className="group flex flex-col overflow-hidden rounded-[20px] bg-paper shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link href={`/venues/${v.id}`} className="relative block aspect-[4/3] bg-line">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrls[photo.path]} alt={v.name} className="h-full w-full object-cover" />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center font-serif text-5xl text-white"
                          style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
                        >
                          {v.name.charAt(0)}
                        </div>
                      )}
                      <span className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[v.status]}`}>
                        {STATUSES[v.status]}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-7 text-white">
                        <span className="block font-serif text-lg font-semibold">{v.name}</span>
                        <span className="text-sm opacity-90">{v.location}</span>
                      </div>
                    </Link>
                    <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
                      <label className={`flex items-center gap-1.5 text-sm font-semibold ${compareDisabled ? "text-ink-2 opacity-50" : "text-ink-2"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={compareDisabled}
                          onChange={() => toggleCompare(v.id)}
                          className="h-4 w-4 accent-sage-deep"
                        />
                        Compare
                      </label>
                      <button
                        onClick={() => toggleFavourite(v)}
                        aria-label={v.is_favourite ? "Remove favourite" : "Mark as favourite"}
                        aria-pressed={v.is_favourite}
                        className={`text-lg ${v.is_favourite ? "" : "grayscale opacity-40 hover:opacity-70"}`}
                      >
                        ★
                      </button>
                    </div>
                    <Link href={`/venues/${v.id}`} className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-sm text-ink-2">
                        <span>
                          {calc.venueSource === "estimated" ? "≈ " : ""}
                          <b className="text-ink">{fmt(calc.grand)}</b>
                          {calc.venueSource !== "estimated" && (
                            <span className="ml-1 text-xs font-semibold text-sage-deep">({calc.venueSource})</span>
                          )}
                        </span>
                        <span><b className="text-ink">{v.capacity || "capacity TBD"}</b></span>
                        {v.turnkey && <span><b className="text-ink">{v.turnkey}</b></span>}
                      </div>
                      {love && <p className="text-sm text-wine">♥ {love}</p>}
                      {warn && <p className="text-sm text-[var(--wait,#a87a25)]">⚠ {warn}</p>}
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-sage-deep" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-ink-2">{pct}% quote</span>
                      </div>
                      <span className="mt-auto pt-2 text-sm font-semibold text-sage-deep group-hover:underline">
                        View venue →
                      </span>
                    </Link>
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
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-green px-5 py-3 text-sm font-semibold text-[#F7F3EA] shadow-md"
        >
          Compare {compareIds.length} venue{compareIds.length === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}
