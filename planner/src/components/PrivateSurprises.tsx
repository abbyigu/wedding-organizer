"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Gift as GiftIcon, ImagePlus, Lock, Plus, Trash2 } from "lucide-react";
import PrivateAttachments from "@/components/PrivateAttachments";
import { Gift } from "@/components/PrivateArt";
import { useConfirm } from "@/components/ConfirmProvider";
import { createClient } from "@/lib/supabase/client";
import { blankTask, type PlanningTask } from "@/lib/planning-tasks";
import { usePrivateUrls } from "@/lib/use-private-urls";
import { fmtMoney } from "@/lib/vendors";
import {
  BUDGET_MODE_LABELS,
  blankSurprise,
  DAY_MODE_LABELS,
  isRevealed,
  LINK_AREAS,
  REVEAL_METHOD_LABELS,
  revealLabel,
  shortDate,
  SURPRISE_STATUS_ORDER,
  SURPRISE_STATUSES,
  type BudgetMode,
  type DayMode,
  type EventRef,
  type RevealMethod,
  type Surprise,
  type SurpriseStatus,
} from "@/lib/private";

const WINE_BTN = "flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-surface-wine px-5 text-sm font-medium text-white hover:bg-[color-mix(in_srgb,var(--surface-wine)_85%,black)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const GHOST_BTN = "flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-line bg-paper px-5 text-sm font-medium hover:border-wine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const FIELD = "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";
const STATUS_STYLE: Record<SurpriseStatus, string> = {
  idea: "bg-[color-mix(in_srgb,var(--sage)_22%,var(--paper))] text-ink-2",
  planning: "bg-[color-mix(in_srgb,var(--gold)_26%,var(--paper))] text-ink",
  ready: "bg-[color-mix(in_srgb,var(--surface-blush)_22%,var(--paper))] text-wine",
  revealed: "bg-[color-mix(in_srgb,var(--surface-wine)_14%,var(--paper))] text-wine",
};

function SurpriseDialog({ s, partner, userId, events, weddingDate, onChange, onClose, onDelete, onError }: { s: Surprise; partner: string; userId: string; events: EventRef[]; weddingDate: string | null; onChange: (p: Partial<Surprise>) => void; onClose: () => void; onDelete: () => void; onError: (m: string) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();
  const [state, setState] = useState<"saved" | "saving">("saved");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<Partial<Surprise>>({});
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [step, setStep] = useState("");
  const urls = usePrivateUrls([s.cover_path]);
  const who = s.recipient_name || partner;
  const revealed = isRevealed(s, events, weddingDate);

  async function flush() {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    const { error } = await supabase.from("surprises").update(patch).eq("id", s.id);
    if (error) onError(`${error.message} Has migration 052 been run?`);
    else setState("saved");
  }
  function edit(patch: Partial<Surprise>, wait = 900) {
    onChange(patch);
    pending.current = { ...pending.current, ...patch };
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, wait);
  }
  useEffect(() => {
    const p = pending;
    return () => {
      clearTimeout(timer.current);
      if (Object.keys(p.current).length) void supabase.from("surprises").update(p.current).eq("id", s.id);
    };
  }, [supabase, s.id]);
  useEffect(() => {
    let live = true;
    supabase.from("planning_tasks").select("*").eq("surprise_id", s.id).order("created_at", { ascending: true }).then(({ data }) => live && setTasks((data ?? []) as PlanningTask[]));
    return () => {
      live = false;
    };
  }, [supabase, s.id]);

  async function cover(file: File) {
    const path = `${userId}/covers/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from("private-files").upload(path, file, { contentType: file.type || undefined });
    if (error) return onError(`Couldn't upload that image (${error.message}).`);
    edit({ cover_path: path }, 0);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const row = blankTask("todo", { title: taskTitle.trim(), category: "Other", due_date: taskDue || null, template_key: `surprise:${s.id}:${crypto.randomUUID()}` });
    const { data, error } = await supabase.from("planning_tasks").insert({ ...row, private_owner_id: userId, surprise_id: s.id }).select("*").single();
    if (error) return onError(`${error.message} Has migration 052 been run?`);
    setTasks((t) => [...t, data as PlanningTask]);
    setTaskTitle("");
    setTaskDue("");
  }
  async function toggleTask(t: PlanningTask) {
    const status = t.status === "done" ? "todo" : "done";
    setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, status } : x)));
    await supabase.from("planning_tasks").update({ status }).eq("id", t.id);
  }
  async function removeTask(t: PlanningTask) {
    setTasks((cur) => cur.filter((x) => x.id !== t.id));
    await supabase.from("planning_tasks").delete().eq("id", t.id);
  }

  async function revealNow() {
    if (!(await confirm(`Reveal this to ${who} now? They'll see the title, your message and the cover image.`, "Reveal"))) return;
    edit({ revealed: true, revealed_at: new Date().toISOString(), status: "revealed" }, 0);
  }

  const done = s.checklist.filter((c) => c.done).length;
  const eventsWithDates = events.filter((e) => e.event_date);
  const budgetPreview = s.budget && s.budget > 0 ? (s.budget_mode === "hidden" ? `${partner} won't see this expense at all.` : s.budget_mode === "amount" ? `${partner} will see: Private expense ${fmtMoney(s.budget)}.` : `${partner} will see Private expense ${fmtMoney(s.budget)} now, and “${s.title}” after the reveal.`) : "";

  return (
    <div role="dialog" aria-modal="true" aria-label={`Surprise: ${s.title}`} className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur sm:px-8">
        <button onClick={async () => { await flush(); onClose(); }} className={GHOST_BTN}><ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />Back</button>
        <p className="flex items-center gap-1.5 text-sm text-ink-2"><Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />{revealed ? `Revealed to ${who}` : `Hidden from ${who}`}</p>
        <p role="status" className="ml-auto text-sm text-ink-2">{state === "saving" ? "Saving…" : "Saved"}</p>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:py-12">
        {s.cover_path && urls[s.cover_path] && (
          <div className="relative mb-6 overflow-hidden rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[s.cover_path]} alt="" className="max-h-64 w-full object-cover" />
            <button onClick={() => edit({ cover_path: null }, 0)} className="absolute right-3 top-3 min-h-11 rounded-full bg-paper/95 px-4 text-sm font-medium">Remove image</button>
          </div>
        )}
        <label htmlFor="sp-title" className="sr-only">Title</label>
        <input id="sp-title" value={s.title} onChange={(e) => edit({ title: e.target.value })} className="w-full bg-transparent font-serif text-4xl font-light leading-tight tracking-[-0.01em] outline-none sm:text-5xl" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label htmlFor="sp-for" className="text-sm text-ink-2">For</label>
          <input id="sp-for" value={s.recipient_name || partner} onChange={(e) => edit({ recipient_name: e.target.value })} className="h-11 w-40 rounded-lg border border-line bg-paper px-3 text-sm" />
          <label htmlFor="sp-status" className="text-sm text-ink-2">Status</label>
          <select id="sp-status" value={s.status} onChange={(e) => edit({ status: e.target.value as SurpriseStatus }, 0)} className="h-11 rounded-lg border border-line bg-paper px-3 text-sm">
            {SURPRISE_STATUS_ORDER.filter((x) => x !== "revealed" || s.status === "revealed").map((x) => <option key={x} value={x}>{SURPRISE_STATUSES[x]}</option>)}
          </select>
        </div>

        <section className="mt-8">
          <h3 className="font-serif text-2xl font-light">What {who} will see</h3>
          <p className="text-sm text-ink-2">Your message, shown when it&apos;s revealed. Your private notes and files are never shared.</p>
          <label htmlFor="sp-msg" className="sr-only">Message</label>
          <textarea id="sp-msg" rows={4} value={s.details} onChange={(e) => edit({ details: e.target.value })} placeholder="A few words for the day it opens…" className={`${FIELD} font-serif text-lg`} />
          <label className={`${GHOST_BTN} mt-3 inline-flex cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-wine`}>
            <ImagePlus className="h-4 w-4" strokeWidth={1.5} aria-hidden />{s.cover_path ? "Change cover image" : "Add a cover image"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) cover(f); }} />
          </label>
        </section>

        <fieldset className="mt-8 rounded-3xl border border-line bg-paper p-5">
          <legend className="px-2 font-serif text-2xl font-light">When it opens</legend>
          <div className="flex flex-col gap-1">
            {(Object.keys(REVEAL_METHOD_LABELS) as RevealMethod[]).map((m) => (
              <label key={m} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
                <input type="radio" name="reveal-method" checked={s.reveal_method === m} onChange={() => edit({ reveal_method: m }, 0)} className="h-4 w-4 accent-[var(--surface-wine)]" />{REVEAL_METHOD_LABELS[m]}
              </label>
            ))}
          </div>
          {s.reveal_method === "date" && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div><label htmlFor="sp-date" className={LABEL}>Date</label><input id="sp-date" type="date" value={s.reveal_on ?? ""} onChange={(e) => edit({ reveal_on: e.target.value || null }, 0)} className={FIELD} /></div>
              <div><label htmlFor="sp-time" className={LABEL}>Time</label><input id="sp-time" type="time" value={(s.reveal_time ?? "").slice(0, 5)} onChange={(e) => edit({ reveal_time: e.target.value || null }, 0)} className={FIELD} /></div>
            </div>
          )}
          {s.reveal_method === "event" && (
            <div className="mt-2">
              <label htmlFor="sp-event" className={LABEL}>Which event</label>
              <select id="sp-event" value={s.reveal_event} onChange={(e) => edit({ reveal_event: e.target.value }, 0)} className={FIELD}>
                <option value="">Choose…</option>
                <option value="wedding-day">The wedding day{weddingDate ? ` (${shortDate(weddingDate)})` : ""}</option>
                {eventsWithDates.map((e) => <option key={e.id} value={e.id}>{e.title} ({shortDate(e.event_date)})</option>)}
              </select>
              <p className="mt-1 text-xs text-ink-2">It opens on the morning of that day.</p>
            </div>
          )}
          <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-2.5 text-[15px]">
            <input type="checkbox" checked={s.teaser} onChange={(e) => edit({ teaser: e.target.checked }, 0)} className="mt-1 h-4 w-4 accent-[var(--surface-wine)]" />
            <span>Let {who} know something is waiting. <span className="text-ink-2">They&apos;ll see only “Something is waiting for you ♡”, that it&apos;s from you, and when it opens. Nothing else.</span></span>
          </label>
          <div className="mt-2">
            {revealed ? <p className="text-sm text-wine">Revealed{s.revealed_at ? ` ${shortDate(s.revealed_at)}` : ""}. It stays with {who} as a memory.</p> : <button onClick={revealNow} className={GHOST_BTN}><GiftIcon className="h-4 w-4" strokeWidth={1.5} aria-hidden />Reveal to {who} now</button>}
          </div>
        </fieldset>

        <section className="mt-8">
          <h3 className="font-serif text-2xl font-light">Steps <span className="ml-1 font-sans text-sm text-ink-2">{done} of {s.checklist.length} done</span></h3>
          <ul className="mt-1">
            {s.checklist.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={c.done} onChange={() => edit({ checklist: s.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) }, 0)} className="h-5 w-5 accent-[var(--surface-wine)]" />
                  <span className={c.done ? "text-ink-2 line-through" : ""}>{c.text}</span>
                </label>
                <button onClick={() => edit({ checklist: s.checklist.filter((x) => x.id !== c.id) }, 0)} aria-label={`Remove step ${c.text}`} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:text-wine"><Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
              </li>
            ))}
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); if (!step.trim()) return; edit({ checklist: [...s.checklist, { id: crypto.randomUUID(), text: step.trim(), done: false }] }, 0); setStep(""); }} className="mt-1 flex gap-2">
            <label htmlFor="sp-step" className="sr-only">Add a step</label>
            <input id="sp-step" value={step} onChange={(e) => setStep(e.target.value)} placeholder="Add a step" className="h-11 flex-1 rounded-lg border border-line bg-paper px-3 text-sm" />
            <button type="submit" className={GHOST_BTN}><Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />Add</button>
          </form>
        </section>

        <section className="mt-8">
          <h3 className="font-serif text-2xl font-light">Private notes</h3>
          <label htmlFor="sp-notes" className="sr-only">Private notes</label>
          <textarea id="sp-notes" rows={3} value={s.notes} onChange={(e) => edit({ notes: e.target.value })} placeholder="Vendors, ideas, anything for your eyes only" className={FIELD} />
        </section>

        <section className="mt-8 rounded-3xl border border-line bg-paper p-5">
          <h3 className="font-serif text-2xl font-light">Budget</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-[10rem_1fr]">
            <div><label htmlFor="sp-budget" className={LABEL}>Amount ($)</label><input id="sp-budget" type="number" min={0} value={s.budget ?? ""} onChange={(e) => edit({ budget: e.target.value === "" ? null : Number(e.target.value) })} className={FIELD} /></div>
            <div><label htmlFor="sp-bmode" className={LABEL}>In the shared budget</label>
              <select id="sp-bmode" value={s.budget_mode} onChange={(e) => edit({ budget_mode: e.target.value as BudgetMode }, 0)} className={FIELD}>
                {(Object.keys(BUDGET_MODE_LABELS) as BudgetMode[]).map((m) => <option key={m} value={m}>{BUDGET_MODE_LABELS[m]}</option>)}
              </select>
            </div>
          </div>
          {budgetPreview && <p className="mt-2 text-sm text-ink-2">{budgetPreview} It never shows the title, vendor, receipt or notes.</p>}
        </section>

        <section className="mt-8">
          <h3 className="font-serif text-2xl font-light">Private tasks</h3>
          <p className="text-sm text-ink-2">These appear on your Planning Board only. {partner} never sees them.</p>
          <ul className="mt-1">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={t.status === "done"} onChange={() => toggleTask(t)} className="h-5 w-5 accent-[var(--surface-wine)]" />
                  <span className={t.status === "done" ? "text-ink-2 line-through" : ""}>{t.title}{t.due_date ? <span className="text-ink-2"> · due {shortDate(t.due_date)}</span> : null}</span>
                </label>
                <button onClick={() => removeTask(t)} aria-label={`Remove task ${t.title}`} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:text-wine"><Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
              </li>
            ))}
          </ul>
          <form onSubmit={addTask} className="mt-1 flex flex-wrap gap-2">
            <label htmlFor="sp-task" className="sr-only">Task</label>
            <input id="sp-task" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Order the gift" className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 text-sm" />
            <label htmlFor="sp-task-due" className="sr-only">Due date</label>
            <input id="sp-task-due" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="h-11 rounded-lg border border-line bg-paper px-3 text-sm" />
            <button type="submit" className={GHOST_BTN}><Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />Add task</button>
          </form>
        </section>

        <section className="mt-8 rounded-3xl border border-line bg-paper p-5">
          <h3 className="font-serif text-2xl font-light">On the wedding day</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-[10rem_1fr]">
            <div><label htmlFor="sp-daytime" className={LABEL}>Time</label><input id="sp-daytime" value={s.day_time} onChange={(e) => edit({ day_time: e.target.value })} placeholder="8:30 AM" className={FIELD} /></div>
            <div><label htmlFor="sp-daymode" className={LABEL}>What {partner} sees</label>
              <select id="sp-daymode" value={s.day_mode} onChange={(e) => edit({ day_mode: e.target.value as DayMode }, 0)} className={FIELD}>
                {(Object.keys(DAY_MODE_LABELS) as DayMode[]).map((m) => <option key={m} value={m}>{DAY_MODE_LABELS[m]}</option>)}
              </select>
            </div>
          </div>
          <p className="mt-2 text-sm text-ink-2">Leave the time blank to keep it off the Wedding Day page. It shows to you as “{s.title}”.</p>
          <div className="mt-3">
            <label htmlFor="sp-area" className={LABEL}>Linked area <span className="font-normal normal-case">(just a label; nothing is shared)</span></label>
            <select id="sp-area" value={s.linked_area} onChange={(e) => edit({ linked_area: e.target.value }, 0)} className={FIELD}>{LINK_AREAS.map((a) => <option key={a} value={a}>{a || "None"}</option>)}</select>
          </div>
        </section>

        <section className="mt-8">
          <h3 className="font-serif text-2xl font-light">Files</h3>
          <PrivateAttachments userId={userId} surpriseId={s.id} />
        </section>

        <div className="mt-10 border-t border-line pt-5">
          <button onClick={onDelete} className={`${GHOST_BTN} text-wine`}><Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />Delete this surprise</button>
        </div>
      </div>
    </div>
  );
}

export default function PrivateSurprises({ surprises, setSurprises, userName, userId, partner, events, weddingDate, onError }: { surprises: Surprise[]; setSurprises: (fn: (s: Surprise[]) => Surprise[]) => void; userName: string; userId: string; partner: string; events: EventRef[]; weddingDate: string | null; onError: (m: string) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();
  const [openId, setOpenId] = useState<string | null>(null);
  const urls = usePrivateUrls(surprises.map((s) => s.cover_path));
  const open = surprises.find((s) => s.id === openId) ?? null;

  async function create() {
    onError("");
    const { data, error } = await supabase.from("surprises").insert(blankSurprise(userName, partner)).select().single();
    if (error || !data) return onError(`${error?.message ?? "Couldn't create that."} Has migration 052 been run?`);
    setSurprises((cur) => [data as Surprise, ...cur]);
    setOpenId((data as Surprise).id);
  }

  async function remove(s: Surprise) {
    if (!(await confirm(`Delete “${s.title}”? Its tasks and files go with it.`, "Delete"))) return;
    setOpenId(null);
    setSurprises((cur) => cur.filter((x) => x.id !== s.id));
    const { data: files } = await supabase.from("private_attachments").select("path").eq("surprise_id", s.id);
    const paths = [...(files ?? []).map((f) => f.path as string), ...(s.cover_path ? [s.cover_path] : [])];
    if (paths.length) await supabase.storage.from("private-files").remove(paths);
    await supabase.from("surprises").delete().eq("id", s.id);
  }

  return (
    <section aria-label="Surprises" className="mt-8">
      <div className="flex justify-end">
        <button onClick={create} className={WINE_BTN}><Plus className="h-4 w-4" strokeWidth={2} aria-hidden />Create a surprise</button>
      </div>
      {surprises.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
          <Gift className="h-20 w-20 text-wine/60" />
          <p className="mt-3 font-serif text-3xl font-light">Planning a little something? ♡</p>
          <p className="mt-1 max-w-sm text-ink-2">A gift, a note tucked somewhere, a moment on the day. {partner} sees nothing until you decide.</p>
          <button onClick={create} className={`${WINE_BTN} mt-5 px-6`}><Plus className="h-4 w-4" strokeWidth={2} aria-hidden />Create a surprise</button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {surprises.map((s) => {
            const revealed = isRevealed(s, events, weddingDate);
            const status: SurpriseStatus = revealed ? "revealed" : s.status;
            const done = s.checklist.filter((c) => c.done).length;
            return (
              <li key={s.id} className="relative flex flex-col overflow-hidden rounded-3xl border border-line bg-[color-mix(in_srgb,var(--surface-blush)_6%,var(--paper))]">
                {s.cover_path && urls[s.cover_path] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[s.cover_path]} alt="" className="h-36 w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-wine"><Lock className="h-3 w-3" strokeWidth={1.75} aria-hidden />{revealed ? `Revealed to ${s.recipient_name || partner}` : `Hidden from ${s.recipient_name || partner}`}</p>
                  <h3 className="font-serif text-2xl leading-tight">{s.title || "Untitled surprise"}</h3>
                  <p className="text-sm text-ink-2">For {s.recipient_name || partner}</p>
                  <dl className="mt-1 grid gap-1 text-sm">
                    <div className="flex gap-2"><dt className="text-ink-2">Reveal</dt><dd>{revealLabel(s, events, weddingDate)}</dd></div>
                    <div className="flex items-center gap-2"><dt className="text-ink-2">Status</dt><dd><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{SURPRISE_STATUSES[status]}</span></dd></div>
                    {s.budget != null && s.budget > 0 && <div className="flex gap-2"><dt className="text-ink-2">Budget</dt><dd>{fmtMoney(s.budget)}</dd></div>}
                  </dl>
                  {s.checklist.length > 0 && <p className="text-sm text-ink-2">{done} / {s.checklist.length} steps complete</p>}
                  <button onClick={() => setOpenId(s.id)} className="mt-auto w-fit rounded pt-2 text-sm font-medium text-wine underline-offset-2 hover:underline after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine">Open surprise →<span className="sr-only">: {s.title}</span></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {open && <SurpriseDialog key={open.id} s={open} partner={partner} userId={userId} events={events} weddingDate={weddingDate} onChange={(p) => setSurprises((cur) => cur.map((x) => (x.id === open.id ? { ...x, ...p } : x)))} onClose={() => setOpenId(null)} onDelete={() => remove(open)} onError={onError} />}
    </section>
  );
}
