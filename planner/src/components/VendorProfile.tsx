"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Globe, Heart, Layers, Mail, Pencil, Scale, Trash2, X } from "lucide-react";
import NavBar from "@/components/NavBar";
import { useConfirm } from "@/components/ConfirmProvider";
import { VendorPhoto } from "@/components/VendorCard";
import VendorComms from "@/components/VendorComms";
import VendorEditDialog from "@/components/VendorEditDialog";
import VendorFiles from "@/components/VendorFiles";
import VendorPricing from "@/components/VendorPricing";
import { BTN, BTN_PRIMARY, Fact, FIELD, FOCUS_RING } from "@/components/VendorUi";
import { normalizeUrl } from "@/lib/ideas";
import { createClient } from "@/lib/supabase/client";
import type { IdeaImage } from "@/lib/registry";
import { useDialog } from "@/lib/use-dialog";
import { useRowSave } from "@/lib/use-row-save";
import {
  AVAILABILITY_LABELS,
  CARD_STATE_LABEL,
  CARD_STATE_STYLE,
  cardState,
  fmtMoney,
  formatShortDate,
  isBooked,
  isFavourite,
  isOurFavourite,
  needsAttention,
  openFollowUps,
  photoSrc,
  PRICE_USED_LABEL,
  vendorPrice,
  WORKS_WITH_VENUE_LABELS,
  type Vendor,
  type VendorComm,
  type VendorFile,
  type VendorPayment,
  type VendorPriceRow,
} from "@/lib/vendors";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "pricing", label: "Pricing" },
  { key: "services", label: "Services" },
  { key: "communication", label: "Communication" },
  { key: "files", label: "Files" },
  { key: "notes", label: "Notes" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type Venue = { id: string; name: string };

export default function VendorProfile({
  userName,
  initial,
  ideas,
  initialPrices,
  initialComms,
  initialFiles,
  initialPayments,
  venues,
  initialScenarioIds,
  compareIds,
  guests,
  initialTab,
  openEdit,
}: {
  userName: string;
  initial: Vendor;
  ideas: IdeaImage[];
  initialPrices: VendorPriceRow[];
  initialComms: VendorComm[];
  initialFiles: VendorFile[];
  initialPayments: VendorPayment[];
  venues: Venue[];
  initialScenarioIds: string[];
  compareIds: string[];
  guests: { adults: number; kids: number };
  initialTab: TabKey;
  openEdit: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const supabase = useMemo(() => createClient(), []);
  const [v, setV] = useState(initial);
  const [prices, setPrices] = useState(initialPrices);
  const [comms, setComms] = useState(initialComms);
  const [files, setFiles] = useState(initialFiles);
  const [payments, setPayments] = useState(initialPayments);
  const [scenarioIds, setScenarioIds] = useState(initialScenarioIds);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState(openEdit);
  const [booking, setBooking] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [error, setError] = useState("");
  const contactRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { saveNow, scheduleSave } = useRowSave<Vendor>("vendors", (_id, patch) => setV((cur) => ({ ...cur, ...patch })), setError);
  const save = { now: (patch: Partial<Vendor>) => saveNow(v.id, patch), later: (patch: Partial<Vendor>) => scheduleSave(v.id, patch) };

  const ideaMap = useMemo(() => new Map(ideas.map((i) => [i.id, i])), [ideas]);
  const srcs = v.photos.map((p) => photoSrc(p, ideaMap)).filter(Boolean);
  const booked = isBooked(v);
  const today = new Date().toISOString().slice(0, 10);
  const attention = needsAttention(v, openFollowUps(comms), payments, today);
  const state = cardState(v, attention);
  const used = vendorPrice(v, guests);
  const me = userName.trim().toLowerCase() === "fred" ? "fred" : "ariel";

  const patchPhotos = (photos: string[]) => {
    save.now({ photos });
    setActive(0);
  };

  async function toggleReaction(who: "ariel" | "fred") {
    save.now({ [`${who}_reaction`]: v[`${who}_reaction`] === "love" ? null : "love" } as Partial<Vendor>);
  }

  async function unbook() {
    if (!(await confirm(`Move ${v.name} back to your potential vendors? Their notes, prices, files and messages stay with them.`, "Move back"))) return;
    save.now({ status: "researching", booked_on: null });
    setEditing(false);
  }

  async function remove() {
    if (!(await confirm(`Delete ${v.name}? This also removes their price history, messages and files.`, "Delete"))) return;
    const paths = files.map((f) => f.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from("vendor-files").remove(paths);
    await supabase.from("vendors").delete().eq("id", v.id);
    router.push(booked ? "/vendors/booked" : "/vendors");
  }

  async function toggleScenario(venueId: string) {
    const on = scenarioIds.includes(venueId);
    setScenarioIds((ids) => (on ? ids.filter((x) => x !== venueId) : [...ids, venueId]));
    const { error: err } = on
      ? await supabase.from("vendor_scenarios").delete().eq("vendor_id", v.id).eq("venue_id", venueId)
      : await supabase.from("vendor_scenarios").insert({ vendor_id: v.id, venue_id: venueId });
    if (err) {
      setError(`${err.message} Has migration 046 been run?`);
      setScenarioIds((ids) => (on ? [...ids, venueId] : ids.filter((x) => x !== venueId)));
    }
  }

  function goTab(next: TabKey) {
    setTab(next);
    tabRefs.current[next]?.focus();
  }
  function onTabKey(e: React.KeyboardEvent, i: number) {
    const to = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    goTab(TABS[to].key);
  }

  const compareHref = `/vendors/compare?ids=${[v.id, ...compareIds].slice(0, 4).join(",")}`;
  const location = [v.city, v.address].filter(Boolean).join(" · ");
  const hasContact = v.contact_name || v.email || v.phone || v.website || v.social;
  const socialHref = v.social && (/^@/.test(v.social) ? `https://instagram.com/${v.social.slice(1)}` : normalizeUrl(v.social));

  return (
    <div className="min-h-screen pb-24 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <Link href={booked ? "/vendors/booked" : "/vendors"} className={`inline-flex min-h-11 items-center gap-2 rounded text-sm text-ink-2 hover:text-ink ${FOCUS_RING}`}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {booked ? "Our wedding team" : "All vendors"}
        </Link>

        <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div>
            <VendorPhoto src={srcs[active] ?? ""} className="aspect-[4/3] w-full rounded-2xl" />
            {srcs.length > 1 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {srcs.map((s, i) => (
                  <li key={`${s}-${i}`}>
                    <button onClick={() => setActive(i)} aria-label={`Show photo ${i + 1} of ${srcs.length}`} aria-current={i === active} className={`block h-16 w-20 overflow-hidden rounded-lg border-2 ${FOCUS_RING} ${i === active ? "border-ink" : "border-transparent opacity-80 hover:opacity-100"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setEditing(true)} className={`mt-2 min-h-11 rounded text-sm text-ink-2 underline underline-offset-2 hover:text-ink ${FOCUS_RING}`}>
              {srcs.length ? "Manage photos" : "Add photos"}
            </button>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-2">{v.category}</p>
            <h1 className="mt-2 font-serif text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">{v.name}</h1>
            {location && <p className="mt-2 text-ink-2">{location}</p>}
            {v.tagline && <p className="mt-3 font-serif text-xl italic text-ink-2">“{v.tagline}”</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${CARD_STATE_STYLE[state]}`}>
                {booked && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
                {booked && !attention ? `Booked${v.booked_on ? ` ${formatShortDate(v.booked_on)}` : ""}` : attention ?? CARD_STATE_LABEL[state]}
              </span>
              {isFavourite(v) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold">
                  <Heart className="h-3.5 w-3.5 fill-wine text-wine" strokeWidth={1.5} aria-hidden />
                  {isOurFavourite(v) ? "Our favourite" : v.ariel_reaction === "love" ? "Ariel’s favourite" : "Fred’s favourite"}
                </span>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              {(["ariel", "fred"] as const).map((who) => {
                const on = v[`${who}_reaction`] === "love";
                const name = who === "ariel" ? "Ariel" : "Fred";
                return (
                  <button key={who} onClick={() => toggleReaction(who)} aria-pressed={on} aria-label={`${name}’s favourite: ${v.name}`} className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm ${FOCUS_RING} ${on ? "border-wine" : "border-line text-ink-2 hover:border-sage-deep"} ${who === me ? "font-medium" : ""}`}>
                    <Heart className={`h-4 w-4 ${on ? "fill-wine text-wine" : ""}`} strokeWidth={1.5} aria-hidden />
                    {name}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {!booked && <button onClick={() => setBooking(true)} className={BTN_PRIMARY}><Check className="h-4 w-4" strokeWidth={2} aria-hidden />Book this vendor</button>}
              {v.website && <a href={normalizeUrl(v.website)} target="_blank" rel="noopener noreferrer" className={BTN}><Globe className="h-4 w-4" strokeWidth={1.5} aria-hidden />Website<span className="sr-only"> (opens in a new tab)</span></a>}
              <button
                onClick={() => {
                  setTab("overview");
                  setTimeout(() => contactRef.current?.focus(), 0);
                }}
                className={BTN}
              >
                <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden />Contact
              </button>
              {!booked && <Link href={compareHref} className={BTN}><Scale className="h-4 w-4" strokeWidth={1.5} aria-hidden />Compare</Link>}
              <button onClick={() => setScenarioOpen(true)} className={BTN}><Layers className="h-4 w-4" strokeWidth={1.5} aria-hidden />Add to scenario{scenarioIds.length ? ` · ${scenarioIds.length}` : ""}</button>
              <button onClick={() => setEditing(true)} className={BTN}><Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden />Edit details</button>
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Price we’re using</p>
              {used.amount != null ? (
                <p className="mt-1 font-serif text-3xl font-light">{fmtMoney(used.amount)} <span className="font-sans text-sm text-ink-2">{PRICE_USED_LABEL[used.source!]}{used.note ? ` · ${used.note}` : ""}</span></p>
              ) : (
                <p className="mt-1 font-serif text-3xl font-light">Unknown <span className="font-sans text-sm text-ink-2">{used.note}</span></p>
              )}
            </div>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-wine">{error}</p>}

        <div role="tablist" aria-label="Vendor details" className="mt-10 flex gap-6 overflow-x-auto border-b border-line">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[t.key] = el;
              }}
              role="tab"
              id={`vt-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`vp-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`min-h-11 shrink-0 border-b-2 text-lg ${FOCUS_RING} ${tab === t.key ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`vp-${tab}`} aria-labelledby={`vt-${tab}`} tabIndex={0} className={`mt-8 max-w-4xl rounded ${FOCUS_RING}`}>
          {tab === "overview" && (
            <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl font-light">Why we like them</h2>
                  <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{v.pros || <span className="text-ink-2">Nothing yet. Use Edit details to say what stood out.</span>}</p>
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-light">What we’re unsure about</h2>
                  <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{v.concerns || <span className="text-ink-2">No concerns noted.</span>}</p>
                </div>
                {v.package_details && (
                  <div>
                    <h2 className="font-serif text-2xl font-light">Package</h2>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{v.package_details}</p>
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div>
                  <h2 ref={contactRef} tabIndex={-1} className="font-serif text-2xl font-light outline-none">Contact</h2>
                  {hasContact ? (
                    <dl className="mt-3 space-y-3">
                      <Fact label={booked ? "Primary contact" : "Contact person"} value={v.contact_name} />
                      <Fact label="Email" value={v.email && <a href={`mailto:${v.email}`} className="underline underline-offset-2">{v.email}</a>} />
                      <Fact label="Phone" value={v.phone && <a href={`tel:${v.phone}`} className="underline underline-offset-2">{v.phone}</a>} />
                      <Fact label="Website" value={v.website && <a href={normalizeUrl(v.website)} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">{v.website.replace(/^https?:\/\//, "")}</a>} />
                      <Fact label="Instagram / social" value={v.social && <a href={socialHref} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">{v.social}</a>} />
                    </dl>
                  ) : (
                    <p className="mt-2 text-ink-2">No contact details yet.</p>
                  )}
                </div>
                <dl className="space-y-3 border-t border-line pt-5">
                  <Fact label="Our wedding date" value={v.availability !== "unknown" ? `${AVAILABILITY_LABELS[v.availability]}${v.availability_response_date ? ` · answered ${formatShortDate(v.availability_response_date)}` : ""}` : ""} />
                  <Fact label="Location" value={location} />
                  <Fact label="Distance from venue" value={v.distance_km != null ? `${v.distance_km} km` : ""} />
                  <Fact label="Travel" value={[v.travel_included ? "Included" : "", v.travel_radius && `Radius ${v.travel_radius}`].filter(Boolean).join(" · ")} />
                  {!booked && <Fact label="Works with our venue" value={v.works_with_venue !== "need_to_ask" ? WORKS_WITH_VENUE_LABELS[v.works_with_venue] : ""} />}
                  {booked && <Fact label="Wedding-day arrival" value={v.arrival_time} />}
                  {booked && <Fact label="Day-of notes" value={v.day_of_notes} />}
                  <Fact label="Found through" value={v.source} />
                </dl>
              </div>
            </div>
          )}

          {tab === "pricing" && <VendorPricing vendor={v} prices={prices} setPrices={setPrices} payments={payments} setPayments={setPayments} guests={guests} save={save} />}

          {tab === "services" && (
            <ServicesPanel v={v} onEdit={() => setEditing(true)} />
          )}

          {tab === "communication" && <VendorComms vendor={v} comms={comms} setComms={setComms} files={files} save={save} />}
          {tab === "files" && <VendorFiles vendorId={v.id} files={files} setFiles={setFiles} />}

          {tab === "notes" && (
            <div>
              <label htmlFor="vendor-notes" className="font-serif text-2xl font-light">Notes</label>
              <textarea id="vendor-notes" rows={10} defaultValue={v.notes} onChange={(e) => save.later({ notes: e.target.value })} placeholder="Anything worth remembering: what they said on the call, what to ask next time…" className={`${FIELD} mt-3 text-[15px] leading-relaxed`} />
              <p className="mt-2 text-sm text-ink-2">Saves as you type.</p>
            </div>
          )}
        </div>

        <div className="mt-16 border-t border-line pt-4">
          <button onClick={remove} className={`inline-flex min-h-11 items-center gap-2 rounded text-sm text-wine ${FOCUS_RING}`}><Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />Delete this vendor</button>
        </div>
      </div>

      {editing && <VendorEditDialog vendor={v} ideas={ideas} save={save} onPhotos={patchPhotos} onClose={() => setEditing(false)} onUnbook={unbook} />}
      {booking && (
        <BookDialog
          vendor={v}
          onClose={() => setBooking(false)}
          onBooked={async (patch, price) => {
            setBooking(false);
            save.now({ status: "booked", booked_on: today, ...patch });
            if (price != null) {
              const { data } = await supabase.from("vendor_prices").insert({ vendor_id: v.id, source: "contracted", amount: price, note: "Booked" }).select().single();
              if (data) setPrices((ps) => [data as VendorPriceRow, ...ps]);
            }
            setTab("pricing");
          }}
        />
      )}
      {scenarioOpen && <ScenarioDialog vendor={v} venues={venues} selected={scenarioIds} used={used} onToggle={toggleScenario} onClose={() => setScenarioOpen(false)} />}
    </div>
  );
}

function ServicesPanel({ v, onEdit }: { v: Vendor; onEdit: () => void }) {
  const blocks: [string, string][] = [
    ["Packages & services", v.package_details],
    ["What’s included", v.whats_included],
    ["Add-ons", v.add_ons],
    ["Exclusions", v.exclusions],
    ["Important restrictions", v.restrictions],
    ["Setup", v.setup_notes],
    ["Teardown", v.teardown_notes],
    ["Required minimum", v.minimum_spend != null ? fmtMoney(v.minimum_spend) : ""],
    ["Travel", [v.travel_included ? "Included in their price" : "", v.travel_fee != null ? `Travel fee ${fmtMoney(v.travel_fee)}` : "", v.travel_radius && `Travels up to ${v.travel_radius}`].filter(Boolean).join(" · ")],
  ];
  const filled = blocks.filter(([, val]) => val);
  if (filled.length === 0) {
    return (
      <p className="text-ink-2">
        Nothing added yet. <button onClick={onEdit} className={`min-h-11 rounded font-medium text-ink underline underline-offset-2 ${FOCUS_RING}`}>Edit details</button> to note their packages, what’s included and any restrictions.
      </p>
    );
  }
  return (
    <dl className="grid gap-x-12 gap-y-6 md:grid-cols-2">
      {filled.map(([k, val]) => (
        <div key={k}>
          <dt className="font-serif text-2xl font-light">{k}</dt>
          <dd className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{val}</dd>
        </div>
      ))}
    </dl>
  );
}

function BookDialog({ vendor: v, onClose, onBooked }: { vendor: Vendor; onClose: () => void; onBooked: (patch: Partial<Vendor>, price: number | null) => void }) {
  const dialogRef = useDialog(true, onClose);
  const [total, setTotal] = useState(String(v.contracted_total ?? v.quoted_total ?? ""));
  const [contact, setContact] = useState(v.contact_name);
  const [arrival, setArrival] = useState(v.arrival_time);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Book ${v.name}`} tabIndex={-1} className="relative w-full max-w-md rounded-2xl bg-paper p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-3xl font-light">Book {v.name}</h2>
          <button onClick={onClose} aria-label="Close" className={`-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg ${FOCUS_RING}`}><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
        </div>
        <p className="mt-1 text-sm text-ink-2">They join your wedding team. Everything you’ve saved about them, including photos, prices, messages and files, comes with them.</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onBooked({ contact_name: contact, arrival_time: arrival, ...(total !== "" ? { contracted_total: +total } : {}) }, total !== "" && +total !== v.contracted_total ? +total : null);
          }}
        >
          <label className="block"><span className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Contracted total ($)</span><input type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Add it when you have it" className={FIELD} /></label>
          <label className="block"><span className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Primary contact</span><input value={contact} onChange={(e) => setContact(e.target.value)} className={FIELD} /></label>
          <label className="block"><span className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Wedding-day arrival time</span><input value={arrival} onChange={(e) => setArrival(e.target.value)} placeholder="e.g. 1:30 pm" className={FIELD} /></label>
          <p className="text-sm text-ink-2">Next you can add the payment schedule on the Pricing tab and upload the contract on Files.</p>
          <button type="submit" className={`${BTN_PRIMARY} w-full`}>Book {v.name}</button>
        </form>
      </div>
    </div>
  );
}

function ScenarioDialog({ vendor: v, venues, selected, used, onToggle, onClose }: { vendor: Vendor; venues: Venue[]; selected: string[]; used: ReturnType<typeof vendorPrice>; onToggle: (venueId: string) => void; onClose: () => void }) {
  const dialogRef = useDialog(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Add ${v.name} to a scenario`} tabIndex={-1} className="relative w-full max-w-md rounded-2xl bg-paper p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-3xl font-light">Add to a scenario</h2>
          <button onClick={onClose} aria-label="Close" className={`-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg ${FOCUS_RING}`}><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
        </div>
        <p className="mt-1 text-sm text-ink-2">
          {isBooked(v)
            ? "Booked vendors already count in every scenario, so there’s nothing to add."
            : used.amount != null
              ? `A scenario counts ${v.name} at ${fmtMoney(used.amount)} (${used.label.toLowerCase()}), and follows the price as it changes.`
              : `${v.name} has no usable price yet, so a scenario shows them as Unknown rather than $0.`}
        </p>
        {venues.length === 0 ? (
          <p className="mt-4 text-sm">Scenarios come from your venues. <Link href="/venues" className="font-medium underline underline-offset-2">Add a venue</Link> first.</p>
        ) : (
          <fieldset className="mt-4" disabled={isBooked(v)}>
            <legend className="sr-only">Scenarios</legend>
            <ul>
              {venues.map((ven) => (
                <li key={ven.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                    <input type="checkbox" checked={selected.includes(ven.id)} onChange={() => onToggle(ven.id)} className="h-4 w-4 accent-sage-deep" />
                    {ven.name} wedding
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <button onClick={onClose} className={`${BTN} mt-5 w-full`}>Done</button>
      </div>
    </div>
  );
}
