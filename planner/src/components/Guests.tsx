"use client";

import { useMemo, useRef, useState } from "react";
import { Accessibility, BedDouble, Car, Download, Ellipsis, Search, Utensils, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import {
  blankGuest,
  groupByCategory,
  guestGroupOptions,
  guestNeeds,
  guestSummary,
  guestsToCsv,
  RSVP_LABELS,
  type Guest,
  type RsvpStatus,
} from "@/lib/guests";

const GUEST_TARGET = 80;
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const NEED_ICONS: Record<string, { icon: typeof Utensils; label: string }> = {
  dietary: { icon: Utensils, label: "Dietary needs" },
  accessibility: { icon: Accessibility, label: "Accessibility needs" },
  accommodation: { icon: BedDouble, label: "Accommodation needed" },
  transportation: { icon: Car, label: "Transportation needed" },
};

function rsvpPillClass(status: RsvpStatus) {
  if (status === "yes") return "border-sage-deep bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))] text-sage-deep";
  if (status === "no") return "border-wine bg-[color-mix(in_srgb,var(--wine)_15%,var(--paper))] text-wine";
  return "border-gold bg-[color-mix(in_srgb,var(--gold)_22%,var(--paper))] text-ink";
}

export default function Guests({ initialGuests, userName }: { initialGuests: Guest[]; userName: string }) {
  const [guests, setGuests] = useState(initialGuests);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [rsvpFilter, setRsvpFilter] = useState<"all" | RsvpStatus>("all");
  const [needsChildrenOnly, setNeedsChildrenOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [moreOpenId, setMoreOpenId] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const summary = guestSummary(guests, GUEST_TARGET);
  const capacityPct = GUEST_TARGET > 0 ? Math.round((summary.adults / GUEST_TARGET) * 100) : 0;
  const groups = [...new Set(guests.map((g) => g.category || "Uncategorized"))].sort();
  const open = guests.find((g) => g.id === openId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (q && !`${g.name} ${g.plus_one} ${g.notes}`.toLowerCase().includes(q)) return false;
      if (groupFilter !== "all" && (g.category || "Uncategorized") !== groupFilter) return false;
      if (rsvpFilter !== "all" && g.rsvp_status !== rsvpFilter) return false;
      if (needsChildrenOnly && g.kids_count === 0) return false;
      return true;
    });
  }, [guests, search, groupFilter, rsvpFilter, needsChildrenOnly]);

  const grouped = groupByCategory(filtered);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2000);
  }

  function patchLocal(id: string, patch: Partial<Guest>) {
    setGuests((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  async function save(id: string, patch: Partial<Guest>) {
    const { error } = await supabase.from("guests").update(patch).eq("id", id);
    if (error) setError(error.message);
    else flash("Saved");
  }

  function scheduleSave(id: string, patch: Partial<Guest>) {
    patchLocal(id, patch);
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => save(id, patch), 700);
  }

  async function saveNow(id: string, patch: Partial<Guest>) {
    patchLocal(id, patch);
    await save(id, patch);
  }

  async function addGuest() {
    setError("");
    const { data, error } = await supabase
      .from("guests")
      .insert(blankGuest({ sort_order: guests.length + 1 }))
      .select()
      .single();
    if (error) setError(error.message);
    else if (data) {
      setGuests((gs) => [...gs, data as Guest]);
      setOpenId((data as Guest).id);
    }
  }

  async function duplicateGuest(g: Guest) {
    setError("");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, ...rest } = g;
    const { data, error } = await supabase
      .from("guests")
      .insert({ ...rest, name: `${g.name} (copy)`, sort_order: guests.length + 1 })
      .select()
      .single();
    if (error) setError(error.message);
    else if (data) setGuests((gs) => [...gs, data as Guest]);
  }

  async function removeGuest(id: string) {
    if (!confirm("Remove this household?")) return;
    setGuests((gs) => gs.filter((g) => g.id !== id));
    setSelectedIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    if (openId === id) setOpenId(null);
    await supabase.from("guests").delete().eq("id", id);
  }

  function toggleSelected(id: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function moveSelectedTo(category: string) {
    const ids = [...selectedIds];
    setGuests((gs) => gs.map((g) => (ids.includes(g.id) ? { ...g, category } : g)));
    setSelectedIds(new Set());
    await supabase.from("guests").update({ category }).in("id", ids);
    flash(`Moved ${ids.length} household${ids.length === 1 ? "" : "s"}`);
  }

  function moveOne(g: Guest) {
    const name = window.prompt("Move to which group?", g.category)?.trim();
    if (name) saveNow(g.id, { category: name });
  }

  function exportCsv() {
    const csv = guestsToCsv(guests);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guest-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Guest List</h1>
        <p className="mt-2 max-w-2xl text-ink-2">{summary.households} households · shared and live.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
            <b className="block font-serif text-2xl">{summary.totalWithKids}</b>
            <span className="text-xs text-ink-2">{summary.adults} adults + {summary.kids} children</span>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
            <b className={`block font-serif text-2xl ${summary.overBy > 0 ? "text-wine" : ""}`}>
              {summary.overBy > 0 ? `${summary.overBy} over target` : summary.overBy < 0 ? `${-summary.overBy} under target` : "At target"}
            </b>
            <span className="text-xs text-ink-2">target: {GUEST_TARGET} adults</span>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
            <b className="block font-serif text-2xl">{summary.confirmed}</b>
            <span className="text-xs text-ink-2">confirmed</span>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
            <b className="block font-serif text-2xl">{summary.pending}</b>
            <span className="text-xs text-ink-2">households awaiting RSVP</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-paper p-4 shadow-sm">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-ink">{summary.adults} of {GUEST_TARGET} adult places</span>
            <span className={`font-semibold ${capacityPct > 100 ? "text-wine" : "text-ink-2"}`}>{capacityPct}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full ${capacityPct > 100 ? "bg-wine" : "bg-sage-deep"}`}
              style={{ width: `${Math.min(100, capacityPct)}%` }}
            />
          </div>
          {summary.overBy > 0 && (
            <p className="mt-2 text-sm text-ink-2">
              You need to remove or reconsider {summary.overBy} adult invitation{summary.overBy === 1 ? "" : "s"} to reach your target.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search households…"
              className="w-full rounded-full border border-line bg-paper py-2 pl-9 pr-3 text-sm outline-none focus:border-sage-deep"
            />
          </div>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink-2"
          >
            <option value="all">All groups</option>
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button
            onClick={() => setNeedsChildrenOnly((v) => !v)}
            className={`rounded-full border px-3 py-2 text-sm font-semibold ${needsChildrenOnly ? "border-sage-deep bg-sage-deep text-white" : "border-line bg-paper text-ink-2 hover:border-sage-deep"}`}
          >
            With children
          </button>
          <button onClick={addGuest} className={`rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
            ＋ Add household
          </button>
          <button
            onClick={exportCsv}
            className={`flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}
          >
            <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Export
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ["all", `All ${summary.households}`],
            ["pending", `Pending ${summary.pending}`],
            ["yes", `Attending ${guests.filter((g) => g.rsvp_status === "yes").length}`],
            ["no", `Declined ${summary.declined}`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRsvpFilter(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                rsvpFilter === key ? "border-sage-deep bg-sage-deep text-white" : "border-line bg-bg text-ink hover:border-sage-deep"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}
        {notice && <p className="mt-2 text-sm text-sage-deep">{notice}</p>}

        {selectedIds.size > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-sage-deep bg-[color-mix(in_srgb,var(--sage)_16%,var(--paper))] px-4 py-2.5">
            <span className="text-sm font-semibold text-ink">{selectedIds.size} selected</span>
            <select
              defaultValue=""
              onChange={(e) => e.target.value && moveSelectedTo(e.target.value)}
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm"
            >
              <option value="" disabled>Move to…</option>
              {groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <button onClick={() => setSelectedIds(new Set())} className="text-sm font-semibold text-ink-2 hover:text-ink">
              Clear selection
            </button>
          </div>
        )}

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
                        <th className="w-8 px-3 py-2"></th>
                        <th className="px-3 py-2">Household</th>
                        <th className="px-3 py-2 text-right">Adults</th>
                        <th className="px-3 py-2 text-right">Children</th>
                        <th className="px-3 py-2">RSVP</th>
                        <th className="px-3 py-2">Needs</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((g) => {
                        const needs = guestNeeds(g);
                        return (
                          <tr key={g.id} className="border-b border-line last:border-0 odd:bg-[color-mix(in_srgb,var(--bg)_45%,transparent)]">
                            <td className="px-3 py-1.5">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(g.id)}
                                onChange={() => toggleSelected(g.id)}
                                aria-label={`Select ${g.name}`}
                                className="h-4 w-4 accent-sage-deep"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <button onClick={() => setOpenId(g.id)} className={`rounded text-left font-semibold text-ink hover:text-sage-deep ${FOCUS_RING}`}>
                                {g.name}
                              </button>
                              {g.group_label && <span className="block text-xs text-ink-2">{g.group_label}</span>}
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
                                className={`rounded-full border px-2 py-1 text-xs font-semibold ${rsvpPillClass(g.rsvp_status)}`}
                              >
                                {Object.entries(RSVP_LABELS).map(([k, label]) => (
                                  <option key={k} value={k}>{label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              {needs.length === 0 ? (
                                <span className="text-ink-2">—</span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  {needs.map((n) => {
                                    const N = NEED_ICONS[n];
                                    return (
                                      <span key={n} title={N.label}>
                                        <N.icon className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-label={N.label} />
                                      </span>
                                    );
                                  })}
                                </span>
                              )}
                            </td>
                            <td className="relative px-3 py-1.5">
                              <button
                                onClick={() => setMoreOpenId((id) => (id === g.id ? null : g.id))}
                                aria-label="More actions"
                                aria-expanded={moreOpenId === g.id}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-ink"
                              >
                                <Ellipsis className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                              </button>
                              {moreOpenId === g.id && (
                                <>
                                  <button aria-label="Close menu" onClick={() => setMoreOpenId(null)} className="fixed inset-0 z-40 cursor-default" />
                                  <div className="absolute right-3 top-9 z-50 overflow-hidden rounded-xl border border-line bg-paper shadow-md">
                                    <button
                                      onClick={() => {
                                        setMoreOpenId(null);
                                        setOpenId(g.id);
                                      }}
                                      className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm font-semibold text-ink hover:bg-bg"
                                    >
                                      Edit household
                                    </button>
                                    <button
                                      onClick={() => {
                                        setMoreOpenId(null);
                                        moveOne(g);
                                      }}
                                      className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm font-semibold text-ink hover:bg-bg"
                                    >
                                      Move group
                                    </button>
                                    <button
                                      onClick={() => {
                                        setMoreOpenId(null);
                                        duplicateGuest(g);
                                      }}
                                      className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm font-semibold text-ink hover:bg-bg"
                                    >
                                      Duplicate
                                    </button>
                                    <button
                                      onClick={() => {
                                        setMoreOpenId(null);
                                        removeGuest(g.id);
                                      }}
                                      className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm font-semibold text-wine hover:bg-bg"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button aria-label="Close" onClick={() => setOpenId(null)} className="absolute inset-0" />
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-paper shadow-lg">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <input
                defaultValue={open.name}
                onChange={(e) => scheduleSave(open.id, { name: e.target.value })}
                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-xl font-medium outline-none focus:border-line focus:bg-bg"
              />
              <button
                onClick={() => setOpenId(null)}
                aria-label="Close"
                className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg"
              >
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Group</label>
                  <select
                    value={open.category}
                    onChange={(e) => scheduleSave(open.id, { category: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  >
                    {!open.category && <option value="">Choose a group…</option>}
                    {guestGroupOptions(guests).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Role</label>
                  <input
                    defaultValue={open.group_label}
                    onChange={(e) => scheduleSave(open.id, { group_label: e.target.value })}
                    placeholder="e.g. Bride's family"
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink-2">Plus-one / additional member note</label>
              <input
                defaultValue={open.plus_one}
                onChange={(e) => scheduleSave(open.id, { plus_one: e.target.value })}
                className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Email</label>
                  <input
                    type="email"
                    defaultValue={open.email}
                    onChange={(e) => scheduleSave(open.id, { email: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Phone</label>
                  <input
                    type="tel"
                    defaultValue={open.phone}
                    onChange={(e) => scheduleSave(open.id, { phone: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink-2">Mailing address</label>
              <input
                defaultValue={open.address}
                onChange={(e) => scheduleSave(open.id, { address: e.target.value })}
                className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Dietary restrictions</label>
                  <input
                    defaultValue={open.dietary}
                    onChange={(e) => scheduleSave(open.id, { dietary: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Accessibility needs</label>
                  <input
                    defaultValue={open.accessibility}
                    onChange={(e) => scheduleSave(open.id, { accessibility: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Meal selection</label>
                  <input
                    defaultValue={open.meal_selection}
                    onChange={(e) => scheduleSave(open.id, { meal_selection: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Assigned table</label>
                  <input
                    defaultValue={open.table_assignment}
                    onChange={(e) => scheduleSave(open.id, { table_assignment: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {([
                  ["accommodation_needed", "Accommodation needed"],
                  ["transportation_needed", "Transportation needed"],
                  ["invitation_sent", "Invitation sent"],
                  ["gift_received", "Gift received"],
                  ["thank_you_sent", "Thank-you sent"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={open[key]}
                      onChange={(e) => saveNow(open.id, { [key]: e.target.checked })}
                      className="h-4 w-4 accent-sage-deep"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-2">Private planning notes</label>
              <textarea
                defaultValue={open.notes}
                onChange={(e) => scheduleSave(open.id, { notes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <button onClick={() => removeGuest(open.id)} className="mt-4 text-xs font-semibold text-wine">
                Remove this household
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
