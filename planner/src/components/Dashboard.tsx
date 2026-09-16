"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  STARTERS,
  DEFAULT_ASSUMPTIONS,
  calcVenue,
  defaultLines,
  fmt,
  type Venue,
} from "@/lib/venues";

const STATUS_STYLE: Record<Venue["status"], string> = {
  finalist: "bg-[color-mix(in_srgb,var(--sage)_35%,var(--paper))] text-[var(--sage-deep)]",
  keep: "bg-[color-mix(in_srgb,var(--gold)_30%,var(--paper))] text-[var(--wood)]",
  hold: "bg-[color-mix(in_srgb,var(--wood)_25%,var(--paper))] text-[var(--wood)]",
  new: "bg-[color-mix(in_srgb,var(--sage)_20%,var(--paper))] text-ink-2",
  out: "bg-[color-mix(in_srgb,var(--wine)_20%,var(--paper))] text-wine",
};

const CARD_COLORS = ["var(--sage-deep)", "var(--wood)", "var(--wine)", "var(--green)", "var(--gold)", "var(--sage)"];

function firstLine(s: string) {
  return s.split(/\r?\n/).map((x) => x.trim()).find(Boolean);
}

export default function Dashboard({ initialVenues, userEmail }: { initialVenues: Venue[]; userEmail: string }) {
  const [venues, setVenues] = useState(initialVenues);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const as = DEFAULT_ASSUMPTIONS;
  const sharedVals = useMemo(() => [], []);

  const stats = useMemo(() => {
    const active = venues.filter((v) => v.status !== "out");
    const withCost = active
      .map((v) => ({ v, g: calcVenue(v, as, sharedVals).grand }))
      .sort((a, b) => a.g - b.g);
    const favourite = withCost.find((x) => x.v.status === "finalist") ?? withCost[0];
    const needQuote = active.filter((v) => !v.quote_received).length;
    const finalistNoQuote = active.find((v) => v.status === "finalist" && !v.quote_received);
    const keepNoQuote = active.find((v) => v.status === "keep" && !v.quote_received);
    const missingCapacity = active.find((v) => !v.capacity);
    const nextAction = finalistNoQuote
      ? `Get the quote from ${finalistNoQuote.name}`
      : keepNoQuote
      ? `Decide whether to pursue a quote from ${keepNoQuote.name}`
      : missingCapacity
      ? `Confirm capacity at ${missingCapacity.name}`
      : "All active venues have quotes — time to compare and decide.";
    return {
      active: active.length,
      favourite: favourite?.v.name ?? "—",
      lowest: withCost[0] ? fmt(withCost[0].g) : "—",
      needQuote,
      nextAction,
    };
  }, [venues, as, sharedVals]);

  const sorted = useMemo(() => {
    const order: Record<Venue["status"], number> = { finalist: 0, keep: 1, new: 2, hold: 3, out: 4 };
    return [...venues].sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return calcVenue(a, as, sharedVals).grand - calcVenue(b, as, sharedVals).grand;
    });
  }, [venues, as, sharedVals]);

  async function seed() {
    setSeeding(true);
    setError("");
    const supabase = createClient();
    const rows = STARTERS.map((s) => ({
      ...s,
      budget_lines: defaultLines(s.key ?? null),
    }));
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
      .insert({ name: "New place", sort_order: venues.length + 1, budget_lines: defaultLines(null) })
      .select()
      .single();
    if (error) setError(error.message);
    else if (data) setVenues((v) => [...v, data as Venue]);
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <span className="font-serif text-base">Ariel &amp; Fred</span>
          <nav className="flex gap-1">
            <span className="rounded-full bg-green px-3 py-1.5 text-sm font-semibold text-[#F7F3EA]">Dashboard</span>
            <Link href="/budget" className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-2 hover:bg-bg hover:text-ink">
              Budget
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-2 sm:inline">{userEmail}</span>
            <form action="/logout" method="post">
              <button className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:border-sage-deep">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="font-serif italic text-wine">Come as you are, stay as long as you like.</p>
        <h1 className="mt-1 font-serif text-3xl font-medium sm:text-4xl">Where do Ariel &amp; Fred get married?</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          ~95 guests (80 adults + 15 kids, up to 102) · early Sept 2029 · $40K target, $45K ceiling.
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
                <b className="font-serif text-2xl">{stats.active}</b>
                <span className="mt-1 block text-xs uppercase tracking-wide text-ink-2">Active contenders</span>
              </div>
              <div className="bg-paper p-4">
                <b className="font-serif text-2xl leading-tight">{stats.favourite}</b>
                <span className="mt-1 block text-xs uppercase tracking-wide text-ink-2">Current favourite</span>
              </div>
              <div className="bg-paper p-4">
                <b className="font-serif text-2xl">{stats.lowest}</b>
                <span className="mt-1 block text-xs uppercase tracking-wide text-ink-2">Lowest estimated cost</span>
              </div>
              <div className="bg-paper p-4">
                <b className="font-serif text-2xl">{stats.needQuote}</b>
                <span className="mt-1 block text-xs uppercase tracking-wide text-ink-2">Quotes still needed</span>
              </div>
              <div className="col-span-2 bg-paper p-4 sm:col-span-4">
                <b className="text-wine">{stats.nextAction}</b>
                <span className="mt-1 block text-xs uppercase tracking-wide text-ink-2">Next action</span>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-ink-2">{venues.length} venue{venues.length === 1 ? "" : "s"}</p>
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
                return (
                  <Link
                    key={v.id}
                    href={`/venues/${v.id}`}
                    className="group flex flex-col overflow-hidden rounded-[20px] bg-paper shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] bg-line">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.path} alt={v.name} className="h-full w-full object-cover" />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center font-serif text-5xl text-white"
                          style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
                        >
                          {v.name.charAt(0)}
                        </div>
                      )}
                      <span className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[v.status]}`}>
                        {v.status === "finalist" ? "Finalist" : v.status === "keep" ? "Keep" : v.status === "hold" ? "On hold" : v.status === "out" ? "Out" : "New"}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-7 text-white">
                        <span className="block font-serif text-lg font-semibold">{v.name}</span>
                        <span className="text-sm opacity-90">{v.location}</span>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-sm text-ink-2">
                        <span>≈ <b className="text-ink">{fmt(calc.grand)}</b></span>
                        <span><b className="text-ink">{v.capacity || "capacity TBD"}</b></span>
                        {v.turnkey && <span><b className="text-ink">{v.turnkey}</b></span>}
                      </div>
                      {love && <p className="text-sm text-wine">♥ {love}</p>}
                      {warn && <p className="text-sm text-[var(--wait,#a87a25)]">⚠ {warn}</p>}
                      {v.quote_received && <span className="text-xs font-semibold text-sage-deep">✓ Quote received</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
