"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { EVENT_SUGGESTIONS, TAG_SUGGESTIONS } from "@/lib/wedding-events";

const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-sage-deep";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";

export type NewEvent = { title: string; event_date: string | null; time: string; location: string; dress_code: string; tag: string; description: string };

export default function NewEventDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (e: NewEvent) => Promise<string | null> }) {
  const ref = useDialog(true, onClose);
  const [f, setF] = useState({ title: "", date: "", time: "", location: "", dress: "", tag: "", description: "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setErr("Give the event a name first.");
    setSaving(true);
    const error = await onCreate({ title: f.title.trim(), event_date: f.date || null, time: f.time, location: f.location, dress_code: f.dress, tag: f.tag, description: f.description });
    setSaving(false);
    if (error) setErr(error);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Add an event" tabIndex={-1} className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-6 shadow-lg">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-light">Add an event</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-bg">
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <label htmlFor="ne-title" className={`${LABEL} mt-4`}>Event</label>
          <input id="ne-title" autoFocus list="ne-suggestions" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Boat tour, winery visit, farewell drinks…" className={FIELD} />
          <datalist id="ne-suggestions">{EVENT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label htmlFor="ne-date" className={LABEL}>Date</label><input id="ne-date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={FIELD} /></div>
            <div><label htmlFor="ne-time" className={LABEL}>Time</label><input id="ne-time" value={f.time} onChange={(e) => set("time", e.target.value)} placeholder="6:00 PM – 10:00 PM" className={FIELD} /></div>
            <div><label htmlFor="ne-loc" className={LABEL}>Location</label><input id="ne-loc" value={f.location} onChange={(e) => set("location", e.target.value)} className={FIELD} /></div>
            <div><label htmlFor="ne-dress" className={LABEL}>Dress code</label><input id="ne-dress" value={f.dress} onChange={(e) => set("dress", e.target.value)} placeholder="Casual chic" className={FIELD} /></div>
            <div><label htmlFor="ne-tag" className={LABEL}>Feel</label><input id="ne-tag" list="ne-tags" value={f.tag} onChange={(e) => set("tag", e.target.value)} placeholder="Informal" className={FIELD} /><datalist id="ne-tags">{TAG_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist></div>
          </div>
          <label htmlFor="ne-desc" className={`${LABEL} mt-4`}>One line about it</label>
          <input id="ne-desc" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Kick off the weekend with good food and great company." className={FIELD} />
          {err && <p role="alert" className="mt-3 text-sm text-wine">{err}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-bg">Cancel</button>
            <button disabled={saving} className="rounded-full bg-surface-green px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Adding…" : "Add event"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
