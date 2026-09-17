"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Coins, Heart, ListChecks, MapPinned, Sparkles } from "lucide-react";
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
  const tab: "shortlist" | "compare" = searchParams.get("tab") === "compare" ? "compare" : "shortlist";
  function setTab(next: "shortlist" | "compare") {
    router.push(next === "compare" ? "/venues?tab=compare" : "/venues", { scroll: false });
  }
  const [activeCompareTab, setActiveCompareTab] = useState("money");
  const [moreOpenTabs, setMoreOpenTabs] = useState<Set<string>>(new Set());
  const [showAllFields, setShowAllFields] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const as = assumptions;
  const TABS = useMemo(() => buildTabs(), []);

  const sorted = useMemo(() => {
    return [...venues].sort((a, b) => {
      const oa = STATUS_ORDER.indexOf(a.status), ob = STATUS_ORDER.indexOf(b.status);
      if (oa !== ob) return oa - ob;
      return calcVenue(a, as, sharedVals).grand - calcVenue(b, as, sharedVals).grand;
    });
  }, [venues, as, sharedVals]);

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

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Venue</h1>
            <p className="mt-2 text-ink-2">Shortlist your options, then compare the ones that matter.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.png" alt="" aria-hidden className="pointer-events-none absolute -right-6 -top-12 hidden h-40 w-auto rotate-[8deg] opacity-30 sm:block" />
        </div>

        {venues.length > 0 && (
          <div className="mt-6 flex gap-5 border-b border-line">
            <Link
              href="/venues"
              className={`border-b-2 pb-2.5 text-sm font-semibold ${tab === "shortlist" ? "border-green text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              Shortlist
            </Link>
            <Link
              href="/venues?tab=compare"
              className={`border-b-2 pb-2.5 text-sm font-semibold ${tab === "compare" ? "border-green text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              Compare venues
            </Link>
          </div>
        )}

        {venues.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
            <h2 className="font-serif text-2xl">Nothing here yet</h2>
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
        ) : tab === "shortlist" ? (
          <>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
              <p className="text-sm text-ink-2">Choose 2–3 venues to compare side by side</p>
              <button onClick={addPlace} className={`rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
                ＋ Add a place
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-wine">{error}</p>}

            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((v, i) => venueCard(v, i))}
            </div>
          </>
        ) : (
          <>
            {compared.length < 2 ? (
              <div className="mt-8 rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
                <p className="text-ink-2">Select 2–3 venues from your shortlist to compare.</p>
                <button onClick={() => setTab("shortlist")} className={`mt-3 rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
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
          className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-green px-5 py-3 text-sm font-semibold text-white shadow-md ${FOCUS_RING}`}
        >
          {compareIds.length} venue{compareIds.length === 1 ? "" : "s"} selected · Compare now →
        </button>
      )}
    </div>
  );
}
