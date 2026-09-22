"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { slugify, type RegistrySettings } from "@/lib/registry";

const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-sage-deep";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";

// The three things the guest page says about you: your names, your link and your note.
export default function RegistrySettingsDialog({
  settings,
  host,
  onClose,
  onSave,
}: {
  settings: RegistrySettings;
  host: string;
  onClose: () => void;
  onSave: (s: RegistrySettings) => Promise<string | null>;
}) {
  const ref = useDialog(true, onClose);
  const [s, setS] = useState(settings);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(s.slug);
    if (!slug) return setErr("Use letters and numbers for the link, like ariel-and-fred.");
    if (!s.couple.trim()) return setErr("Add your names.");
    setSaving(true);
    const error = await onSave({ ...s, slug, couple: s.couple.trim(), guest_note: s.guest_note.trim() });
    setSaving(false);
    if (error) setErr(error);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Your guest page" tabIndex={-1} className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-paper p-5 shadow-lg sm:rounded-2xl sm:p-6">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-light">Your guest page</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg">
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-2">Only your names, this note and the registries you show to guests appear on the page. Nothing else is public.</p>

          <label htmlFor="rs-couple" className={`${LABEL} mt-4`}>Your names</label>
          <input id="rs-couple" value={s.couple} onChange={(e) => setS({ ...s, couple: e.target.value })} className={FIELD} />

          <label htmlFor="rs-slug" className={`${LABEL} mt-3`}>Your link</label>
          <div className="mt-1 flex items-center rounded-lg border border-line bg-bg focus-within:border-sage-deep">
            <span id="rs-slug-prefix" className="shrink-0 pl-3 text-sm text-ink-2">{host}/</span>
            <input
              id="rs-slug"
              value={s.slug}
              onChange={(e) => setS({ ...s, slug: e.target.value })}
              aria-describedby="rs-slug-prefix rs-slug-suffix"
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm outline-none"
            />
            <span id="rs-slug-suffix" className="shrink-0 pr-3 text-sm text-ink-2">/registry</span>
          </div>
          <p className="mt-1 text-xs text-ink-2">If you change this, links you&apos;ve already shared stop working.</p>

          <label htmlFor="rs-note" className={`${LABEL} mt-3`}>A note for guests</label>
          <textarea id="rs-note" rows={4} value={s.guest_note} onChange={(e) => setS({ ...s, guest_note: e.target.value })} className={FIELD} />

          {err && <p role="alert" className="mt-3 text-sm text-wine">{err}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold hover:bg-bg">Cancel</button>
            <button disabled={saving} className="min-h-11 rounded-full bg-surface-sage-deep px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
