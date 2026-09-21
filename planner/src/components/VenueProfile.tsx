"use client";

import { useConfirm } from "@/components/ConfirmProvider";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { calcVenue, checklistPercent, CHECKLIST_ITEMS, fmt, STATUSES, type Assumptions, type Photo, type Venue } from "@/lib/venues";

const TURNKEY_OPTIONS = ["", "Full turnkey", "Full turnkey plus", "Semi-turnkey", "DIY-heavy", "Full DIY"];

export default function VenueProfile({
  venue,
  signedUrls,
  userName,
  assumptions,
  sharedVals,
}: {
  venue: Venue;
  signedUrls: Record<string, string>;
  userName: string;
  assumptions: Assumptions;
  sharedVals: number[];
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const [v, setV] = useState(venue);
  const [urls, setUrls] = useState(signedUrls);
  const [saved, setSaved] = useState("");
  const [coords, setCoords] = useState({ lat: venue.lat != null ? String(venue.lat) : "", lng: venue.lng != null ? String(venue.lng) : "" });
  const [uploading, setUploading] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const save = useCallback(
    async (patch: Partial<Venue>) => {
      setSaved("Saving…");
      const { error } = await supabase.from("venues").update(patch).eq("id", v.id);
      setSaved(error ? `Could not save (${error.message})` : "Saved");
      if (!error) setTimeout(() => setSaved((s) => (s === "Saved" ? "" : s)), 1500);
    },
    [supabase, v.id]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const key = e.target.name as keyof Venue;
    const val = e.target.value;
    setV((prev) => ({ ...prev, [key]: val }));
    const t = timers.current;
    clearTimeout(t[key]);
    t[key] = setTimeout(() => save({ [key]: val } as Partial<Venue>), 800);
  }, [save]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const key = e.target.name as keyof Venue;
    clearTimeout(timers.current[key]);
    save({ [key]: e.target.value } as Partial<Venue>);
  }, [save]);

  function field<K extends keyof Venue>(key: K) {
    return { name: key as string, value: (v[key] ?? "") as string, onChange: handleChange, onBlur: handleBlur };
  }

  async function setStatus(status: Venue["status"]) {
    setV((p) => ({ ...p, status }));
    save({ status });
  }

  async function toggleQuote() {
    const next = !v.quote_received;
    setV((p) => ({ ...p, quote_received: next }));
    save({ quote_received: next });
  }

  async function toggleFavourite() {
    const next = !v.is_favourite;
    setV((p) => ({ ...p, is_favourite: next }));
    save({ is_favourite: next });
  }

  function toggleChecklistItem(key: string) {
    const next = { ...v.quote_checklist, [key]: !v.quote_checklist?.[key] };
    setV((p) => ({ ...p, quote_checklist: next }));
    save({ quote_checklist: next });
  }

  function updateMoney(key: "quoted_total" | "contracted_total" | "deposit_amount", raw: string) {
    const num = raw === "" ? (key === "deposit_amount" ? 0 : null) : Number(raw);
    setV((p) => ({ ...p, [key]: num }));
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => save({ [key]: num } as Partial<Venue>), 800);
  }

  function updateDate(key: "deposit_due" | "balance_due", raw: string) {
    const val = raw || null;
    setV((p) => ({ ...p, [key]: val }));
    save({ [key]: val } as Partial<Venue>);
  }

  function toggleMoneyFlag(key: "deposit_paid" | "balance_paid") {
    const next = !v[key];
    setV((p) => ({ ...p, [key]: next }));
    save({ [key]: next } as Partial<Venue>);
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
    setV((p) => ({ ...p, lat, lng }));
    clearTimeout(timers.current["coords"]);
    timers.current["coords"] = setTimeout(() => save({ lat, lng }), 800);
  }

  async function removeVenue() {
    if (!(await confirm(`Remove ${v.name}? Its notes and photos will be deleted.`))) return;
    await Promise.all((v.photos ?? []).map((p) => supabase.storage.from("venue-photos").remove([p.path])));
    await supabase.from("venues").delete().eq("id", v.id);
    router.push("/");
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    const newPhotos: Photo[] = [...(v.photos ?? [])];
    const newUrls = { ...urls };
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const path = `${v.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("venue-photos").upload(path, file);
      if (error) continue;
      newPhotos.push({ path, caption: "", addedAt: new Date().toISOString() });
      const { data: signed } = await supabase.storage.from("venue-photos").createSignedUrl(path, 3600);
      if (signed) newUrls[path] = signed.signedUrl;
    }
    setV((p) => ({ ...p, photos: newPhotos }));
    setUrls(newUrls);
    setUploading(false);
    await save({ photos: newPhotos });
    router.refresh();
  }

  async function removePhoto(path: string) {
    const next = (v.photos ?? []).filter((p) => p.path !== path);
    setV((p) => ({ ...p, photos: next }));
    await save({ photos: next });
    await supabase.storage.from("venue-photos").remove([path]);
    router.refresh();
  }

  function setCaption(path: string, caption: string) {
    const next = (v.photos ?? []).map((p) => (p.path === path ? { ...p, caption } : p));
    setV((p) => ({ ...p, photos: next }));
    clearTimeout(timers.current["photos"]);
    timers.current["photos"] = setTimeout(() => save({ photos: next }), 800);
  }

  const calc = calcVenue(v, assumptions, sharedVals);
  const balance = (v.contracted_total ?? v.quoted_total ?? 0) - v.deposit_amount;

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-64">
            <input {...field("name")} className="w-full border-b border-transparent bg-transparent font-serif text-3xl font-medium outline-none focus:border-gold" aria-label="Venue name" />
            <input {...field("location")} placeholder="Where is it?" className="mt-1 w-full border-b border-transparent bg-transparent text-ink-2 outline-none focus:border-gold" aria-label="Location" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavourite}
              aria-label={v.is_favourite ? "Remove favourite" : "Mark as favourite"}
              aria-pressed={v.is_favourite}
              className={`text-xl ${v.is_favourite ? "" : "grayscale opacity-40 hover:opacity-70"}`}
            >
              ★
            </button>
            <select
              value={v.status}
              onChange={(e) => setStatus(e.target.value as Venue["status"])}
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-semibold"
            >
              {Object.entries(STATUSES).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
            <span className="text-xs text-ink-2">{saved}</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-2 font-semibold">Notes</h3>
              <textarea {...field("notes")} rows={7} placeholder="Write it down before you forget it…" className="w-full rounded-lg border border-line bg-bg p-3 outline-none focus:border-sage-deep" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
                <h3 className="mb-2 font-semibold">What we love</h3>
                <textarea {...field("pros")} rows={5} className="w-full rounded-lg border border-line bg-bg p-3 outline-none focus:border-sage-deep" />
              </div>
              <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
                <h3 className="mb-2 font-semibold">What worries us</h3>
                <textarea {...field("cons")} rows={5} className="w-full rounded-lg border border-line bg-bg p-3 outline-none focus:border-sage-deep" />
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-2 font-semibold">Character</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <span className="mb-1 block text-sm font-semibold">Themes</span>
                  <input {...field("themes")} placeholder="e.g. rustic, coastal, garden" className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-sage-deep" />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Colors on site</span>
                  <input {...field("colors")} placeholder="e.g. stone grey, deep green" className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-sage-deep" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-2 font-semibold">Questions to ask</h3>
              <textarea {...field("questions")} rows={5} className="w-full rounded-lg border border-line bg-bg p-3 outline-none focus:border-sage-deep" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-3 font-semibold">Details</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <span className="mb-1 block text-sm font-semibold">All-in estimate <small className="font-normal text-ink-2">({calc.venueSource})</small></span>
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-bg px-3 py-2 font-serif text-lg">
                    {fmt(calc.grand)}
                    <span className="text-sm font-normal text-ink-2">· {fmt(calc.perGuest)}/guest</span>
                    <Link href={`/budget/builder?venue=${v.id}`} className="ml-auto text-sm font-semibold text-sage-deep underline underline-offset-2">Edit breakdown →</Link>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={v.quote_received} onChange={toggleQuote} className="h-4 w-4 accent-sage-deep" />
                  Quote received
                </label>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Capacity</span>
                  <input {...field("capacity")} placeholder="e.g. 100 seated w/ dance" className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-sage-deep" />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Map pin</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={coords.lat} onChange={(e) => updateCoords("lat", e.target.value)} inputMode="decimal" placeholder="Latitude, e.g. 46.8523" aria-label="Latitude" className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-sage-deep" />
                    <input value={coords.lng} onChange={(e) => updateCoords("lng", e.target.value)} inputMode="decimal" placeholder="Longitude, e.g. -71.2075" aria-label="Longitude" className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-sage-deep" />
                  </div>
                  <p className="mt-1 text-xs text-ink-2">
                    In Google Maps, right-click the place and click the numbers to copy — you can paste both into either box.{" "}
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.location}`.trim())}`} target="_blank" rel="noreferrer" className="font-semibold text-sage-deep underline underline-offset-2">
                      Find it on Google Maps ↗
                    </a>
                  </p>
                </div>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Website</span>
                  <input {...field("website")} className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-sage-deep" />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Contact</span>
                  <input {...field("contact")} placeholder="name · email · phone" className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-sage-deep" />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Turnkey level</span>
                  <select
                    value={v.turnkey}
                    onChange={(e) => { setV((p) => ({ ...p, turnkey: e.target.value })); save({ turnkey: e.target.value }); }}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2"
                  >
                    {TURNKEY_OPTIONS.map((t) => <option key={t} value={t}>{t || "—"}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-3 font-semibold">Cost &amp; payments</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="mb-1 block text-sm font-semibold">Quoted total</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="—"
                    defaultValue={v.quoted_total ?? ""}
                    onChange={(e) => updateMoney("quoted_total", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Contracted total</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="—"
                    defaultValue={v.contracted_total ?? ""}
                    onChange={(e) => updateMoney("contracted_total", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Deposit amount</span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={v.deposit_amount}
                    onChange={(e) => updateMoney("deposit_amount", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Deposit due</span>
                  <input
                    type="date"
                    value={v.deposit_due ?? ""}
                    onChange={(e) => updateDate("deposit_due", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2"
                  />
                </div>
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={v.deposit_paid} onChange={() => toggleMoneyFlag("deposit_paid")} className="h-4 w-4 accent-sage-deep" />
                  Deposit paid
                </label>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Balance <small className="font-normal text-ink-2">(auto)</small></span>
                  <div className="rounded-lg border border-dashed border-line bg-bg px-3 py-2">{balance > 0 ? fmt(balance) : "—"}</div>
                </div>
                <div>
                  <span className="mb-1 block text-sm font-semibold">Balance due</span>
                  <input
                    type="date"
                    value={v.balance_due ?? ""}
                    onChange={(e) => updateDate("balance_due", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2"
                  />
                </div>
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={v.balance_paid} onChange={() => toggleMoneyFlag("balance_paid")} className="h-4 w-4 accent-sage-deep" />
                  Balance paid
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-1 flex items-center justify-between font-semibold">
                Quote checklist
                <span className="text-sm font-normal text-ink-2">{checklistPercent(v)}% complete</span>
              </h3>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-sage-deep" style={{ width: `${checklistPercent(v)}%` }} />
              </div>
              <div className="flex flex-col gap-1.5">
                {CHECKLIST_ITEMS.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!v.quote_checklist?.[key]}
                      onChange={() => toggleChecklistItem(key)}
                      className="h-4 w-4 accent-sage-deep"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-3 font-semibold">Photos <small className="font-normal text-ink-2">{(v.photos ?? []).length}</small></h3>
              <div className="grid grid-cols-2 gap-3">
                {(v.photos ?? []).map((p) => (
                  <div key={p.path} className="overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urls[p.path]} alt={p.caption || v.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    <div className="flex items-center gap-1 border-t border-line bg-paper px-1.5 py-1">
                      <input
                        value={p.caption}
                        onChange={(e) => setCaption(p.path, e.target.value)}
                        placeholder="Caption"
                        className="w-full bg-transparent text-xs outline-none"
                      />
                      <button onClick={() => removePhoto(p.path)} aria-label="Delete photo" className="text-xs text-wine">×</button>
                    </div>
                  </div>
                ))}
              </div>
              <label className="mt-3 block cursor-pointer rounded-xl border-2 border-dashed border-line p-4 text-center text-sm text-ink-2">
                {uploading ? "Uploading…" : "Click to choose photos"}
                <input type="file" accept="image/*" multiple hidden onChange={(e) => uploadPhotos(e.target.files)} />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={removeVenue} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-wine hover:border-wine">
            Remove this place
          </button>
        </div>
      </div>
    </div>
  );
}
