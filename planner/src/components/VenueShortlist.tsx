"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, CalendarDays, Coins, FileText, GitCompareArrows, Heart, ListChecks, MapPin, MapPinned, Plus, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import NavBar from "@/components/NavBar";
import { geocodeVenue } from "@/lib/geocode";
import DashboardTopBar, { type SearchItem } from "@/components/DashboardTopBar";
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

const VenueMap = dynamic(() => import("@/components/VenueMap"), { ssr: false, loading: () => <div className="h-[34rem] rounded-2xl bg-bg" /> });

const CARD_COLORS = ["var(--sage-deep)", "var(--wood)", "var(--wine)", "var(--green)", "var(--gold)", "var(--sage)"];
const MAX_COMPARE = 3;
const CARD_TRANSITION = "transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:transform-none";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

// Each pipeline stage tints its card, so colour alone tells you where a place stands.
const STATUS_TINT: Record<Status, string> = {
  researching: "color-mix(in srgb, var(--gold) 6%, var(--paper))",
  contacted: "color-mix(in srgb, var(--gold) 15%, var(--paper))",
  tour_booked: "color-mix(in srgb, var(--surface-blush) 14%, var(--paper))",
  quote_received: "color-mix(in srgb, var(--gold) 26%, var(--paper))",
  finalist: "color-mix(in srgb, var(--sage) 26%, var(--paper))",
  out: "color-mix(in srgb, var(--line) 60%, var(--paper))",
};
const STATUS_ACCENT: Record<Status, string> = {
  researching: "var(--sage-deep)",
  contacted: "var(--gold)",
  tour_booked: "var(--surface-blush)",
  quote_received: "var(--wood)",
  finalist: "var(--sage-deep)",
  out: "var(--line)",
};
const TOOL_SELECT = `rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink ${FOCUS_RING}`;

const capacityNumber = (v: Venue) => parseInt(v.capacity.replace(/[^\d]/g, ""), 10) || 0;

type Calc = ReturnType<typeof calcVenue>;

type CompareField = {
  label: string;
  value: (v: Venue, calc: Calc) => string | null;
  node?: (v: Venue, calc: Calc) => ReactNode;
  action?: (v: Venue) => { label: string };
};

type CompareTab = { key: string; label: string; icon: typeof Coins; primary: CompareField[]; more: CompareField[] };

function buildTabs(): CompareTab[] {
  return [
    {
      key: "overview",
      label: "Overview",
      icon: Sparkles,
      primary: [
        { label: "Status", value: (v) => STATUSES[v.status] },
        { label: "Capacity", value: (v) => v.capacity || null, action: () => ({ label: "Record capacity" }) },
        { label: "Location", value: (v) => v.location || null },
        { label: "Period", value: (v) => v.period || null },
        { label: "Favourite", value: (v) => (v.is_favourite ? "★ Yes" : "No") },
      ],
      more: [],
    },
    {
      key: "money",
      label: "Money",
      icon: Coins,
      primary: [
        { label: "All-in estimate", value: (v, c) => fmt(c.grand) },
        { label: "Cost per guest", value: (v, c) => fmt(c.perGuest) },
        {
          label: "Quote status",
          value: (v) => (v.quote_received ? "Received" : null),
          action: () => ({ label: "Request quote" }),
        },
        {
          label: "Deposit",
          value: (v) => (v.deposit_amount > 0 ? `${fmt(v.deposit_amount)}${v.deposit_paid ? " ✓ paid" : v.deposit_due ? ` due ${v.deposit_due}` : " unpaid"}` : null),
          action: () => ({ label: "Add deposit amount" }),
        },
        { label: "Your notes", value: (v) => v.notes.trim() || null, action: () => ({ label: "Write a note" }) },
      ],
      more: [
        { label: "Quoted", value: (v) => (v.quoted_total != null ? fmt(v.quoted_total) : null) },
        { label: "Contracted", value: (v) => (v.contracted_total != null ? fmt(v.contracted_total) : null) },
        { label: "Balance", value: (v) => (v.balance_due ? (v.balance_paid ? `✓ paid (due ${v.balance_due})` : `due ${v.balance_due}`) : null) },
        { label: "Quote completion", value: (v) => `${checklistPercent(v)}%` },
        { label: "Budget note", value: (v) => v.budget_note.trim() || null },
      ],
    },
    {
      key: "fit",
      label: "Fit",
      icon: ListChecks,
      primary: [
        { label: "Capacity", value: (v) => v.capacity || null, action: () => ({ label: "Record capacity" }) },
        { label: "Location", value: (v) => v.location || null },
        { label: "Turnkey level", value: (v) => v.turnkey || null },
        { label: "Team", value: (v) => v.team || null },
        { label: "Status", value: (v) => STATUSES[v.status] },
      ],
      more: [
        { label: "DIY we'd still do", value: (v) => v.diy || null },
        { label: "Period", value: (v) => v.period || null },
      ],
    },
    {
      key: "stay",
      label: "Stay",
      icon: MapPinned,
      primary: [
        { label: "Period", value: (v) => v.period || null },
        { label: "Open questions", value: (v) => v.questions.trim() || null },
        {
          label: "Website",
          value: (v) => (v.website ? "Visit site" : null),
          node: (v) =>
            v.website ? (
              <a href={v.website} target="_blank" rel="noreferrer" className="text-sage-deep underline underline-offset-2">Visit site</a>
            ) : null,
          action: () => ({ label: "Add website" }),
        },
        { label: "Contact", value: (v) => v.contact || null, action: () => ({ label: "Add contact" }) },
      ],
      more: [],
    },
    {
      key: "experience",
      label: "Experience",
      icon: Heart,
      primary: [
        { label: "Themes", value: (v) => v.themes || null },
        { label: "Colors on site", value: (v) => v.colors || null },
        { label: "Main advantage", value: (v) => v.pros || null, action: () => ({ label: "Write a note" }) },
        { label: "Main concern", value: (v) => v.cons || null },
      ],
      more: [
        { label: "Contact", value: (v) => v.contact || null },
        {
          label: "Website",
          value: (v) => (v.website ? "Visit site" : null),
          node: (v) => (v.website ? <a href={v.website} target="_blank" rel="noreferrer" className="text-sage-deep underline underline-offset-2">Visit site</a> : null),
        },
      ],
    },
  ];
}

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
  const [venues, setVenues] = useState(initialVenues);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: "shortlist" | "compare" | "map" = tabParam === "compare" || tabParam === "map" ? tabParam : "shortlist";
  function setTab(next: "shortlist" | "compare") {
    router.push(next === "compare" ? "/venues?tab=compare" : "/venues", { scroll: false });
  }
  const [activeCompareTab, setActiveCompareTab] = useState("money");
  const [moreOpenTabs, setMoreOpenTabs] = useState<Set<string>>(new Set());
  const [showAllFields, setShowAllFields] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [locFilter, setLocFilter] = useState("all");
  const [capFilter, setCapFilter] = useState(0);
  const [priceFilter, setPriceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [sortBy, setSortBy] = useState<"stage" | "price_low" | "price_high" | "name">("stage");
  const as = assumptions;
  const TABS = useMemo(() => buildTabs(), []);

  const sorted = useMemo(() => {
    return [...venues].sort((a, b) => {
      const oa = STATUS_ORDER.indexOf(a.status), ob = STATUS_ORDER.indexOf(b.status);
      if (oa !== ob) return oa - ob;
      return calcVenue(a, as, sharedVals).grand - calcVenue(b, as, sharedVals).grand;
    });
  }, [venues, as, sharedVals]);

  const filtered = useMemo(() => {
    const list = sorted.filter((v) => {
      const grand = calcVenue(v, as, sharedVals).grand;
      if (locFilter !== "all" && v.location !== locFilter) return false;
      if (capFilter && capacityNumber(v) < capFilter) return false;
      if (priceFilter === "low" && grand >= 10000) return false;
      if (priceFilter === "mid" && (grand < 10000 || grand > 25000)) return false;
      if (priceFilter === "high" && grand <= 25000) return false;
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      return true;
    });
    if (sortBy === "price_low") list.sort((a, b) => calcVenue(a, as, sharedVals).grand - calcVenue(b, as, sharedVals).grand);
    if (sortBy === "price_high") list.sort((a, b) => calcVenue(b, as, sharedVals).grand - calcVenue(a, as, sharedVals).grand);
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [sorted, as, sharedVals, locFilter, capFilter, priceFilter, statusFilter, sortBy]);
  const favourites = filtered.filter((v) => v.is_favourite && v.status !== "out").slice(0, 3);
  const exploring = filtered.filter((v) => !favourites.includes(v));
  const locations = [...new Set(venues.map((v) => v.location).filter(Boolean))].sort();
  const heroVenue = [...sorted].sort((a, b) => Number(b.is_favourite) - Number(a.is_favourite)).find((v) => v.photos?.[0]);
  const heroPhoto = heroVenue ? photoUrls[heroVenue.photos[0].path] : null;
  const searchItems: SearchItem[] = venues.map((v) => ({ label: v.name, hint: v.location || "Venue", href: `/venues/${v.id}` }));

  const mapped = venues.filter((v): v is Venue & { lat: number; lng: number } => v.lat != null && v.lng != null);
  const unmapped = venues.filter((v) => v.lat == null || v.lng == null);

  const [pinning, setPinning] = useState("");
  // Fills in every missing pin from the venue's location text, one lookup per second.
  async function pinAll() {
    const supabase = createClient();
    let found = 0;
    const todo = unmapped.filter((v) => v.location.trim() || v.name.trim());
    for (let i = 0; i < todo.length; i++) {
      const v = todo[i];
      setPinning(`Finding ${v.name} (${i + 1} of ${todo.length})…`);
      try {
        const hit = await geocodeVenue(v.name, v.location);
        if (hit) {
          const { error } = await supabase.from("venues").update({ lat: hit.lat, lng: hit.lng }).eq("id", v.id);
          if (error) {
            setError(error.message);
            break;
          }
          setVenues((vs) => vs.map((x) => (x.id === v.id ? { ...x, lat: hit.lat, lng: hit.lng } : x)));
          found++;
        }
      } catch {
        setError("Couldn't reach the map lookup — try again in a moment.");
        break;
      }
      if (i < todo.length - 1) await new Promise((r) => setTimeout(r, 1100));
    }
    setPinning(`Pinned ${found} of ${todo.length}. Any missed places can be pinned from their details page.`);
  }

  const compared = compareIds.map((id) => venues.find((v) => v.id === id)).filter((v): v is Venue => Boolean(v));

  const leaderId = useMemo(() => {
    if (compared.length === 0) return null;
    return [...compared].sort((a, b) => calcVenue(a, as, sharedVals).grand - calcVenue(b, as, sharedVals).grand)[0].id;
  }, [compared, as, sharedVals]);

  const cheapestPerGuestId = useMemo(() => {
    if (compared.length === 0) return null;
    return [...compared].sort((a, b) => calcVenue(a, as, sharedVals).perGuest - calcVenue(b, as, sharedVals).perGuest)[0].id;
  }, [compared, as, sharedVals]);

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

  function toggleMore(tabKey: string) {
    setMoreOpenTabs((s) => {
      const next = new Set(s);
      if (next.has(tabKey)) next.delete(tabKey);
      else next.add(tabKey);
      return next;
    });
  }

  function compareBox(v: Venue) {
    const checked = compareIds.includes(v.id);
    const disabled = !checked && compareIds.length >= MAX_COMPARE;
    return (
      <label className={`flex items-center gap-2 text-sm text-ink ${disabled ? "opacity-50" : ""}`}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleCompare(v.id)} className={`h-4 w-4 accent-sage-deep ${FOCUS_RING}`} />
        Compare
      </label>
    );
  }

  function heartButton(v: Venue, className: string) {
    return (
      <button
        onClick={() => toggleFavourite(v)}
        aria-label={v.is_favourite ? `Remove ${v.name} from favourites` : `Add ${v.name} to favourites`}
        aria-pressed={v.is_favourite}
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] shadow-sm ${FOCUS_RING} ${className}`}
      >
        <Heart className={`h-[18px] w-[18px] ${v.is_favourite ? "fill-wine text-wine" : "text-ink"}`} strokeWidth={1.5} aria-hidden />
      </button>
    );
  }

  function cover(v: Venue, i: number, className: string) {
    const photo = v.photos?.[0];
    return photo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrls[photo.path]} alt="" loading="lazy" className={`${className} object-cover`} />
    ) : (
      <div className={`${className} flex items-center justify-center font-serif text-5xl text-white`} style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}>
        {v.name.charAt(0)}
      </div>
    );
  }

  const facts = (v: Venue, calc: Calc) => (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink">
      <span className="flex items-center gap-1.5">
        <Users className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />
        {v.capacity || "Capacity TBD"}
      </span>
      <span>
        {calc.venueSource === "estimated" ? "≈ " : ""}
        <b className="font-semibold">{fmt(calc.grand)}</b>
        {calc.venueSource !== "estimated" && <span className="ml-1 text-xs font-semibold text-sage-deep">({calc.venueSource})</span>}
      </span>
    </div>
  );

  function favouriteCard(v: Venue, i: number) {
    const calc = calcVenue(v, as, sharedVals);
    return (
      <div key={v.id} className="flex flex-col overflow-hidden rounded-2xl bg-paper shadow-sm">
        <div className="relative">
          <Link href={`/venues/${v.id}`} aria-label={`Open ${v.name}`} className={`relative block aspect-[16/9] ${FOCUS_RING}`}>
            {cover(v, i, "absolute inset-0 h-full w-full")}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <span className="block font-serif text-3xl font-light leading-tight">{v.name}</span>
              <span className="mt-1 block">{v.location || "Location TBD"}</span>
            </div>
          </Link>
          {heartButton(v, "absolute left-3 top-3")}
          <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-3.5 py-1.5 text-sm text-ink shadow-sm">
            {v.status === "finalist" ? STATUSES.finalist : (<><Heart className="h-3.5 w-3.5 text-wine" strokeWidth={1.5} aria-hidden /> Our favourite</>)}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          {facts(v, calc)}
          <div className="flex items-center gap-4">
            {compareBox(v)}
            <Link href={`/venues/${v.id}`} className={`flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-sage-deep ${FOCUS_RING}`}>
              View details <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function exploreCard(v: Venue, i: number) {
    const calc = calcVenue(v, as, sharedVals);
    const pct = checklistPercent(v);
    return (
      <div key={v.id} className={`flex flex-col overflow-hidden rounded-2xl border border-line shadow-sm ${CARD_TRANSITION}`} style={{ background: STATUS_TINT[v.status] }}>
        <div className="relative">
          <Link href={`/venues/${v.id}`} aria-label={`Open ${v.name}`} className={`relative block aspect-[4/3] ${FOCUS_RING}`}>
            {cover(v, i, "absolute inset-0 h-full w-full")}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-10">
              <span className="block font-serif text-xl text-white">{v.name}</span>
            </div>
          </Link>
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-3 py-1 text-xs font-medium text-ink shadow-sm">{STATUSES[v.status]}</span>
          {heartButton(v, "absolute right-3 top-3")}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <p className="text-sm text-ink-2">{v.location || "Location TBD"}</p>
          {facts(v, calc)}
          <div className="mt-auto flex items-center gap-2" title={`${pct}% of the quote checklist answered`}>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink-2)_15%,transparent)]">
              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 3)}%`, background: STATUS_ACCENT[v.status] }} />
            </div>
            <span className="text-xs text-ink-2">{pct}%</span>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-3">
            {compareBox(v)}
            <Link href={`/venues/${v.id}`} className={`flex items-center gap-1.5 rounded text-sm text-ink hover:text-sage-deep ${FOCUS_RING}`}>
              Details <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function fieldRow(field: CompareField, calcFor: (v: Venue) => Calc) {
    return (
      <tr key={field.label} className="border-b border-line last:border-0">
        <th className="px-4 py-3 text-left align-top text-xs font-semibold uppercase tracking-wide text-ink-2">{field.label}</th>
        {compared.map((v) => {
          const calc = calcFor(v);
          const val = field.value(v, calc);
          const isLeaderCol = v.id === leaderId;
          let badge: string | null = null;
          if (field.label === "All-in estimate" && v.id === leaderId) badge = "Lowest";
          if (field.label === "Cost per guest" && v.id === cheapestPerGuestId) badge = "Best value";
          return (
            <td key={v.id} className={`px-4 py-3 align-top ${isLeaderCol ? "bg-[color-mix(in_srgb,var(--sage)_10%,var(--paper))]" : ""}`}>
              {val === null ? (
                <div className="flex flex-col items-start gap-1.5">
                  <span className="text-ink-2">Not available</span>
                  {field.action && (
                    <Link href={`/venues/${v.id}`} className="text-xs font-semibold text-sage-deep underline underline-offset-2">
                      {field.action(v).label} →
                    </Link>
                  )}
                </div>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  {field.node ? field.node(v, calc) : val}
                  {badge && (
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--sage)_28%,var(--paper))] px-2 py-0.5 text-xs font-semibold text-sage-deep">
                      {badge}
                    </span>
                  )}
                </span>
              )}
            </td>
          );
        })}
      </tr>
    );
  }

  const activeTabData = TABS.find((t) => t.key === activeCompareTab)!;
  const moreOpen = showAllFields || moreOpenTabs.has(activeCompareTab);
  const anyMissingQuote = compared.some((v) => !v.quote_received);

  return (
    <div className="min-h-screen pb-24 lg:pl-56">
      <NavBar userName={userName} />

      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <DashboardTopBar
          userName={userName}
          partner={userName.trim().toLowerCase() === "ariel" ? "Fred" : "Ariel"}
          items={searchItems}
          notices={[]}
          placeholder="Search venues, locations, or keywords…"
          onSelect={(item) => router.push(item.href)}
        />

        <section className="mt-8 grid items-stretch gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="relative flex flex-col justify-center">
            <h1 className="font-serif text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">
              Find the place
              <br />
              that feels like <span className="font-script text-[1.15em] text-wine">us.</span>
            </h1>
            <p className="mt-4 max-w-sm text-lg text-ink-2">Shortlist your options, fall in love with a few, then compare what matters.</p>
          </div>
          <div className="relative min-h-[13rem] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))]">
            {heroPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,color-mix(in_srgb,var(--gold)_35%,var(--paper)),color-mix(in_srgb,var(--surface-blush)_25%,var(--paper)))]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-transparent to-transparent" />
            <p aria-hidden className="absolute right-6 top-5 hidden -rotate-6 text-right font-script text-4xl leading-[1.05] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.45)] sm:block">
              Good venues,
              <br />
              better memories ♡
            </p>
            {heroVenue && (
              <p className="absolute bottom-4 left-4 bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-4 py-2.5 text-sm text-ink shadow-sm">
                {heroVenue.name}
                {heroVenue.location && <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-2">{heroVenue.location}</span>}
              </p>
            )}
          </div>
        </section>

        {venues.length > 0 && (
          <>
            <dl className="mt-7 flex flex-wrap items-center gap-x-10 gap-y-4">
              {[
                { n: venues.length, label: venues.length === 1 ? "place" : "places", Icon: MapPin },
                { n: venues.filter((v) => v.is_favourite).length, label: "favourites", Icon: Heart },
                { n: venues.filter((v) => v.status === "tour_booked").length, label: "tour booked", Icon: CalendarDays },
                { n: venues.filter((v) => v.quote_received).length, label: "quotes", Icon: FileText },
                { n: compareIds.length, label: "selected to compare", Icon: GitCompareArrows },
              ].map(({ n, label, Icon }) => (
                <div key={label} className="flex items-center gap-3 text-ink-2">
                  <Icon className="h-6 w-6" strokeWidth={1.25} aria-hidden />
                  <div>
                    <dd className="font-serif text-2xl font-light leading-none text-ink">{n}</dd>
                    <dt className="mt-1 text-sm">{label}</dt>
                  </div>
                </div>
              ))}
              <button onClick={addPlace} className={`ml-auto flex items-center gap-2 rounded-full bg-surface-olive px-6 py-3 text-base font-medium text-white ${FOCUS_RING}`}>
                <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Add a venue
              </button>
            </dl>

            <div className="mt-6 flex gap-8 border-b border-line">
              <Link href="/venues" className={`border-b-2 pb-3 text-lg ${tab === "shortlist" ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
                Shortlist
              </Link>
              <Link href="/venues?tab=compare" className={`border-b-2 pb-3 text-lg ${tab === "compare" ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
                Compare
              </Link>
              <Link href="/venues?tab=map" className={`border-b-2 pb-3 text-lg ${tab === "map" ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
                Map
              </Link>
            </div>
          </>
        )}

        {venues.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
            <h2 className="font-serif text-2xl">Nothing here yet</h2>
            <p className="mt-2 text-ink-2">Start with the six venues from the original research, or add your own.</p>
            <button
              onClick={seed}
              disabled={seeding}
              className={`mt-4 rounded-full bg-surface-sage-deep px-4 py-2 font-semibold text-white disabled:opacity-60 ${FOCUS_RING}`}
            >
              {seeding ? "Adding…" : "Add the 6 shortlisted venues"}
            </button>
            {error && <p className="mt-3 text-sm text-wine">{error}</p>}
          </div>
        ) : tab === "shortlist" ? (
          <>
            {error && <p className="mt-3 text-sm text-wine">{error}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <select aria-label="Filter by location" value={locFilter} onChange={(e) => setLocFilter(e.target.value)} className={TOOL_SELECT}>
                <option value="all">All locations</option>
                {locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <select aria-label="Filter by capacity" value={capFilter} onChange={(e) => setCapFilter(+e.target.value)} className={TOOL_SELECT}>
                <option value={0}>Capacity</option>
                <option value={100}>Fits 100+</option>
                <option value={150}>Fits 150+</option>
                <option value={200}>Fits 200+</option>
              </select>
              <select aria-label="Filter by price" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} className={TOOL_SELECT}>
                <option value="all">Price</option>
                <option value="low">Under $10K</option>
                <option value="mid">$10K – $25K</option>
                <option value="high">Over $25K</option>
              </select>
              <select aria-label="Filter by stage" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | Status)} className={TOOL_SELECT}>
                <option value="all">Any stage</option>
                {STATUS_ORDER.map((st) => (
                  <option key={st} value={st}>{STATUSES[st]}</option>
                ))}
              </select>
              <select aria-label="Sort venues" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className={`${TOOL_SELECT} ml-auto`}>
                <option value="stage">Sort by stage</option>
                <option value="price_low">Price: low to high</option>
                <option value="price_high">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </div>

            <section className="mt-6 rounded-3xl bg-[color-mix(in_srgb,var(--surface-blush)_10%,var(--paper))] p-5 sm:p-6" aria-labelledby="favourites-title">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="favourites-title" className="font-serif text-3xl font-light">Our favourites</h2>
                  <p className="mt-1 text-ink-2">The places that make us say “this could be it”.</p>
                </div>
                <p aria-hidden className="-rotate-3 font-script text-3xl text-wine">Top contenders ♡</p>
              </div>
              {favourites.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-paper px-5 py-8 text-center text-sm text-ink-2">Tap the heart on a place you love and it will appear here as a large card.</p>
              ) : (
                <div className={`mt-5 grid gap-5 md:grid-cols-2 ${favourites.length === 3 ? "xl:grid-cols-3" : ""}`}>{favourites.map((v, i) => favouriteCard(v, i))}</div>
              )}
            </section>

            <section className="mt-10" aria-labelledby="exploring-title">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="exploring-title" className="font-serif text-3xl font-light">Places we&apos;re exploring</h2>
                  <p className="mt-1 text-ink-2">Keep researching, plan a visit, and see what feels right.</p>
                </div>
                <p aria-hidden className="-rotate-3 font-script text-2xl leading-tight text-sage-deep">Different places, same dream ♡</p>
              </div>
              {exploring.length === 0 ? (
                <p className="mt-5 text-sm text-ink-2">{filtered.length === 0 ? "No places match these filters." : "Every place you're tracking is a favourite."}</p>
              ) : (
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{exploring.map((v, i) => exploreCard(v, i + favourites.length))}</div>
              )}
            </section>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[color-mix(in_srgb,var(--sage)_18%,var(--paper))] px-6 py-5">
              <div className="flex items-center gap-4">
                <MapPin className="h-8 w-8 text-ink" strokeWidth={1.25} aria-hidden />
                <div>
                  <p className="font-serif text-xl">See it on the map</p>
                  <p className="text-sm text-ink-2">
                    {mapped.length > 0 ? `${mapped.length} of ${venues.length} places pinned — explore where everything is.` : "Add a map pin to a venue, then explore where everything is."}
                  </p>
                </div>
              </div>
              <Link href="/venues?tab=map" className={`rounded-full bg-surface-green px-6 py-2.5 text-sm font-medium text-white ${FOCUS_RING}`}>
                Open map view
              </Link>
            </div>
          </>
        ) : tab === "map" ? (
          <div className="mt-6">
            {unmapped.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <button onClick={pinAll} disabled={Boolean(pinning) && pinning.startsWith("Finding")} className={`rounded-full bg-surface-olive px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60 ${FOCUS_RING}`}>
                  Find {unmapped.length} place{unmapped.length === 1 ? "" : "s"} from their addresses
                </button>
                {pinning && <span role="status" className="text-sm text-ink-2">{pinning}</span>}
                {error && <span className="text-sm text-wine">{error}</span>}
              </div>
            )}
            {mapped.length === 0 ? (
              <div className="rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
                <h2 className="font-serif text-2xl">No places on the map yet</h2>
                <p className="mx-auto mt-2 max-w-md text-ink-2">Open a venue and add its latitude and longitude under “Map pin” in its details. Places with coordinates appear here.</p>
              </div>
            ) : (
              <VenueMap venues={mapped} />
            )}
            {unmapped.length > 0 && mapped.length > 0 && (
              <p className="mt-4 text-sm text-ink-2">
                Not on the map yet — add a map pin to:{" "}
                {unmapped.map((v, i) => (
                  <span key={v.id}>
                    {i > 0 && ", "}
                    <Link href={`/venues/${v.id}`} className="font-semibold text-sage-deep underline underline-offset-2">{v.name}</Link>
                  </span>
                ))}
              </p>
            )}
            {unmapped.length > 0 && mapped.length === 0 && (
              <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                {unmapped.map((v) => (
                  <li key={v.id}>
                    <Link href={`/venues/${v.id}`} className="rounded-full border border-line bg-paper px-3 py-1.5 text-ink hover:border-sage-deep">{v.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            {compared.length < 2 ? (
              <div className="mt-8 rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
                <p className="text-ink-2">Select 2–3 venues from your shortlist to compare.</p>
                <button onClick={() => setTab("shortlist")} className={`mt-3 rounded-full bg-surface-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
                  Go to shortlist
                </button>
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper p-4 shadow-sm">
                  <span className="mr-1 text-sm text-ink-2">Comparing {compared.length} of {venues.length} venues</span>
                  {compared.map((v) => (
                    <span key={v.id} className="flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-1.5 text-sm font-semibold text-ink">
                      {v.name}
                      <button onClick={() => toggleCompare(v.id)} aria-label={`Remove ${v.name} from comparison`} className="text-ink-2 hover:text-wine">
                        ×
                      </button>
                    </span>
                  ))}
                  {compareIds.length < MAX_COMPARE && (
                    <select
                      key={compareIds.join(",")}
                      defaultValue=""
                      onChange={(e) => e.target.value && toggleCompare(e.target.value)}
                      className="rounded-full border border-dashed border-line bg-transparent px-3 py-1.5 text-sm font-semibold text-ink-2 hover:border-sage-deep hover:text-ink"
                    >
                      <option value="" disabled>＋ Add venue</option>
                      {sorted.filter((v) => !compareIds.includes(v.id)).map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {leaderId && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--sage)_16%,var(--paper))] p-5 shadow-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Best value so far</p>
                      <p className="mt-1 font-serif text-xl font-medium">{compared.find((v) => v.id === leaderId)!.name}</p>
                      <p className="mt-0.5 text-sm text-ink-2">
                        {leaderId === cheapestPerGuestId ? "Lowest estimate and lowest cost per guest." : "Lowest estimate among your selection."}
                      </p>
                    </div>
                    <button onClick={() => setWhyOpen((v) => !v)} className="shrink-0 text-sm font-semibold text-sage-deep underline underline-offset-2">
                      Why this stands out →
                    </button>
                  </div>
                )}
                {whyOpen && leaderId && (
                  <div className="mt-2 rounded-xl border border-line bg-paper p-4 text-sm text-ink-2 shadow-sm">
                    <ul className="flex flex-col gap-1">
                      {compared.map((v) => {
                        const c = calcVenue(v, as, sharedVals);
                        return (
                          <li key={v.id} className="flex items-center justify-between">
                            <span className={v.id === leaderId ? "font-semibold text-ink" : ""}>{v.name}</span>
                            <span>{fmt(c.grand)} · {fmt(c.perGuest)}/guest</span>
                          </li>
                        );
                      })}
                    </ul>
                    {anyMissingQuote && (
                      <p className="mt-2 border-t border-line pt-2 text-xs">
                        {compared.filter((v) => !v.quote_received).length} of {compared.length} venues haven&apos;t sent a complete quote yet — these are estimates.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-1 border-b border-line">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setActiveCompareTab(t.key)}
                      className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold ${
                        activeCompareTab === t.key ? "border-green text-ink" : "border-transparent text-ink-2 hover:text-ink"
                      }`}
                    >
                      <t.icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-hidden rounded-b-2xl border border-t-0 border-line bg-paper shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-line">
                          <th className="w-40 shrink-0 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Detail</th>
                          {compared.map((v) => (
                            <th
                              key={v.id}
                              className={`min-w-48 px-4 py-3 text-left align-top ${v.id === leaderId ? "bg-[color-mix(in_srgb,var(--sage)_10%,var(--paper))]" : ""}`}
                            >
                              {v.photos?.[0] && photoUrls[v.photos[0].path] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photoUrls[v.photos[0].path]} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
                              )}
                              <Link href={`/venues/${v.id}`} className="font-serif text-base font-medium text-ink hover:text-sage-deep">
                                {v.is_favourite ? "★ " : ""}
                                {v.name}
                              </Link>
                              <span className="mt-0.5 block text-xs font-normal text-ink-2">{v.location || "Location TBD"}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeTabData.primary.map((f) => fieldRow(f, (v) => calcVenue(v, as, sharedVals)))}
                        {activeTabData.more.length > 0 && moreOpen && activeTabData.more.map((f) => fieldRow(f, (v) => calcVenue(v, as, sharedVals)))}
                      </tbody>
                    </table>
                  </div>
                  {activeTabData.more.length > 0 && (
                    <button
                      onClick={() => toggleMore(activeCompareTab)}
                      className="flex w-full items-center gap-1.5 border-t border-line px-4 py-3 text-left text-sm font-semibold text-ink-2 hover:bg-bg hover:text-ink"
                    >
                      <span className={`inline-block transition-transform ${moreOpen ? "rotate-90" : ""}`}>›</span>
                      {moreOpen ? `Hide extra ${activeTabData.label.toLowerCase()} details` : `Show ${activeTabData.more.length} more ${activeTabData.label.toLowerCase()} details`}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowAllFields((v) => !v)}
                  className="mt-3 text-sm font-semibold text-sage-deep underline underline-offset-2"
                >
                  {showAllFields ? "Showing all research fields" : "View all research fields →"}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {tab === "shortlist" && compareIds.length >= 2 && (
        <button
          onClick={() => setTab("compare")}
          className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-surface-green px-5 py-3 text-sm font-semibold text-white shadow-md ${FOCUS_RING}`}
        >
          {compareIds.length} venue{compareIds.length === 1 ? "" : "s"} selected · Compare now →
        </button>
      )}
    </div>
  );
}
