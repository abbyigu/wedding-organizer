"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { blankGuest, groupByCategory, guestSummary, RSVP_LABELS, type Guest, type RsvpStatus } from "@/lib/guests";

const GUEST_TARGET = 80;

export default function Guests({ initialGuests, userName }: { initialGuests: Guest[]; userName: string }) {
  const [guests, setGuests] = useState(initialGuests);
  const [error, setError] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const summary = guestSummary(guests, GUEST_TARGET);
  const grouped = groupByCategory(guests);

  function patchLocal(id: string, patch: Partial<Guest>) {
    setGuests((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  async function save(id: string, patch: Partial<Guest>) {
    const { error } = await supabase.from("guests").update(patch).eq("id", id);
    if (error) setError(error.message);
  }

  function scheduleSave(id: string, patch: Partial<Guest>) {
    patchLocal(id, patch);
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => save(id, patch), 700);
  }

  async function addGuest() {
    setError("");
    const { data, error } = await supabase
      .from("guests")
      .insert(blankGuest({ sort_order: guests.length + 1 }))
      .select()
      .single();
    if (error) setError(error.message);
    else if (data) setGuests((gs) => [...gs, data as Guest]);
  }

  async function removeGuest(id: string) {
    if (!confirm("Remove this guest?")) return;
    setGuests((gs) => gs.filter((g) => g.id !== id));
    await supabase.from("guests").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Guest List</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          {summary.households} households · imported from your tracker, now shared and live.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-sm sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Adults", summary.adults],
            ["Kids", summary.kids],
            ["Total w/ kids", summary.totalWithKids],
            ["Vs. target (adults)", summary.remaining >= 0 ? `+${summary.remaining}` : summary.remaining],
            ["Confirmed (Yes)", summary.confirmed],
            ["Pending", summary.pending],
          ].map(([label, value]) => (
            <div key={label} className="bg-paper p-4">
              <b className="block font-serif text-2xl">{value}</b>
              <span className="mt-0.5 block text-xs uppercase tracking-wide text-ink-2">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-ink-2">Target: {GUEST_TARGET} adults</p>
          <button onClick={addGuest} className="rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white">
            ＋ Add a guest
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        <div className="mt-6 flex flex-col gap-4">
          {grouped.map(([category, list]) => {
            const catAdults = list.reduce((n, g) => n + g.party_size, 0);
            const catKids = list.reduce((n, g) => n + g.kids_count, 0);
            return (
              <details key={category} open className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
                <summary className="cursor-pointer select-none list-none bg-bg px-4 py-3 font-serif text-lg font-medium marker:content-none">
                  <span className="mr-2 inline-block transition-transform [details[open]_&]:rotate-90">▸</span>
                  {category}
                  <span className="ml-2 text-sm font-normal text-ink-2">
                    {list.length} households · {catAdults} adults + {catKids} kids
                  </span>
                </summary>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-2">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Plus-one / household</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2 text-right">Party</th>
                        <th className="px-3 py-2 text-right">Kids</th>
                        <th className="px-3 py-2">RSVP</th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((g) => (
                        <tr key={g.id} className="border-b border-line last:border-0 odd:bg-[color-mix(in_srgb,var(--bg)_45%,transparent)]">
                          <td className="px-3 py-1.5">
                            <input
                              defaultValue={g.name}
                              onChange={(e) => scheduleSave(g.id, { name: e.target.value })}
                              className="w-32 rounded border border-transparent bg-transparent px-1 py-1 outline-none focus:border-line focus:bg-bg"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              defaultValue={g.plus_one}
                              onChange={(e) => scheduleSave(g.id, { plus_one: e.target.value })}
                              className="w-36 rounded border border-transparent bg-transparent px-1 py-1 outline-none focus:border-line focus:bg-bg"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              defaultValue={g.group_label}
                              onChange={(e) => scheduleSave(g.id, { group_label: e.target.value })}
                              className="w-28 rounded border border-transparent bg-transparent px-1 py-1 text-xs text-ink-2 outline-none focus:border-line focus:bg-bg"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <input
                              type="number"
                              min={0}
                              defaultValue={g.party_size}
                              onChange={(e) => scheduleSave(g.id, { party_size: +e.target.value || 0 })}
                              className="w-14 rounded border border-line bg-bg px-1 py-1 text-right"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <input
                              type="number"
                              min={0}
                              defaultValue={g.kids_count}
                              onChange={(e) => scheduleSave(g.id, { kids_count: +e.target.value || 0 })}
                              className="w-14 rounded border border-line bg-bg px-1 py-1 text-right"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              value={g.rsvp_status}
                              onChange={(e) => scheduleSave(g.id, { rsvp_status: e.target.value as RsvpStatus })}
                              className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                                g.rsvp_status === "yes"
                                  ? "border-sage-deep bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))] text-sage-deep"
                                  : g.rsvp_status === "no"
                                  ? "border-wine bg-[color-mix(in_srgb,var(--wine)_15%,var(--paper))] text-wine"
                                  : "border-line bg-bg text-ink-2"
                              }`}
                            >
                              {Object.entries(RSVP_LABELS).map(([k, label]) => (
                                <option key={k} value={k}>{label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              defaultValue={g.notes}
                              placeholder="—"
                              onChange={(e) => scheduleSave(g.id, { notes: e.target.value })}
                              className="w-36 rounded border border-transparent bg-transparent px-1 py-1 text-ink-2 outline-none focus:border-line focus:bg-bg"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <button onClick={() => removeGuest(g.id)} aria-label={`Remove ${g.name}`} className="text-wine">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
