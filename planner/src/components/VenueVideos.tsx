"use client";

import { useEffect, useMemo, useState } from "react";
import { Film, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmProvider";
import { MAX_VIDEO_MB, safeName, uploadMessage } from "@/lib/video";
import type { Venue } from "@/lib/venues";

type VenueFile = NonNullable<Venue["files"]>[number];
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const BUCKET = "venue-photos";

// Videos of a venue (a tour, a walkthrough). They sit in the venue's own file list, tagged as videos, and play right here.
export default function VenueVideos({ venueId, files, update }: { venueId: string; files: VenueFile[]; update: (patch: Partial<Venue>, wait?: number) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();
  const videos = files.filter((f) => f.kind === "video");
  const key = videos.map((f) => f.path).join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const paths = key ? key.split("|") : [];
    if (!paths.length) return;
    let live = true;
    supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600)
      .then(({ data }) => live && setUrls((cur) => ({ ...cur, ...Object.fromEntries((data ?? []).filter((d): d is typeof d & { signedUrl: string } => Boolean(d.signedUrl)).map((d) => [d.path ?? "", d.signedUrl])) })));
    return () => {
      live = false;
    };
  }, [supabase, key]);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    const next = [...files];
    const all = Array.from(list);
    for (let i = 0; i < all.length; i++) {
      const file = all[i];
      setBusy(`Uploading ${i + 1} of ${all.length}…`);
      const path = `${venueId}/videos/${Date.now()}-${safeName(file.name)}`;
      const { error: err } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
      if (err) {
        setError(`${file.name}: ${uploadMessage(err.message)}`);
        continue;
      }
      next.push({ path, name: file.name, addedAt: new Date().toISOString(), kind: "video" });
    }
    setBusy("");
    update({ files: next }, 0);
  }

  async function remove(f: VenueFile) {
    if (!(await confirm(`Remove “${f.name}”?`, "Remove"))) return;
    update({ files: files.filter((x) => x.path !== f.path) }, 0);
    await supabase.storage.from(BUCKET).remove([f.path]);
  }

  return (
    <section aria-labelledby="venue-videos" className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="venue-videos" className="font-serif text-2xl font-medium">Videos</h2>
          <p className="text-sm text-ink-2">Tours and walkthroughs of this place. Up to about {MAX_VIDEO_MB} MB each; for longer ones, paste a YouTube link under Files &amp; Links.</p>
        </div>
        <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface-olive px-5 text-sm font-medium text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sage-deep has-[:focus-visible]:ring-offset-2`}>
          <Film className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {busy || (videos.length ? "Add a video" : "Add your first video")}
          <input type="file" accept="video/*" multiple disabled={Boolean(busy)} className="sr-only" onChange={(e) => { const f = e.target.files; upload(f); e.target.value = ""; }} />
        </label>
      </div>
      {videos.length > 0 && (
        <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
          {videos.map((f) => (
            <li key={f.path} className="w-72 shrink-0 snap-start sm:w-[26rem]">
              {urls[f.path] ? <video src={urls[f.path]} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black" /> : <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-bg text-sm text-ink-2">Loading…</div>}
              <div className="mt-1 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                <button onClick={() => remove(f)} aria-label={`Remove ${f.name}`} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:text-wine ${FOCUS_RING}`}><Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-wine">{error}</p>}
    </section>
  );
}
