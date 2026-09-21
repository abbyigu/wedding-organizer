"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { normalizeUrl } from "@/lib/ideas";
import RegistryCover, { coverSrc, TYPE_ICON } from "@/components/RegistryCover";
import { REGISTRY_TYPE_ORDER, REGISTRY_TYPES, typeOf, type IdeaImage, type RegistryEntry, type RegistryType } from "@/lib/registry";

const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-sage-deep";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";

export type RegistryForm = {
  type: RegistryType;
  store_name: string;
  url: string;
  description: string;
  summary: string;
  visible: boolean;
  is_primary: boolean;
  // Exactly one cover source: keep what's there, upload a file, pick an Inspiration pin, or none.
  cover: { kind: "keep" } | { kind: "upload"; file: File } | { kind: "idea"; id: string } | { kind: "none" };
};

type Source = "upload" | "inspiration";

export default function RegistryDialog({
  entry,
  ideas,
  isFirst,
  onClose,
  onSave,
}: {
  entry?: RegistryEntry;
  ideas: IdeaImage[];
  isFirst: boolean;
  onClose: () => void;
  onSave: (f: RegistryForm) => Promise<string | null>;
}) {
  const ref = useDialog(true, onClose);
  const [f, setF] = useState<RegistryForm>({
    type: entry ? typeOf(entry) : "store",
    store_name: entry?.store_name ?? "",
    url: entry?.url ?? "",
    description: entry?.description ?? "",
    summary: entry?.summary ?? "",
    visible: entry ? entry.visible !== false : true,
    is_primary: entry ? !!entry.is_primary : isFirst,
    cover: { kind: "keep" },
  });
  const [source, setSource] = useState<Source>(entry?.idea_id ? "inspiration" : "upload");
  const [preview, setPreview] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof RegistryForm>(k: K, v: RegistryForm[K]) => setF((p) => ({ ...p, [k]: v }));

  // What the cover shows right now, given the choice made in this dialog.
  const shown =
    f.cover.kind === "upload" ? preview
    : f.cover.kind === "idea" ? coverSrc({ image_path: null, idea_id: f.cover.id }, ideas)
    : f.cover.kind === "none" ? ""
    : entry ? coverSrc(entry, ideas) : "";

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setErr("That image is over 5 MB. Try a smaller one.");
    setErr("");
    setPreview(URL.createObjectURL(file));
    set("cover", { kind: "upload", file });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.store_name.trim()) return setErr("Give the registry a name.");
    setSaving(true);
    const error = await onSave({ ...f, store_name: f.store_name.trim(), url: f.url.trim() ? normalizeUrl(f.url) : "" });
    setSaving(false);
    if (error) setErr(error);
    else onClose();
  }

  const pinnedIdea = f.cover.kind === "idea" ? f.cover.id : f.cover.kind === "keep" ? entry?.idea_id : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={entry ? "Edit registry" : "Add a registry"} tabIndex={-1} className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-paper p-5 shadow-lg sm:rounded-2xl sm:p-6">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-light">{entry ? "Edit registry" : "Add a registry"}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg">
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          <fieldset className="mt-4">
            <legend className={LABEL}>What kind?</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REGISTRY_TYPE_ORDER.map((t) => {
                const Icon = TYPE_ICON[t];
                const on = f.type === t;
                return (
                  <label key={t} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sage-deep ${on ? "border-sage-deep bg-[color-mix(in_srgb,var(--sage)_25%,var(--paper))] text-ink" : "border-line text-ink-2 hover:bg-bg"}`}>
                    <input type="radio" name="reg-type" value={t} checked={on} onChange={() => set("type", t)} className="sr-only" />
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    {REGISTRY_TYPES[t].label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-name" className={LABEL}>Name</label>
              <input id="reg-name" autoFocus value={f.store_name} onChange={(e) => set("store_name", e.target.value)} placeholder="Amazon, Honeymoon Fund…" className={FIELD} />
            </div>
            <div>
              <label htmlFor="reg-url" className={LABEL}>Registry link</label>
              <input id="reg-url" type="url" inputMode="url" value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" className={FIELD} />
            </div>
          </div>

          <label htmlFor="reg-desc" className={`${LABEL} mt-3`}>A short line for guests</label>
          <input id="reg-desc" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={120} placeholder="For our home together" className={FIELD} />

          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={LABEL}>Cover image <span className="font-normal normal-case tracking-normal">(optional)</span></p>
              <div className="flex gap-1 rounded-full border border-line p-0.5" role="group" aria-label="Where the cover comes from">
                {(["upload", "inspiration"] as const).map((s) => (
                  <button key={s} type="button" aria-pressed={source === s} onClick={() => setSource(s)} className={`min-h-9 rounded-full px-3 text-xs font-semibold ${source === s ? "bg-surface-sage-deep text-white" : "text-ink-2 hover:bg-bg"}`}>
                    {s === "upload" ? "Upload" : "From Inspiration"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex gap-3">
              <RegistryCover src={shown} type={f.type} className="h-24 w-32 shrink-0 rounded-xl border border-line" />
              <div className="min-w-0 flex-1">
                {source === "upload" ? (
                  <>
                    <input ref={fileRef} id="reg-file" type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0])} className="sr-only" />
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold hover:bg-bg">
                      <ImagePlus className="h-4 w-4" strokeWidth={1.5} aria-hidden /> {shown ? "Choose a different image" : "Choose an image"}
                    </button>
                    <p className="mt-1.5 text-xs text-ink-2">JPG or PNG, up to 5 MB.</p>
                  </>
                ) : ideas.length === 0 ? (
                  <p className="text-sm text-ink-2">No Inspiration pins with an image yet. Add one on the Inspiration board and it will show up here. Nothing is copied, so the registry always uses the pin&apos;s image.</p>
                ) : (
                  <ul className="grid max-h-28 grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1.5 overflow-y-auto p-0.5" aria-label="Inspiration pins">
                    {ideas.map((i) => (
                      <li key={i.id}>
                        <button type="button" onClick={() => set("cover", { kind: "idea", id: i.id })} aria-pressed={pinnedIdea === i.id} aria-label={i.title || "Inspiration pin"} className={`relative block h-14 w-full overflow-hidden rounded-lg border-2 ${pinnedIdea === i.id ? "border-sage-deep" : "border-transparent"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={normalizeUrl(i.image_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                          {pinnedIdea === i.id && <Check className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-surface-sage-deep p-0.5 text-white" strokeWidth={2.5} aria-hidden />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {shown && (
                  <button type="button" onClick={() => { set("cover", { kind: "none" }); setPreview(""); }} className="mt-1.5 min-h-9 text-xs font-semibold text-wine">
                    Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-1 border-t border-line pt-4">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" checked={f.visible} onChange={(e) => set("visible", e.target.checked)} className="h-5 w-5 accent-sage-deep" />
              <span><span className="font-semibold">Show to guests</span> <span className="text-ink-2">on your public registry page</span></span>
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" checked={f.is_primary} onChange={(e) => set("is_primary", e.target.checked)} className="h-5 w-5 accent-sage-deep" />
              <span><span className="font-semibold">Make this our main registry</span> <span className="text-ink-2">shown first</span></span>
            </label>
          </div>

          <details className="mt-2 text-sm" open={Boolean(entry?.summary)}>
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink-2 hover:text-ink">Optional: your own summary</summary>
            <input aria-label="Summary" value={f.summary} onChange={(e) => set("summary", e.target.value)} maxLength={80} placeholder="24 items · 8 purchased" className={FIELD} />
            <p className="mt-1 text-xs text-ink-2">Only if you want it. The registry itself is the source of truth for items and what&apos;s been bought, so nothing here updates by itself.</p>
          </details>

          {err && <p role="alert" className="mt-3 text-sm text-wine">{err}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold hover:bg-bg">Cancel</button>
            <button disabled={saving} className="min-h-11 rounded-full bg-surface-sage-deep px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : entry ? "Save" : "Add registry"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
