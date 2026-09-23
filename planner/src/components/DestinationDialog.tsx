"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { createClient } from "@/lib/supabase/client";
import { BTN, BTN_PRIMARY, FIELD, FOCUS_RING } from "@/components/VendorUi";
import { normalizeUrl } from "@/lib/ideas";
import type { IdeaImage } from "@/lib/registry";
import type { Destination } from "@/lib/honeymoon";

const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";
const num = (s: string) => (s.trim() === "" ? null : Math.max(0, Number(s)));

export default function DestinationDialog({ destination, ideas, nextSort, onClose, onSaved }: { destination?: Destination; ideas: IdeaImage[]; nextSort: number; onClose: () => void; onSaved: (d: Destination) => void }) {
  const ref = useDialog(true, onClose);
  const [name, setName] = useState(destination?.name ?? "");
  const [country, setCountry] = useState(destination?.country ?? "");
  const [photo, setPhoto] = useState(destination?.photo ?? "");
  const [cost, setCost] = useState(destination?.est_cost == null ? "" : String(destination.est_cost));
  const [season, setSeason] = useState(destination?.best_season ?? "");
  const [travel, setTravel] = useState(destination?.travel_time ?? "");
  const [pros, setPros] = useState(destination?.pros ?? "");
  const [cons, setCons] = useState(destination?.considerations ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const row = { name: name.trim(), country: country.trim(), photo: photo.startsWith("idea:") || photo === "" ? photo : normalizeUrl(photo), est_cost: num(cost), best_season: season.trim(), travel_time: travel.trim(), pros: pros.trim(), considerations: cons.trim() };
    const supabase = createClient();
    const q = destination ? supabase.from("honeymoon_destinations").update(row).eq("id", destination.id) : supabase.from("honeymoon_destinations").insert({ ...row, sort_order: nextSort });
    const { data, error: err } = await q.select("*").single();
    setBusy(false);
    if (err || !data) return setError(`${err?.message ?? "Couldn't save."} Has migration 051 been run?`);
    onSaved(data as Destination);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={destination ? "Edit destination" : "Add a destination"} tabIndex={-1} className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-paper p-6 shadow-lg">
        <form onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="flex items-start justify-between">
            <h2 className="font-serif text-3xl font-light">{destination ? "Edit destination" : "Add a destination"}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className={`-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg ${FOCUS_RING}`}><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="d-name" className={LABEL}>Place</label><input id="d-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amalfi Coast" className={FIELD} /></div>
            <div><label htmlFor="d-country" className={LABEL}>Country</label><input id="d-country" value={country} onChange={(e) => setCountry(e.target.value)} className={FIELD} /></div>
            <div><label htmlFor="d-cost" className={LABEL}>Estimated cost ($)</label><input id="d-cost" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} className={FIELD} /></div>
            <div><label htmlFor="d-season" className={LABEL}>Best season</label><input id="d-season" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. May to June" className={FIELD} /></div>
            <div className="sm:col-span-2"><label htmlFor="d-travel" className={LABEL}>Travel time</label><input id="d-travel" value={travel} onChange={(e) => setTravel(e.target.value)} placeholder="e.g. 9 hours, one connection" className={FIELD} /></div>
            <div className="sm:col-span-2"><label htmlFor="d-photo" className={LABEL}>Photo</label>
              <input id="d-photo" value={photo.startsWith("idea:") ? "" : photo} onChange={(e) => setPhoto(e.target.value)} placeholder="Paste an image link" className={FIELD} />
              {ideas.length > 0 && (
                <select aria-label="Or use a photo from Inspiration" value={photo.startsWith("idea:") ? photo : ""} onChange={(e) => setPhoto(e.target.value)} className={FIELD}>
                  <option value="">Or pick from Inspiration…</option>
                  {ideas.map((i) => <option key={i.id} value={`idea:${i.id}`}>{i.title || "Untitled pin"}</option>)}
                </select>
              )}
            </div>
            <div className="sm:col-span-2"><label htmlFor="d-pros" className={LABEL}>Why we&apos;d love it</label><textarea id="d-pros" rows={2} value={pros} onChange={(e) => setPros(e.target.value)} className={FIELD} /></div>
            <div className="sm:col-span-2"><label htmlFor="d-cons" className={LABEL}>Things to consider</label><textarea id="d-cons" rows={2} value={cons} onChange={(e) => setCons(e.target.value)} className={FIELD} /></div>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-wine">{error}</p>}
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={onClose} className={BTN}>Cancel</button>
            <button type="submit" disabled={busy || !name.trim()} className={`${BTN_PRIMARY} flex-1`}>{busy ? "Saving…" : destination ? "Save" : "Add destination"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
