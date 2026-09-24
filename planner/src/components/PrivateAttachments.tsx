"use client";

import { useEffect, useState } from "react";
import { FileText, Lock, Paperclip, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmProvider";
import { FOCUS_RING } from "@/components/VendorUi";

type Attachment = { id: string; name: string; path: string; kind: string };

// Files kept with a private note or surprise. They live in a private bucket under the owner's own folder and are never
// shared, not even after a reveal. Only the cover image can be shown to the person it's for.
export default function PrivateAttachments({ userId, noteId, surpriseId }: { userId: string; noteId?: string; surpriseId?: string }) {
  const supabase = createClient();
  const confirm = useConfirm();
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    supabase
      .from("private_attachments")
      .select("id, name, path, kind")
      .eq(noteId ? "note_id" : "surprise_id", (noteId ?? surpriseId) as string)
      .order("created_at", { ascending: true })
      .then(({ data }) => live && setItems((data ?? []) as Attachment[]));
    return () => {
      live = false;
    };
  }, [supabase, noteId, surpriseId]);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const path = `${userId}/files/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const up = await supabase.storage.from("private-files").upload(path, file, { contentType: file.type || undefined });
    if (up.error) {
      setBusy(false);
      return setError(`Couldn't upload that (${up.error.message}). Has migration 052 been run?`);
    }
    const kind = file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "other";
    const { data, error: err } = await supabase.from("private_attachments").insert({ name: file.name, path, kind, note_id: noteId ?? null, surprise_id: surpriseId ?? null }).select("id, name, path, kind").single();
    setBusy(false);
    if (err || !data) return setError(err?.message ?? "Couldn't save that file.");
    setItems((cur) => [...cur, data as Attachment]);
  }

  async function open(a: Attachment) {
    const { data, error: err } = await supabase.storage.from("private-files").createSignedUrl(a.path, 120);
    if (err || !data) return setError(err?.message ?? "Couldn't open that file.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove(a: Attachment) {
    if (!(await confirm(`Remove “${a.name}”?`, "Remove"))) return;
    setItems((cur) => cur.filter((x) => x.id !== a.id));
    await supabase.storage.from("private-files").remove([a.path]);
    await supabase.from("private_attachments").delete().eq("id", a.id);
  }

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-ink-2"><Lock className="h-3 w-3" strokeWidth={1.75} aria-hidden />Only you can open these, even after a reveal.</p>
      {items.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3">
              <FileText className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
              <button onClick={() => open(a)} className={`min-h-11 min-w-0 flex-1 truncate rounded text-left text-[15px] underline-offset-2 hover:underline ${FOCUS_RING}`}>{a.name}</button>
              <button onClick={() => remove(a)} aria-label={`Remove ${a.name}`} className={`flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:text-wine ${FOCUS_RING}`}><Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      <label className={`mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-5 text-sm font-medium hover:border-wine has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-wine`}>
        <Paperclip className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        {busy ? "Adding…" : "Add a file"}
        <input type="file" disabled={busy} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-wine">{error}</p>}
    </div>
  );
}
