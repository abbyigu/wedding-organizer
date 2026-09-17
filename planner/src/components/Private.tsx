"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import {
  blankNote,
  blankSurprise,
  SURPRISE_STATUS_ORDER,
  SURPRISE_STATUSES,
  type PrivateNote,
  type Surprise,
  type SurpriseStatus,
} from "@/lib/private";

const STATUS_STYLE: Record<SurpriseStatus, string> = {
  idea: "bg-[color-mix(in_srgb,var(--sage)_20%,var(--paper))] text-ink-2",
  planning: "bg-[color-mix(in_srgb,var(--new,#4A6C8A)_25%,var(--paper))] text-[var(--new,#4A6C8A)]",
  ready: "bg-[color-mix(in_srgb,var(--gold)_30%,var(--paper))] text-[var(--wood)]",
  done: "bg-[color-mix(in_srgb,var(--sage)_35%,var(--paper))] text-[var(--sage-deep)]",
};

export default function Private({
  initialNotes,
  initialSurprises,
  userName,
  userId,
}: {
  initialNotes: PrivateNote[];
  initialSurprises: Surprise[];
  userName: string;
  userId: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [surprises, setSurprises] = useState(initialSurprises);
  const [error, setError] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const mySurprises = surprises.filter((s) => s.owner_id === userId);
  const partnerSurprises = surprises.filter((s) => s.owner_id !== userId);

  function scheduleNoteSave(id: string, patch: Partial<PrivateNote>) {
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("private_notes").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function addNote() {
    setError("");
    const { data, error } = await supabase.from("private_notes").insert(blankNote()).select().single();
    if (error) setError(error.message);
    else if (data) setNotes((ns) => [data as PrivateNote, ...ns]);
  }

  async function removeNote(id: string) {
    if (!confirm("Delete this note? This can't be undone.")) return;
    setNotes((ns) => ns.filter((n) => n.id !== id));
    await supabase.from("private_notes").delete().eq("id", id);
  }

  function scheduleSurpriseSave(id: string, patch: Partial<Surprise>) {
    setSurprises((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("surprises").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function reveal(id: string) {
    setSurprises((ss) => ss.map((s) => (s.id === id ? { ...s, revealed: true } : s)));
    await supabase.from("surprises").update({ revealed: true }).eq("id", id);
  }

  async function addSurprise() {
    setError("");
    const { data, error } = await supabase.from("surprises").insert(blankSurprise(userName)).select().single();
    if (error) setError(error.message);
    else if (data) setSurprises((ss) => [data as Surprise, ...ss]);
  }

  async function removeSurprise(id: string) {
    if (!confirm("Delete this surprise?")) return;
    setSurprises((ss) => ss.filter((s) => s.id !== id));
    await supabase.from("surprises").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Private</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Notes here stay yours alone. Surprises stay hidden from the other person until you reveal them, or their reveal date arrives.
        </p>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        <div className="mt-6 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Your private notes <small className="font-normal text-ink-2">— nobody else ever sees these</small></h3>
            <button onClick={addNote} className="rounded-full bg-sage-deep px-3.5 py-1.5 text-sm font-semibold text-white">＋ Add note</button>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-ink-2">Nothing here yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-line bg-bg p-3">
                  <div className="flex items-center gap-2">
                    <input
                      defaultValue={n.title}
                      onChange={(e) => scheduleNoteSave(n.id, { title: e.target.value })}
                      className="flex-1 rounded border border-transparent bg-transparent px-1 py-1 font-semibold outline-none focus:border-line focus:bg-paper"
                    />
                    <button onClick={() => removeNote(n.id)} aria-label={`Delete ${n.title}`} className="text-wine">×</button>
                  </div>
                  <textarea
                    defaultValue={n.body}
                    onChange={(e) => scheduleNoteSave(n.id, { body: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm outline-none focus:border-line focus:bg-paper"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Your surprises</h3>
            <button onClick={addSurprise} className="rounded-full bg-sage-deep px-3.5 py-1.5 text-sm font-semibold text-white">＋ Add surprise</button>
          </div>
          {mySurprises.length === 0 ? (
            <p className="text-sm text-ink-2">Nothing here yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {mySurprises.map((s) => (
                <div key={s.id} className="flex flex-col rounded-2xl border border-line bg-bg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <input
                      defaultValue={s.title}
                      onChange={(e) => scheduleSurpriseSave(s.id, { title: e.target.value })}
                      className="flex-1 rounded border border-transparent bg-transparent px-1 py-1 font-serif text-lg font-medium outline-none focus:border-line focus:bg-paper"
                    />
                    <button onClick={() => removeSurprise(s.id)} aria-label={`Delete ${s.title}`} className="shrink-0 text-wine">×</button>
                  </div>
                  <select
                    value={s.status}
                    onChange={(e) => scheduleSurpriseSave(s.id, { status: e.target.value as SurpriseStatus })}
                    className={`mt-1 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[s.status]}`}
                  >
                    {SURPRISE_STATUS_ORDER.map((k) => (
                      <option key={k} value={k}>{SURPRISE_STATUSES[k]}</option>
                    ))}
                  </select>
                  <textarea
                    defaultValue={s.details}
                    onChange={(e) => scheduleSurpriseSave(s.id, { details: e.target.value })}
                    rows={3}
                    placeholder="Details…"
                    className="mt-2 w-full flex-1 rounded border border-transparent bg-transparent px-1 py-1 text-sm outline-none focus:border-line focus:bg-paper"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-line pt-2 text-sm">
                    <label className="flex items-center gap-1.5 text-ink-2">
                      Reveal on
                      <input
                        type="date"
                        defaultValue={s.reveal_on ?? ""}
                        onChange={(e) => scheduleSurpriseSave(s.id, { reveal_on: e.target.value || null })}
                        className="rounded border border-line bg-paper px-2 py-1"
                      />
                    </label>
                    {s.revealed ? (
                      <span className="font-semibold text-sage-deep">✓ Revealed</span>
                    ) : (
                      <button onClick={() => reveal(s.id)} className="font-semibold text-sage-deep underline underline-offset-2">Reveal now</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Revealed to you</h3>
          {partnerSurprises.length === 0 ? (
            <p className="text-sm text-ink-2">Nothing revealed yet — any surprise the other person hasn&apos;t shared stays hidden.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {partnerSurprises.map((s) => (
                <div key={s.id} className="flex flex-col rounded-2xl border border-gold bg-[color-mix(in_srgb,var(--gold)_15%,var(--paper))] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-serif text-lg font-medium">🎉 {s.title}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[s.status]}`}>
                      {SURPRISE_STATUSES[s.status]}
                    </span>
                  </div>
                  <p className="text-sm text-ink-2">from {s.owner_name}</p>
                  {s.details && <p className="mt-2 text-sm text-ink-2">{s.details}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
