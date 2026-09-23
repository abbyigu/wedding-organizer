"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, ExternalLink, Heart, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmProvider";
import NavBar from "@/components/NavBar";
import { normalizeUrl } from "@/lib/ideas";
import {
  DIY_AREAS,
  DIY_OWNER_LABELS,
  DIY_OWNER_ORDER,
  DIY_STATUS_LABELS,
  DIY_STATUS_ORDER,
  MATERIAL_STATUS_LABEL,
  materialTotal,
  progressOf,
  projectCost,
  type DiyMaterial,
  type DiyOwner,
  type DiyProject,
  type DiyStatus,
  type MaterialStatus,
} from "@/lib/diy-projects";
import { fmt } from "@/lib/venues";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-sage-deep";
const LABEL = "text-xs font-semibold uppercase tracking-[0.12em] text-ink-2";
const PANEL = "rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6";
const TABS = ["overview", "materials", "steps", "budget", "inspiration", "notes"] as const;
type Tab = (typeof TABS)[number];

export default function DiyProjectDetail({
  initialProject,
  initialMaterials,
  materialsMissing,
  idea,
  userName,
  initialTab,
}: {
  initialProject: DiyProject;
  initialMaterials: DiyMaterial[];
  materialsMissing: boolean;
  idea: { id: string; title: string; image_url: string } | null;
  userName: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const supabase = createClient();
  const [p, setP] = useState(initialProject);
  const [mats, setMats] = useState(initialMaterials);
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "overview");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [stepDraft, setStepDraft] = useState("");
  const [photoDraft, setPhotoDraft] = useState("");
  const pending = useRef<Partial<DiyProject>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function save(patch: Partial<DiyProject>, wait = 700) {
    setP((c) => ({ ...c, ...patch }));
    pending.current = { ...pending.current, ...patch };
    setSaved("Saving…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const out = pending.current;
      pending.current = {};
      const { error } = await supabase.from("diy_projects").update(out).eq("id", p.id);
      if (error) {
        setError(error.message);
        setSaved("");
      } else {
        setSaved("Saved");
        setTimeout(() => setSaved((s) => (s === "Saved" ? "" : s)), 1800);
      }
    }, wait);
  }
  const num = (raw: string) => (raw === "" ? null : Number(raw));

  const setStatus = (status: DiyStatus) => save({ status, finished_at: status === "finished" ? p.finished_at ?? new Date().toISOString() : null }, 0);

  async function addMaterial() {
    setError("");
    const { data, error } = await supabase.from("diy_materials").insert({ project_id: p.id, sort_order: mats.length }).select().single();
    if (error) setError(error.message);
    else setMats((m) => [...m, data as DiyMaterial]);
  }
  function patchMaterial(id: string, patch: Partial<DiyMaterial>, now = false) {
    setMats((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(matTimers.current[key]);
    const run = async () => {
      const { error } = await supabase.from("diy_materials").update(patch).eq("id", id);
      if (error) setError(error.message);
    };
    if (now) void run();
    else matTimers.current[key] = setTimeout(run, 600);
  }
  async function removeMaterial(id: string) {
    setMats((ms) => ms.filter((m) => m.id !== id));
    await supabase.from("diy_materials").delete().eq("id", id);
  }

  async function removeProject() {
    if (!(await confirm(`Remove ${p.title}? Its Planning Board card and materials go with it.`))) return;
    const { error } = await supabase.from("diy_projects").delete().eq("id", p.id);
    if (error) setError(error.message);
    else router.push("/diy");
  }

  const c = projectCost(p, mats);
  const prog = progressOf(p);
  const heroImage = normalizeUrl((p.status === "finished" ? p.progress_photos[p.progress_photos.length - 1] : "") || idea?.image_url || p.reference_image || "");
  const steps = p.materials_checklist;
  const toBuy = mats.filter((m) => m.status === "need");

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-2">
          <Link href="/diy" className="hover:text-wine">DIY Projects</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span className="font-semibold text-wine">{p.title}</span>
        </nav>

        <header className="mt-4 grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
          <div className="flex flex-col justify-center">
            <div className="flex items-start gap-2">
              <input aria-label="Project name" value={p.title} onChange={(e) => save({ title: e.target.value })} className="w-full rounded-lg border border-transparent bg-transparent font-serif text-4xl font-medium tracking-[-0.01em] outline-none focus:border-line sm:text-5xl" />
              <button onClick={() => save({ is_favourite: !p.is_favourite }, 0)} aria-pressed={!!p.is_favourite} aria-label={p.is_favourite ? "Remove favourite" : "Favourite"} className={`mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${FOCUS_RING}`}><Heart className={`h-5 w-5 ${p.is_favourite ? "fill-wine text-wine" : "text-ink-2"}`} strokeWidth={1.5} aria-hidden /></button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
              <label className="flex items-center gap-2">Stage
                <select value={p.status} onChange={(e) => setStatus(e.target.value as DiyStatus)} className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink">{DIY_STATUS_ORDER.map((s) => <option key={s} value={s}>{DIY_STATUS_LABELS[s]}</option>)}</select>
              </label>
              <span>{DIY_OWNER_LABELS[p.owner]}</span>
              {p.deadline && <span>Due {p.deadline}</span>}
              <span role="status" className="text-xs">{saved}</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div role="progressbar" aria-label="Progress" aria-valuenow={Math.round(prog * 100)} aria-valuemin={0} aria-valuemax={100} className="h-2 max-w-sm flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-surface-sage-deep" style={{ width: `${prog * 100}%` }} /></div>
              <span className="text-sm text-ink-2">{Math.round(prog * 100)}% · {fmt(c.spent)} spent of {fmt(c.estimated)}</span>
            </div>
          </div>
          <div className="relative min-h-[10rem] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_25%,var(--paper))]">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <p aria-hidden className="absolute inset-0 flex items-center justify-center -rotate-3 p-4 text-center font-script text-3xl leading-tight text-ink-2">Good ideas start somewhere ♡</p>
            )}
          </div>
        </header>

        <div role="tablist" aria-label="Project sections" className="mt-6 flex gap-x-7 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`shrink-0 border-b-2 pb-3 text-base capitalize ${tab === t ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>{t}</button>
          ))}
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl border border-wine/30 bg-wine/10 px-4 py-3 text-sm text-wine">{error}</p>}

        <div className="mt-6 max-w-5xl">
          {tab === "overview" && (
            <section className={PANEL} aria-label="Overview">
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className={LABEL}>Description</span><textarea rows={2} value={p.description ?? ""} onChange={(e) => save({ description: e.target.value })} placeholder="What are we making?" className={FIELD} /></label>
                <label><span className={LABEL}>Made by</span>
                  <select value={p.owner} onChange={(e) => save({ owner: e.target.value as DiyOwner }, 0)} className={FIELD}>{DIY_OWNER_ORDER.map((o) => <option key={o} value={o}>{DIY_OWNER_LABELS[o]}</option>)}</select>
                </label>
                <label><span className={LABEL}>Connected wedding area</span>
                  <select value={p.related_area} onChange={(e) => save({ related_area: e.target.value }, 0)} className={FIELD}>
                    {[...new Set([...DIY_AREAS, p.related_area])].map((a) => <option key={a}>{a}</option>)}
                  </select>
                </label>
                <label><span className={LABEL}>Quantity needed</span><input type="number" min={0} value={p.quantity ?? ""} onChange={(e) => save({ quantity: num(e.target.value) })} placeholder="e.g. 108" className={FIELD} /></label>
                <label><span className={LABEL}>Completed</span><input type="number" min={0} value={p.qty_done ?? 0} onChange={(e) => save({ qty_done: Number(e.target.value) || 0 })} className={FIELD} /></label>
                <label><span className={LABEL}>Target start</span><input type="date" value={p.start_date ?? ""} onChange={(e) => save({ start_date: e.target.value || null }, 0)} className={FIELD} /></label>
                <label><span className={LABEL}>Due</span><input type="date" value={p.deadline ?? ""} onChange={(e) => save({ deadline: e.target.value || null }, 0)} className={FIELD} /></label>
                <label><span className={LABEL}>Estimated making time (hours)</span><input type="number" min={0} step="0.5" value={p.hours_estimate ?? ""} onChange={(e) => save({ hours_estimate: num(e.target.value) })} placeholder="e.g. 8" className={FIELD} /></label>
                <label><span className={LABEL}>Instructions or tutorial</span><input value={p.instructions_url} onChange={(e) => save({ instructions_url: e.target.value })} placeholder="https://…" className={FIELD} /></label>
              </div>
              {p.instructions_url && <a href={normalizeUrl(p.instructions_url)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-green underline underline-offset-2"><ExternalLink className="h-3.5 w-3.5" aria-hidden />Open instructions</a>}
              <p className="mt-5 text-sm text-ink-2">This project also shows up on the <Link href="/board" className="font-semibold text-green underline underline-offset-2">Planning Board</Link>, and its cost counts toward the <Link href="/budget/builder" className="font-semibold text-green underline underline-offset-2">wedding budget</Link>.</p>
            </section>
          )}

          {tab === "materials" && (
            <section className={PANEL} aria-label="Materials">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div><h2 className="font-serif text-2xl font-medium">Materials</h2><p className="text-sm text-ink-2">Quantity × unit price. Things you already own cost nothing new.</p></div>
                <p className="text-sm text-ink-2">{toBuy.length} to buy</p>
              </div>
              {materialsMissing ? (
                <p className="mt-4 text-sm text-ink-2">Materials need one small database update (migration 043) before they can be saved.</p>
              ) : (
                <>
                  <ul className="mt-4 flex flex-col gap-3">
                    {mats.length === 0 && <li className="text-sm text-ink-2">No materials yet. Add what you need and the budget works out the cost.</li>}
                    {mats.map((m) => (
                      <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-bg/60 p-2 sm:grid-cols-[minmax(0,1.6fr)_4.5rem_5.5rem_6rem_8.5rem_minmax(0,1fr)_auto]">
                        <input aria-label="Material" defaultValue={m.name} onChange={(e) => patchMaterial(m.id, { name: e.target.value })} className={`${FIELD} mt-0`} />
                        <button onClick={() => removeMaterial(m.id)} aria-label={`Remove ${m.name}`} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:text-wine sm:order-last"><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
                        <input aria-label="Quantity" type="number" min={0} step="any" defaultValue={m.qty} onChange={(e) => patchMaterial(m.id, { qty: Number(e.target.value) || 0 })} className={`${FIELD} mt-0`} />
                        <input aria-label="Unit" defaultValue={m.unit} placeholder="unit" onChange={(e) => patchMaterial(m.id, { unit: e.target.value })} className={`${FIELD} mt-0`} />
                        <input aria-label="Unit price" type="number" min={0} step="any" defaultValue={m.unit_price} onChange={(e) => patchMaterial(m.id, { unit_price: Number(e.target.value) || 0 })} className={`${FIELD} mt-0`} />
                        <select aria-label="Status" value={m.status} onChange={(e) => patchMaterial(m.id, { status: e.target.value as MaterialStatus }, true)} className={`${FIELD} mt-0`}>{(Object.keys(MATERIAL_STATUS_LABEL) as MaterialStatus[]).map((k) => <option key={k} value={k}>{MATERIAL_STATUS_LABEL[k]}</option>)}</select>
                        <input aria-label="Store or source" defaultValue={m.source} placeholder="Store" onChange={(e) => patchMaterial(m.id, { source: e.target.value })} className={`${FIELD} mt-0`} />
                        <p className={`col-span-2 text-right text-sm font-semibold sm:hidden ${m.status === "owned" ? "text-ink-2" : ""}`}>{m.status === "owned" ? "Already owned" : fmt(materialTotal(m))}</p>
                      </li>
                    ))}
                  </ul>
                  <button onClick={addMaterial} className={`mt-4 flex items-center gap-1.5 rounded-full border border-ink/25 px-5 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}><Plus className="h-4 w-4" aria-hidden />Add material</button>
                </>
              )}
            </section>
          )}

          {tab === "steps" && (
            <section className={PANEL} aria-label="Steps">
              <h2 className="font-serif text-2xl font-medium">Steps</h2>
              <p className="text-sm text-ink-2">{p.quantity ? "Progress follows the quantity you've made." : "Ticking steps moves the progress bar."}</p>
              <ul className="mt-4 flex flex-col gap-1">
                {steps.length === 0 && <li className="text-sm text-ink-2">No steps yet.</li>}
                {steps.map((s, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <button role="checkbox" aria-checked={s.done} aria-label={s.text} onClick={() => save({ materials_checklist: steps.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) }, 0)} className="-m-1 flex h-10 w-10 shrink-0 items-center justify-center"><span className={`flex h-5 w-5 items-center justify-center rounded border ${s.done ? "border-transparent bg-surface-olive text-white" : "border-ink-2"}`}>{s.done && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}</span></button>
                    <span className={`min-w-0 flex-1 text-sm ${s.done ? "text-ink-2 line-through" : ""}`}>{s.text}</span>
                    <button onClick={() => save({ materials_checklist: steps.filter((_, j) => j !== i) }, 0)} aria-label={`Remove ${s.text}`} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:text-wine"><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
                  </li>
                ))}
              </ul>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!stepDraft.trim()) return; save({ materials_checklist: [...steps, { text: stepDraft.trim(), done: false }] }, 0); setStepDraft(""); }}>
                <input aria-label="Add a step" value={stepDraft} onChange={(e) => setStepDraft(e.target.value)} placeholder="Add a step…" className={`${FIELD} mt-0`} />
                <button className="shrink-0 rounded-full bg-surface-green px-5 py-2.5 text-sm font-semibold text-white">Add</button>
              </form>
            </section>
          )}

          {tab === "budget" && (
            <section className={PANEL} aria-label="Budget">
              <h2 className="font-serif text-2xl font-medium">Budget</h2>
              <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
                <div className="bg-paper p-4"><p className="font-serif text-3xl font-medium">{fmt(c.estimated)}</p><p className="text-ink-2">Estimated</p></div>
                <div className="bg-paper p-4"><p className="font-serif text-3xl font-medium">{fmt(c.spent)}</p><p className="text-ink-2">Spent</p></div>
                <div className="bg-paper p-4"><p className="font-serif text-3xl font-medium">{fmt(c.remaining)}</p><p className="text-ink-2">Remaining</p></div>
              </div>
              {c.fromMaterials ? (
                <ul className="mt-4 divide-y divide-line text-sm">
                  {mats.map((m) => (
                    <li key={m.id} className="flex items-baseline justify-between gap-3 py-2"><span className="min-w-0">{m.name} <span className="text-ink-2">· {MATERIAL_STATUS_LABEL[m.status]}</span></span><span className="shrink-0 font-semibold">{m.status === "owned" ? "—" : fmt(materialTotal(m))}</span></li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <p className="text-sm text-ink-2 sm:col-span-2">No materials listed, so this uses the numbers you enter here. Add materials and they take over automatically.</p>
                  <label><span className={LABEL}>Estimated cost ($)</span><input type="number" min={0} step="0.01" value={p.cost_estimate ?? ""} onChange={(e) => save({ cost_estimate: num(e.target.value) })} className={FIELD} /></label>
                  <label><span className={LABEL}>Actual cost ($)</span><input type="number" min={0} step="0.01" value={p.cost_actual ?? ""} onChange={(e) => save({ cost_actual: num(e.target.value) })} className={FIELD} /></label>
                </div>
              )}
              <p className="mt-4 text-sm text-ink-2">Counts toward <Link href="/budget/builder" className="font-semibold text-green underline underline-offset-2">Budget → DIY projects</Link>. You only enter it here.</p>
            </section>
          )}

          {tab === "inspiration" && (
            <section className={PANEL} aria-label="Inspiration">
              <h2 className="font-serif text-2xl font-medium">Inspiration</h2>
              {idea ? (
                <div className="mt-3 flex items-center gap-4">
                  {idea.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={normalizeUrl(idea.image_url)} alt="" className="h-24 w-24 rounded-xl object-cover" />
                  )}
                  <p className="text-sm">Inspired by <Link href="/ideas" className="font-semibold text-green underline underline-offset-2">{idea.title}</Link> on your Inspiration Board.</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-2">Not linked to an inspiration idea yet. On the Inspiration Board, choose “Create DIY project” on an idea and it will be linked here.</p>
              )}
              <label className="mt-4 block"><span className={LABEL}>Reference image link</span><input type="url" value={p.reference_image} onChange={(e) => save({ reference_image: e.target.value })} placeholder="https://…" className={FIELD} /></label>
              <h3 className="mt-6 text-sm font-semibold">Progress photos</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {p.progress_photos.map((url, i) => (
                  <li key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={normalizeUrl(url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <button onClick={() => save({ progress_photos: p.progress_photos.filter((_, j) => j !== i) }, 0)} aria-label="Remove photo" className={`absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-ink-2 hover:text-wine ${FOCUS_RING}`}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper/90"><X className="h-3.5 w-3.5" aria-hidden /></span></button>
                  </li>
                ))}
              </ul>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!photoDraft.trim()) return; save({ progress_photos: [...p.progress_photos, photoDraft.trim()] }, 0); setPhotoDraft(""); }}>
                <input aria-label="Photo link" type="url" value={photoDraft} onChange={(e) => setPhotoDraft(e.target.value)} placeholder="Paste a photo link…" className={`${FIELD} mt-0`} />
                <button className="shrink-0 rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:bg-bg">Add</button>
              </form>
            </section>
          )}

          {tab === "notes" && (
            <section className={PANEL} aria-label="Notes">
              <h2 className="font-serif text-2xl font-medium">Notes</h2>
              <label className="mt-3 block"><span className="sr-only">Notes</span><textarea rows={10} value={p.notes} onChange={(e) => save({ notes: e.target.value })} className={FIELD} /></label>
            </section>
          )}
        </div>

        <div className="mt-8"><button onClick={removeProject} className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-wine hover:bg-paper ${FOCUS_RING}`}><Trash2 className="h-4 w-4" aria-hidden />Remove this project</button></div>
      </main>
    </div>
  );
}
