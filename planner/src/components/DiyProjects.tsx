"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CircleCheck, Heart, Lightbulb, List, Plus, Search, ShoppingCart, SquareKanban, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { normalizeUrl } from "@/lib/ideas";
import {
  blankDiyProject,
  DIY_OWNER_LABELS,
  DIY_STATUS_LABELS,
  DIY_STATUS_ORDER,
  hoursOf,
  MATERIAL_STATUS_LABEL,
  materialTotal,
  progressOf,
  projectCost,
  type DiyMaterial,
  type DiyProject,
  type DiyStatus,
} from "@/lib/diy-projects";
import { fmt } from "@/lib/venues";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const STAGE: Record<DiyStatus, { Icon: typeof Lightbulb; tint: string; empty: string }> = {
  idea: { Icon: Lightbulb, tint: "color-mix(in srgb, var(--surface-blush) 12%, var(--paper))", empty: "Ideas you want to try land here." },
  materials_needed: { Icon: ShoppingCart, tint: "color-mix(in srgb, var(--gold) 12%, var(--paper))", empty: "Nothing to shop for yet." },
  making: { Icon: Wrench, tint: "color-mix(in srgb, var(--sage) 16%, var(--paper))", empty: "Ready when you are." },
  finished: { Icon: CircleCheck, tint: "color-mix(in srgb, var(--surface-olive) 10%, var(--paper))", empty: "Your finished creations will live here ♡" },
};
const SORTS = [
  ["custom", "Custom"],
  ["due", "Due date"],
  ["cost", "Cost"],
  ["progress", "Progress"],
  ["updated", "Recently updated"],
] as const;
type Sort = (typeof SORTS)[number][0];
type View = "board" | "list" | "shopping";

const shortDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

export default function DiyProjects({
  initialProjects,
  initialMaterials,
  materialsMissing,
  ideas,
  userName,
}: {
  initialProjects: DiyProject[];
  initialMaterials: DiyMaterial[];
  materialsMissing: boolean;
  ideas: { id: string; title: string; image_url: string }[];
  userName: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [projects, setProjects] = useState(initialProjects);
  const [materials, setMaterials] = useState(initialMaterials);
  const [view, setView] = useState<View>("board");
  const [filter, setFilter] = useState<"all" | DiyStatus>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("custom");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<DiyStatus | null>(null);
  const [error, setError] = useState("");

  const matsOf = (id: string) => materials.filter((m) => m.project_id === id);
  const costOf = (p: DiyProject) => projectCost(p, matsOf(p.id));
  const imageOf = (p: DiyProject) => {
    const own = p.status === "finished" ? p.progress_photos[p.progress_photos.length - 1] : "";
    return normalizeUrl(own || ideas.find((i) => i.id === p.idea_pin_id)?.image_url || p.reference_image || "");
  };

  const q = query.trim().toLowerCase();
  const visible = projects.filter((p) => (filter === "all" || p.status === filter) && (!q || `${p.title} ${p.related_area} ${p.category} ${p.notes}`.toLowerCase().includes(q)));
  const ordered = (list: DiyProject[]) => {
    const l = [...list];
    if (sort === "due") l.sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
    if (sort === "cost") l.sort((a, b) => costOf(b).estimated - costOf(a).estimated);
    if (sort === "progress") l.sort((a, b) => progressOf(b) - progressOf(a));
    if (sort === "updated") l.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return l;
  };

  const totals = projects.reduce(
    (t, p) => {
      const c = costOf(p);
      return { estimated: t.estimated + c.estimated, spent: t.spent + c.spent, hours: t.hours + (p.status === "finished" ? 0 : hoursOf(p) * (1 - progressOf(p))) };
    },
    { estimated: 0, spent: 0, hours: 0 },
  );

  async function addProject(status: DiyStatus) {
    setError("");
    const count = projects.filter((p) => p.status === status).length;
    const { data, error } = await supabase.from("diy_projects").insert(blankDiyProject(status, count)).select().single();
    if (error) return setError(error.message);
    router.push(`/diy/${(data as DiyProject).id}`);
  }

  async function moveTo(id: string, status: DiyStatus) {
    const cur = projects.find((p) => p.id === id);
    if (!cur || cur.status === status) return;
    const patch = { status, finished_at: status === "finished" ? new Date().toISOString() : null };
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from("diy_projects").update(patch).eq("id", id);
    if (error) setError(error.message);
  }

  async function toggleFavourite(p: DiyProject) {
    setProjects((ps) => ps.map((x) => (x.id === p.id ? { ...x, is_favourite: !p.is_favourite } : x)));
    const { error } = await supabase.from("diy_projects").update({ is_favourite: !p.is_favourite }).eq("id", p.id);
    if (error) setError(error.message);
  }

  async function buy(m: DiyMaterial) {
    setMaterials((ms) => ms.map((x) => (x.id === m.id ? { ...x, status: "purchased" } : x)));
    const { error } = await supabase.from("diy_materials").update({ status: "purchased" }).eq("id", m.id);
    if (error) setError(error.message);
  }

  function card(p: DiyProject) {
    const c = costOf(p);
    const prog = progressOf(p);
    const img = imageOf(p);
    const steps = p.materials_checklist;
    const tags = [...new Set([p.related_area, p.category].filter((t) => t && t !== "Other" && t !== "DIY"))];
    const done = p.status === "finished";
    return (
      <li
        key={p.id}
        draggable
        onDragStart={() => setDragId(p.id)}
        onDragEnd={() => {
          setDragId(null);
          setOverCol(null);
        }}
        className={`group relative overflow-hidden rounded-xl border border-line bg-paper shadow-sm ${dragId === p.id ? "opacity-50" : ""}`}
      >
        {img && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" loading="lazy" draggable={false} className={`w-full object-cover ${done ? "h-40" : "h-32"}`} />
          </div>
        )}
        <button
          onClick={() => toggleFavourite(p)}
          aria-label={p.is_favourite ? `Remove ${p.title} from favourites` : `Favourite ${p.title}`}
          aria-pressed={!!p.is_favourite}
          className={`absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-paper/90 shadow-sm ${FOCUS_RING}`}
        >
          <Heart className={`h-4 w-4 ${p.is_favourite ? "fill-wine text-wine" : "text-ink-2"}`} strokeWidth={1.5} aria-hidden />
        </button>
        <div className="p-3.5">
          <h3 className="font-serif text-lg font-medium leading-snug">
            <Link href={`/diy/${p.id}`} className={`after:absolute after:inset-0 ${FOCUS_RING}`}>{p.title}</Link>
            {done && <span className="ml-1 text-sage-deep" aria-label="finished">✓</span>}
          </h3>
          {tags.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">{tags.map((t) => <li key={t} className="rounded-full bg-bg px-2.5 py-0.5 text-xs text-ink-2">{t}</li>)}</ul>
          )}
          {p.description && !done && <p className="mt-2 line-clamp-2 text-sm text-ink-2">{p.description}</p>}

          {p.quantity ? (
            <p className="mt-3 text-sm font-semibold">{done ? p.quantity : p.qty_done ?? 0} / {p.quantity} made</p>
          ) : null}
          {(p.quantity || steps.length > 0) && !done && (
            <div className="mt-1.5 flex items-center gap-2">
              <div role="progressbar" aria-label="Progress" aria-valuenow={Math.round(prog * 100)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-surface-sage-deep" style={{ width: `${prog * 100}%` }} /></div>
              <span className="text-xs text-ink-2">{Math.round(prog * 100)}%</span>
            </div>
          )}

          {done ? (
            <div className="mt-2 text-sm">
              {p.finished_at && <p className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-xs font-semibold text-sage-deep"><Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />Finished {shortDate(p.finished_at)}</p>}
              {c.spent > 0 && (
                <p className="mt-2 text-ink-2">
                  {fmt(c.spent)} spent
                  {c.estimated > 0 && c.estimated !== c.spent && <span className={c.spent <= c.estimated ? " text-sage-deep" : " text-wine"}> · {fmt(Math.abs(c.estimated - c.spent))} {c.spent <= c.estimated ? "under" : "over"} estimate</span>}
                </p>
              )}
            </div>
          ) : (
            <>
              {c.estimated > 0 && <p className="mt-2 text-sm text-ink-2">{fmt(c.spent)} spent / {fmt(c.estimated)} estimated</p>}
              {p.deadline && <p className="mt-0.5 text-sm text-ink-2">Due {shortDate(p.deadline)}</p>}
              {steps.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {steps.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span aria-hidden className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${s.done ? "border-transparent bg-surface-olive text-white" : "border-ink-2"}`}>{s.done && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                      <span className={`truncate ${s.done ? "text-ink-2 line-through" : ""}`}>{s.text}<span className="sr-only">{s.done ? " (done)" : ""}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p className="mt-3 flex items-center justify-between text-xs text-ink-2">
            <span className="rounded-full border border-line px-2.5 py-0.5 font-semibold">{DIY_OWNER_LABELS[p.owner]}</span>
            {matsOf(p.id).length > 0 && <span>{matsOf(p.id).length} material{matsOf(p.id).length === 1 ? "" : "s"}</span>}
          </p>
        </div>
      </li>
    );
  }

  const columns = DIY_STATUS_ORDER.filter((s) => filter === "all" || s === filter);
  const toBuy = materials.filter((m) => m.status === "need" && projects.some((p) => p.id === m.project_id && p.status !== "finished"));

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="relative flex flex-wrap items-start justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.webp" alt="" aria-hidden className="pointer-events-none absolute -left-3 top-0 hidden h-20 w-auto -rotate-12 -scale-x-100 opacity-50 sm:block" />
          <div className="sm:pl-16">
            <h1 className="font-serif text-4xl font-medium tracking-[-0.01em] sm:text-5xl">DIY Projects</h1>
            <p className="mt-2 max-w-xl text-lg text-ink-2">Where ideas become real — cost, materials, and progress for everything you&apos;re making.</p>
            <p className="mt-1 text-sm text-ink-2">Every project also shows up on the Planning Board under the DIY category.</p>
          </div>
          <p aria-hidden className="pointer-events-none hidden -rotate-6 font-script text-3xl leading-tight text-ink-2 xl:block">Small details<br />make a big day ♡</p>
          <button onClick={() => addProject("idea")} className={`flex items-center gap-2 rounded-full bg-surface-green px-5 py-3 text-sm font-semibold text-white ${FOCUS_RING}`}><Plus className="h-4 w-4" aria-hidden />New DIY Project</button>
        </header>

        <p className="mt-5 text-sm text-ink-2" aria-label="Summary">
          <b className="font-semibold text-ink">{projects.length}</b> project{projects.length === 1 ? "" : "s"} · <b className="font-semibold text-ink">{fmt(totals.estimated)}</b> estimated · <b className="font-semibold text-ink">{fmt(totals.spent)}</b> spent
          {totals.hours > 0 && <> · about <b className="font-semibold text-ink">{Math.round(totals.hours)}</b> hours of making left</>}
        </p>
        {error && <p role="alert" className="mt-2 text-sm text-wine">{error}</p>}
        {materialsMissing && <p className="mt-2 text-sm text-ink-2">Materials, quantities and hours need one small database update (migration 043).</p>}

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-3">
          <div role="group" aria-label="Filter by stage" className="flex flex-wrap gap-2">
            {(["all", ...DIY_STATUS_ORDER] as const).map((s) => {
              const n = s === "all" ? projects.length : projects.filter((p) => p.status === s).length;
              return (
                <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)} className={`rounded-full border px-4 py-2.5 text-sm font-semibold ${filter === s ? "border-surface-green bg-surface-green text-white" : "border-line bg-paper hover:bg-bg"} ${FOCUS_RING}`}>
                  {s === "all" ? "All" : DIY_STATUS_LABELS[s]} ({n})
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-sm focus-within:ring-2 focus-within:ring-sage-deep">
              <Search className="h-4 w-4 text-ink-2" aria-hidden />
              <input aria-label="Search projects" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" className="w-36 bg-transparent outline-none placeholder:text-ink-2" />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-2">Sort by:
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-line bg-paper px-3 py-2.5 text-sm font-semibold text-ink">{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </label>
            <div role="group" aria-label="View" className="flex rounded-full border border-line bg-paper p-1">
              {([["board", SquareKanban, "Board"], ["list", List, "List"], ["shopping", ShoppingCart, "Shopping list"]] as const).map(([k, Icon, label]) => (
                <button key={k} aria-pressed={view === k} aria-label={label} title={label} onClick={() => setView(k)} className={`flex h-10 w-10 items-center justify-center rounded-full ${view === k ? "bg-surface-green text-white" : "text-ink-2 hover:text-ink"} ${FOCUS_RING}`}><Icon className="h-4 w-4" aria-hidden /></button>
              ))}
            </div>
          </div>
        </div>

        {view === "board" && (
          <div className={`mt-6 grid gap-4 ${columns.length === 1 ? "" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
            {columns.map((status) => {
              const { Icon, tint, empty } = STAGE[status];
              const items = ordered(visible.filter((p) => p.status === status));
              return (
                <section
                  key={status}
                  aria-label={DIY_STATUS_LABELS[status]}
                  onDragOver={(e) => {
                    if (dragId) {
                      e.preventDefault();
                      setOverCol(status);
                    }
                  }}
                  onDrop={() => {
                    if (dragId) void moveTo(dragId, status);
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={`flex flex-col gap-3 rounded-2xl border p-3 ${overCol === status ? "border-wine" : "border-line"}`}
                  style={{ backgroundColor: tint }}
                >
                  <div className="flex items-center justify-between px-1">
                    <h2 className="flex items-center gap-2 font-serif text-lg font-medium"><Icon className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden />{DIY_STATUS_LABELS[status]}</h2>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-ink-2">{items.length}</span>
                      <button onClick={() => addProject(status)} aria-label={`Add a project to ${DIY_STATUS_LABELS[status]}`} className={`flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-paper hover:text-ink ${FOCUS_RING}`}><Plus className="h-4 w-4" aria-hidden /></button>
                    </div>
                  </div>
                  {items.length === 0 ? (
                    <p className="px-2 py-8 text-center font-script text-2xl leading-tight text-ink-2">{empty}</p>
                  ) : (
                    <ul className="flex flex-col gap-3">{items.map(card)}</ul>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {view === "list" && (
          <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
            {ordered(visible).length === 0 && <li className="p-6 text-center text-sm text-ink-2">No projects match.</li>}
            {ordered(visible).map((p) => {
              const c = costOf(p);
              return (
                <li key={p.id} className="relative flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 sm:px-5">
                  <div className="min-w-[10rem] flex-1">
                    <Link href={`/diy/${p.id}`} className={`font-serif text-lg font-medium after:absolute after:inset-0 ${FOCUS_RING}`}>{p.title}</Link>
                    <p className="text-sm text-ink-2">{DIY_STATUS_LABELS[p.status]} · {DIY_OWNER_LABELS[p.owner]}{p.deadline ? ` · due ${shortDate(p.deadline)}` : ""}</p>
                  </div>
                  <span className="w-14 text-sm text-ink-2">{Math.round(progressOf(p) * 100)}%</span>
                  <span className="w-40 text-right text-sm">{c.estimated > 0 ? `${fmt(c.spent)} / ${fmt(c.estimated)}` : "—"}</span>
                </li>
              );
            })}
          </ul>
        )}

        {view === "shopping" && (
          <section className="mt-6 rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6" aria-label="DIY shopping list">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div><h2 className="font-serif text-2xl font-medium">DIY Shopping List</h2><p className="text-sm text-ink-2">Everything still to buy, across all your projects.</p></div>
              {toBuy.length > 0 && <p className="text-sm text-ink-2">About <b className="font-semibold text-ink">{fmt(toBuy.reduce((t, m) => t + materialTotal(m), 0))}</b> to spend</p>}
            </div>
            {toBuy.length === 0 ? (
              <p className="mt-6 py-6 text-center font-script text-2xl text-ink-2">Nothing to shop for yet.</p>
            ) : (
              projects.filter((p) => toBuy.some((m) => m.project_id === p.id)).map((p) => (
                <div key={p.id} className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-2"><Link href={`/diy/${p.id}?tab=materials`} className="hover:text-wine">{p.title}</Link></h3>
                  <ul className="mt-1 divide-y divide-line">
                    {toBuy.filter((m) => m.project_id === p.id).map((m) => (
                      <li key={m.id} className="flex items-center gap-3 py-1.5 text-sm">
                        <button role="checkbox" aria-checked={false} aria-label={`Mark ${m.name} as purchased`} onClick={() => buy(m)} className="-m-1 flex h-10 w-10 shrink-0 items-center justify-center"><span className="h-5 w-5 rounded border border-ink-2" /></button>
                        <span className="min-w-0 flex-1">{m.name}<span className="text-ink-2"> · {m.qty}{m.unit ? ` ${m.unit}` : ""}{m.source ? ` · ${m.source}` : ""}</span></span>
                        <span className="shrink-0 font-semibold">{fmt(materialTotal(m))}</span>
                        <span className="sr-only">{MATERIAL_STATUS_LABEL[m.status]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}
