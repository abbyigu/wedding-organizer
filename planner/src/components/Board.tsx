"use client";

import { useDialog } from "@/lib/use-dialog";
import { useConfirm } from "@/components/ConfirmProvider";
import { useMemo, useRef, useState } from "react";
import { CalendarDays, CalendarRange, CircleCheck, CircleHelp, Clock, Ellipsis, Hourglass, Leaf, Lightbulb, GanttChart, LayoutGrid, List as ListIcon, Plus, Search, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import Link from "next/link";
import Timeline from "@/components/Timeline";
import NewTaskDialog, { type NewTask } from "@/components/NewTaskDialog";
import { decorRows, planRows, recalcUpdates } from "@/lib/planning-timeline";
import { blankDiyProject } from "@/lib/diy-projects";
import DashboardTopBar, { type Notice, type SearchItem } from "@/components/DashboardTopBar";
import {
  blankTask,
  CATEGORIES,
  categoryColor,
  formatDueDate,
  isDueSoon,
  partnerOf,
  STATUS_LABELS,
  STATUS_ORDER,
  TAGS,
  type Assignee,
  type PlanningTask,
  type Priority,
  type TaskStatus,
} from "@/lib/planning-tasks";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const ASSIGNEE_LABELS: Record<Assignee, string> = { ariel: "Ariel", fred: "Fred", together: "Together" };

// Each column gets its own very pale identity, so an empty board still reads as designed.
const COLUMN: Record<TaskStatus, { tint: string; script: string; sub?: string }> = {
  ideas: { tint: "var(--gold)", script: "Dream it up here", sub: "All ideas welcome" },
  todo: { tint: "var(--surface-blush)", script: "Small steps, big moments" },
  in_progress: { tint: "var(--gold)", script: "Making progress" },
  waiting: { tint: "var(--surface-rose)", script: "Good things take time" },
  decision_needed: { tint: "var(--wine)", script: "Let's decide together" },
  done: { tint: "var(--sage)", script: "One step closer" },
};

const DATE_FILTERS = [
  ["all", "All dates"],
  ["week", "Due this week"],
  ["overdue", "Overdue"],
  ["none", "No date"],
] as const;
type DateFilter = (typeof DATE_FILTERS)[number][0];

const TOOLBAR_SELECT = `rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink ${FOCUS_RING}`;

function Avatars({ value }: { value: Assignee }) {
  const dot = (letter: string, key: string) => (
    <span
      key={key}
      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-paper bg-surface-sage-deep text-xs font-semibold text-white"
    >
      {letter}
    </span>
  );
  if (value === "together") {
    return (
      <span className="flex -space-x-2">
        {dot("A", "a")}
        {dot("F", "f")}
      </span>
    );
  }
  return dot(value === "ariel" ? "A" : "F", value);
}

export default function Board({ initialTasks, userName, daysToGo, weddingDate, vendors, initialView = "board" }: { initialTasks: PlanningTask[]; userName: string; daysToGo: number; weddingDate: string; vendors: { id: string; name: string }[]; initialView?: "board" | "timeline" | "list" }) {
  const confirm = useConfirm();
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState("");
  const [view, setView] = useState<"board" | "timeline" | "list">(initialView);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | Assignee>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ status: TaskStatus; index: number } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [moreOpenId, setMoreOpenId] = useState<string | null>(null);
  const [moreOpenPos, setMoreOpenPos] = useState<{ top: number; left: number } | null>(null);
  const [moveSubmenu, setMoveSubmenu] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const partner = partnerOf(userName);
  const today = new Date().toLocaleDateString("en-CA");
  const open = tasks.find((t) => t.id === openId) ?? null;
  const dialogRef = useDialog(Boolean(open), () => setOpenId(null));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !`${t.title} ${t.notes}`.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (assigneeFilter !== "all" && t.assigned_to !== assigneeFilter) return false;
      if (dateFilter === "week" && !isDueSoon(t.due_date)) return false;
      if (dateFilter === "overdue" && !(t.due_date && t.due_date < today && t.status !== "done")) return false;
      if (dateFilter === "none" && t.due_date) return false;
      return true;
    });
  }, [tasks, search, categoryFilter, assigneeFilter, dateFilter, today]);

  function columnItems(status: TaskStatus) {
    return filtered.filter((t) => t.status === status).sort((a, b) => a.sort_order - b.sort_order);
  }

  async function persistOrder(items: PlanningTask[]) {
    const supabase = createClient();
    await Promise.all(items.map((t) => supabase.from("planning_tasks").update({ status: t.status, sort_order: t.sort_order }).eq("id", t.id)));
  }

  function moveTask(id: string, toStatus: TaskStatus, toIndex: number) {
    setTasks((prev) => {
      const moving = prev.find((t) => t.id === id);
      if (!moving) return prev;
      const rest = prev.filter((t) => t.id !== id);
      const destItems = rest.filter((t) => t.status === toStatus).sort((a, b) => a.sort_order - b.sort_order);
      const clamped = Math.max(0, Math.min(toIndex, destItems.length));
      destItems.splice(clamped, 0, { ...moving, status: toStatus });
      const renumbered = destItems.map((t, i) => ({ ...t, sort_order: i }));
      const others = rest.filter((t) => t.status !== toStatus);
      persistOrder(renumbered);
      return [...others, ...renumbered];
    });
  }

  function handleDragOver(e: React.DragEvent, status: TaskStatus, items: PlanningTask[]) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const cards = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-card]")];
    let index = items.length;
    for (let i = 0; i < cards.length; i++) {
      const cardRect = cards[i].getBoundingClientRect();
      const mid = cardRect.top - rect.top + cardRect.height / 2;
      if (y < mid) {
        index = i;
        break;
      }
    }
    setDragOver({ status, index });
  }

  function handleDrop(status: TaskStatus) {
    if (draggingId && dragOver) moveTask(draggingId, status, dragOver.index);
    setDraggingId(null);
    setDragOver(null);
  }

  async function addTask(status: TaskStatus, category = "Other") {
    setError("");
    const supabase = createClient();
    const count = tasks.filter((t) => t.status === status).length;
    const { data, error } = await supabase
      .from("planning_tasks")
      .insert(blankTask(status, { assigned_to: "together", sort_order: count, category }))
      .select()
      .single();
    if (error) setError(error.message);
    else if (data) {
      setTasks((ts) => [...ts, data as PlanningTask]);
      setOpenId((data as PlanningTask).id);
    }
  }

  function patchLocal(id: string, patch: Partial<PlanningTask>) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function save(id: string, patch: Partial<PlanningTask>) {
    const supabase = createClient();
    const { error } = await supabase.from("planning_tasks").update(patch).eq("id", id);
    if (error) setError(error.message);
  }

  function scheduleSave(id: string, patch: Partial<PlanningTask>) {
    patchLocal(id, patch);
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => save(id, patch), 700);
  }

  async function saveNow(id: string, patch: Partial<PlanningTask>) {
    patchLocal(id, patch);
    await save(id, patch);
  }

  async function removeTask(id: string) {
    if (!(await confirm("Delete this task?"))) return;
    setTasks((ts) => ts.filter((t) => t.id !== id));
    if (openId === id) setOpenId(null);
    const supabase = createClient();
    await supabase.from("planning_tasks").delete().eq("id", id);
  }

  // ---- Timeline actions: the same rows, arranged by WHEN ----
  function toggleDone(t: PlanningTask) {
    saveNow(t.id, { status: t.status === "done" ? "todo" : "done" });
  }

  async function createTimelineTask(nt: NewTask): Promise<string | null> {
    const supabase = createClient();
    if (nt.isDiy) {
      // A DIY project is the record; a trigger mirrors it onto the Planning Board (no duplicates).
      const diyStatus = { ideas: "idea", todo: "materials_needed", in_progress: "making", done: "finished" }[nt.status as string] ?? "idea";
      const { data: proj, error: e1 } = await supabase
        .from("diy_projects")
        .insert({ ...blankDiyProject("idea", 0), title: nt.title, notes: nt.notes, deadline: nt.due_date, owner: nt.assigned_to, status: diyStatus })
        .select()
        .single();
      if (e1 || !proj) return e1?.message ?? "Couldn't create the DIY project.";
      const { data: mirrored, error: e2 } = await supabase
        .from("planning_tasks")
        .update({ start_date: nt.start_date, date_manual: Boolean(nt.due_date) })
        .eq("diy_project_id", proj.id)
        .select()
        .single();
      if (e2 || !mirrored) return e2?.message ?? "The DIY project was created but didn't reach the Planning Board.";
      setTasks((ts) => [...ts, mirrored as PlanningTask]);
      return null;
    }
    const { data, error } = await supabase
      .from("planning_tasks")
      .insert(blankTask(nt.status, { title: nt.title, category: nt.category, assigned_to: nt.assigned_to, notes: nt.notes, due_date: nt.due_date, sort_order: tasks.length, ...(nt.due_date ? { date_manual: true } : {}) }))
      .select()
      .single();
    if (error) return error.message;
    setTasks((ts) => [...ts, data as PlanningTask]);
    return null;
  }

  async function seed(kind: "plan" | "decor") {
    setBusy(kind);
    setError("");
    const keys = new Set(tasks.map((t) => t.template_key).filter((k): k is string => Boolean(k)));
    const rows = kind === "plan" ? planRows(weddingDate, keys) : decorRows(keys);
    const { data, error } = await createClient().from("planning_tasks").insert(rows).select();
    if (error) setError(error.message);
    else setTasks((ts) => [...ts, ...((data ?? []) as PlanningTask[])]);
    setBusy("");
  }

  async function recalc() {
    setBusy("recalc");
    const supabase = createClient();
    const updates = recalcUpdates(tasks, weddingDate);
    const results = await Promise.all(updates.map(({ id, ...patch }) => supabase.from("planning_tasks").update(patch).eq("id", id)));
    const failed = results.find((r) => r.error);
    if (failed?.error) setError(failed.error.message);
    else setTasks((ts) => ts.map((t) => { const u = updates.find((x) => x.id === t.id); return u ? { ...t, due_date: u.due_date, start_date: u.start_date, suggested_for: u.suggested_for } : t; }));
    setBusy("");
  }

  function openMenu(e: React.MouseEvent, id: string) {
    if (moreOpenId === id) {
      setMoreOpenId(null);
      setMoveSubmenu(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMoreOpenPos({ top: rect.bottom + 4, left: rect.right - 176 });
    setMoreOpenId(id);
    setMoveSubmenu(false);
  }

  function taskCard(t: PlanningTask) {
    const dragging = draggingId === t.id;
    const done = t.status === "done";
    return (
      <div
        key={t.id}
        data-card
        draggable
        onDragStart={() => setDraggingId(t.id)}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOver(null);
        }}
        className={`rounded-xl border border-line bg-paper p-4 shadow-sm transition-[opacity,box-shadow] ${
          dragging ? "opacity-40" : "hover:shadow-md"
        } ${done ? "bg-[color-mix(in_srgb,var(--sage)_14%,var(--paper))]" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            {done && <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-sage-deep" strokeWidth={1.75} aria-hidden />}
            <button
              onClick={() => setOpenId(t.id)}
              className={`block min-w-0 rounded text-left text-[15px] font-medium leading-snug ${FOCUS_RING} ${done ? "text-ink-2 line-through decoration-ink-2/50" : "text-ink"}`}
            >
              {t.title}
            </button>
          </div>
          <button
            onClick={(e) => openMenu(e, t.id)}
            aria-label="Task actions"
            aria-expanded={moreOpenId === t.id}
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-ink pointer-coarse:h-11 pointer-coarse:w-11"
          >
            <Ellipsis className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        {t.due_date ? (
          <p className={`mt-1.5 text-sm ${done ? "pl-[30px] text-ink-2" : "text-ink-2"}`}>{formatDueDate(t.due_date, true)}</p>
        ) : t.effort ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-2">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            {t.effort}
          </p>
        ) : null}
        {t.notes && !done && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{t.notes}</p>}

        {!done && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span
              className="rounded-md px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-ink"
              style={{ background: `color-mix(in srgb, ${categoryColor(t.category)} 24%, var(--paper))` }}
            >
              {t.category}
            </span>
            <span className="flex items-center gap-2">
              {t.priority === "high" && <span className="text-xs font-semibold text-wine">High priority</span>}
              {t.status === "ideas" ? (
                <Lightbulb className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-label="Idea" />
              ) : t.status === "waiting" ? (
                <Hourglass className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-label="Waiting" />
              ) : (
                <Avatars value={t.assigned_to} />
              )}
            </span>
          </div>
        )}

        {moreOpenId === t.id && moreOpenPos && (
          <>
            <button
              aria-label="Close menu"
              onClick={() => {
                setMoreOpenId(null);
                setMoveSubmenu(false);
              }}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div style={{ top: moreOpenPos.top, left: moreOpenPos.left }} className="fixed z-50 w-44 overflow-hidden rounded-xl border border-line bg-paper shadow-md">
              {!moveSubmenu ? (
                <>
                  <button
                    onClick={() => {
                      setMoreOpenId(null);
                      setOpenId(t.id);
                    }}
                    className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm font-semibold text-ink hover:bg-bg"
                  >
                    Edit
                  </button>
                  <button onClick={() => setMoveSubmenu(true)} className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm font-semibold text-ink hover:bg-bg">
                    Move to…
                  </button>
                  <button
                    onClick={() => {
                      setMoreOpenId(null);
                      removeTask(t.id);
                    }}
                    className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm font-semibold text-wine hover:bg-bg"
                  >
                    Delete
                  </button>
                </>
              ) : (
                STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setMoreOpenId(null);
                      setMoveSubmenu(false);
                      moveTask(t.id, s, columnItems(s).length);
                    }}
                    disabled={s === t.status}
                    className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm font-semibold text-ink hover:bg-bg disabled:text-ink-2"
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const listSorted = [...filtered].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return a.created_at.localeCompare(b.created_at);
  });

  const count = (st: TaskStatus) => tasks.filter((t) => t.status === st).length;
  const stats = [
    { n: count("done"), label: "Completed", Icon: Leaf, tint: "var(--sage)" },
    { n: count("todo"), label: "To do", Icon: CircleCheck, tint: "var(--surface-blush)" },
    { n: count("in_progress"), label: "In progress", Icon: Clock, tint: "var(--gold)" },
    { n: count("waiting"), label: "Waiting", Icon: Users, tint: "var(--surface-rose)" },
    { n: count("decision_needed"), label: "Decision needed", Icon: CircleHelp, tint: "var(--wine)" },
    { n: daysToGo, label: "Days to go", Icon: CalendarRange, tint: "var(--gold)" },
  ];

  const searchItems: SearchItem[] = tasks.map((t) => ({ label: t.title, hint: "Task", href: "/board" }));
  const notices: Notice[] = [
    ...(count("decision_needed") ? [{ label: `${count("decision_needed")} task${count("decision_needed") === 1 ? " needs" : "s need"} a decision`, href: "/board" }] : []),
    ...(tasks.filter((t) => t.status !== "done" && isDueSoon(t.due_date)).length
      ? [{ label: `${tasks.filter((t) => t.status !== "done" && isDueSoon(t.due_date)).length} due this week`, href: "/board" }]
      : []),
  ];

  return (
    <div className="min-h-screen pb-16 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1520px] px-4 py-5 sm:px-6 lg:px-8">
        <DashboardTopBar userName={userName} partner={ASSIGNEE_LABELS[partner]} items={searchItems} notices={notices} />

        <section className="mt-8 grid items-stretch gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col justify-center">
            <h1 className="font-serif text-5xl font-light tracking-[-0.02em] sm:text-6xl xl:text-[4.5rem]">Planning Board</h1>
            <p className="mt-3 text-lg text-ink-2">Everything we need to do, from first ideas to wedding day.</p>
            <p aria-hidden className="mt-5 -rotate-3 font-script text-3xl leading-[1.1] text-sage-deep">
              Big plans,
              <br />
              beautiful details ♡
            </p>
          </div>
          <div className="relative min-h-[13rem] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photo-flower-table.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_35%]" />
            <p className="absolute bottom-5 right-4 -rotate-2 bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-5 py-3 text-center text-[11px] font-medium uppercase leading-[1.8] tracking-[0.24em] text-ink shadow-sm sm:right-6">
              Good things
              <br />
              take planning
            </p>
          </div>
        </section>

        <dl className="mt-7 grid grid-cols-2 gap-y-5 border-b border-line pb-7 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-line">
          {stats.map(({ n, label, Icon, tint }) => (
            <div key={label} className="flex items-center gap-3 lg:px-6 lg:first:pl-2">
              <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink" style={{ background: `color-mix(in srgb, ${tint} 30%, var(--paper))` }}>
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div>
                <dd className="font-serif text-3xl font-light leading-none">{n}</dd>
                <dt className="mt-1 text-sm text-ink-2">{label}</dt>
              </div>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {view !== "timeline" && (
            <>
          <label className="relative min-w-[200px] flex-1 lg:max-w-sm">
            <span className="sr-only">Search tasks</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className={`w-full rounded-full border border-line bg-paper py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-2 ${FOCUS_RING}`}
            />
          </label>
          <select aria-label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={TOOLBAR_SELECT}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select aria-label="Filter by person" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value as "all" | Assignee)} className={TOOLBAR_SELECT}>
            <option value="all">Everyone</option>
            <option value="ariel">Ariel</option>
            <option value="fred">Fred</option>
            <option value="together">Together</option>
          </select>
          <select aria-label="Filter by date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} className={TOOLBAR_SELECT}>
            {DATE_FILTERS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

            </>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div role="group" aria-label="View" className="flex items-center gap-1 rounded-full border border-line bg-paper p-1">
              {([["board", "Board", LayoutGrid], ["timeline", "Timeline", GanttChart], ["list", "List", ListIcon]] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm ${FOCUS_RING} ${view === key ? "bg-surface-green text-white" : "text-ink hover:bg-bg"}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => (view === "timeline" ? setShowNew(true) : addTask("todo"))} className={`flex items-center gap-2 rounded-full bg-surface-wine px-6 py-2.5 text-sm font-medium text-white ${FOCUS_RING}`}>
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              Add task
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        {view === "board" ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {STATUS_ORDER.map((status) => {
              const items = columnItems(status);
              const isDone = status === "done";
              const shown = isDone && doneCollapsed ? items.slice(0, 3) : items;
              const { tint, script, sub } = COLUMN[status];
              return (
                <div
                  key={status}
                  className="flex min-h-[34rem] flex-col rounded-2xl p-3"
                  style={{ background: `linear-gradient(to bottom, color-mix(in srgb, ${tint} 20%, var(--paper)), color-mix(in srgb, ${tint} 6%, var(--paper)))` }}
                >
                  <div className="flex items-center justify-between px-1.5 pb-3 pt-1">
                    <h2 className="font-serif text-lg">{STATUS_LABELS[status]}</h2>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-ink-2">{items.length}</span>
                      <button
                        onClick={() => addTask(status)}
                        aria-label={`Add a task to ${STATUS_LABELS[status]}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-paper pointer-coarse:h-11 pointer-coarse:w-11"
                      >
                        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <div
                    onDragOver={(e) => handleDragOver(e, status, shown)}
                    onDragLeave={() => setDragOver((d) => (d?.status === status ? null : d))}
                    onDrop={() => handleDrop(status)}
                    className="flex flex-1 flex-col gap-3"
                  >
                    {shown.map((t, i) => (
                      <div key={t.id}>
                        {dragOver?.status === status && dragOver.index === i && draggingId && <div className="mb-2 h-1 rounded-full bg-sage-deep" />}
                        {taskCard(t)}
                      </div>
                    ))}
                    {dragOver?.status === status && dragOver.index === shown.length && draggingId && <div className="h-1 rounded-full bg-sage-deep" />}
                    {isDone && items.length > 3 && (
                      <button onClick={() => setDoneCollapsed((v) => !v)} className={`w-fit rounded px-1 text-sm text-ink-2 underline hover:text-ink ${FOCUS_RING}`}>
                        {doneCollapsed ? `Show all ${items.length}` : "Show fewer"}
                      </button>
                    )}
                    <div aria-hidden className="mt-auto flex flex-col items-center px-2 pb-3 pt-10 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/botanical-accent.webp" width={350} height={420} loading="lazy" decoding="async" alt="" className={`h-16 w-auto opacity-40 ${status === "waiting" || status === "todo" ? "-scale-x-100" : ""}`} />
                      <p className="mt-2 -rotate-3 font-script text-2xl leading-tight text-ink-2">{script}</p>
                      {sub && <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink-2">{sub}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : view === "timeline" ? (
          <Timeline tasks={tasks} weddingDate={weddingDate} daysToGo={daysToGo} busy={busy} onOpenTask={setOpenId} onToggleDone={toggleDone} onAdd={() => setShowNew(true)} onSeed={seed} onRecalc={recalc} />
        ) : (
          <div className="mt-6 flex flex-col divide-y divide-line rounded-2xl border border-line bg-paper shadow-sm">
            {listSorted.length === 0 && <p className="p-5 text-sm text-ink-2">No tasks match these filters.</p>}
            {listSorted.map((t) => (
              <button key={t.id} onClick={() => setOpenId(t.id)} className={`flex flex-wrap items-center gap-3 p-4 text-left hover:bg-bg sm:flex-nowrap ${FOCUS_RING}`}>
                <span className="shrink-0 rounded-full border border-line bg-bg px-2.5 py-1 text-xs font-semibold text-ink-2">{STATUS_LABELS[t.status]}</span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-ink"
                  style={{ background: `color-mix(in srgb, ${categoryColor(t.category)} 28%, var(--paper))` }}
                >
                  {t.category}
                </span>
                <span className="min-w-0 flex-1 font-semibold text-ink">{t.title}</span>
                {t.priority === "high" && <span className="shrink-0 text-xs font-semibold text-wine">! High priority</span>}
                <Avatars value={t.assigned_to} />
                {t.due_date && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-2">
                    <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    {formatDueDate(t.due_date)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button aria-label="Close" tabIndex={-1} onClick={() => setOpenId(null)} className="absolute inset-0" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Edit task" tabIndex={-1} className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-paper shadow-lg">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <input
                defaultValue={open.title}
                onChange={(e) => scheduleSave(open.id, { title: e.target.value })}
                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-xl font-medium outline-none focus:border-line focus:bg-bg"
              />
              <button onClick={() => setOpenId(null)} aria-label="Close" className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg">
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="board-f1" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Category</label>
                  <select id="board-f1"
                    value={open.category}
                    onChange={(e) => scheduleSave(open.id, { category: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="board-f2" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Status</label>
                  <select id="board-f2"
                    value={open.status}
                    onChange={(e) => saveNow(open.id, { status: e.target.value as TaskStatus })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="board-f3" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Assigned to</label>
                  <select id="board-f3"
                    value={open.assigned_to}
                    onChange={(e) => scheduleSave(open.id, { assigned_to: e.target.value as Assignee })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  >
                    <option value="together">Together</option>
                    <option value="ariel">Ariel</option>
                    <option value="fred">Fred</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="board-f4" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Priority</label>
                  <select id="board-f4"
                    value={open.priority}
                    onChange={(e) => scheduleSave(open.id, { priority: e.target.value as Priority })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="board-f5" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">{open.category === "DIY" ? "Finish by" : "Target date"}</label>
                  <input id="board-f5"
                    type="date"
                    defaultValue={open.due_date ?? ""}
                    onChange={(e) => scheduleSave(open.id, { due_date: e.target.value || null, ...(open.template_key ? { date_manual: true } : {}) })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="board-f6" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Time estimate</label>
                  <input id="board-f6"
                    defaultValue={open.effort}
                    onChange={(e) => scheduleSave(open.id, { effort: e.target.value })}
                    placeholder="e.g. 15 min"
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <label htmlFor="board-f7" className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink-2">Estimated cost</label>
              <input id="board-f7"
                type="number"
                min={0}
                defaultValue={open.estimated_cost ?? ""}
                onChange={(e) => scheduleSave(open.id, { estimated_cost: e.target.value ? +e.target.value : null })}
                placeholder="$"
                className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <div className="mt-3 grid grid-cols-2 gap-3">
                {(open.category === "DIY" || open.start_date) && (
                  <div>
                    <label htmlFor="board-start" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Start date</label>
                    <input id="board-start" type="date" defaultValue={open.start_date ?? ""} onChange={(e) => scheduleSave(open.id, { start_date: e.target.value || null })} className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm" />
                  </div>
                )}
                <div>
                  <label htmlFor="board-actual" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Actual cost</label>
                  <input id="board-actual" type="number" min={0} defaultValue={open.actual_cost ?? ""} onChange={(e) => scheduleSave(open.id, { actual_cost: e.target.value ? +e.target.value : null })} placeholder="$" className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm" />
                </div>
                {vendors.length > 0 && (
                  <div>
                    <label htmlFor="board-vendor" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Related vendor</label>
                    <select id="board-vendor" value={open.vendor_id ?? ""} onChange={(e) => saveNow(open.id, { vendor_id: e.target.value || null })} className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm">
                      <option value="">None</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {(open.category === "Décor & Florals" || open.category === "DIY" || (open.tags ?? []).length > 0) && (
                <fieldset className="mt-3">
                  <legend className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Tags</legend>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {TAGS.map((tag) => {
                      const on = (open.tags ?? []).includes(tag);
                      return (
                        <button key={tag} type="button" aria-pressed={on} onClick={() => saveNow(open.id, { tags: on ? (open.tags ?? []).filter((x) => x !== tag) : [...(open.tags ?? []), tag] })}
                          className={`rounded-full border px-3 py-1 text-xs ${FOCUS_RING} ${on ? "border-surface-sage-deep bg-surface-sage-deep text-white" : "border-line text-ink-2 hover:border-sage-deep"}`}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {open.diy_project_id && (
                <Link href="/diy" className="mt-3 inline-block text-xs font-semibold text-sage-deep underline underline-offset-2">This task mirrors a DIY project — open DIY Projects →</Link>
              )}

              <details className="mt-4 rounded-lg border border-line bg-bg px-3 py-2" open={Object.values(open.wedding_day ?? {}).some(Boolean)}>
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink-2">Wedding Day handoff</summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([["location", "Location / used at"], ["person", "Person responsible"], ["vendor", "Vendor responsible"], ["ready_by", "Ready by (time)"]] as const).map(([k, label]) => (
                    <div key={k}>
                      <label htmlFor={`board-wd-${k}`} className="block text-xs text-ink-2">{label}</label>
                      <input id={`board-wd-${k}`} defaultValue={open.wedding_day?.[k] ?? ""} onChange={(e) => scheduleSave(open.id, { wedding_day: { ...(open.wedding_day ?? {}), [k]: e.target.value } })} className="mt-0.5 w-full rounded border border-line bg-paper px-2 py-1 text-sm" />
                    </div>
                  ))}
                </div>
                <label htmlFor="board-wd-setup" className="mt-2 block text-xs text-ink-2">Setup instructions</label>
                <textarea id="board-wd-setup" rows={2} defaultValue={open.wedding_day?.setup ?? ""} onChange={(e) => scheduleSave(open.id, { wedding_day: { ...(open.wedding_day ?? {}), setup: e.target.value } })} className="mt-0.5 w-full rounded border border-line bg-paper px-2 py-1 text-sm" />
              </details>

              <label htmlFor="board-f8" className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink-2">Notes &amp; links</label>
              <textarea id="board-f8"
                defaultValue={open.notes}
                onChange={(e) => scheduleSave(open.id, { notes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <button onClick={() => removeTask(open.id)} className="mt-4 text-xs font-semibold text-wine">
                Delete this task
              </button>
            </div>
          </div>
        </div>
      )}

      {showNew && <NewTaskDialog onClose={() => setShowNew(false)} onCreate={createTimelineTask} />}
    </div>
  );
}
