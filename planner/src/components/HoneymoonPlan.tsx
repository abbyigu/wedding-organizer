"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import { NumField } from "@/components/ScenarioRows";
import { useConfirm } from "@/components/ConfirmProvider";
import { BTN, BTN_PRIMARY, FIELD, FOCUS_RING } from "@/components/VendorUi";
import { createClient } from "@/lib/supabase/client";
import { normalizeUrl } from "@/lib/ideas";
import { fmtMoney, formatShortDate } from "@/lib/vendors";
import { blankTask, type PlanningTask } from "@/lib/planning-tasks";
import { itinerary, paymentDeadlines, SECTION_BY_KIND, SECTIONS, STEPS, stepKey, tripBudget, type Destination, type HoneymoonItem, type HoneymoonSettings, type ItemKind } from "@/lib/honeymoon";

const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";
type Draft = Pick<HoneymoonItem, "title" | "detail" | "item_date" | "time" | "amount" | "paid" | "due_date" | "confirmation" | "link">;

function ItemForm({ kind, initial, submit, onSubmit, onCancel }: { kind: ItemKind; initial?: HoneymoonItem; submit: string; onSubmit: (d: Draft) => void; onCancel: () => void }) {
  const sec = SECTION_BY_KIND[kind];
  const id = `hm-${kind}-${initial?.id ?? "new"}`;
  const [f, setF] = useState({ title: initial?.title ?? "", detail: initial?.detail ?? "", date: initial?.item_date ?? "", time: initial?.time ?? "", amount: initial?.amount == null ? "" : String(initial.amount), due: initial?.due_date ?? "", conf: initial?.confirmation ?? "", link: initial?.link ?? "", paid: initial?.paid ?? false });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.title.trim()) return;
        onSubmit({ title: f.title.trim(), detail: f.detail.trim(), item_date: sec.dated && f.date ? f.date : null, time: sec.dated ? f.time.trim() : "", amount: sec.costs && f.amount.trim() !== "" ? Math.max(0, Number(f.amount)) : null, paid: sec.costs && f.paid, due_date: sec.costs && f.due ? f.due : null, confirmation: sec.costs ? f.conf.trim() : "", link: f.link.trim() ? normalizeUrl(f.link) : "" });
      }}
      className="grid gap-3 rounded-2xl border border-line bg-bg p-4 sm:grid-cols-6"
    >
      <div className="sm:col-span-4"><label htmlFor={`${id}-t`} className={LABEL}>{sec.singular[0].toUpperCase() + sec.singular.slice(1)}</label><input id={`${id}-t`} required value={f.title} onChange={set("title")} className={FIELD} /></div>
      {sec.dated && <div className="sm:col-span-1"><label htmlFor={`${id}-d`} className={LABEL}>Date</label><input id={`${id}-d`} type="date" value={f.date} onChange={set("date")} className={FIELD} /></div>}
      {sec.dated && <div className="sm:col-span-1"><label htmlFor={`${id}-tm`} className={LABEL}>Time</label><input id={`${id}-tm`} value={f.time} onChange={set("time")} placeholder="7 PM" className={FIELD} /></div>}
      <div className="sm:col-span-6"><label htmlFor={`${id}-dt`} className={LABEL}>Details</label><input id={`${id}-dt`} value={f.detail} onChange={set("detail")} className={FIELD} /></div>
      {sec.costs && (
        <>
          <div className="sm:col-span-2"><label htmlFor={`${id}-a`} className={LABEL}>Cost ($)</label><input id={`${id}-a`} type="number" min={0} value={f.amount} onChange={set("amount")} className={FIELD} /><span className="text-xs text-ink-2">Blank means unknown, not $0.</span></div>
          <div className="sm:col-span-2"><label htmlFor={`${id}-du`} className={LABEL}>Pay by</label><input id={`${id}-du`} type="date" value={f.due} onChange={set("due")} className={FIELD} /></div>
          <div className="sm:col-span-2"><label htmlFor={`${id}-c`} className={LABEL}>Confirmation</label><input id={`${id}-c`} value={f.conf} onChange={set("conf")} className={FIELD} /></div>
          <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-6"><input type="checkbox" checked={f.paid} onChange={(e) => setF((x) => ({ ...x, paid: e.target.checked }))} className="h-4 w-4 accent-sage-deep" />Already paid</label>
        </>
      )}
      <div className="sm:col-span-6"><label htmlFor={`${id}-l`} className={LABEL}>Link</label><input id={`${id}-l`} value={f.link} onChange={set("link")} placeholder="Booking page, document" className={FIELD} /></div>
      <div className="flex gap-2 sm:col-span-6"><button type="button" onClick={onCancel} className={BTN}>Cancel</button><button type="submit" className={BTN_PRIMARY}>{submit}</button></div>
    </form>
  );
}

export default function HoneymoonPlan({ destination, initialSettings, initialItems, contributions, hasFund, giftAmountMissing, initialTasks, onChangeDestination }: { destination: Destination; initialSettings: HoneymoonSettings; initialItems: HoneymoonItem[]; contributions: number; hasFund: boolean; giftAmountMissing: boolean; initialTasks: PlanningTask[]; onChangeDestination: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const confirm = useConfirm();
  const [settings, setSettings] = useState(initialSettings);
  const [items, setItems] = useState(initialItems);
  const [tasks, setTasks] = useState(initialTasks);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<ItemKind | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const b = tripBudget(items, destination.est_cost, settings.budget_target, contributions, settings.fund_offsets);
  const deadlines = paymentDeadlines(items);
  const plan = itinerary(items);
  const today = new Date().toISOString().slice(0, 10);

  async function saveSettings(patch: Partial<HoneymoonSettings>) {
    const before = settings;
    setSettings({ ...settings, ...patch });
    const { error: err } = await supabase.from("honeymoon_settings").upsert({ id: true, ...patch, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (err) {
      setSettings(before);
      setError(err.message);
    }
  }
  async function add(kind: ItemKind, d: Draft) {
    const { data, error: err } = await supabase.from("honeymoon_items").insert({ kind, ...d, done: false, sort_order: items.length }).select("*").single();
    if (err) return setError(err.message);
    setItems((cur) => [...cur, data as HoneymoonItem]);
    setAdding(null);
  }
  async function patch(id: string, p: Partial<HoneymoonItem>) {
    const before = items;
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i)));
    const { error: err } = await supabase.from("honeymoon_items").update(p).eq("id", id);
    if (err) {
      setItems(before);
      setError(err.message);
    }
  }
  async function remove(i: HoneymoonItem) {
    if (!(await confirm(`Remove “${i.title}”?`, "Remove"))) return;
    setItems((cur) => cur.filter((x) => x.id !== i.id));
    await supabase.from("honeymoon_items").delete().eq("id", i.id);
  }

  // Steps live on the Planning Board. Here they are only added once and read back, never copied.
  async function addStep(key: string) {
    const s = STEPS.find((x) => x.key === key)!;
    const { data, error: err } = await supabase.from("planning_tasks").insert(blankTask("todo", { title: s.title, notes: s.notes, category: "Travel & Stay", template_key: stepKey(key) })).select("*").single();
    if (err) return setError(err.message);
    setTasks((cur) => [...cur, data as PlanningTask]);
  }
  async function toggleStep(t: PlanningTask) {
    const status = t.status === "done" ? "todo" : "done";
    setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, status } : x)));
    await supabase.from("planning_tasks").update({ status }).eq("id", t.id);
  }

  const itemRow = (i: HoneymoonItem) => {
    const sec = SECTION_BY_KIND[i.kind];
    if (editing === i.id) {
      return <li key={i.id} className="py-3"><ItemForm kind={i.kind} initial={i} submit="Save" onCancel={() => setEditing(null)} onSubmit={(d) => { patch(i.id, d); setEditing(null); }} /></li>;
    }
    return (
      <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
        {!sec.costs && (
          <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
            <input type="checkbox" checked={i.done} onChange={(e) => patch(i.id, { done: e.target.checked })} className="h-5 w-5 accent-sage-deep" />
            <span className="sr-only">{i.kind === "packing" ? "Packed" : "Sorted"}: {i.title}</span>
          </label>
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-[17px] leading-snug ${i.done ? "text-ink-2 line-through" : ""}`}>
            {i.link ? <a href={i.link} target="_blank" rel="noreferrer" className={`rounded hover:underline ${FOCUS_RING}`}>{i.title}</a> : i.title}
          </p>
          <p className="text-sm text-ink-2">{[i.item_date && `${formatShortDate(i.item_date)}${i.time ? ` ${i.time}` : ""}`, i.detail, i.confirmation && `Ref ${i.confirmation}`, i.due_date && !i.paid && `pay by ${formatShortDate(i.due_date)}`].filter(Boolean).join(" · ")}</p>
        </div>
        {sec.costs && (
          <div className="text-right">
            {i.amount != null ? <p className="font-serif text-xl font-light">{fmtMoney(i.amount)}</p> : <p className="text-sm font-medium text-wine">Unknown</p>}
            {i.amount != null && (
              <label className="flex min-h-11 cursor-pointer items-center justify-end gap-1.5 text-xs text-ink-2">
                <input type="checkbox" checked={i.paid} onChange={(e) => patch(i.id, { paid: e.target.checked })} className="h-4 w-4 accent-sage-deep" />Paid
              </label>
            )}
          </div>
        )}
        <div className="flex gap-1">
          <button onClick={() => setEditing(i.id)} aria-label={`Edit ${i.title}`} className={`flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:text-ink ${FOCUS_RING}`}><Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
          <button onClick={() => remove(i)} aria-label={`Remove ${i.title}`} className={`flex h-11 items-center rounded-full px-3 text-sm text-ink-2 hover:text-wine ${FOCUS_RING}`}>Remove</button>
        </div>
      </li>
    );
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section aria-label="Trip overview" className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Our honeymoon</p>
          <h2 className="font-serif text-4xl font-light leading-tight">{destination.name}</h2>
          <p className="text-ink-2">{[destination.country, destination.best_season && `best in ${destination.best_season}`, destination.travel_time].filter(Boolean).join(" · ")}</p>
          <button onClick={onChangeDestination} className={`mt-1 min-h-11 rounded text-sm font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Back to the shortlist</button>
        </div>
        <div className="flex flex-wrap gap-3">
          <div><label htmlFor="hm-start" className={LABEL}>Leaving</label><input id="hm-start" type="date" defaultValue={settings.start_date ?? ""} onBlur={(e) => (e.target.value || null) !== settings.start_date && saveSettings({ start_date: e.target.value || null })} className={`${FIELD} h-11`} /></div>
          <div><label htmlFor="hm-end" className={LABEL}>Back</label><input id="hm-end" type="date" defaultValue={settings.end_date ?? ""} onBlur={(e) => (e.target.value || null) !== settings.end_date && saveSettings({ end_date: e.target.value || null })} className={`${FIELD} h-11`} /></div>
        </div>
      </section>
      {error && <p role="alert" className="text-sm text-wine">{error}</p>}

      <section aria-label="Honeymoon budget" className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h3 className="font-serif text-2xl font-light">Honeymoon budget</h3>
        <p className="text-sm text-ink-2">Kept apart from the wedding budget. <Link href="/budget?together=1" className={`rounded font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>See them together in Budget</Link>.</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-5">
          <div><dt className={LABEL}>Trip target</dt><dd className="mt-1"><NumField id="hm-target" label="$" value={settings.budget_target} onCommit={(n) => saveSettings({ budget_target: n })} width="w-28" /></dd></div>
          <div><dt className={LABEL}>Estimated trip cost</dt><dd className="font-serif text-3xl font-light">{b.estimated == null ? "Unknown" : `${b.unknown > 0 ? "≥ " : ""}${fmtMoney(b.estimated)}`}</dd><dd className="text-xs text-ink-2">{b.basis === "items" ? "from what's been added below" : b.basis === "destination" ? "from the destination estimate" : "add costs below"}{b.unknown > 0 ? ` · ${b.unknown} unknown` : ""}</dd></div>
          <div><dt className={LABEL}>Paid so far</dt><dd className="font-serif text-3xl font-light">{fmtMoney(b.paid)}</dd></div>
          <div><dt className={LABEL}>Still to pay</dt><dd className="font-serif text-3xl font-light">{fmtMoney(b.owed)}</dd></div>
          <div><dt className={LABEL}>{b.remaining != null && b.remaining < 0 ? "Over target" : "Left of target"}</dt><dd className={`font-serif text-3xl font-light ${b.remaining != null && b.remaining < 0 ? "text-wine" : ""}`}>{b.remaining == null ? "—" : fmtMoney(Math.abs(b.remaining))}</dd></div>
        </dl>

        <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
          <div><p className={LABEL}>Estimated trip cost</p><p className="font-serif text-2xl font-light">{b.estimated == null ? "Unknown" : fmtMoney(b.estimated)}</p></div>
          <div><p className={LABEL}>Honeymoon fund gifts</p><p className="font-serif text-2xl font-light">{fmtMoney(contributions)}</p><p className="text-xs text-ink-2">{giftAmountMissing ? "Needs migration 051." : hasFund ? "Recorded on the Guest List, from your honeymoon fund." : "Add a Honeymoon fund in Registry to track gifts."}</p></div>
          <div><p className={LABEL}>Personal amount needed</p><p className="font-serif text-2xl font-light">{b.personal == null ? "—" : fmtMoney(b.personal)}</p><p className="text-xs text-ink-2">{settings.fund_offsets ? "Trip cost minus fund gifts." : "Shown once you count fund gifts toward the trip."}</p></div>
        </div>
        <label className="mt-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={settings.fund_offsets} onChange={(e) => saveSettings({ fund_offsets: e.target.checked })} className="h-4 w-4 accent-sage-deep" />Count fund gifts toward the trip cost</label>
        <p className="text-xs text-ink-2">Gifts are recorded once, in the Guest List&apos;s gift section (amount and which registry). <Link href="/guests/list" className={`rounded underline underline-offset-2 ${FOCUS_RING}`}>Open the Guest List</Link> or <Link href="/registry" className={`rounded underline underline-offset-2 ${FOCUS_RING}`}>Registry</Link>.</p>
      </section>

      {deadlines.length > 0 && (
        <section aria-label="Payment deadlines" className="rounded-3xl border border-line bg-[color-mix(in_srgb,var(--gold)_10%,var(--paper))] p-5 sm:p-6">
          <h3 className="font-serif text-2xl font-light">Payment deadlines</h3>
          <ul className="mt-2 divide-y divide-line">
            {deadlines.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-1">
                <span className={`w-20 shrink-0 text-sm font-medium ${d.due < today ? "text-wine" : ""}`}>{formatShortDate(d.due)}</span>
                <span className="min-w-0 flex-1">{d.title}{d.due < today && <span className="ml-2 text-sm text-wine">overdue</span>}</span>
                <span className="tabular-nums">{fmtMoney(d.amount)}</span>
                <button onClick={() => patch(d.id, { paid: true })} className={BTN}>Mark paid</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Itinerary" className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h3 className="font-serif text-2xl font-light">Itinerary</h3>
        <p className="text-sm text-ink-2">Everything with a date, in order. It reads the flights, stays and plans below, so nothing is entered twice.</p>
        {plan.days.size === 0 ? (
          <p className="mt-3 text-ink-2">Nothing dated yet. Give a flight, stay or activity a date and it lands here.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-4">
            {[...plan.days.entries()].map(([day, list]) => (
              <li key={day}>
                <p className="font-serif text-xl">{new Date(day + "T12:00").toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}</p>
                <ul className="mt-1 divide-y divide-line">
                  {list.map((i) => <li key={i.id} className="flex gap-4 py-1.5"><span className="w-20 shrink-0 text-sm text-ink-2">{i.time || "—"}</span><span className="flex-1">{i.title}</span><span className="text-sm text-ink-2">{SECTION_BY_KIND[i.kind].singular}</span></li>)}
                </ul>
              </li>
            ))}
          </ol>
        )}
        {plan.undated.length > 0 && <p className="mt-3 text-sm text-wine">{plan.undated.length} item{plan.undated.length === 1 ? " needs" : "s need"} a date to appear here.</p>}
      </section>

      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => {
          const list = items.filter((i) => i.kind === s.kind);
          const total = list.filter((i) => i.amount != null).reduce((t, i) => t + (i.amount as number), 0);
          const isOpen = open[s.kind] ?? list.length > 0;
          const done = list.filter((i) => i.done).length;
          return (
            <section key={s.kind} className="rounded-3xl border border-line bg-paper">
              <h3>
                <button type="button" aria-expanded={isOpen} aria-controls={`hm-${s.kind}`} onClick={() => setOpen((o) => ({ ...o, [s.kind]: !isOpen }))} className={`flex min-h-16 w-full items-center gap-3 rounded-3xl px-5 py-3 text-left sm:px-6 ${FOCUS_RING}`}>
                  <span className="min-w-0 flex-1"><span className="block font-serif text-2xl font-light leading-tight">{s.title}</span>{!isOpen && <span className="block truncate text-sm text-ink-2">{s.blurb}</span>}</span>
                  <span className="shrink-0 text-[15px] tabular-nums text-ink-2">{s.costs ? (list.length ? `${list.length} · ${fmtMoney(total)}` : "Nothing yet") : list.length ? `${done} of ${list.length} done` : "Nothing yet"}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-ink-2 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.5} aria-hidden />
                </button>
              </h3>
              {isOpen && (
                <div id={`hm-${s.kind}`} className="border-t border-line px-5 pb-5 pt-2 sm:px-6">
                  <p className="text-sm text-ink-2">{s.blurb}</p>
                  {list.length > 0 && <ul className="mt-1 divide-y divide-line">{list.map(itemRow)}</ul>}
                  {adding === s.kind ? (
                    <div className="mt-3"><ItemForm kind={s.kind} submit="Add" onCancel={() => setAdding(null)} onSubmit={(d) => add(s.kind, d)} /></div>
                  ) : (
                    <button onClick={() => setAdding(s.kind)} className={`${BTN} mt-3`}><Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />Add {s.singular}</button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section aria-label="Steps on the Planning Board" className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h3 className="font-serif text-2xl font-light">Steps on the Planning Board</h3>
        <p className="text-sm text-ink-2">These become real tasks on your <Link href="/board" className={`rounded font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Planning Board</Link>, and ticking one here ticks it there.</p>
        <ul className="mt-2 divide-y divide-line">
          {STEPS.map((s) => {
            const t = tasks.find((x) => x.template_key === stepKey(s.key));
            return (
              <li key={s.key} className="flex flex-wrap items-center gap-3 py-1">
                {t ? (
                  <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={t.status === "done"} onChange={() => toggleStep(t)} className="h-5 w-5 accent-sage-deep" />
                    <span className={t.status === "done" ? "text-ink-2 line-through" : ""}>{t.title}</span>
                  </label>
                ) : (
                  <>
                    <span className="flex-1">{s.title}</span>
                    <button onClick={() => addStep(s.key)} className={BTN}>Add to Planning Board</button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
