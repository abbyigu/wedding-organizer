"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { blankTask, type PlanningTask } from "@/lib/planning-tasks";
import { ACTION_SUGGESTIONS } from "@/lib/venue-profile";

// Venue to-dos are Planning Board tasks (category "Venue"), tied to this venue by template_key.
export default function VenueActions({ venueId, venueName, initialTasks }: { venueId: string; venueName: string; initialTasks: PlanningTask[] }) {
  const supabase = createClient();
  const [tasks, setTasks] = useState(initialTasks);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const prefix = `venue:${venueId}:`;
  const suggestions = ACTION_SUGGESTIONS.map((a) => ({ ...a, task: tasks.find((t) => t.template_key === `${prefix}${a.key}`) }));
  const custom = tasks.filter((t) => !ACTION_SUGGESTIONS.some((a) => t.template_key === `${prefix}${a.key}`));
  const missing = suggestions.filter((s) => !s.task);

  async function create(title: string, key: string) {
    const { data, error } = await supabase.from("planning_tasks").insert(blankTask("todo", { title: `${title} — ${venueName}`, category: "Venue", template_key: `${prefix}${key}` })).select().single();
    if (error) setError(error.message);
    else setTasks((ts) => [...ts, data as PlanningTask]);
  }

  async function addAll() {
    setError("");
    for (const s of missing) await create(s.label, s.key);
  }

  async function toggle(t: PlanningTask) {
    const status = t.status === "done" ? "todo" : "done";
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, status } : x)));
    await supabase.from("planning_tasks").update({ status }).eq("id", t.id);
  }

  const row = (t: PlanningTask | undefined, label: string, onAdd: () => void) => (
    <li key={label} className="flex items-center gap-3 py-1.5 text-sm">
      {t ? (
        <button role="checkbox" aria-checked={t.status === "done"} aria-label={label} onClick={() => toggle(t)} className="-m-1.5 flex h-10 w-10 shrink-0 items-center justify-center">
          <span className={`flex h-5 w-5 items-center justify-center rounded border ${t.status === "done" ? "border-transparent bg-surface-olive text-white" : "border-ink-2"}`}>{t.status === "done" && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}</span>
        </button>
      ) : (
        <button onClick={onAdd} aria-label={`Add “${label}” to the Planning Board`} className="-m-1.5 flex h-10 w-10 shrink-0 items-center justify-center text-ink-2 hover:text-sage-deep"><Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden /></button>
      )}
      <span className={t?.status === "done" ? "text-ink-2 line-through" : ""}>{label}</span>
    </li>
  );

  return (
    <section aria-label="Action items" className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[color-mix(in_srgb,var(--sage)_16%,var(--paper))] px-5 py-3">
        <h2 className="font-serif text-xl font-medium">Action items</h2>
        {missing.length > 0 && <button onClick={addAll} className="rounded-full bg-surface-green px-4 py-2 text-sm font-semibold text-white">Add to Planning Board</button>}
      </div>
      <div className="px-5 py-3">
        <ul>
          {suggestions.map((s) => row(s.task, s.label, () => create(s.label, s.key)))}
          {custom.map((t) => row(t, t.title, () => {}))}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            await create(draft.trim(), crypto.randomUUID());
            setDraft("");
          }}
        >
          <input aria-label="Add your own action" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add your own…" className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-sage-deep" />
          <button className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-bg">Add</button>
        </form>
        <p className="mt-2 text-xs text-ink-2">These are Planning Board tasks. Ticking one here ticks it there too.</p>
        {error && <p role="alert" className="mt-1 text-sm text-wine">{error}</p>}
      </div>
    </section>
  );
}
