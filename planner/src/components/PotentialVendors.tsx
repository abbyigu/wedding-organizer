"use client";

import { useDialog } from "@/lib/use-dialog";
import { useConfirm } from "@/components/ConfirmProvider";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Camera, MapPin, Plus, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeUrl } from "@/lib/ideas";
import { blankVendor as blankBookedVendor, type Vendor } from "@/lib/vendors";
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_ORDER,
  blankPotentialVendor,
  COMMUNICATION_LABELS,
  COMMUNICATION_ORDER,
  DECISION_LABELS,
  DECISION_ORDER,
  POTENTIAL_VENDOR_CATEGORIES,
  priceRange,
  REACTION_EMOJI,
  REACTION_LABELS,
  REACTION_ORDER,
  WORKS_WITH_VENUE_LABELS,
  WORKS_WITH_VENUE_ORDER,
  type Availability,
  type CommunicationStatus,
  type DecisionStatus,
  type PotentialVendor,
  type PriceUnit,
  type Reaction,
  type WorksWithVenue,
} from "@/lib/potential-vendors";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const FIELD = "mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

const QUICK_FILTERS = [
  { key: "favourite", label: "Favourite" },
  { key: "available", label: "Available" },
  { key: "quote_received", label: "Quote received" },
  { key: "follow_up_needed", label: "Needs follow-up" },
] as const;
type QuickFilter = (typeof QUICK_FILTERS)[number]["key"] | "none";

export default function PotentialVendors({ initialVendors }: { initialVendors: PotentialVendor[] }) {
  const confirm = useConfirm();
  const [vendors, setVendors] = useState(initialVendors);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("none");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const open = vendors.find((v) => v.id === openId) ?? null;
  const dialogRef = useDialog(Boolean(open), () => setOpenId(null));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (q && !`${v.name} ${v.city} ${v.notes}`.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "All" && v.category !== categoryFilter) return false;
      if (quickFilter === "favourite" && v.ariel_reaction !== "love" && v.fred_reaction !== "love") return false;
      if (quickFilter === "available" && v.availability !== "available") return false;
      if (quickFilter === "quote_received" && v.communication_status !== "quote_received") return false;
      if (quickFilter === "follow_up_needed" && v.communication_status !== "follow_up_needed") return false;
      return true;
    });
  }, [vendors, search, categoryFilter, quickFilter]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }

  function patchLocal(id: string, patch: Partial<PotentialVendor>) {
    setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  async function save(id: string, patch: Partial<PotentialVendor>) {
    const { error } = await supabase.from("potential_vendors").update(patch).eq("id", id);
    if (error) setError(error.message);
  }

  function scheduleSave(id: string, patch: Partial<PotentialVendor>) {
    patchLocal(id, patch);
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => save(id, patch), 700);
  }

  async function saveNow(id: string, patch: Partial<PotentialVendor>) {
    patchLocal(id, patch);
    await save(id, patch);
  }

  async function addVendor() {
    setError("");
    const { data, error } = await supabase.from("potential_vendors").insert(blankPotentialVendor(vendors.length)).select().single();
    if (error) setError(error.message);
    else if (data) {
      setVendors((vs) => [...vs, data as PotentialVendor]);
      setOpenId((data as PotentialVendor).id);
    }
  }

  async function removeVendor(id: string) {
    if (!(await confirm("Remove this potential vendor?"))) return;
    setVendors((vs) => vs.filter((v) => v.id !== id));
    if (openId === id) setOpenId(null);
    setCompareIds((ids) => ids.filter((x) => x !== id));
    await supabase.from("potential_vendors").delete().eq("id", id);
  }

  async function moveToBooked(v: PotentialVendor) {
    if (!(await confirm(`Move ${v.name} to Booked Vendors? It'll be removed from your Potential shortlist.`, "Move it"))) return;
    setError("");
    const bookedPatch: Partial<Vendor> = {
      ...blankBookedVendor(0),
      name: v.name,
      category: POTENTIAL_VENDOR_CATEGORIES.includes(v.category as (typeof POTENTIAL_VENDOR_CATEGORIES)[number]) ? v.category : "Other",
      contact_name: v.contact_name,
      phone: v.phone,
      email: v.email,
      website: v.website,
      status: "booked",
      cost: v.price_high ?? v.price_low ?? null,
      notes: [v.notes, v.pros && `Pros: ${v.pros}`].filter(Boolean).join("\n\n"),
    };
    const { error } = await supabase.from("vendors").insert(bookedPatch);
    if (error) {
      setError(error.message);
      return;
    }
    setVendors((vs) => vs.filter((x) => x.id !== v.id));
    if (openId === v.id) setOpenId(null);
    await supabase.from("potential_vendors").delete().eq("id", v.id);
    flash(`${v.name} moved to Booked Vendors.`);
  }

  function toggleCompare(id: string) {
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 4 ? ids : [...ids, id]));
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">Dump someone interesting in, then fill in details as you research.</p>
        <button onClick={addVendor} className={`flex shrink-0 items-center gap-1.5 rounded-full bg-surface-sage-deep px-4 py-2.5 text-sm font-semibold text-white ${FOCUS_RING}`}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          Add vendor
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-wine">{error}</p>}
      {notice && <p className="mt-2 text-sm text-sage-deep">{notice}</p>}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {["All", ...POTENTIAL_VENDOR_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              categoryFilter === c ? "border-surface-sage-deep bg-surface-sage-deep text-white" : "border-line bg-paper text-ink-2 hover:border-sage-deep"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors…"
            className="w-full rounded-full border border-line bg-paper py-2 pl-9 pr-3 text-sm outline-none focus:border-sage-deep"
          />
        </div>
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setQuickFilter((v) => (v === f.key ? "none" : f.key))}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              quickFilter === f.key ? "border-surface-sage-deep bg-surface-sage-deep text-white" : "border-line bg-paper text-ink-2 hover:border-sage-deep"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {compareIds.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-full border border-sage-deep bg-[color-mix(in_srgb,var(--sage)_18%,var(--paper))] px-4 py-2 text-sm">
          <span className="font-semibold">{compareIds.length} selected to compare</span>
          <span className="text-ink-2">— side-by-side comparison is coming later; for now open each card to compare details.</span>
          <button onClick={() => setCompareIds([])} className="ml-auto text-xs font-semibold text-ink-2 underline">
            Clear
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && <p className="col-span-full text-sm italic text-ink-2">No potential vendors yet — add the first one you find.</p>}
        {filtered.map((v) => {
          const range = priceRange(v);
          return (
            <div key={v.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
              <button onClick={() => setOpenId(v.id)} className={`block text-left ${FOCUS_RING}`}>
                {v.cover_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={normalizeUrl(v.cover_photo)} alt="" loading="lazy" className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-bg text-ink-2">
                    <Camera className="h-8 w-8" strokeWidth={1.25} aria-hidden />
                  </div>
                )}
              </button>
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setOpenId(v.id)} className={`text-left font-serif text-lg font-medium ${FOCUS_RING}`}>
                    {v.name}
                  </button>
                  <label className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-2">
                    <input type="checkbox" checked={compareIds.includes(v.id)} onChange={() => toggleCompare(v.id)} className="h-3.5 w-3.5" />
                    Compare
                  </label>
                </div>
                <p className="text-sm text-ink-2">
                  {v.category}
                  {v.city && ` · ${v.city}`}
                </p>
                {range && <p className="text-sm font-semibold">{range}</p>}

                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  {v.availability !== "unknown" && (
                    <span className="rounded-full border border-line px-2 py-0.5 font-semibold text-ink-2">{AVAILABILITY_LABELS[v.availability]}</span>
                  )}
                  {v.communication_status !== "not_contacted" && (
                    <span className="rounded-full border border-line px-2 py-0.5 font-semibold text-ink-2">{COMMUNICATION_LABELS[v.communication_status]}</span>
                  )}
                  {v.distance_km != null && (
                    <span className="flex items-center gap-0.5 rounded-full border border-line px-2 py-0.5 font-semibold text-ink-2">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                      {v.distance_km} km
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex items-center gap-3 text-sm">
                  <span>
                    Ariel {v.ariel_reaction ? REACTION_EMOJI[v.ariel_reaction] : "—"}
                  </span>
                  <span>
                    Fred {v.fred_reaction ? REACTION_EMOJI[v.fred_reaction] : "—"}
                  </span>
                </div>

                <button onClick={() => setOpenId(v.id)} className={`mt-2 text-left text-xs font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>
                  View details →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button aria-label="Close" tabIndex={-1} onClick={() => setOpenId(null)} className="absolute inset-0" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Edit potential vendor" tabIndex={-1} className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-paper shadow-lg">
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
              <div className="flex flex-col gap-4">
                <Section title="Basics">
                  <Field label="Category">
                    <select value={open.category} onChange={(e) => saveNow(open.id, { category: e.target.value })} className={FIELD}>
                      {POTENTIAL_VENDOR_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Contact person">
                    <input defaultValue={open.contact_name} onChange={(e) => scheduleSave(open.id, { contact_name: e.target.value })} className={FIELD} />
                  </Field>
                  <Field label="Website">
                    <input defaultValue={open.website} onChange={(e) => scheduleSave(open.id, { website: e.target.value })} className={FIELD} />
                  </Field>
                  <Field label="Instagram / social">
                    <input defaultValue={open.social} onChange={(e) => scheduleSave(open.id, { social: e.target.value })} className={FIELD} />
                  </Field>
                  <Field label="Email">
                    <input type="email" defaultValue={open.email} onChange={(e) => scheduleSave(open.id, { email: e.target.value })} className={FIELD} />
                  </Field>
                  <Field label="Phone">
                    <input type="tel" defaultValue={open.phone} onChange={(e) => scheduleSave(open.id, { phone: e.target.value })} className={FIELD} />
                  </Field>
                </Section>

                <Section title="Visuals">
                  <div className="col-span-2">
                    <Field label="Cover photo URL">
                      <input defaultValue={open.cover_photo} onChange={(e) => scheduleSave(open.id, { cover_photo: e.target.value })} placeholder="https://…" className={FIELD} />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <PhotoList
                      photos={open.photos}
                      onAdd={(url) => scheduleSave(open.id, { photos: [...open.photos, url] })}
                      onRemove={(i) => scheduleSave(open.id, { photos: open.photos.filter((_, idx) => idx !== i) })}
                    />
                  </div>
                </Section>

                <Section title="Pricing">
                  <Field label="Starting price">
                    <input type="number" min={0} defaultValue={open.price_low ?? ""} onChange={(e) => scheduleSave(open.id, { price_low: e.target.value ? +e.target.value : null })} className={FIELD} />
                  </Field>
                  <Field label="Estimated total">
                    <input type="number" min={0} defaultValue={open.price_high ?? ""} onChange={(e) => scheduleSave(open.id, { price_high: e.target.value ? +e.target.value : null })} className={FIELD} />
                  </Field>
                  <Field label="Priced">
                    <select value={open.price_unit} onChange={(e) => saveNow(open.id, { price_unit: e.target.value as PriceUnit })} className={FIELD}>
                      <option value="flat">flat</option>
                      <option value="person">per person</option>
                      <option value="hour">per hour</option>
                      <option value="package">per package</option>
                    </select>
                  </Field>
                  <Field label="Service charge %">
                    <input type="number" min={0} defaultValue={open.service_charge_pct ?? ""} onChange={(e) => scheduleSave(open.id, { service_charge_pct: e.target.value ? +e.target.value : null })} className={FIELD} />
                  </Field>
                  <Field label="Travel fee">
                    <input type="number" min={0} defaultValue={open.travel_fee ?? ""} onChange={(e) => scheduleSave(open.id, { travel_fee: e.target.value ? +e.target.value : null })} className={FIELD} />
                  </Field>
                  <Field label="Deposit required">
                    <input defaultValue={open.deposit_required} onChange={(e) => scheduleSave(open.id, { deposit_required: e.target.value })} placeholder="e.g. 30% at booking" className={FIELD} />
                  </Field>
                  <label className="col-span-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={open.tax_included} onChange={(e) => saveNow(open.id, { tax_included: e.target.checked })} className="h-4 w-4 accent-sage-deep" />
                    Taxes included
                  </label>
                </Section>

                <Section title="Availability">
                  <Field label="Wedding date">
                    <select value={open.availability} onChange={(e) => saveNow(open.id, { availability: e.target.value as Availability })} className={FIELD}>
                      {AVAILABILITY_ORDER.map((a) => (
                        <option key={a} value={a}>{AVAILABILITY_LABELS[a]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Response date">
                    <input type="date" defaultValue={open.availability_response_date ?? ""} onChange={(e) => scheduleSave(open.id, { availability_response_date: e.target.value || null })} className={FIELD} />
                  </Field>
                </Section>

                <Section title="Location">
                  <Field label="City">
                    <input defaultValue={open.city} onChange={(e) => scheduleSave(open.id, { city: e.target.value })} className={FIELD} />
                  </Field>
                  <Field label="Distance from venue (km)">
                    <input type="number" min={0} defaultValue={open.distance_km ?? ""} onChange={(e) => scheduleSave(open.id, { distance_km: e.target.value ? +e.target.value : null })} className={FIELD} />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Address">
                      <input defaultValue={open.address} onChange={(e) => scheduleSave(open.id, { address: e.target.value })} className={FIELD} />
                    </Field>
                  </div>
                  <Field label="Travel radius">
                    <input defaultValue={open.travel_radius} onChange={(e) => scheduleSave(open.id, { travel_radius: e.target.value })} placeholder="e.g. 50 km" className={FIELD} />
                  </Field>
                  <label className="flex items-end gap-2 pb-1 text-sm">
                    <input type="checkbox" checked={open.travel_included} onChange={(e) => saveNow(open.id, { travel_included: e.target.checked })} className="h-4 w-4 accent-sage-deep" />
                    Travel included
                  </label>
                </Section>

                <Section title="What they offer">
                  <div className="col-span-2">
                    <Field label="Package / services">
                      <textarea defaultValue={open.package_details} onChange={(e) => scheduleSave(open.id, { package_details: e.target.value })} rows={2} className={FIELD} />
                    </Field>
                  </div>
                  <Field label="What's included">
                    <textarea defaultValue={open.whats_included} onChange={(e) => scheduleSave(open.id, { whats_included: e.target.value })} rows={2} className={FIELD} />
                  </Field>
                  <Field label="Add-ons">
                    <textarea defaultValue={open.add_ons} onChange={(e) => scheduleSave(open.id, { add_ons: e.target.value })} rows={2} className={FIELD} />
                  </Field>
                  <Field label="Exclusions">
                    <textarea defaultValue={open.exclusions} onChange={(e) => scheduleSave(open.id, { exclusions: e.target.value })} rows={2} className={FIELD} />
                  </Field>
                  <Field label="Minimum spend">
                    <input type="number" min={0} defaultValue={open.minimum_spend ?? ""} onChange={(e) => scheduleSave(open.id, { minimum_spend: e.target.value ? +e.target.value : null })} className={FIELD} />
                  </Field>
                </Section>

                <Section title="Your reactions">
                  <Field label="Ariel">
                    <ReactionPicker value={open.ariel_reaction} onChange={(r) => saveNow(open.id, { ariel_reaction: r })} />
                  </Field>
                  <Field label="Fred">
                    <ReactionPicker value={open.fred_reaction} onChange={(r) => saveNow(open.id, { fred_reaction: r })} />
                  </Field>
                  <Field label="Pros">
                    <textarea defaultValue={open.pros} onChange={(e) => scheduleSave(open.id, { pros: e.target.value })} rows={2} className={FIELD} />
                  </Field>
                  <Field label="Concerns">
                    <textarea defaultValue={open.concerns} onChange={(e) => scheduleSave(open.id, { concerns: e.target.value })} rows={2} className={FIELD} />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Notes">
                      <textarea defaultValue={open.notes} onChange={(e) => scheduleSave(open.id, { notes: e.target.value })} rows={2} className={FIELD} />
                    </Field>
                  </div>
                </Section>

                <Section title="Communication">
                  <Field label="Status">
                    <select value={open.communication_status} onChange={(e) => saveNow(open.id, { communication_status: e.target.value as CommunicationStatus })} className={FIELD}>
                      {COMMUNICATION_ORDER.map((s) => (
                        <option key={s} value={s}>{COMMUNICATION_LABELS[s]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Works with our venue?">
                    <select value={open.works_with_venue} onChange={(e) => saveNow(open.id, { works_with_venue: e.target.value as WorksWithVenue })} className={FIELD}>
                      {WORKS_WITH_VENUE_ORDER.map((w) => (
                        <option key={w} value={w}>{WORKS_WITH_VENUE_LABELS[w]}</option>
                      ))}
                    </select>
                  </Field>
                </Section>

                <Section title="Files">
                  <Field label="Quote link">
                    <input defaultValue={open.quote_url} onChange={(e) => scheduleSave(open.id, { quote_url: e.target.value })} placeholder="https://…" className={FIELD} />
                  </Field>
                  <Field label="Brochure link">
                    <input defaultValue={open.brochure_url} onChange={(e) => scheduleSave(open.id, { brochure_url: e.target.value })} placeholder="https://…" className={FIELD} />
                  </Field>
                  <Field label="Contract sample link">
                    <input defaultValue={open.contract_url} onChange={(e) => scheduleSave(open.id, { contract_url: e.target.value })} placeholder="https://…" className={FIELD} />
                  </Field>
                </Section>

                <Section title="Dates">
                  <Field label="Discovered">
                    <input type="date" defaultValue={open.date_discovered ?? ""} onChange={(e) => scheduleSave(open.id, { date_discovered: e.target.value || null })} className={FIELD} />
                  </Field>
                  <Field label="Contacted">
                    <input type="date" defaultValue={open.date_contacted ?? ""} onChange={(e) => scheduleSave(open.id, { date_contacted: e.target.value || null })} className={FIELD} />
                  </Field>
                  <Field label="Follow up by">
                    <input type="date" defaultValue={open.follow_up_date ?? ""} onChange={(e) => scheduleSave(open.id, { follow_up_date: e.target.value || null })} className={FIELD} />
                  </Field>
                  <Field label="Quote expires">
                    <input type="date" defaultValue={open.quote_expiry ?? ""} onChange={(e) => scheduleSave(open.id, { quote_expiry: e.target.value || null })} className={FIELD} />
                  </Field>
                </Section>

                <Section title="Source">
                  <div className="col-span-2">
                    <input defaultValue={open.source} onChange={(e) => scheduleSave(open.id, { source: e.target.value })} placeholder="Google, Instagram, referral, venue recommendation, wedding show…" className={FIELD} />
                  </div>
                </Section>

                <Section title="Decision">
                  <Field label="Status">
                    <select value={open.decision_status} onChange={(e) => saveNow(open.id, { decision_status: e.target.value as DecisionStatus })} className={FIELD}>
                      {DECISION_ORDER.map((d) => (
                        <option key={d} value={d}>{DECISION_LABELS[d]}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex items-end">
                    <button
                      onClick={() => moveToBooked(open)}
                      className={`w-full rounded-full bg-surface-green px-3 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}
                    >
                      Move to Booked Vendors →
                    </button>
                  </div>
                </Section>
              </div>

              <button onClick={() => removeVendor(open.id)} className="mt-4 text-xs font-semibold text-wine">
                Remove this potential vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ReactionPicker({ value, onChange }: { value: Reaction | null; onChange: (r: Reaction | null) => void }) {
  return (
    <div className="mt-1 flex gap-1">
      {REACTION_ORDER.map((r) => (
        <button
          key={r}
          onClick={() => onChange(value === r ? null : r)}
          aria-label={REACTION_LABELS[r]}
          title={REACTION_LABELS[r]}
          className={`flex h-8 w-8 items-center justify-center rounded-full border text-base ${
            value === r ? "border-sage-deep bg-[color-mix(in_srgb,var(--sage)_28%,var(--paper))]" : "border-line bg-bg hover:border-sage-deep"
          }`}
        >
          {REACTION_EMOJI[r]}
        </button>
      ))}
    </div>
  );
}

function PhotoList({ photos, onAdd, onRemove }: { photos: string[]; onAdd: (url: string) => void; onRemove: (index: number) => void }) {
  const [value, setValue] = useState("");
  return (
    <Field label="Inspiration photos">
      {photos.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {photos.map((url, i) => (
            <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={normalizeUrl(url)} alt="" loading="lazy" className="h-full w-full object-cover" />
              <button
                onClick={() => onRemove(i)}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 rounded-full bg-bg/90 p-0.5 text-ink-2 opacity-0 pointer-coarse:opacity-100 group-hover:opacity-100 hover:text-wine"
              >
                <X className="h-3 w-3" strokeWidth={2} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onAdd(value.trim());
            setValue("");
          }
        }}
        placeholder="Paste a photo URL and press Enter…"
        className={FIELD}
      />
    </Field>
  );
}
