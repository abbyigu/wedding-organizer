"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import {
  blankVendor,
  VENDOR_CATEGORIES,
  VENDOR_STATUS_LABELS,
  VENDOR_STATUS_ORDER,
  type Vendor,
  type VendorStatus,
} from "@/lib/vendors";
import { fmt } from "@/lib/venues";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function statusPillClass(status: VendorStatus) {
  if (status === "confirmed") return "border-sage-deep bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))] text-sage-deep";
  if (status === "booked") return "border-green bg-[color-mix(in_srgb,var(--green)_18%,var(--paper))] text-green";
  if (status === "contacted") return "border-gold bg-[color-mix(in_srgb,var(--gold)_22%,var(--paper))] text-ink";
  return "border-line bg-bg text-ink-2";
}

export default function Vendors({ initialVendors, userName }: { initialVendors: Vendor[]; userName: string }) {
  const [vendors, setVendors] = useState(initialVendors);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const open = vendors.find((v) => v.id === openId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (q && !`${v.name} ${v.contact_name} ${v.notes}`.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && v.category !== categoryFilter) return false;
      return true;
    });
  }, [vendors, search, categoryFilter]);

  function patchLocal(id: string, patch: Partial<Vendor>) {
    setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  async function save(id: string, patch: Partial<Vendor>) {
    const { error } = await supabase.from("vendors").update(patch).eq("id", id);
    if (error) setError(error.message);
  }

  function scheduleSave(id: string, patch: Partial<Vendor>) {
    patchLocal(id, patch);
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => save(id, patch), 700);
  }

  async function saveNow(id: string, patch: Partial<Vendor>) {
    patchLocal(id, patch);
    await save(id, patch);
  }

  async function addVendor() {
    setError("");
    const { data, error } = await supabase.from("vendors").insert(blankVendor(vendors.length)).select().single();
    if (error) setError(error.message);
    else if (data) {
      setVendors((vs) => [...vs, data as Vendor]);
      setOpenId((data as Vendor).id);
    }
  }

  async function removeVendor(id: string) {
    if (!confirm("Remove this vendor?")) return;
    setVendors((vs) => vs.filter((v) => v.id !== id));
    if (openId === id) setOpenId(null);
    await supabase.from("vendors").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Vendors</h1>
            <p className="mt-2 text-ink-2">Everyone you&apos;re hiring, in one place.</p>
          </div>
          <button onClick={addVendor} className={`flex shrink-0 items-center gap-1.5 rounded-full bg-sage-deep px-4 py-2.5 text-sm font-semibold text-white ${FOCUS_RING}`}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Add vendor
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.png" alt="" aria-hidden className="pointer-events-none absolute -right-6 -top-12 hidden h-40 w-auto rotate-[8deg] opacity-30 sm:block" />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors…"
              className="w-full rounded-full border border-line bg-paper py-2 pl-9 pr-3 text-sm outline-none focus:border-sage-deep"
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink-2">
            <option value="all">All categories</option>
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        <div className="mt-4 flex flex-col divide-y divide-line rounded-2xl border border-line bg-paper shadow-sm">
          {filtered.length === 0 && <p className="p-5 text-sm text-ink-2">No vendors yet — add the first one you&apos;re talking to.</p>}
          {filtered.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 p-4 hover:bg-bg sm:flex-nowrap">
              <button onClick={() => setOpenId(v.id)} className={`min-w-0 flex-1 rounded text-left ${FOCUS_RING}`}>
                <p className="font-semibold text-ink">{v.name}</p>
                <p className="text-sm text-ink-2">{v.category}{v.contact_name && ` · ${v.contact_name}`}</p>
              </button>
              {v.cost != null && <span className="shrink-0 font-serif text-lg">{fmt(v.cost)}</span>}
              <select
                value={v.status}
                onChange={(e) => scheduleSave(v.id, { status: e.target.value as VendorStatus })}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClass(v.status)}`}
              >
                {VENDOR_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{VENDOR_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          ))}
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
              <button onClick={() => setOpenId(null)} aria-label="Close" className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg">
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Category</label>
                  <select
                    value={open.category}
                    onChange={(e) => scheduleSave(open.id, { category: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  >
                    {VENDOR_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Status</label>
                  <select
                    value={open.status}
                    onChange={(e) => saveNow(open.id, { status: e.target.value as VendorStatus })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  >
                    {VENDOR_STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{VENDOR_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Contact name</label>
                  <input
                    defaultValue={open.contact_name}
                    onChange={(e) => scheduleSave(open.id, { contact_name: e.target.value })}
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
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Website</label>
                  <input
                    defaultValue={open.website}
                    onChange={(e) => scheduleSave(open.id, { website: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Cost</label>
                  <input
                    type="number"
                    min={0}
                    defaultValue={open.cost ?? ""}
                    onChange={(e) => scheduleSave(open.id, { cost: e.target.value ? +e.target.value : null })}
                    placeholder="$"
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={open.deposit_paid}
                    onChange={(e) => saveNow(open.id, { deposit_paid: e.target.checked })}
                    className="h-4 w-4 accent-sage-deep"
                  />
                  Deposit paid
                </label>
              </div>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink-2">Notes</label>
              <textarea
                defaultValue={open.notes}
                onChange={(e) => scheduleSave(open.id, { notes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <button onClick={() => removeVendor(open.id)} className="mt-4 text-xs font-semibold text-wine">
                Remove this vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
