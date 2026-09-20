"use client";

import { useDialog } from "@/lib/use-dialog";
import { useConfirm } from "@/components/ConfirmProvider";
import { useMemo, useRef, useState } from "react";
import { CalendarDays, Clock, Ellipsis, LayoutGrid, List as ListIcon, Plus, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import {
  blankTask,
  CATEGORIES,
  categoryColor,
  formatDueDate,
  isDueSoon,
  partnerOf,
  STATUS_LABELS,
  STATUS_ORDER,
  type Assignee,
  type PlanningTask,
  type Priority,
  type TaskStatus,
} from "@/lib/planning-tasks";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const ASSIGNEE_LABELS: Record<Assignee, string> = { ariel: "Ariel", fred: "Fred", together: "Together" };

function Avatars({ value }: { value: Assignee }) {
  const dot = (letter: string, key: string) => (
    <span
      key={key}
      className="flex h-5 w-5 items-center justify-center rounded-full border border-paper bg-surface-sage-deep text-[10px] font-semibold text-white"
    >
      {letter}
    </span>
  );
  if (value === "together") {
    return (
      <span className="flex -space-x-1.5">
        {dot("A", "a")}
        {dot("F", "f")}
      </span>
    );
  }
  return dot(value === "ariel" ? "A" : "F", value);
}

export default function Board({ initialTasks, userName }: { initialTasks: PlanningTask[]; userName: string }) {
  const confirm = useConfirm();
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | Assignee>("all");
  const [quickFilter, setQuickFilter] = useState<"none" | "mine" | "partner" | "together" | "due_soon">("none");
  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ status: TaskStatus; index: number } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [moreOpenId, setMoreOpenId] = useState<string | null>(null);
  const [moreOpenPos, setMoreOpenPos] = useState<{ top: number; left: number } | null>(null);
  const [moveSubmenu, setMoveSubmenu] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const me = userName.trim().toLowerCase() as Assignee;
  const partner = partnerOf(userName);
  const open = tasks.find((t) => t.id === openId) ?? null;
  const dialogRef = useDialog(Boolean(open), () => setOpenId(null));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !`${t.title} ${t.notes}`.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (assigneeFilter !== "all" && t.assigned_to !== assigneeFilter) return false;
      if (quickFilter === "mine" && t.assigned_to !== me) return false;
      if (quickFilter === "partner" && t.assigned_to !== partner) return false;
      if (quickFilter === "together" && t.assigned_to !== "together") return false;
      if (quickFilter === "due_soon" && !isDueSoon(t.due_date)) return false;
      return true;
    });
  }, [tasks, search, categoryFilter, assigneeFilter, quickFilter, me, partner]);

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

  async function addTask(status: TaskStatus) {
    setError("");
    const supabase = createClient();
    const count = tasks.filter((t) => t.status === status).length;
    const { data, error } = await supabase
      .from("planning_tasks")
      .insert(blankTask(status, { assigned_to: "together", sort_order: count }))
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
        className={`rounded-xl border border-line bg-paper p-3 shadow-sm transition-[opacity,box-shadow] ${
          dragging ? "opacity-40" : "hover:shadow-md"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold text-ink"
            style={{ background: `color-mix(in srgb, ${categoryColor(t.category)} 28%, var(--paper))` }}
          >
            {t.category}
          </span>
          <button
            onClick={(e) => openMenu(e, t.id)}
            aria-label="Task actions"
            aria-expanded={moreOpenId === t.id}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-ink"
          >
            <Ellipsis className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <button onClick={() => setOpenId(t.id)} className={`mt-2 block w-full rounded text-left font-semibold text-ink ${FOCUS_RING}`}>
          {t.title}
        </button>
        {t.notes && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{t.notes}</p>}
        {t.priority === "high" && <p className="mt-1.5 text-xs font-semibold text-wine">! High priority</p>}

        <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2">
          <Avatars value={t.assigned_to} />
          {t.due_date ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-ink-2">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {formatDueDate(t.due_date)}
            </span>
          ) : t.effort ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-ink-2">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {t.effort}
            </span>
          ) : null}
        </div>

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

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Planning Board</h1>
            <p className="mt-2 max-w-2xl text-ink-2">Everything we need to do, from first ideas to wedding day.</p>
          </div>
          <button onClick={() => addTask("todo")} className={`flex shrink-0 items-center gap-1.5 rounded-full bg-surface-sage-deep px-4 py-2.5 text-sm font-semibold text-white ${FOCUS_RING}`}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Add task
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.webp" width={350} height={420} loading="lazy" decoding="async" alt="" aria-hidden className="pointer-events-none absolute -right-6 -top-10 hidden h-40 w-auto rotate-[8deg] opacity-30 sm:block" />
        </div>

        <div className="mt-6 flex items-center gap-1 rounded-full border border-line bg-paper p-1" style={{ width: "fit-content" }}>
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${view === "board" ? "bg-surface-green text-white" : "text-ink-2 hover:bg-bg hover:text-ink"}`}
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${view === "list" ? "bg-surface-green text-white" : "text-ink-2 hover:bg-bg hover:text-ink"}`}
          >
            <ListIcon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            List
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full rounded-full border border-line bg-paper py-2 pl-9 pr-3 text-sm outline-none focus:border-sage-deep"
            />
          </div>
          <label className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink-2">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent text-ink outline-none">
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink-2">
            <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value as "all" | Assignee)} className="bg-transparent text-ink outline-none">
              <option value="all">Everyone</option>
              <option value="ariel">Ariel</option>
              <option value="fred">Fred</option>
              <option value="together">Together</option>
            </select>
          </label>

          <div className="hidden h-6 w-px bg-line sm:block" />

          {([
            ["mine", `${userName}'s`],
            ["partner", `${ASSIGNEE_LABELS[partner]}'s`],
            ["together", "Together"],
            ["due_soon", "Due soon"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setQuickFilter((v) => (v === key ? "none" : key))}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                quickFilter === key ? "border-surface-sage-deep bg-surface-sage-deep text-white" : "border-line bg-paper text-ink-2 hover:border-sage-deep"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        {view === "board" ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {STATUS_ORDER.map((status) => {
              const items = columnItems(status);
              const isDone = status === "done";
              const showCollapsed = isDone && doneCollapsed && items.length > 0;
              return (
                <div key={status} className="flex flex-col gap-3 rounded-2xl border border-line bg-bg p-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="font-serif text-base font-medium">{STATUS_LABELS[status]}</h2>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-ink-2">{items.length}</span>
                      {isDone && items.length > 0 && (
                        <button onClick={() => setDoneCollapsed((v) => !v)} className="text-xs font-semibold text-ink-2 underline hover:text-ink">
                          {showCollapsed ? "Show" : "Hide"}
                        </button>
                      )}
                      <button
                        onClick={() => addTask(status)}
                        aria-label={`Add a task to ${STATUS_LABELS[status]}`}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-sm font-semibold text-ink-2 hover:bg-paper hover:text-ink"
                      >
                        ＋
                      </button>
                    </div>
                  </div>
                  <div
                    onDragOver={(e) => !showCollapsed && handleDragOver(e, status, items)}
                    onDragLeave={() => setDragOver((d) => (d?.status === status ? null : d))}
                    onDrop={() => handleDrop(status)}
                    className="flex min-h-[40px] flex-col gap-2"
                  >
                    {showCollapsed ? (
                      <p className="px-1 text-xs italic text-ink-2">{items.length} done — hidden</p>
                    ) : (
                      <>
                        {items.map((t, i) => (
                          <div key={t.id}>
                            {dragOver?.status === status && dragOver.index === i && draggingId && <div className="h-1 rounded-full bg-sage-deep" />}
                            {taskCard(t)}
                          </div>
                        ))}
                        {dragOver?.status === status && dragOver.index === items.length && draggingId && <div className="h-1 rounded-full bg-sage-deep" />}
                        {items.length === 0 && <p className="px-1 text-xs italic text-ink-2">Nothing here</p>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
                  <label htmlFor="board-f5" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Due date</label>
                  <input id="board-f5"
                    type="date"
                    defaultValue={open.due_date ?? ""}
                    onChange={(e) => scheduleSave(open.id, { due_date: e.target.value || null })}
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
    </div>
  );
}
