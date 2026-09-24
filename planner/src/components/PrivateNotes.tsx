"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Lock, Pen, Pin, Plus, Trash2 } from "lucide-react";
import PrivateAttachments from "@/components/PrivateAttachments";
import { Sprig } from "@/components/PrivateArt";
import { useConfirm } from "@/components/ConfirmProvider";
import { createClient } from "@/lib/supabase/client";
import { usePrivateUrls } from "@/lib/use-private-urls";
import { blankNote, LINK_AREAS, NOTE_CATEGORIES, shortDate, wordCount, type PrivateNote } from "@/lib/private";

const WINE_BTN = "flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-surface-wine px-5 text-sm font-medium text-white hover:bg-[color-mix(in_srgb,var(--surface-wine)_85%,black)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const GHOST_BTN = "flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-line bg-paper px-5 text-sm font-medium hover:border-wine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function Writer({ note, userId, onChange, onClose, onDelete, onError }: { note: PrivateNote; userId: string; onChange: (p: Partial<PrivateNote>) => void; onClose: () => void; onDelete: () => void; onError: (m: string) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<"saved" | "saving">("saved");
  const [savedAt, setSavedAt] = useState(note.updated_at);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<Partial<PrivateNote>>({});
  const urls = usePrivateUrls([note.cover_path]);

  async function flush() {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    const { error } = await supabase.from("private_notes").update(patch).eq("id", note.id);
    if (error) onError(error.message);
    else {
      setState("saved");
      setSavedAt(new Date().toISOString());
    }
  }
  function edit(patch: Partial<PrivateNote>, wait = 900) {
    onChange(patch);
    pending.current = { ...pending.current, ...patch };
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, wait);
  }
  useEffect(() => {
    const p = pending;
    return () => {
      clearTimeout(timer.current);
      if (Object.keys(p.current).length) void supabase.from("private_notes").update(p.current).eq("id", note.id);
    };
  }, [supabase, note.id]);

  async function cover(file: File) {
    const path = `${userId}/covers/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from("private-files").upload(path, file, { contentType: file.type || undefined });
    if (error) return onError(`Couldn't upload that image (${error.message}).`);
    edit({ cover_path: path }, 0);
  }

  const words = wordCount(note.body);
  return (
    <div role="dialog" aria-modal="true" aria-label={`Editing ${note.title || "private note"}`} className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur sm:px-8">
        <button onClick={async () => { await flush(); onClose(); }} className={GHOST_BTN}><ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />Back</button>
        <p className="flex items-center gap-1.5 text-sm text-ink-2"><Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />Only you</p>
        <p role="status" className="ml-auto text-sm text-ink-2">{state === "saving" ? "Saving…" : `Saved ${shortDate(savedAt)}`}</p>
      </div>
      <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
        {note.cover_path && urls[note.cover_path] && (
          <div className="relative mb-6 overflow-hidden rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[note.cover_path]} alt="" className="max-h-64 w-full object-cover" />
            <button onClick={() => edit({ cover_path: null }, 0)} className="absolute right-3 top-3 min-h-11 rounded-full bg-paper/95 px-4 text-sm font-medium">Remove image</button>
          </div>
        )}
        <label htmlFor="pn-title" className="sr-only">Title</label>
        <input id="pn-title" value={note.title} onChange={(e) => edit({ title: e.target.value })} placeholder={note.kind === "writing" ? "Untitled writing" : "Title"} className="w-full bg-transparent font-serif text-4xl font-light leading-tight tracking-[-0.01em] outline-none placeholder:text-ink-2/50 sm:text-5xl" />
        <p className="mt-2 text-sm text-ink-2">
          {note.kind === "writing" ? `Draft · ${words} word${words === 1 ? "" : "s"}` : `${words} word${words === 1 ? "" : "s"}`} · Last edited {shortDate(savedAt)}
        </p>
        <label htmlFor="pn-body" className="sr-only">Body</label>
        <textarea
          id="pn-body"
          value={note.body}
          onChange={(e) => edit({ body: e.target.value })}
          placeholder={note.kind === "writing" ? "Begin whenever you're ready…" : "What's on your mind?"}
          className={`mt-6 w-full resize-none bg-transparent font-serif leading-[1.8] outline-none placeholder:text-ink-2/50 ${note.kind === "writing" ? "min-h-[55vh] text-xl" : "min-h-[30vh] text-lg"}`}
        />

        <div className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
          <div>
            <label htmlFor="pn-cat" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Category</label>
            <select id="pn-cat" value={note.category} onChange={(e) => edit({ category: e.target.value }, 0)} className="mt-1 h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm">
              {NOTE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pn-link" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Linked wedding area <span className="font-normal normal-case">(just a label)</span></label>
            <select id="pn-link" value={note.linked_area} onChange={(e) => edit({ linked_area: e.target.value }, 0)} className="mt-1 h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm">
              {LINK_AREAS.map((a) => <option key={a} value={a}>{a || "None"}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button onClick={() => edit({ pinned: !note.pinned }, 0)} aria-pressed={note.pinned} className={GHOST_BTN}><Pin className={`h-4 w-4 ${note.pinned ? "fill-wine text-wine" : ""}`} strokeWidth={1.5} aria-hidden />{note.pinned ? "Pinned" : "Pin to the top"}</button>
            <label className={`${GHOST_BTN} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-wine`}>
              <ImagePlus className="h-4 w-4" strokeWidth={1.5} aria-hidden />Add a cover image
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) cover(f); }} />
            </label>
            <button onClick={onDelete} className={`${GHOST_BTN} text-wine`}><Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />Delete</button>
          </div>
          <div className="sm:col-span-2">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Attachments</h3>
            <PrivateAttachments userId={userId} noteId={note.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrivateNotes({ notes, setNotes, userId, onError }: { notes: PrivateNote[]; setNotes: (fn: (n: PrivateNote[]) => PrivateNote[]) => void; userId: string; onError: (m: string) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();
  const [openId, setOpenId] = useState<string | null>(null);
  const [cat, setCat] = useState("All");
  const urls = usePrivateUrls(notes.map((n) => n.cover_path));

  const shown = [...notes].filter((n) => cat === "All" || n.category === cat).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at));
  const open = notes.find((n) => n.id === openId) ?? null;

  async function add(kind: PrivateNote["kind"]) {
    onError("");
    const { data, error } = await supabase.from("private_notes").insert(blankNote(kind, cat === "All" ? (kind === "writing" ? "Vows" : "Thoughts") : cat)).select().single();
    if (error || !data) return onError(`${error?.message ?? "Couldn't add that."} Has migration 052 been run?`);
    setNotes((ns) => [data as PrivateNote, ...ns]);
    setOpenId((data as PrivateNote).id);
  }

  async function remove(n: PrivateNote) {
    if (!(await confirm(`Delete “${n.title || "this note"}”? This can't be undone.`, "Delete"))) return;
    setOpenId(null);
    setNotes((ns) => ns.filter((x) => x.id !== n.id));
    const { data: files } = await supabase.from("private_attachments").select("path").eq("note_id", n.id);
    const paths = [...(files ?? []).map((f) => f.path as string), ...(n.cover_path ? [n.cover_path] : [])];
    if (paths.length) await supabase.storage.from("private-files").remove(paths);
    await supabase.from("private_notes").delete().eq("id", n.id);
  }

  const cats = ["All", ...NOTE_CATEGORIES.filter((c) => notes.some((n) => n.category === c))];

  return (
    <section aria-label="My private space" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {notes.length > 0 ? (
          <div role="group" aria-label="Category" className="flex flex-wrap gap-2">
            {cats.map((c) => <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`min-h-11 rounded-full border px-4 text-sm ${cat === c ? "border-wine bg-[color-mix(in_srgb,var(--surface-wine)_9%,var(--paper))] text-wine" : "border-line bg-paper hover:border-wine"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine`}>{c}</button>)}
          </div>
        ) : <span />}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => add("writing")} className={GHOST_BTN}><Pen className="h-4 w-4" strokeWidth={1.5} aria-hidden />Write something longer</button>
          <button onClick={() => add("note")} className={WINE_BTN}><Plus className="h-4 w-4" strokeWidth={2} aria-hidden />Private note</button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
          <Sprig className="h-20 w-16 text-sage-deep/60" />
          <p className="mt-3 font-serif text-3xl font-light">Your thoughts have a place here.</p>
          <p className="mt-1 max-w-sm text-ink-2">Vows, gift ideas, a letter you&apos;re not ready to share. Only you can see any of it.</p>
          <button onClick={() => add("note")} className={`${WINE_BTN} mt-5 px-6`}><Plus className="h-4 w-4" strokeWidth={2} aria-hidden />Write a private note</button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((n) => (
            <li key={n.id} className="relative flex flex-col overflow-hidden rounded-3xl border border-line bg-[color-mix(in_srgb,var(--surface-blush)_6%,var(--paper))]">
              {n.cover_path && urls[n.cover_path] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[n.cover_path]} alt="" className="h-36 w-full object-cover" />
              )}
              <div className="flex flex-1 flex-col gap-2 p-5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-wine"><Lock className="h-3 w-3" strokeWidth={1.75} aria-hidden />Only you{n.pinned && <Pin className="ml-1 h-3 w-3 fill-wine" strokeWidth={1.5} aria-label="Pinned" />}</p>
                <h3 className="font-serif text-2xl leading-tight"><button onClick={() => setOpenId(n.id)} className="rounded text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine">{n.title || "Untitled"}</button></h3>
                {n.body && <p className="line-clamp-3 font-serif text-[15px] italic text-ink-2">“{n.body.slice(0, 220)}”</p>}
                <p className="mt-auto pt-2 text-sm text-ink-2">{n.category} · {n.kind === "writing" ? `${wordCount(n.body)} words · ` : ""}Updated {shortDate(n.updated_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && <Writer key={open.id} note={open} userId={userId} onChange={(p) => setNotes((ns) => ns.map((n) => (n.id === open.id ? { ...n, ...p, updated_at: new Date().toISOString() } : n)))} onClose={() => setOpenId(null)} onDelete={() => remove(open)} onError={onError} />}
    </section>
  );
}
