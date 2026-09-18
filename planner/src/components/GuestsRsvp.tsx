"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { guestNeeds, RSVP_LABELS, type Guest, type RsvpStatus } from "@/lib/guests";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

type RsvpFilter = "all" | "awaiting" | "attending" | "declined" | "incomplete" | "follow_up";

function rsvpPillClass(status: RsvpStatus) {
  if (status === "yes") return "border-sage-deep bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))] text-sage-deep";
  if (status === "no") return "border-wine bg-[color-mix(in_srgb,var(--wine)_15%,var(--paper))] text-wine";
  return "border-gold bg-[color-mix(in_srgb,var(--gold)_22%,var(--paper))] text-ink";
}

export default function GuestsRsvp({ initialGuests }: { initialGuests: Guest[] }) {
  const [guests, setGuests] = useState(initialGuests);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<RsvpFilter>("all");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  function scheduleSave(id: string, patch: Partial<Guest>) {
    setGuests((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("guests").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  const counts = useMemo(() => {
    const incomplete = (g: Guest) => g.rsvp_status === "yes" && !g.meal_selection.trim();
    const followUp = (g: Guest) => g.rsvp_status === "pending" && g.invitation_sent;
    return {
      all: guests.length,
      awaiting: guests.filter((g) => g.rsvp_status === "pending").length,
      attending: guests.filter((g) => g.rsvp_status === "yes").length,
      declined: guests.filter((g) => g.rsvp_status === "no").length,
      incomplete: guests.filter(incomplete).length,
      follow_up: guests.filter(followUp).length,
    };
  }, [guests]);

  const filtered = guests.filter((g) => {
    if (filter === "awaiting") return g.rsvp_status === "pending";
    if (filter === "attending") return g.rsvp_status === "yes";
    if (filter === "declined") return g.rsvp_status === "no";
    if (filter === "incomplete") return g.rsvp_status === "yes" && !g.meal_selection.trim();
    if (filter === "follow_up") return g.rsvp_status === "pending" && g.invitation_sent;
    return true;
  });

  const FILTERS: [RsvpFilter, string][] = [
    ["all", `All ${counts.all}`],
    ["awaiting", `Awaiting reply ${counts.awaiting}`],
    ["attending", `Attending ${counts.attending}`],
    ["declined", `Declined ${counts.declined}`],
    ["incomplete", `Incomplete ${counts.incomplete}`],
    ["follow_up", `Needs follow-up ${counts.follow_up}`],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filter === key ? "border-sage-deep bg-sage-deep text-white" : "border-line bg-bg text-ink hover:border-sage-deep"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-wine">{error}</p>}

      <div className="mt-4 flex flex-col divide-y divide-line rounded-2xl border border-line bg-paper shadow-sm">
        {filtered.length === 0 && <p className="p-5 text-sm text-ink-2">No households match this filter.</p>}
        {filtered.map((g) => {
          const needs = guestNeeds(g);
          return (
            <div key={g.id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <Link href="/guests/list" className={`rounded font-semibold text-ink hover:text-sage-deep ${FOCUS_RING}`}>
                  {g.name}
                </Link>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                  {g.party_size} adult{g.party_size === 1 ? "" : "s"}
                  {g.kids_count > 0 && ` · ${g.kids_count} child${g.kids_count === 1 ? "" : "ren"}`}
                  {needs.map((n) => (
                    <span key={n} className="rounded-full bg-bg px-2 py-0.5">{n}</span>
                  ))}
                </p>
              </div>
              <input
                defaultValue={g.meal_selection}
                onChange={(e) => scheduleSave(g.id, { meal_selection: e.target.value })}
                placeholder="Meal selection…"
                className="w-40 shrink-0 rounded border border-line bg-bg px-2 py-1 text-sm outline-none focus:border-sage-deep"
              />
              <select
                value={g.rsvp_status}
                onChange={(e) => scheduleSave(g.id, { rsvp_status: e.target.value as RsvpStatus })}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${rsvpPillClass(g.rsvp_status)}`}
              >
                {Object.entries(RSVP_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
