"use client";

import { useDialog } from "@/lib/use-dialog";
import { useConfirm } from "@/components/ConfirmProvider";
import { useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Check, Heart, MapPin, Plus, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeUrl } from "@/lib/ideas";
import { isFavourite, isOurFavourite, STAGE_LABEL, STAGE_TINT, stageOf } from "@/lib/vendor-status";
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

export default function PotentialVendors({ initialVendors, userName, bookedCategories }: { initialVendors: PotentialVendor[]; userName: string; bookedCategories: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const confirm = useConfirm();
  const [vendors, setVendors] = useState(initialVendors);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [catState, setCatState] = useState<{ value: string; key: string | null } | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "name" | "price_low" | "price_high">("recent");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("none");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [openState, setOpenState] = useState<{ id: string | null; key: string } | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  // A vendor or category picked in the top-bar search arrives as ?open= / ?category=; anything you click
  // afterwards wins until a new search changes the URL again.
  const openKey = `${params.get("open")}|${params.get("t")}`;
  const catKey = params.get("category");
  const categoryFilter = catState && catState.key === catKey ? catState.value : catKey ?? "All";
  const openId = openState && openState.key === openKey ? openState.id : params.get("open");
  const setOpenId = (id: string | null) => setOpenState({ id, key: openKey });
  const setCategoryFilter = (value: string) => setCatState({ value, key: catKey });
  const open = vendors.find((v) => v.id === openId) ?? null;
  function closeOpen() {
    setOpenId(null);
    if (params.get("open")) router.replace("/vendors", { scroll: false });
  }
  const dialogRef = useDialog(Boolean(open), closeOpen);
  const me: "ariel" | "fred" = userName.trim().toLowerCase() === "fred" ? "fred" : "ariel";

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (q && !`${v.name} ${v.city} ${v.notes}`.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "All" && v.category !== categoryFilter) return false;
      if (quickFilter === "favourite" && !isFavourite(v)) return false;
      if (quickFilter === "available" && v.availability !== "available") return false;
      if (quickFilter === "quote_received" && v.communication_status !== "quote_received") return false;
      if (quickFilter === "follow_up_needed" && v.communication_status !== "follow_up_needed") return false;
      return true;
    });
  })();

  const price = (v: PotentialVendor) => v.price_low ?? v.price_high ?? Infinity;
  const sorted = (() => {
    const list = [...filtered];
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "price_low") list.sort((a, b) => price(a) - price(b));
    if (sortBy === "price_high") list.sort((a, b) => (price(b) === Infinity ? -1 : price(b)) - (price(a) === Infinity ? -1 : price(a)));
    if (sortBy === "recent") list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list;
  })();
  const favourites = [...filtered].filter(isFavourite).sort((a, b) => Number(isOurFavourite(b)) - Number(isOurFavourite(a))).slice(0, 3);

  const stateOf = (c: string): "booked" | "favourite" | "candidates" | "none" => {
    if (bookedCategories.includes(c)) return "booked";
    const inCat = vendors.filter((v) => v.category === c);
    return inCat.some(isFavourite) ? "favourite" : inCat.length ? "candidates" : "none";
  };
  const bookedCount = POTENTIAL_VENDOR_CATEGORIES.filter((c) => bookedCategories.includes(c)).length;

  async function setReaction(v: PotentialVendor, who: "ariel" | "fred" | "both") {
    const next = (r: Reaction | null): Reaction | null => (r === "love" ? null : "love");
    if (who === "both") {
      const value = isOurFavourite(v) ? null : "love";
      await saveNow(v.id, { ariel_reaction: value, fred_reaction: value });
    } else {
      await saveNow(v.id, { [`${who}_reaction`]: next(v[`${who}_reaction`]) } as Partial<PotentialVendor>);
    }
  }

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

  const pill = (on: boolean) => `rounded-full border px-4 py-1.5 text-sm ${FOCUS_RING} ${on ? "border-surface-sage-deep bg-surface-sage-deep text-white" : "border-line bg-paper text-ink hover:border-sage-deep"}`;
  const cover = (v: PotentialVendor, className: string) =>
    v.cover_photo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={normalizeUrl(v.cover_photo)} alt="" loading="lazy" className={`${className} object-cover`} />
    ) : (
      <div className={`${className} flex items-center justify-center bg-[radial-gradient(circle_at_30%_30%,color-mix(in_srgb,var(--gold)_30%,var(--paper)),color-mix(in_srgb,var(--surface-blush)_25%,var(--paper)))] text-ink-2`}>
        <Camera className="h-8 w-8" strokeWidth={1.25} aria-hidden />
      </div>
    );
  const heartRow = (v: PotentialVendor) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink">
      {([["ariel", "Ariel", v.ariel_reaction === "love"], ["fred", "Fred", v.fred_reaction === "love"], ["both", "Our favourite", isOurFavourite(v)]] as const).map(([who, label, on]) => (
        <button key={who} onClick={() => setReaction(v, who)} aria-pressed={on} aria-label={`${label}${who === "both" ? "" : "'s favourite"}: ${v.name}`} className={`flex items-center gap-1.5 rounded ${FOCUS_RING}`}>
          {label}
          <Heart className={`h-[18px] w-[18px] ${on ? "fill-wine text-wine" : "text-ink-2"}`} strokeWidth={1.5} aria-hidden />
        </button>
      ))}
    </div>
  );

  return (
    <>
      <section aria-labelledby="vendor-categories">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="vendor-categories" className="font-serif text-2xl font-light">Categories</h2>
          <p className="text-sm text-ink-2">{bookedCount} of {POTENTIAL_VENDOR_CATEGORIES.length} booked</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {["All", ...POTENTIAL_VENDOR_CATEGORIES].map((c) => {
            const st = c === "All" ? "none" : stateOf(c);
            return (
              <button key={c} onClick={() => setCategoryFilter(c)} aria-pressed={categoryFilter === c} className={`${pill(categoryFilter === c)} flex items-center gap-1.5`}>
                {st === "booked" && <Check className="h-3.5 w-3.5 text-sage-deep" strokeWidth={2.5} aria-label="booked" />}
                {st === "favourite" && <Heart className="h-3.5 w-3.5 fill-wine text-wine" strokeWidth={1.5} aria-label="has a favourite" />}
                {c}
                {st === "candidates" && <span className="text-xs text-ink-2">{vendors.filter((v) => v.category === c).length}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {error && <p className="mt-3 text-sm text-wine">{error}</p>}
      {notice && <p className="mt-3 text-sm text-sage-deep">{notice}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search vendors</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors…" className={`w-full rounded-full border border-line bg-paper py-2.5 pl-10 pr-4 text-sm placeholder:text-ink-2 ${FOCUS_RING}`} />
        </label>
        {QUICK_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setQuickFilter((v) => (v === f.key ? "none" : f.key))} aria-pressed={quickFilter === f.key} className={pill(quickFilter === f.key)}>
            {f.label}
          </button>
        ))}
        <select aria-label="Sort vendors" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className={`rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink ${FOCUS_RING}`}>
          <option value="recent">Most recent</option>
          <option value="name">Name</option>
          <option value="price_low">Price: low to high</option>
          <option value="price_high">Price: high to low</option>
        </select>
        <button onClick={addVendor} className={`flex shrink-0 items-center gap-2 rounded-full bg-surface-olive px-6 py-2.5 text-sm font-medium text-white ${FOCUS_RING}`}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          Add a vendor
        </button>
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

      <section className="mt-6 rounded-3xl bg-[color-mix(in_srgb,var(--surface-blush)_10%,var(--paper))] p-5 sm:p-6" aria-labelledby="vendor-favourites">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="vendor-favourites" className="font-serif text-3xl font-light">Our favourites</h2>
            <p className="mt-1 text-ink-2">The ones that feel the most like us.</p>
          </div>
          <p aria-hidden className="-rotate-3 font-script text-3xl text-wine">Top picks ♡</p>
        </div>
        {favourites.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-paper px-5 py-8 text-center text-sm text-ink-2">Tap a heart under Ariel or Fred on any vendor and they&apos;ll appear here as a large card.</p>
        ) : (
          <div className={`mt-5 grid gap-5 md:grid-cols-2 ${favourites.length === 3 ? "xl:grid-cols-3" : ""}`}>
            {favourites.map((v) => {
              const range = priceRange(v);
              const badge = isOurFavourite(v) ? "Our favourite" : v.ariel_reaction === "love" ? "Ariel's favourite" : "Fred's favourite";
              return (
                <div key={v.id} className="flex flex-col overflow-hidden rounded-2xl bg-paper shadow-sm">
                  <div className="relative">
                    <button onClick={() => setOpenId(v.id)} aria-label={`Open ${v.name}`} className={`block w-full ${FOCUS_RING}`}>
                      {cover(v, "aspect-[4/3] w-full")}
                    </button>
                    <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-3.5 py-1.5 text-sm text-ink shadow-sm">
                      <Heart className="h-3.5 w-3.5 fill-wine text-wine" strokeWidth={1.5} aria-hidden /> {badge}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-5">
                    <button onClick={() => setOpenId(v.id)} className={`w-fit rounded text-left font-serif text-2xl leading-tight ${FOCUS_RING}`}>{v.name}</button>
                    <p className="text-sm text-ink-2">{v.category}{v.city && ` · ${v.city}`}</p>
                    {range && <p className="font-medium">{range}</p>}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                      {heartRow(v)}
                      <button onClick={() => setOpenId(v.id)} className={`rounded-full border border-line px-4 py-1.5 text-sm hover:border-sage-deep ${FOCUS_RING}`}>View details →</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="vendor-all">
        <h2 id="vendor-all" className="font-serif text-3xl font-light">All vendors</h2>
        <p className="mt-1 text-ink-2">Keep exploring, compare options, and find the perfect fit.</p>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.length === 0 && <p className="col-span-full text-sm italic text-ink-2">{vendors.length === 0 ? "No potential vendors yet — add the first one you find." : "No vendors match these filters."}</p>}
          {sorted.map((v) => {
            const range = priceRange(v);
            const stage = stageOf(v);
            return (
              <div key={v.id} className="flex flex-col overflow-hidden rounded-2xl border border-line shadow-sm" style={{ background: STAGE_TINT[stage] }}>
                <div className="relative">
                  <button onClick={() => setOpenId(v.id)} aria-label={`Open ${v.name}`} className={`block w-full ${FOCUS_RING}`}>
                    {cover(v, "aspect-[16/10] w-full")}
                  </button>
                  <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-3 py-1 text-xs font-medium text-ink shadow-sm">{STAGE_LABEL[stage]}</span>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <button onClick={() => setOpenId(v.id)} className={`w-fit rounded text-left font-serif text-lg leading-snug ${FOCUS_RING}`}>{v.name}</button>
                  <p className="text-sm text-ink-2">{v.category}{v.city && ` · ${v.city}`}</p>
                  <p className="text-sm font-medium text-ink">{range || "—"}</p>
                  {v.distance_km != null && (
                    <p className="flex items-center gap-1 text-xs text-ink-2"><MapPin className="h-3 w-3" strokeWidth={1.5} aria-hidden />{v.distance_km} km</p>
                  )}
                  <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input type="checkbox" checked={compareIds.includes(v.id)} onChange={() => toggleCompare(v.id)} className={`h-4 w-4 accent-sage-deep ${FOCUS_RING}`} />
                      Compare
                    </label>
                    <button
                      onClick={() => saveNow(v.id, { [`${me}_reaction`]: v[`${me}_reaction`] === "love" ? null : "love" } as Partial<PotentialVendor>)}
                      aria-pressed={v[`${me}_reaction`] === "love"}
                      aria-label={v[`${me}_reaction`] === "love" ? `Remove ${v.name} from your favourites` : `Add ${v.name} to your favourites`}
                      className={`flex h-9 w-9 items-center justify-center rounded-full hover:bg-paper ${FOCUS_RING}`}
                    >
                      <Heart className={`h-[18px] w-[18px] ${v[`${me}_reaction`] === "love" ? "fill-wine text-wine" : "text-ink-2"}`} strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button aria-label="Close" tabIndex={-1} onClick={closeOpen} className="absolute inset-0" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Edit potential vendor" tabIndex={-1} className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-paper shadow-lg">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <input
                defaultValue={open.name}
                onChange={(e) => scheduleSave(open.id, { name: e.target.value })}
                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-xl font-medium outline-none focus:border-line focus:bg-bg"
              />
              <button onClick={closeOpen} aria-label="Close" className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg">
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
