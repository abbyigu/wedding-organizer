"use client";

import { useState } from "react";
import Link from "next/link";
import { NotebookPen, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type BudgetNote = { id: string; body: string; created_at: string };

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function BudgetNotes({ initialNotes, missing, preview }: { initialNotes: BudgetNote[]; missing: boolean; preview?: boolean }) {
  const supabase = createClient();
  const [notes, setNotes] = useState(initialNotes);
  const [adding, setAdding] = useState(!preview);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const newest = [...notes].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const shown = preview ? newest.slice(0, 3) : newest;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError("");
    const { data, error } = await supabase.from("budget_notes").insert({ body: text.trim() }).select().single();
    if (error) return setError(error.message);
    setNotes((n) => [...n, data as BudgetNote]);
    setText("");
    if (preview) setAdding(false);
  }

  async function remove(id: string) {
    setNotes((n) => n.filter((x) => x.id !== id));
    await supabase.from("budget_notes").delete().eq("id", id);
  }

  if (missing) return <p className="mt-3 text-sm text-ink-2">Notes need one small database update (migration 038) before they can be saved.</p>;

  return (
    <div>
      {shown.length === 0 && !adding && (
        <div className="mt-3 flex gap-3 rounded-xl bg-bg/70 p-4">
          <NotebookPen className="mt-0.5 h-5 w-5 shrink-0 text-wine" strokeWidth={1.25} aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">No notes yet.</p>
            <p className="text-ink-2">Jot down ideas, reminders or decisions to keep everything in one place.</p>
          </div>
        </div>
      )}
      {shown.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {shown.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-2 py-2.5 text-sm">
              <p className="min-w-0 whitespace-pre-wrap">{n.body}</p>
              <button onClick={() => remove(n.id)} aria-label="Remove note" className={`-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:text-wine ${FOCUS_RING}`}>
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <form onSubmit={add} className="mt-3 flex flex-col gap-2">
          <textarea id="budget-note-new" aria-label="New budget note" autoFocus={preview} rows={preview ? 2 : 3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Ask the venue whether the bar is included" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sage-deep" />
          <div className="flex justify-end gap-2">
            {preview && <button type="button" onClick={() => setAdding(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-bg">Cancel</button>}
            <button className="rounded-full bg-surface-green px-4 py-2 text-sm font-semibold text-white">Save note</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className={`mx-auto mt-3 flex items-center gap-1.5 rounded-full border border-ink/25 px-5 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>
          <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Add note
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-wine">{error}</p>}
      {preview && notes.length > 3 && (
        <Link href="/budget/notes" className="mt-2 inline-block text-sm font-semibold text-green">+{notes.length - 3} more</Link>
      )}
    </div>
  );
}
