"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { MOMENT_KINDS, type TimelineMoment } from "@/lib/wedding-events";

const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-sage-deep";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";

export type MomentForm = Pick<TimelineMoment, "moment_date" | "time" | "title" | "note" | "kind">;

export default function TimelineMomentDialog({
  moment,
  defaultDate,
  onClose,
  onSave,
  onRemove,
}: {
  moment?: TimelineMoment;
  defaultDate?: string;
  onClose: () => void;
  onSave: (f: MomentForm) => Promise<string | null>;
  onRemove?: () => void;
}) {
  const ref = useDialog(true, onClose);
  const [f, setF] = useState<MomentForm>({
    moment_date: moment?.moment_date ?? defaultDate ?? "",
    time: moment?.time ?? "",
    title: moment?.title ?? "",
    note: moment?.note ?? "",
    kind: moment?.kind ?? "free",
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof MomentForm, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setErr("Give the moment a name first.");
    if (!f.moment_date) return setErr("Pick the day it happens.");
    setSaving(true);
    const error = await onSave({ ...f, title: f.title.trim() });
    setSaving(false);
    if (error) setErr(error);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={moment ? "Edit moment" : "Add a timeline moment"} tabIndex={-1} className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-paper p-6 shadow-lg">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-light">{moment ? "Edit moment" : "Add a timeline moment"}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-bg"><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
          </div>
          <label htmlFor="tm-title" className={`${LABEL} mt-4`}>What&apos;s happening</label>
          <input id="tm-title" autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Guests check in, shuttle to the venue…" className={FIELD} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div><label htmlFor="tm-date" className={LABEL}>Day</label><input id="tm-date" type="date" value={f.moment_date} onChange={(e) => set("moment_date", e.target.value)} className={FIELD} /></div>
            <div><label htmlFor="tm-time" className={LABEL}>Time</label><input id="tm-time" value={f.time} onChange={(e) => set("time", e.target.value)} placeholder="3:00 PM" className={FIELD} /></div>
          </div>
          <label htmlFor="tm-kind" className={`${LABEL} mt-4`}>Kind</label>
          <select id="tm-kind" value={f.kind} onChange={(e) => set("kind", e.target.value)} className={FIELD}>{MOMENT_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select>
          <label htmlFor="tm-note" className={`${LABEL} mt-4`}>Note</label>
          <input id="tm-note" value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Guests explore, relax, get ready" className={FIELD} />
          {err && <p role="alert" className="mt-3 text-sm text-wine">{err}</p>}
          <div className="mt-6 flex items-center justify-between gap-2">
            {onRemove ? <button type="button" onClick={onRemove} className="rounded-full px-3 py-2 text-sm font-semibold text-wine hover:bg-bg">Remove</button> : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-bg">Cancel</button>
              <button disabled={saving} className="rounded-full bg-surface-green px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : moment ? "Save" : "Add moment"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
