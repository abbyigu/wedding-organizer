"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { normalizeUrl } from "@/lib/ideas";
import { CATEGORIES } from "@/lib/planning-tasks";
import {
  blankDiyProject,
  DIY_OWNER_LABELS,
  DIY_OWNER_ORDER,
  DIY_STATUS_LABELS,
  DIY_STATUS_ORDER,
  type ChecklistItem,
  type DiyOwner,
  type DiyProject,
  type DiyStatus,
} from "@/lib/diy-projects";
import { fmt } from "@/lib/venues";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const FIELD = "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-line focus:bg-bg";

export default function DiyProjects({ initialProjects, userName }: { initialProjects: DiyProject[]; userName: string }) {
  const [projects, setProjects] = useState(initialProjects);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
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
    else if (data) {
      setProjects((ps) => [...ps, data as DiyProject]);
      setOpenId((data as DiyProject).id);
    }
  }

  async function removeProject(id: string) {
    if (!confirm("Remove this project? Its Planning Board card will be removed too.")) return;
    setProjects((ps) => ps.filter((p) => p.id !== id));
    if (openId === id) setOpenId(null);
    await supabase.from("diy_projects").delete().eq("id", id);
  }

  function toggleChecklist(p: DiyProject, index: number) {
    const next = p.materials_checklist.map((item, i) => (i === index ? { ...item, done: !item.done } : item));
    scheduleSave(p.id, { materials_checklist: next });
  }

  function addChecklistItem(p: DiyProject, text: string) {
    if (!text.trim()) return;
    scheduleSave(p.id, { materials_checklist: [...p.materials_checklist, { text: text.trim(), done: false }] });
  }

  function removeChecklistItem(p: DiyProject, index: number) {
    scheduleSave(p.id, { materials_checklist: p.materials_checklist.filter((_, i) => i !== index) });
  }

  function addPhoto(p: DiyProject, url: string) {
    if (!url.trim()) return;
    scheduleSave(p.id, { progress_photos: [...p.progress_photos, url.trim()] });
  }

  function removePhoto(p: DiyProject, index: number) {
    scheduleSave(p.id, { progress_photos: p.progress_photos.filter((_, i) => i !== index) });
  }

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">DIY Projects</h1>
            <p className="mt-2 text-ink-2">Where ideas become real — cost, materials, and progress for everything you&apos;re making.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.png" alt="" aria-hidden className="pointer-events-none absolute -right-6 -top-12 hidden h-40 w-auto rotate-[8deg] opacity-30 sm:block" />
        </div>
        {error && <p className="mt-3 text-sm text-wine">{error}</p>}
        <p className="mt-2 text-xs text-ink-2">Every project also shows up on the Planning Board under the DIY category.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  {items.map((p) => {
                    const isOpen = openId === p.id;
                    const checklistDone = p.materials_checklist.filter((i) => i.done).length;
                    return (
                      <div key={p.id} className="overflow-hidden rounded-xl border border-line bg-paper shadow-sm">
                        {p.reference_image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={normalizeUrl(p.reference_image)} alt="" className="h-28 w-full object-cover" />
                        )}
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <button onClick={() => setOpenId(isOpen ? null : p.id)} className={`flex min-w-0 flex-1 items-start gap-1 rounded text-left ${FOCUS_RING}`}>
                              {isOpen ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-2" aria-hidden /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-2" aria-hidden />}
                              <span className="truncate font-semibold">{p.title}</span>
                            </button>
                            <button onClick={() => removeProject(p.id)} aria-label={`Remove ${p.title}`} className={`shrink-0 rounded-full p-1 text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}>
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                            </button>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink-2">
                            <span className="rounded-full border border-line px-2 py-0.5">{DIY_OWNER_LABELS[p.owner]}</span>
                            {p.materials_checklist.length > 0 && (
                              <span className="rounded-full border border-line px-2 py-0.5">
                                {checklistDone}/{p.materials_checklist.length} materials
                              </span>
                            )}
                            {p.deadline && <span className="rounded-full border border-line px-2 py-0.5">Due {p.deadline}</span>}
                          </div>

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
                            {(p.cost_actual ?? p.cost_estimate) != null && (
                              <span className="text-xs font-semibold text-ink-2">
                                {fmt((p.cost_actual ?? p.cost_estimate)!)}
                                {p.cost_actual == null && p.cost_estimate != null && " est."}
                              </span>
                            )}
                          </div>
                        </div>

                        {isOpen && (
                          <div className="border-t border-line bg-bg p-3">
                            <div className="grid grid-cols-2 gap-2">
                              <label className="col-span-2 text-xs font-semibold text-ink-2">
                                Reference image URL
                                <input
                                  defaultValue={p.reference_image}
                                  onChange={(e) => scheduleSave(p.id, { reference_image: e.target.value })}
                                  placeholder="https://…"
                                  className={FIELD}
                                />
                              </label>
                              <label className="text-xs font-semibold text-ink-2">
                                Owner
                                <select
                                  value={p.owner}
                                  onChange={(e) => scheduleSave(p.id, { owner: e.target.value as DiyOwner })}
                                  className={FIELD}
                                >
                                  {DIY_OWNER_ORDER.map((o) => (
                                    <option key={o} value={o}>{DIY_OWNER_LABELS[o]}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="text-xs font-semibold text-ink-2">
                                Quantity
                                <input
                                  type="number"
                                  min={0}
                                  defaultValue={p.quantity ?? ""}
                                  onChange={(e) => scheduleSave(p.id, { quantity: e.target.value === "" ? null : Number(e.target.value) })}
                                  className={FIELD}
                                />
                              </label>
                              <label className="text-xs font-semibold text-ink-2">
                                Est. cost
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  defaultValue={p.cost_estimate ?? ""}
                                  onChange={(e) => scheduleSave(p.id, { cost_estimate: e.target.value === "" ? null : Number(e.target.value) })}
                                  className={FIELD}
                                />
                              </label>
                              <label className="text-xs font-semibold text-ink-2">
                                Actual cost
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  defaultValue={p.cost_actual ?? ""}
                                  onChange={(e) => scheduleSave(p.id, { cost_actual: e.target.value === "" ? null : Number(e.target.value) })}
                                  className={FIELD}
                                />
                              </label>
                              <label className="text-xs font-semibold text-ink-2">
                                Time estimate
                                <input
                                  defaultValue={p.time_estimate}
                                  onChange={(e) => scheduleSave(p.id, { time_estimate: e.target.value })}
                                  placeholder="e.g. 2 hrs"
                                  className={FIELD}
                                />
                              </label>
                              <label className="text-xs font-semibold text-ink-2">
                                Deadline
                                <input
                                  type="date"
                                  defaultValue={p.deadline ?? ""}
                                  onChange={(e) => scheduleSave(p.id, { deadline: e.target.value || null })}
                                  className={FIELD}
                                />
                              </label>
                              <label className="text-xs font-semibold text-ink-2">
                                Related wedding area
                                <select
                                  value={p.related_area}
                                  onChange={(e) => scheduleSave(p.id, { related_area: e.target.value })}
                                  className={FIELD}
                                >
                                  {CATEGORIES.filter((c) => c !== "DIY").map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="col-span-2 text-xs font-semibold text-ink-2">
                                Instructions / link
                                <input
                                  defaultValue={p.instructions_url}
                                  onChange={(e) => scheduleSave(p.id, { instructions_url: e.target.value })}
                                  placeholder="https://… or where the tutorial lives"
                                  className={FIELD}
                                />
                              </label>
                              {p.instructions_url && (
                                <a href={normalizeUrl(p.instructions_url)} target="_blank" rel="noreferrer" className="col-span-2 -mt-1 flex items-center gap-1 text-xs font-semibold text-sage-deep underline underline-offset-2">
                                  <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                                  Open instructions
                                </a>
                              )}
                              <label className="col-span-2 text-xs font-semibold text-ink-2">
                                Notes
                                <textarea
                                  defaultValue={p.notes}
                                  onChange={(e) => scheduleSave(p.id, { notes: e.target.value })}
                                  rows={2}
                                  className={FIELD}
                                />
                              </label>
                            </div>

                            <div className="mt-3">
                              <p className="text-xs font-semibold text-ink-2">Materials checklist</p>
                              <div className="mt-1 flex flex-col gap-1">
                                {p.materials_checklist.map((item, i) => (
                                  <ChecklistRow key={i} item={item} onToggle={() => toggleChecklist(p, i)} onRemove={() => removeChecklistItem(p, i)} />
                                ))}
                              </div>
                              <AddInline placeholder="Add a material…" onAdd={(v) => addChecklistItem(p, v)} />
                            </div>

                            <div className="mt-3">
                              <p className="text-xs font-semibold text-ink-2">Progress photos</p>
                              {p.progress_photos.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {p.progress_photos.map((url, i) => (
                                    <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-line">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={normalizeUrl(url)} alt="" className="h-full w-full object-cover" />
                                      <button
                                        onClick={() => removePhoto(p, i)}
                                        aria-label="Remove photo"
                                        className="absolute right-0.5 top-0.5 rounded-full bg-bg/90 p-0.5 text-ink-2 opacity-0 group-hover:opacity-100 hover:text-wine"
                                      >
                                        <X className="h-3 w-3" strokeWidth={2} aria-hidden />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <AddInline placeholder="Paste a photo URL…" onAdd={(v) => addPhoto(p, v)} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChecklistRow({ item, onToggle, onRemove }: { item: ChecklistItem; onToggle: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded border border-transparent px-1 py-0.5 hover:border-line hover:bg-paper">
      <input type="checkbox" checked={item.done} onChange={onToggle} className="h-3.5 w-3.5 shrink-0" />
      <span className={`min-w-0 flex-1 truncate text-sm ${item.done ? "text-ink-2 line-through" : "text-ink"}`}>{item.text}</span>
      <button onClick={onRemove} aria-label={`Remove ${item.text}`} className="shrink-0 text-ink-2 hover:text-wine">
        <X className="h-3 w-3" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && value.trim()) {
          onAdd(value.trim());
          setValue("");
        }
      }}
      placeholder={placeholder}
      className="mt-1 w-full rounded border border-dashed border-line bg-transparent px-1.5 py-1 text-sm text-ink-2 outline-none focus:border-sage-deep focus:text-ink"
    />
  );
}
