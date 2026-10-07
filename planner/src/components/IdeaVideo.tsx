"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resolveTikTok } from "@/app/ideas/actions";
import { isTikTok, safeName, tiktokEmbed, tiktokId, uploadMessage } from "@/lib/video";
import type { IdeaPin } from "@/lib/ideas";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const BTN = `flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-paper px-4 text-sm font-medium hover:border-sage-deep ${FOCUS_RING}`;
const BUCKET = "venue-photos";

// A video on an idea: a TikTok link played in place, or a video file uploaded from the phone or computer.
export default function IdeaVideo({ idea, editable, onPatch }: { idea: IdeaPin; editable: boolean; onPatch: (patch: Partial<IdeaPin>) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null);
  const resolving = useRef("");
  const url = idea.video_url ?? "";
  const path = idea.video_path ?? null;
  const id = url ? tiktokId(url) : null;

  // A short link saved earlier (or from the new-idea form) is turned into the full link the first time it's opened.
  useEffect(() => {
    if (!url || id || !isTikTok(url) || resolving.current === url) return;
    resolving.current = url;
    resolveTikTok(url).then((r) => {
      if (r.ok && r.url) onPatch({ video_url: r.url });
      else setError(r.error ?? "Couldn't open that TikTok link.");
    });
  }, [url, id, onPatch]);

  useEffect(() => {
    if (!path) return;
    let live = true;
    supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => live && data && setSigned({ path, url: data.signedUrl }));
    return () => {
      live = false;
    };
  }, [supabase, path]);

  async function saveLink(e: React.FormEvent) {
    e.preventDefault();
    if (!link.trim()) return;
    setBusy(true);
    setError("");
    const r = await resolveTikTok(link);
    setBusy(false);
    if (!r.ok || !r.url) return setError(r.error ?? "Couldn't use that link.");
    onPatch({ video_url: r.url });
    setLink("");
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const dest = `ideas/${idea.id}/${Date.now()}-${safeName(file.name)}`;
    const { error: err } = await supabase.storage.from(BUCKET).upload(dest, file, { contentType: file.type || undefined });
    setBusy(false);
    if (err) return setError(uploadMessage(err.message));
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    onPatch({ video_path: dest });
  }

  async function removeFile() {
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    setSigned(null);
    onPatch({ video_path: null });
  }

  const has = Boolean(url || path);
  if (!has && !editable) return null;

  return (
    <section aria-label="Video">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Video</h3>
      {id && (
        <div className="mx-1 mt-2">
          <iframe src={tiktokEmbed(id)} title="TikTok video" allow="fullscreen; encrypted-media" loading="lazy" className="h-[640px] max-h-[70vh] w-full max-w-[325px] rounded-xl border-0 bg-bg" />
        </div>
      )}
      {url && !id && !isTikTok(url) && (
        <p className="mx-1 mt-2 text-sm">
          <a href={url.match(/^https?:\/\//i) ? url : `https://${url}`} target="_blank" rel="noreferrer" className="font-medium text-sage-deep underline underline-offset-2">Open the video ↗</a>
        </p>
      )}
      {path && (
        <div className="mx-1 mt-2">
          {signed?.path === path ? <video src={signed.url} controls playsInline preload="metadata" className="max-h-[70vh] w-full rounded-xl bg-black" /> : <p className="text-sm text-ink-2">Loading the video…</p>}
        </div>
      )}
      {editable && (
        <div className="mx-1 mt-2 flex flex-col gap-2">
          <form onSubmit={saveLink} className="flex gap-2">
            <label htmlFor={`idea-video-link-${idea.id}`} className="sr-only">TikTok link</label>
            <input id={`idea-video-link-${idea.id}`} value={link} onChange={(e) => setLink(e.target.value)} placeholder={url ? "Replace with another TikTok link" : "Paste a TikTok link"} className="h-11 min-w-0 flex-1 rounded border border-line bg-bg px-2 text-sm" />
            <button type="submit" disabled={busy || !link.trim()} className={`${BTN} disabled:opacity-50`}>{busy ? "…" : "Add"}</button>
          </form>
          <div className="flex flex-wrap gap-2">
            <label className={`${BTN} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sage-deep`}>
              <Film className="h-4 w-4" strokeWidth={1.5} aria-hidden />{busy ? "Working…" : path ? "Replace the video file" : "Upload a video file"}
              <input type="file" accept="video/*" disabled={busy} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
            </label>
            {url && <button onClick={() => onPatch({ video_url: "" })} className={BTN}><Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />Remove the link</button>}
            {path && <button onClick={removeFile} className={BTN}><Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />Remove the file</button>}
          </div>
          <p className="text-xs text-ink-2">A saved TikTok? Upload the file, or paste its link to watch it right here.</p>
        </div>
      )}
      {error && <p role="alert" className="mx-1 mt-2 text-sm text-wine">{error}</p>}
    </section>
  );
}
