"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
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
  type Venue,
} from "@/lib/venues";

const CARD_COLORS = ["var(--sage-deep)", "var(--wood)", "var(--wine)", "var(--green)", "var(--gold)", "var(--sage)"];
const MAX_COMPARE = 3;
const CARD_TRANSITION = "transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:transform-none";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function VenueShortlist({
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

  function venueCard(v: Venue, i: number) {
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
  }

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {venues.length === 0 ? (
          <div className="rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
            <h1 className="font-serif text-2xl">Nothing here yet</h1>
            <p className="mt-2 text-ink-2">Start with the six venues from the original research, or add your own.</p>
            <button
              onClick={seed}
              disabled={seeding}
              className={`mt-4 rounded-full bg-sage-deep px-4 py-2 font-semibold text-white disabled:opacity-60 ${FOCUS_RING}`}
            >
              {seeding ? "Adding…" : "Add the 6 shortlisted venues"}
            </button>
            {error && <p className="mt-3 text-sm text-wine">{error}</p>}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-serif text-2xl font-medium">Venue shortlist</h1>
                <p className="mt-1 text-sm text-ink-2">Choose 2–3 venues to compare side by side</p>
              </div>
              <button onClick={addPlace} className={`rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
                ＋ Add a place
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-wine">{error}</p>}

            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((v, i) => venueCard(v, i))}
            </div>
          </>
        )}
      </div>

      {compareIds.length >= 2 && (
        <button
          onClick={() => router.push(`/compare?ids=${compareIds.join(",")}`)}
          className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-green px-5 py-3 text-sm font-semibold text-white shadow-md ${FOCUS_RING}`}
        >
          Compare {compareIds.length} venue{compareIds.length === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}
