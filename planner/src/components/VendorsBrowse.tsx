"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Circle, ListFilter, Search } from "lucide-react";
import { BookedCard, PotentialCard } from "@/components/VendorCard";
import { useRowSave } from "@/lib/use-row-save";
import type { IdeaImage } from "@/lib/registry";
import {
  cardState,
  isBooked,
  needsAttention,
  paymentSummary,
  photoSrc,
  PLURAL,
  TEAM_CATEGORIES,
  VENDOR_CATEGORIES,
  type FollowUp,
  type Vendor,
  type VendorPayment,
} from "@/lib/vendors";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";


type Quick = "favourite" | "available" | "quote" | "attention" | "passed";
const QUICK_LABEL: Record<Quick, string> = { favourite: "Favourite", available: "Available", quote: "Quote received", attention: "Needs attention", passed: "Passed on" };
type Sort = "recent" | "name" | "price_low" | "price_high" | "favourites";

export default function VendorsBrowse({
  mode,
  initialVendors,
  followUps,
  planVendorIds,
  payments,
  ideas,
  venueChosen,
  needsMigration,
}: {
  mode: "potential" | "booked";
  initialVendors: Vendor[];
  followUps: FollowUp[];
  planVendorIds: string[];
  payments: VendorPayment[];
  ideas: IdeaImage[];
  venueChosen: boolean;
  needsMigration: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const category = params.get("category") ?? "All";
  const [vendors, setVendors] = useState(initialVendors);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [quick, setQuick] = useState<Quick[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { saveNow } = useRowSave<Vendor>("vendors", (id, patch) => setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v))), setError);
  const ideaMap = useMemo(() => new Map(ideas.map((i) => [i.id, i])), [ideas]);
  const today = new Date().toISOString().slice(0, 10);

  const attentionOf = (v: Vendor) => needsAttention(v, followUps, payments, today);
  const inMode = vendors.filter((v) => (mode === "booked" ? isBooked(v) : !isBooked(v)));
  const bookedCategories = new Set(vendors.filter(isBooked).map((v) => v.category));
  if (venueChosen) bookedCategories.add("Venue");

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const price = (v: Vendor) => v.contracted_total ?? v.quoted_total ?? v.price_high ?? v.price_low ?? v.starting_price ?? Infinity;
    const out = inMode.filter((v) => {
      if (category !== "All" && v.category !== category) return false;
      if (q && !`${v.name} ${v.city} ${v.category} ${v.tagline} ${v.notes}`.toLowerCase().includes(q)) return false;
      if (quick.includes("favourite") && !(v.ariel_reaction === "love" || v.fred_reaction === "love")) return false;
      if (quick.includes("available") && v.availability !== "available") return false;
      if (quick.includes("quote") && !(v.communication_status === "quote_received" || v.quoted_total != null)) return false;
      if (quick.includes("attention") && !needsAttention(v, followUps, payments, today)) return false;
      if (quick.includes("passed") && v.decision_status !== "rejected") return false;
      return true;
    });
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price_low") out.sort((a, b) => price(a) - price(b));
    if (sort === "price_high") out.sort((a, b) => (price(b) === Infinity ? -1 : price(b)) - (price(a) === Infinity ? -1 : price(a)));
    if (sort === "favourites") out.sort((a, b) => Number(b.ariel_reaction === "love") + Number(b.fred_reaction === "love") - (Number(a.ariel_reaction === "love") + Number(a.fred_reaction === "love")));
    if (sort === "recent") out.sort((a, b) => (mode === "booked" ? (b.booked_on ?? "").localeCompare(a.booked_on ?? "") : b.created_at.localeCompare(a.created_at)));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inMode, category, search, quick, sort, followUps, payments]);

  const setCategory = (c: string) => {
    const next = new URLSearchParams(params.toString());
    if (c === "All") next.delete("category");
    else next.set("category", c);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const toggleQuick = (k: Quick) => setQuick((qs) => (qs.includes(k) ? qs.filter((x) => x !== k) : [...qs, k]));
  const quickOptions: Quick[] = mode === "booked" ? ["attention"] : ["favourite", "available", "quote", "attention", "passed"];

  const compareCategory = compareIds.length ? vendors.find((v) => v.id === compareIds[0])?.category : undefined;
  const toggleCompare = (id: string) => setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const compareBlock = (v: Vendor) => {
    if (compareIds.includes(v.id)) return { disabled: false, hint: "" };
    if (compareCategory && compareCategory !== v.category) return { disabled: true, hint: `Compare ${PLURAL[compareCategory] ?? "vendors"} together — clear your selection to compare ${PLURAL[v.category] ?? "vendors"}` };
    if (compareIds.length >= 4) return { disabled: true, hint: "You can compare up to four vendors" };
    return { disabled: false, hint: "" };
  };

  const chip = (on: boolean) => `flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm ${FOCUS_RING} ${on ? "border-surface-sage-deep bg-surface-sage-deep text-white" : "border-line bg-paper text-ink hover:border-sage-deep"}`;
  const base = mode === "booked" ? "/vendors/booked" : "/vendors";

  return (
    <>
      {needsMigration && (
        <p role="status" className="mb-4 rounded-2xl border border-gold bg-[color-mix(in_srgb,var(--gold)_14%,var(--paper))] px-4 py-3 text-sm">
          Vendors need a one-time database update before communication, files and price history will save. Run migration 046 in Supabase, then refresh.
        </p>
      )}

      <section aria-labelledby="team-heading" className="rounded-3xl bg-[color-mix(in_srgb,var(--sage)_10%,var(--paper))] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="team-heading" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-2">Your wedding team</h2>
          <p className="text-sm text-ink-2">{TEAM_CATEGORIES.filter((c) => bookedCategories.has(c)).length} of {TEAM_CATEGORIES.length} in place</p>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
          {TEAM_CATEGORIES.map((c) => {
            const done = bookedCategories.has(c);
            const count = vendors.filter((v) => v.category === c && !isBooked(v)).length;
            const href = c === "Venue" ? "/venues" : done ? `/vendors/booked?category=${encodeURIComponent(c)}` : `/vendors?category=${encodeURIComponent(c)}`;
            return (
              <li key={c}>
                <Link href={href} className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-[15px] hover:bg-paper ${FOCUS_RING}`}>
                  {done ? <Check className="h-4 w-4 text-sage-deep" strokeWidth={2.5} aria-label="booked" /> : <Circle className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-label="not booked yet" />}
                  <span className={done ? "font-medium" : ""}>{c}</span>
                  {!done && c !== "Venue" && count > 0 && <span className="text-xs text-ink-2">{count} to consider</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <nav aria-label="Filter by category" className="mt-6 flex flex-wrap gap-2">
        {["All", ...VENDOR_CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className={`${chip(category === c)} !min-h-9 !px-3.5`}>
            {c}
          </button>
        ))}
      </nav>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search vendors</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors…" className={`h-11 w-full rounded-full border border-line bg-paper pl-10 pr-4 text-sm placeholder:text-ink-2 ${FOCUS_RING}`} />
        </label>
        <select aria-label="Sort vendors" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`h-11 rounded-full border border-line bg-paper px-4 text-sm ${FOCUS_RING}`}>
          <option value="recent">{mode === "booked" ? "Recently booked" : "Most recent"}</option>
          <option value="name">Name</option>
          <option value="favourites">Favourites first</option>
          <option value="price_low">Price: low to high</option>
          <option value="price_high">Price: high to low</option>
        </select>
        <button onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} aria-controls="vendor-filters" className={chip(quick.length > 0)}>
          <ListFilter className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Filters{quick.length ? ` · ${quick.length}` : ""}
        </button>
      </div>
      {filtersOpen && (
        <div id="vendor-filters" className="mt-3 flex flex-wrap gap-2">
          {quickOptions.map((k) => (
            <button key={k} onClick={() => toggleQuick(k)} aria-pressed={quick.includes(k)} className={chip(quick.includes(k))}>{QUICK_LABEL[k]}</button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-wine">{error}</p>}

      <p className="sr-only" aria-live="polite">{list.length} vendor{list.length === 1 ? "" : "s"} shown</p>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {list.map((v) => {
          const attention = attentionOf(v);
          const state = cardState(v, attention);
          const src = photoSrc(v.photos[0], ideaMap);
          return mode === "booked" ? (
            <BookedCard key={v.id} vendor={v} src={src} state={state} attention={attention} pay={paymentSummary(v, payments, today)} inPlan={planVendorIds.includes(v.id)} />
          ) : (
            <PotentialCard
              key={v.id}
              vendor={v}
              src={src}
              state={state}
              attention={attention}
              inPlan={planVendorIds.includes(v.id)}
              compare={{ checked: compareIds.includes(v.id), onToggle: () => toggleCompare(v.id), ...compareBlock(v) }}
              onReaction={(who) => saveNow(v.id, { [`${who}_reaction`]: v[`${who}_reaction`] === "love" ? null : "love" } as Partial<Vendor>)}
            />
          );
        })}
      </div>

      {list.length === 0 && (
        <div className="mt-6 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-serif text-3xl font-light">
            {inMode.length === 0 ? (mode === "booked" ? "No one booked yet" : "No potential vendors yet") : "Nothing matches those filters"}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-ink-2">
            {inMode.length === 0
              ? mode === "booked"
                ? "When you book a vendor from the Potential tab, they join your wedding team here."
                : "Add the florists, photographers and caterers you’re curious about. You can compare them side by side later."
              : "Try clearing a filter or searching for something else."}
          </p>
          {inMode.length > 0 && (
            <button onClick={() => { setCategory("All"); setQuick([]); setSearch(""); }} className={`mt-5 h-11 rounded-full border border-line px-5 text-sm hover:border-sage-deep ${FOCUS_RING}`}>Clear filters</button>
          )}
          {inMode.length === 0 && mode === "booked" && (
            <Link href={base === "/vendors/booked" ? "/vendors" : base} className={`mt-5 inline-flex h-11 items-center rounded-full border border-line px-5 text-sm hover:border-sage-deep ${FOCUS_RING}`}>See potential vendors</Link>
          )}
        </div>
      )}

      {compareIds.length > 0 && compareCategory && (
        <div role="region" aria-label="Comparison" className="sticky bottom-4 z-30 mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-full border border-line bg-paper py-2 pl-6 pr-2 shadow-lg">
          <p className="text-sm">
            <b className="font-semibold">{compareIds.length} {PLURAL[compareCategory] ?? "vendors"}</b> selected
            {compareIds.length < 2 && <span className="text-ink-2"> · pick at least one more</span>}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCompareIds([])} className={`h-11 rounded-full px-3 text-sm text-ink-2 hover:text-ink ${FOCUS_RING}`}>Clear</button>
            {compareIds.length >= 2 ? (
              <Link href={`/vendors/compare?ids=${compareIds.join(",")}`} className={`flex h-11 items-center rounded-full bg-surface-olive px-5 text-sm font-medium text-white ${FOCUS_RING}`}>Compare vendors →</Link>
            ) : (
              <span className="flex h-11 items-center rounded-full bg-line px-5 text-sm text-ink-2">Compare vendors →</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
