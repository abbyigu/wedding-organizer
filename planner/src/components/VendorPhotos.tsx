"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeUrl } from "@/lib/ideas";
import { resizeCoverImage, type IdeaImage } from "@/lib/registry";
import { PHOTO_BUCKET, photoSrc } from "@/lib/vendors";
import { BTN, FIELD, FOCUS_RING } from "@/components/VendorUi";

// The vendor's photo list: index 0 is the cover. Entries are URLs, "idea:<id>" (an Inspiration pin, referenced) or "up:<path>" (an upload).
export default function VendorPhotos({ vendorId, photos, ideas, onChange }: { vendorId: string; photos: string[]; ideas: IdeaImage[]; onChange: (photos: string[]) => void }) {
  const [url, setUrl] = useState("");
  const [pickingIdea, setPickingIdea] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ideaMap = new Map(ideas.map((i) => [i.id, i]));
  const unused = ideas.filter((i) => !photos.includes(`idea:${i.id}`));

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const blob = await resizeCoverImage(file);
    const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${vendorId}/${crypto.randomUUID()}.${ext}`;
    const { error: err } = await createClient().storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type || undefined });
    setBusy(false);
    if (err) return setError(`Couldn't upload that photo (${err.message}). Has migration 046 been run?`);
    onChange([...photos, `up:${path}`]);
  }

  function move(i: number, to: number) {
    const next = [...photos];
    const [p] = next.splice(i, 1);
    next.splice(to, 0, p);
    onChange(next);
  }

  async function remove(i: number) {
    const entry = photos[i];
    onChange(photos.filter((_, idx) => idx !== i));
    if (entry.startsWith("up:")) await createClient().storage.from(PHOTO_BUCKET).remove([entry.slice(3)]);
  }

  const icon = `flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-bg disabled:opacity-30 ${FOCUS_RING}`;
  return (
    <div className="sm:col-span-2">
      {photos.length === 0 ? (
        <p className="text-sm text-ink-2">No photos yet. The first one you add becomes the cover.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={`${p}-${i}`} className="overflow-hidden rounded-xl border border-line bg-bg">
              <div className="relative aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc(p, ideaMap)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold shadow-sm">Cover</span>}
              </div>
              <div className="flex items-center justify-between px-1">
                <button type="button" onClick={() => move(i, 0)} disabled={i === 0} aria-label={`Set photo ${i + 1} as cover`} title="Set as cover" className={icon}><Star className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className={icon}><ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === photos.length - 1} aria-label={`Move photo ${i + 1} later`} className={icon}><ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
                <button type="button" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`} className={`${icon} text-wine`}><Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className={`${BTN} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sage-deep`}>
          <ImagePlus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {busy ? "Uploading…" : "Upload a photo"}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
        </label>
        {ideas.length > 0 && (
          <button type="button" onClick={() => setPickingIdea((o) => !o)} aria-expanded={pickingIdea} className={BTN}>From Inspiration</button>
        )}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!url.trim()) return;
          onChange([...photos, url.trim()]);
          setUrl("");
        }}
      >
        <label className="flex-1">
          <span className="sr-only">Photo link</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste a photo link" className={`${FIELD} !mt-0`} />
        </label>
        <button type="submit" className={BTN}>Add</button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-wine">{error}</p>}

      {pickingIdea && (
        <div className="mt-3">
          {unused.length === 0 ? (
            <p className="text-sm text-ink-2">Every Inspiration photo is already here.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {unused.slice(0, 30).map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => onChange([...photos, `idea:${i.id}`])} aria-label={`Use ${i.title || "this inspiration photo"}`} className={`block aspect-square w-full overflow-hidden rounded-lg ${FOCUS_RING}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={normalizeUrl(i.image_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-2">Inspiration photos are linked, not copied. Change one on the board and it changes here.</p>
        </div>
      )}
    </div>
  );
}
