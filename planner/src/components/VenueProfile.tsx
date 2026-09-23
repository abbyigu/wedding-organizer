"use client";

import { useConfirm } from "@/components/ConfirmProvider";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronRight, EllipsisVertical, Heart, ImagePlus, Link2, Paperclip, Share2, Star, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import TagField from "@/components/TagField";
import VenueActions from "@/components/VenueActions";
import VenueAmenities from "@/components/VenueAmenities";
import { FILE_KIND_LABELS, FILE_KINDS } from "@/lib/vendors";
import VenueComms, { type VenueComm } from "@/components/VenueComms";
import VenueCosts from "@/components/VenueCosts";
import { geocodeVenue } from "@/lib/geocode";
import { scenarioOf } from "@/lib/budget-scenarios";
import { linkedTotalFor, type BudgetExpense, type LinkedCost } from "@/lib/budget-extras";
import type { PlanningTask } from "@/lib/planning-tasks";
import { joinContact, parseContact, researchChecklist, researchPercent, VENUE_TYPES } from "@/lib/venue-profile";
import { CHECKLIST_ITEMS, checklistPercent, fmt, STATUSES, type Assumptions, type Photo, type Venue } from "@/lib/venues";

const TURNKEY_OPTIONS = ["", "Full turnkey", "Full turnkey plus", "Semi-turnkey", "DIY-heavy", "Full DIY"];
const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-sage-deep";
const LABEL = "text-sm font-semibold";
const PANEL = "rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const TABS = [
  ["general", "General Information"],
  ["costs", "Costs & Payments"],
  ["amenities", "Amenities & Spaces"],
  ["notes", "Notes & Research"],
  ["questions", "Questions"],
  ["contact", "Contact history"],
  ["files", "Files & Links"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function VenueProfile({
  venue,
  signedUrls,
  userName,
  assumptions,
  sharedVals,
  expenses,
  linked,
  tasks,
  initialTab,
  comms,
  commsMissing,
  planName,
}: {
  venue: Venue;
  signedUrls: Record<string, string>;
  userName: string;
  assumptions: Assumptions;
  sharedVals: number[];
  expenses: BudgetExpense[];
  linked: LinkedCost[];
  tasks: PlanningTask[];
  initialTab?: string;
  comms: VenueComm[];
  commsMissing: boolean;
  planName: string | null;
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const [v, setV] = useState(venue);
  const [urls, setUrls] = useState(signedUrls);
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t[0] === initialTab) ? (initialTab as Tab) : "general");
  const [saved, setSaved] = useState("");
  const [geo, setGeo] = useState("");
  const [coords, setCoords] = useState({ lat: venue.lat != null ? String(venue.lat) : "", lng: venue.lng != null ? String(venue.lng) : "" });
  const [contact, setContact] = useState(() => parseContact(venue.contact));
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shared, setShared] = useState("");
  const [linkDraft, setLinkDraft] = useState({ label: "", url: "" });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const save = useCallback(
    async (patch: Partial<Venue>) => {
      setSaved("Saving…");
      const { error } = await supabase.from("venues").update(patch).eq("id", v.id);
      setSaved(error ? `Could not save (${error.message})` : "Saved");
      if (!error) setTimeout(() => setSaved((s) => (s === "Saved" ? "" : s)), 1800);
    },
    [supabase, v.id],
  );

  // Autosave: typing waits a moment, clicks (wait = 0) save straight away.
  const update = useCallback(
    (patch: Partial<Venue>, wait = 800) => {
      setV((p) => ({ ...p, ...patch }));
      const key = Object.keys(patch)[0];
      clearTimeout(timers.current[key]);
      if (wait === 0) void save(patch);
      else timers.current[key] = setTimeout(() => save(patch), wait);
    },
    [save],
  );

  const bind = (key: keyof Venue) => ({ name: key as string, value: (v[key] ?? "") as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ [key]: e.target.value } as Partial<Venue>) });

  function setContactPart(part: "name" | "email" | "phone", val: string) {
    const next = { ...contact, [part]: val };
    setContact(next);
    update({ contact: joinContact(next) });
  }

  // Accepts one number per box, or "46.85, -71.21" (what Google Maps copies) pasted into either.
  function updateCoords(which: "lat" | "lng", raw: string) {
    const pair = raw.split(/[,\s]+/).filter(Boolean);
    const next = pair.length === 2 && !raw.includes("°") ? { lat: pair[0], lng: pair[1] } : { ...coords, [which]: raw };
    setCoords(next);
    const parse = (t: string, max: number) => (t.trim() === "" ? null : Math.abs(Number(t)) <= max && Number.isFinite(Number(t)) ? Number(t) : undefined);
    const lat = parse(next.lat, 90);
    const lng = parse(next.lng, 180);
    if (lat === undefined || lng === undefined) return;
    update({ lat, lng });
  }

  // Same lookup the trip planner uses: OpenStreetMap's Nominatim turns the address into a pin.
  async function findLocation() {
    if (!v.location.trim() && !v.name.trim()) return setGeo("Add an address or town first.");
    setGeo("Looking up location…");
    try {
      const hit = await geocodeVenue(v.name, v.location);
      if (!hit) return setGeo("Couldn't find that address — try a town or street, or paste the coordinates.");
      setCoords({ lat: String(hit.lat), lng: String(hit.lng) });
      update({ lat: hit.lat, lng: hit.lng }, 0);
      setGeo(`Pinned to ${hit.label}`);
    } catch {
      setGeo("Couldn't reach the map lookup (offline?). You can paste the coordinates instead.");
    }
  }

  async function removeVenue() {
    if (!(await confirm(`Remove ${v.name}? Its notes, photos and files will be deleted.`))) return;
    await supabase.storage.from("venue-photos").remove([...(v.photos ?? []).map((p) => p.path), ...(v.files ?? []).map((f) => f.path)]);
    await supabase.from("venues").delete().eq("id", v.id);
    router.push("/venues");
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared("Link copied");
    } catch {
      setShared("Copy the address bar link");
    }
    setTimeout(() => setShared(""), 2000);
  }

  // ---- photos: the first photo is the venue's cover everywhere else in the app ----
  const photos = v.photos ?? [];
  async function uploadPhotos(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    const next: Photo[] = [...photos];
    const nextUrls = { ...urls };
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const path = `${v.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("venue-photos").upload(path, file);
      if (error) continue;
      next.push({ path, caption: "", addedAt: new Date().toISOString() });
      const { data: signed } = await supabase.storage.from("venue-photos").createSignedUrl(path, 3600);
      if (signed) nextUrls[path] = signed.signedUrl;
    }
    setUrls(nextUrls);
    setUploading(false);
    update({ photos: next }, 0);
    router.refresh();
  }
  async function removePhoto(path: string) {
    update({ photos: photos.filter((p) => p.path !== path) }, 0);
    await supabase.storage.from("venue-photos").remove([path]);
    router.refresh();
  }
  function movePhoto(i: number, to: number) {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    [next[i], next[to]] = [next[to], next[i]];
    update({ photos: next }, 0);
  }
  function makePrimary(i: number) {
    update({ photos: [photos[i], ...photos.filter((_, j) => j !== i)] }, 0);
  }
  const setCaption = (path: string, caption: string) => update({ photos: photos.map((p) => (p.path === path ? { ...p, caption } : p)) });

  // ---- files & links ----
  const files = v.files ?? [];
  const links = v.links ?? [];
  async function uploadFiles(list: FileList | null) {
    if (!list || !list.length) return;
    setUploading(true);
    const next = [...files];
    for (const file of Array.from(list)) {
      const path = `${v.id}/files/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("venue-photos").upload(path, file);
      if (!error) next.push({ path, name: file.name, addedAt: new Date().toISOString() });
    }
    setUploading(false);
    update({ files: next }, 0);
  }
  async function openFile(path: string) {
    const { data } = await supabase.storage.from("venue-photos").createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  }
  async function removeFile(path: string) {
    update({ files: files.filter((f) => f.path !== path) }, 0);
    await supabase.storage.from("venue-photos").remove([path]);
  }

  const s = scenarioOf(v, assumptions, sharedVals, expenses, linkedTotalFor(linked, v.id));
  const research = researchChecklist(v);
  const guestCount = assumptions.adults + assumptions.kids;
  const venueBuckets = ["venue", "alcohol", "rentals", "accommodation", "transport"] as const;
  const venueCost = venueBuckets.reduce((t, b) => t + s.cells[b].amount, 0) + s.service + s.taxes;
  const venueUnknown = venueBuckets.some((b) => s.cells[b].kind === "unknown" || s.cells[b].partial);
  const cellNote = (b: (typeof venueBuckets)[number]) => (s.cells[b].kind === "amount" ? fmt(s.cells[b].amount) : s.cells[b].kind === "unknown" ? "Unknown" : s.cells[b].kind === "included" ? "Included" : s.cells[b].kind === "na" ? "Not required" : "$0");
  const snapshot: [string, boolean, string][] = [
    ["Venue & catering", s.cells.venue.kind !== "unknown", cellNote("venue")],
    ["Alcohol", s.cells.alcohol.kind !== "unknown", cellNote("alcohol")],
    ["Rentals & décor", s.cells.rentals.kind !== "unknown", cellNote("rentals")],
    ["Accommodation", s.cells.accommodation.kind !== "unknown", cellNote("accommodation")],
    ["Transportation", s.cells.transport.kind !== "unknown", cellNote("transport")],
    [`Service charge (${assumptions.svcPct}%)`, assumptions.svcPct > 0, fmt(s.service)],
    ["Taxes", assumptions.tax, assumptions.tax ? fmt(s.taxes) : "Not applied"],
  ];
  const researchPct = researchPercent(v);
  const swatchBtn = "flex h-10 items-center justify-center rounded-full border border-line bg-paper px-4 text-sm font-semibold hover:bg-bg";

  const general = (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
      <div className="flex flex-col gap-6">
        <section className={PANEL} aria-label="Basic information">
          <h2 className="font-serif text-xl font-medium">Basic information</h2>
          <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div><label htmlFor="vp-name" className={LABEL}>Venue name</label><input id="vp-name" {...bind("name")} className={FIELD} /></div>
            <div><label htmlFor="vp-status" className={LABEL}>Status</label>
              <select id="vp-status" value={v.status} onChange={(e) => update({ status: e.target.value as Venue["status"] }, 0)} className={FIELD}>
                {Object.entries(STATUSES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
            <div><label htmlFor="vp-loc" className={LABEL}>Location</label>
              <input id="vp-loc" {...bind("location")} onBlur={(e) => { if (e.target.value.trim() && !coords.lat && !coords.lng) void findLocation(); }} placeholder="Address or town" className={FIELD} />
            </div>
            <div><label htmlFor="vp-type" className={LABEL}>Type</label>
              <input id="vp-type" list="vp-types" value={v.venue_type ?? ""} onChange={(e) => update({ venue_type: e.target.value })} placeholder="Vineyard, historic building…" className={FIELD} />
              <datalist id="vp-types">{VENUE_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div><label htmlFor="vp-web" className={LABEL}>Website</label><input id="vp-web" {...bind("website")} className={FIELD} /></div>
            <div><label htmlFor="vp-cap" className={LABEL}>Capacity (approx.)</label><input id="vp-cap" {...bind("capacity")} placeholder="e.g. 100 seated w/ dance" className={FIELD} /></div>
            <div className="sm:col-span-2">
              <span className={LABEL}>Map location</span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input value={coords.lat} onChange={(e) => updateCoords("lat", e.target.value)} inputMode="decimal" placeholder="Latitude, e.g. 46.8523" aria-label="Latitude" className={`${FIELD} mt-0`} />
                <input value={coords.lng} onChange={(e) => updateCoords("lng", e.target.value)} inputMode="decimal" placeholder="Longitude, e.g. -71.2075" aria-label="Longitude" className={`${FIELD} mt-0`} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button type="button" onClick={findLocation} className="rounded-full border border-line px-3.5 py-2 text-sm font-semibold hover:border-sage-deep">Find from address</button>
                {geo && <span role="status" className="text-xs text-ink-2">{geo}</span>}
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.location}`.trim())}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-sage-deep underline underline-offset-2">Google Maps ↗</a>
              </div>
              <p className="mt-1 text-xs text-ink-2">Paste both numbers copied from Google Maps into either box.</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section className={`${PANEL} bg-[color-mix(in_srgb,var(--sage)_14%,var(--paper))]`} aria-label="What we love">
            <h2 className="font-serif text-xl font-medium">What we love</h2>
            <textarea aria-label="What we love" {...bind("pros")} rows={5} className={`${FIELD} bg-paper`} />
          </section>
          <section className={`${PANEL} bg-[color-mix(in_srgb,var(--surface-wine)_8%,var(--paper))]`} aria-label="What worries us">
            <h2 className="font-serif text-xl font-medium">What worries us</h2>
            <textarea aria-label="What worries us" {...bind("cons")} rows={5} className={`${FIELD} bg-paper`} />
          </section>
        </div>

        <section className={PANEL} aria-label="Character and style">
          <h2 className="font-serif text-xl font-medium">Character &amp; style</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            <TagField label="Themes / vibe" value={v.themes} onChange={(t) => update({ themes: t }, 0)} placeholder="+ Add a theme" />
            <TagField label="Colors on site" value={v.colors} onChange={(t) => update({ colors: t }, 0)} placeholder="+ Add a color" swatches />
          </div>
        </section>

        <section className={PANEL} aria-label="Notes">
          <h2 className="font-serif text-xl font-medium">Notes</h2>
          <textarea aria-label="Notes" {...bind("notes")} rows={7} placeholder="Write down anything about this venue — details, impressions, follow-ups…" className={FIELD} />
        </section>
      </div>

      <aside className="flex flex-col gap-6">
        <section className={PANEL} aria-label="Quick overview">
          <h2 className="font-serif text-xl font-medium">Cost snapshot</h2>
          <p className="mt-3 text-sm font-semibold">Estimated venue-related cost <small className="font-normal text-ink-2">({s.source})</small></p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 rounded-lg border border-dashed border-line bg-bg px-3 py-2">
            <span className="font-serif text-2xl">{venueUnknown ? "≥ " : ""}{fmt(venueCost)}</span>
            <span className="text-sm text-ink-2">· {fmt(guestCount ? venueCost / guestCount : 0)}/guest</span>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {snapshot.map(([label, ok, note]) => (
              <li key={label} className="flex items-baseline gap-2">
                <span aria-hidden className={ok ? "text-sage-deep" : "text-wine"}>{ok ? "✓" : "⚠"}</span>
                <span className="sr-only">{ok ? "Known:" : "Still to find out:"}</span>
                <span>{label}</span>
                <span className="ml-auto text-ink-2">{note}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => setTab("costs")} className="mt-3 rounded text-sm font-semibold text-green underline underline-offset-2">Add or change costs</button>
          <Link href={`/budget/builder?venue=${v.id}`} className={`mt-1 flex items-center gap-1 rounded text-sm font-semibold text-green ${FOCUS_RING}`}>View full scenario <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
          <label className="mt-4 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={v.quote_received} onChange={(e) => update({ quote_received: e.target.checked }, 0)} className="h-4 w-4 accent-sage-deep" />Quote received</label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div><label htmlFor="vp-quoted" className={LABEL}>Quoted total</label><input id="vp-quoted" type="number" min={0} placeholder="$" value={v.quoted_total ?? ""} onChange={(e) => update({ quoted_total: e.target.value === "" ? null : Number(e.target.value) })} className={FIELD} /></div>
            <div><label htmlFor="vp-contracted" className={LABEL}>Contracted total</label><input id="vp-contracted" type="number" min={0} placeholder="$" value={v.contracted_total ?? ""} onChange={(e) => update({ contracted_total: e.target.value === "" ? null : Number(e.target.value) })} className={FIELD} /></div>
          </div>
        </section>

        <section className={PANEL} aria-label="Venue research">
          <div className="flex items-baseline justify-between gap-2"><h2 className="font-serif text-xl font-medium">Venue research</h2><span className="text-sm text-ink-2">{researchPct}% complete</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-surface-green" style={{ width: `${researchPct}%` }} /></div>
          <p className="mt-2 text-xs text-ink-2">{researchPct < 100 ? `Still to find out: ${research.filter((r) => !r.done).map((r) => r.label.toLowerCase()).slice(0, 3).join(", ")}${research.filter((r) => !r.done).length > 3 ? "…" : ""}` : "Everything is covered, so this venue compares fairly."}</p>
          <button onClick={() => setTab("notes")} className="mt-2 rounded text-sm font-semibold text-green underline underline-offset-2">See the checklist</button>
        </section>

        <section className={PANEL} aria-label="Contact information">
          <h2 className="font-serif text-xl font-medium">Contact information</h2>
          <div className="mt-3 grid gap-3">
            <div><label htmlFor="vp-cn" className={LABEL}>Contact name</label><input id="vp-cn" value={contact.name} onChange={(e) => setContactPart("name", e.target.value)} placeholder="Name" className={FIELD} /></div>
            <div><label htmlFor="vp-ce" className={LABEL}>Email</label><input id="vp-ce" type="email" value={contact.email} onChange={(e) => setContactPart("email", e.target.value)} placeholder="email@venue.com" className={FIELD} /></div>
            <div><label htmlFor="vp-cp" className={LABEL}>Phone</label><input id="vp-cp" type="tel" value={contact.phone} onChange={(e) => setContactPart("phone", e.target.value)} placeholder="(418) 000-0000" className={FIELD} /></div>
          </div>
        </section>

        <section className={PANEL} aria-label="Additional details">
          <h2 className="font-serif text-xl font-medium">Additional details</h2>
          <div className="mt-3 grid gap-3">
            <div><label htmlFor="vp-turnkey" className={LABEL}>Turnkey level</label>
              <select id="vp-turnkey" value={v.turnkey} onChange={(e) => update({ turnkey: e.target.value }, 0)} className={FIELD}>{TURNKEY_OPTIONS.map((t) => <option key={t} value={t}>{t || "—"}</option>)}</select>
            </div>
            <div><label htmlFor="vp-season" className={LABEL}>Season considerations</label><textarea id="vp-season" rows={3} value={v.season_notes ?? ""} onChange={(e) => update({ season_notes: e.target.value })} placeholder="e.g. best months, weather notes…" className={FIELD} /></div>
          </div>
        </section>

        <VenueActions venueId={v.id} venueName={v.name} initialTasks={tasks} />
      </aside>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-2">
            <Link href="/venues" className="flex items-center gap-1.5 hover:text-wine"><ArrowLeft className="h-4 w-4" aria-hidden />Venues</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span>{v.name}</span>
            {planName && (
              <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-wine/40 px-3 py-1 text-xs font-semibold text-wine">
                <Heart className="h-3.5 w-3.5 fill-wine" strokeWidth={1.5} aria-hidden /> In our wedding · {planName}
              </span>
            )}
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <span role="status" className="text-xs text-ink-2">{saved}</span>
            <button onClick={() => update({ is_favourite: !v.is_favourite }, 0)} aria-label={v.is_favourite ? "Remove favourite" : "Mark as favourite"} aria-pressed={v.is_favourite} className={`flex h-10 w-10 items-center justify-center rounded-full ${FOCUS_RING}`}>
              <Star className={`h-5 w-5 ${v.is_favourite ? "fill-gold text-gold" : "text-ink-2"}`} strokeWidth={1.5} aria-hidden />
            </button>
            <select aria-label="Venue status" value={v.status} onChange={(e) => update({ status: e.target.value as Venue["status"] }, 0)} className="h-10 rounded-full border border-line bg-paper px-4 text-sm font-semibold">
              {Object.entries(STATUSES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <button onClick={share} className={`${swatchBtn} gap-2 ${FOCUS_RING}`}><Share2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />{shared || "Share"}</button>
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} aria-label="More" aria-expanded={menuOpen} className={`${swatchBtn} w-10 px-0 ${FOCUS_RING}`}><EllipsisVertical className="h-4 w-4" aria-hidden /></button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-paper shadow-md">
                  <button onClick={removeVenue} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-wine hover:bg-bg"><Trash2 className="h-4 w-4" aria-hidden />Remove this place</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <header className="relative mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.webp" alt="" aria-hidden className="pointer-events-none absolute -left-2 -top-1 hidden h-20 w-auto -rotate-12 -scale-x-100 opacity-50 sm:block" />
          <div className="sm:pl-16">
            <input {...bind("name")} aria-label="Venue name" className="w-full border-b border-transparent bg-transparent font-serif text-4xl font-medium tracking-[-0.01em] outline-none focus:border-gold sm:text-5xl" />
            <input {...bind("location")} aria-label="Location" onBlur={(e) => { if (e.target.value.trim() && !coords.lat && !coords.lng) void findLocation(); }} placeholder="Address or town, e.g. Saint-Jean, Île d'Orléans" className="mt-1 w-full border-b border-transparent bg-transparent font-serif text-xl text-ink-2 outline-none focus:border-gold" />
          </div>
        </header>

        <section aria-label="Photos" className="mt-5">
          <ul className="flex snap-x gap-3 overflow-x-auto pb-2">
            {photos.map((p, i) => (
              <li key={p.path} className={`group relative shrink-0 snap-start overflow-hidden rounded-xl bg-line ${i === 0 ? "h-48 w-72 sm:h-52 sm:w-[26rem]" : "h-48 w-44 sm:h-52 sm:w-56"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[p.path]} alt={p.caption || `${v.name}, photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8">
                  <input value={p.caption} onChange={(e) => setCaption(p.path, e.target.value)} aria-label="Photo caption" placeholder={i === 0 ? "Primary photo — add a caption" : "Add a caption"} className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/70" />
                </div>
                <div className="absolute right-1.5 top-1.5 flex max-w-[6rem] flex-wrap justify-end gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  {i > 0 && <button onClick={() => makePrimary(i)} aria-label="Make this the primary photo" className={`flex h-11 w-11 items-center justify-center rounded-full bg-paper/95 text-ink shadow-sm ${FOCUS_RING}`}><Star className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>}
                  {i > 0 && <button onClick={() => movePhoto(i, i - 1)} aria-label="Move earlier" className={`flex h-11 w-11 items-center justify-center rounded-full bg-paper/95 text-ink shadow-sm ${FOCUS_RING}`}><ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>}
                  {i < photos.length - 1 && <button onClick={() => movePhoto(i, i + 1)} aria-label="Move later" className={`flex h-11 w-11 items-center justify-center rounded-full bg-paper/95 text-ink shadow-sm ${FOCUS_RING}`}><ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>}
                  <button onClick={() => removePhoto(p.path)} aria-label="Delete photo" className={`flex h-11 w-11 items-center justify-center rounded-full bg-paper/95 text-wine shadow-sm ${FOCUS_RING}`}><X className="h-4 w-4" strokeWidth={1.75} aria-hidden /></button>
                </div>
              </li>
            ))}
            <li className="shrink-0">
              <label className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-6 text-center text-sm text-ink-2 hover:border-sage-deep sm:h-52 ${photos.length === 0 ? "w-72 sm:w-[26rem]" : "w-44 sm:w-56"}`}>
                <ImagePlus className="h-6 w-6" strokeWidth={1.25} aria-hidden />
                {uploading ? "Uploading…" : photos.length === 0 ? "Add your first photo of this place" : "Add photo"}
                <input type="file" accept="image/*" multiple hidden onChange={(e) => uploadPhotos(e.target.files)} />
              </label>
            </li>
            <li aria-hidden className="hidden shrink-0 items-center rounded-xl bg-[color-mix(in_srgb,var(--surface-blush)_16%,var(--paper))] px-8 lg:flex">
              <p className="-rotate-3 font-script text-3xl leading-tight text-wine">Imagine the day<br />right here ♡</p>
            </li>
          </ul>
        </section>

        <div role="tablist" aria-label="Venue sections" className="mt-4 flex gap-x-7 overflow-x-auto border-b border-line">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`shrink-0 border-b-2 pb-3 text-base ${tab === k ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>{label}</button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "general" && general}
          {tab === "costs" && <VenueCosts v={v} assumptions={assumptions} sharedVals={sharedVals} expenses={expenses} linked={linked} update={update} />}
          {tab === "amenities" && <VenueAmenities v={v} update={update} />}

          {tab === "notes" && (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <section className={PANEL} aria-label="Research checklist">
                <div className="flex items-baseline justify-between gap-2"><h2 className="font-serif text-2xl font-medium">Venue research</h2><span className="text-sm text-ink-2">{researchPct}% complete</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-surface-green" style={{ width: `${researchPct}%` }} /></div>
                <p className="mt-2 text-sm text-ink-2">Worked out from what you&apos;ve filled in, so venues can be compared fairly.</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {research.map((r) => (
                    <li key={r.label} className="flex items-center gap-3 text-sm">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${r.done ? "bg-surface-olive text-white" : "border border-line"}`}>{r.done && <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />}</span>
                      <span className={r.done ? "" : "text-ink-2"}>{r.label}<span className="sr-only">{r.done ? ", done" : ", still to do"}</span></span>
                    </li>
                  ))}
                </ul>
                <label className="mt-4 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={v.amenities?.tour_done === "Yes"} onChange={(e) => update({ amenities: { ...(v.amenities ?? {}), tour_done: e.target.checked ? "Yes" : "" } }, 0)} className="h-4 w-4 accent-sage-deep" />We&apos;ve toured this place</label>
              </section>
              <div className="flex flex-col gap-6">
                <section className={PANEL} aria-label="Notes"><h2 className="font-serif text-2xl font-medium">Notes</h2><textarea aria-label="Notes" {...bind("notes")} rows={8} placeholder="Details, impressions, follow-ups…" className={FIELD} /></section>
                <section className={PANEL} aria-label="Quote checklist">
                  <div className="flex items-baseline justify-between gap-2"><h2 className="font-serif text-2xl font-medium">Quote checklist</h2><span className="text-sm text-ink-2">{checklistPercent(v)}% complete</span></div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {CHECKLIST_ITEMS.map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v.quote_checklist?.[key]} onChange={() => update({ quote_checklist: { ...v.quote_checklist, [key]: !v.quote_checklist?.[key] } }, 0)} className="h-4 w-4 accent-sage-deep" />{label}</label>
                    ))}
                  </div>
                </section>
                <section className={PANEL} aria-label="Budget note"><h2 className="font-serif text-2xl font-medium">Budget note</h2><textarea aria-label="Budget note" {...bind("budget_note")} rows={3} className={FIELD} /></section>
              </div>
            </div>
          )}

          {tab === "questions" && (
            <section className={`${PANEL} max-w-3xl`} aria-label="Questions to ask">
              <h2 className="font-serif text-2xl font-medium">Questions to ask</h2>
              <textarea aria-label="Questions to ask" {...bind("questions")} rows={12} placeholder="What do you want to ask on the next call or tour?" className={FIELD} />
              <p className="mt-2 text-sm text-ink-2">Want one to become a to-do? Add it under Action items on the General tab. It lands on the Planning Board.</p>
            </section>
          )}

          {tab === "contact" && <VenueComms venueId={v.id} defaultContact={contact.name ?? ""} initial={comms} missing={commsMissing} />}
          {tab === "files" && (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <section className={PANEL} aria-label="Files">
                <h2 className="font-serif text-2xl font-medium">Files</h2>
                <p className="text-sm text-ink-2">Quotes, contracts, floor plans, menus.</p>
                <ul className="mt-3 divide-y divide-line">
                  {files.length === 0 && <li className="py-3 text-sm text-ink-2">No files yet.</li>}
                  {files.map((f) => (
                    <li key={f.path} className="flex items-center gap-3 py-2 text-sm">
                      <Paperclip className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                      <button onClick={() => openFile(f.path)} className="min-w-0 flex-1 truncate text-left font-semibold underline-offset-2 hover:underline">{f.name}</button>
                      <select aria-label={`Type of ${f.name}`} value={f.kind ?? "other"} onChange={(e) => update({ files: files.map((x) => (x.path === f.path ? { ...x, kind: e.target.value } : x)) }, 0)} className="h-10 max-w-[9rem] rounded-lg border border-line bg-bg px-2 text-xs">
                        {FILE_KINDS.map((k) => <option key={k} value={k}>{FILE_KIND_LABELS[k]}</option>)}
                      </select>
                      <button onClick={() => removeFile(f.path)} aria-label={`Remove ${f.name}`} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:text-wine"><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
                <label className="mt-3 block cursor-pointer rounded-xl border-2 border-dashed border-line p-4 text-center text-sm text-ink-2 hover:border-sage-deep">
                  {uploading ? "Uploading…" : "Click to add a file"}
                  <input type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
                </label>
              </section>
              <section className={PANEL} aria-label="Links">
                <h2 className="font-serif text-2xl font-medium">Links</h2>
                <ul className="mt-3 divide-y divide-line">
                  {v.website && <li className="flex items-center gap-3 py-2 text-sm"><Link2 className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden /><a href={v.website} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-semibold underline-offset-2 hover:underline">Website</a></li>}
                  {links.map((l) => (
                    <li key={l.url} className="flex items-center gap-3 py-2 text-sm">
                      <Link2 className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                      <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-semibold underline-offset-2 hover:underline">{l.label || l.url}</a>
                      <button onClick={() => update({ links: links.filter((x) => x.url !== l.url) }, 0)} aria-label={`Remove ${l.label || l.url}`} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:text-wine"><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!linkDraft.url.trim()) return;
                    update({ links: [...links, { label: linkDraft.label.trim(), url: linkDraft.url.trim() }] }, 0);
                    setLinkDraft({ label: "", url: "" });
                  }}
                >
                  <input aria-label="Link name" value={linkDraft.label} onChange={(e) => setLinkDraft((d) => ({ ...d, label: e.target.value }))} placeholder="Name" className={`${FIELD} mt-0`} />
                  <input aria-label="Link address" type="url" value={linkDraft.url} onChange={(e) => setLinkDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://…" className={`${FIELD} mt-0`} />
                  <button className="rounded-full bg-surface-green px-5 py-2 text-sm font-semibold text-white">Add</button>
                </form>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
