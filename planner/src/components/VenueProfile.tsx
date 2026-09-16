"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { calcVenue, DEFAULT_ASSUMPTIONS, fmt, STATUSES, type Photo, type Venue } from "@/lib/venues";

const TURNKEY_OPTIONS = ["", "Full turnkey", "Full turnkey plus", "Semi-turnkey", "DIY-heavy", "Full DIY"];

export default function VenueProfile({
  venue,
  signedUrls,
  userName,
}: {
  venue: Venue;
  signedUrls: Record<string, string>;
  userName: string;
}) {
  const router = useRouter();
  const [v, setV] = useState(venue);
  const [urls, setUrls] = useState(signedUrls);
  const [saved, setSaved] = useState("");
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

  async function removeVenue() {
    if (!confirm(`Remove ${v.name}? Its notes and photos will be deleted.`)) return;
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

  const calc = calcVenue(v, DEFAULT_ASSUMPTIONS, []);

  return (
    <div className="min-h-screen">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/" className="text-sm text-ink-2 underline underline-offset-2">← Dashboard</Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-64">
            <input {...field("name")} className="w-full border-b border-transparent bg-transparent font-serif text-3xl font-medium outline-none focus:border-gold" aria-label="Venue name" />
            <input {...field("location")} placeholder="Where is it?" className="mt-1 w-full border-b border-transparent bg-transparent text-ink-2 outline-none focus:border-gold" aria-label="Location" />
          </div>
          <div className="flex items-center gap-2">
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
              <h3 className="mb-2 font-semibold">Questions to ask</h3>
              <textarea {...field("questions")} rows={5} className="w-full rounded-lg border border-line bg-bg p-3 outline-none focus:border-sage-deep" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h3 className="mb-3 font-semibold">Details</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <span className="mb-1 block text-sm font-semibold">Estimated all-in <small className="font-normal text-ink-2">(current assumptions)</small></span>
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-bg px-3 py-2 font-serif text-lg">
                    {fmt(calc.grand)}
                    <Link href="/budget" className="text-sm font-semibold text-sage-deep underline underline-offset-2">Edit cost breakdown →</Link>
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
              <h3 className="mb-3 font-semibold">Photos <small className="font-normal text-ink-2">{(v.photos ?? []).length}</small></h3>
              <div className="grid grid-cols-2 gap-3">
                {(v.photos ?? []).map((p) => (
                  <div key={p.path} className="overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urls[p.path]} alt={p.caption || v.name} className="aspect-[4/3] w-full object-cover" />
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
