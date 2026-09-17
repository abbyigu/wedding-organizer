"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { blankDiyProject, DIY_STATUS_LABELS, DIY_STATUS_ORDER, type DiyProject, type DiyStatus } from "@/lib/diy-projects";
import { fmt } from "@/lib/venues";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function DiyProjects({ initialProjects, userName }: { initialProjects: DiyProject[]; userName: string }) {
  const [projects, setProjects] = useState(initialProjects);
  const [error, setError] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  function scheduleSave(id: string, patch: Partial<DiyProject>) {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("diy_projects").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function addProject(status: DiyStatus) {
    setError("");
    const count = projects.filter((p) => p.status === status).length;
    const { data, error } = await supabase.from("diy_projects").insert(blankDiyProject(status, count)).select().single();
    if (error) setError(error.message);
    else if (data) setProjects((ps) => [...ps, data as DiyProject]);
  }

  async function removeProject(id: string) {
    if (!confirm("Remove this project?")) return;
    setProjects((ps) => ps.filter((p) => p.id !== id));
    await supabase.from("diy_projects").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">DIY Projects</h1>
            <p className="mt-2 text-ink-2">Everything you&apos;re making yourselves.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.png" alt="" aria-hidden className="pointer-events-none absolute -right-6 -top-12 hidden h-40 w-auto rotate-[8deg] opacity-30 sm:block" />
        </div>
        {error && <p className="mt-3 text-sm text-wine">{error}</p>}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {DIY_STATUS_ORDER.map((status) => {
            const items = projects.filter((p) => p.status === status);
            return (
              <div key={status} className="flex flex-col gap-3 rounded-2xl border border-line bg-bg p-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-serif text-base font-medium">{DIY_STATUS_LABELS[status]}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-ink-2">{items.length}</span>
                    <button
                      onClick={() => addProject(status)}
                      aria-label={`Add a project to ${DIY_STATUS_LABELS[status]}`}
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-ink-2 hover:bg-paper hover:text-ink ${FOCUS_RING}`}
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {items.length === 0 && <p className="px-1 text-xs italic text-ink-2">Nothing here</p>}
                  {items.map((p) => (
                    <div key={p.id} className="rounded-xl border border-line bg-paper p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          defaultValue={p.title}
                          onChange={(e) => scheduleSave(p.id, { title: e.target.value })}
                          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-semibold outline-none focus:border-line focus:bg-bg"
                        />
                        <button onClick={() => removeProject(p.id)} aria-label={`Remove ${p.title}`} className={`shrink-0 rounded-full p-1 text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}>
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        </button>
                      </div>
                      <input
                        defaultValue={p.materials}
                        onChange={(e) => scheduleSave(p.id, { materials: e.target.value })}
                        placeholder="Materials needed…"
                        className="mt-1 w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-ink-2 outline-none focus:border-line focus:bg-bg"
                      />
                      <div className="mt-1.5 flex items-center gap-2">
                        <select
                          value={p.status}
                          onChange={(e) => scheduleSave(p.id, { status: e.target.value as DiyStatus })}
                          className="rounded-full border border-line bg-bg px-2 py-0.5 text-xs font-semibold"
                        >
                          {DIY_STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>{DIY_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        {p.cost_estimate != null && <span className="text-xs font-semibold text-ink-2">{fmt(p.cost_estimate)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
