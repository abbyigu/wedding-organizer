"use client";

import StyleStrip from "@/components/StyleStrip";
import type { WeddingStyleRow } from "@/lib/wedding-style";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Check, ChevronRight, CircleDollarSign, Copy, MapPin, Plus, Shirt, Store, Trash2, Users, Utensils, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmProvider";
import NavBar from "@/components/NavBar";
import type { Guest } from "@/lib/guests";
import type { Vendor } from "@/lib/vendors";
import { blankTask, type PlanningTask } from "@/lib/planning-tasks";
import {
  EVENT_EXPENSE_CATEGORIES,
  EVENT_GUEST_STATUS_LABELS,
  EVENT_GUEST_STATUS_ORDER,
  EVENT_PHOTOS,
  EVENT_TASK_CATEGORY,
  eventCost,
  eventCounts,
  eventStepsDone,
  inviteLabel,
  TAG_SUGGESTIONS,
  type EventExpense,
  type EventGuest,
  type EventGuestStatus,
  type WeddingEvent,
} from "@/lib/wedding-events";
import { fmt } from "@/lib/venues";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const FIELD = `mt-1 w-full rounded-xl border border-line bg-bg/70 px-3 py-2.5 text-sm text-ink transition-colors placeholder:text-ink-2/60 hover:border-gold focus:border-wine focus:outline-none ${FOCUS_RING}`;
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2";
const PANEL = "rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6";
const TABS = ["overview", "guests", "menu", "budget", "vendors", "notes"] as const;
type Tab = (typeof TABS)[number];

function prettyDate(value: string | null) {
  if (!value) return "Date to be decided";
  return new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export default function EventDetail({
  initialEvent,
  initialEventGuests,
  initialExpenses,
  expensesMissing,
  initialSteps,
  guests,
  vendors,
  userName,
  style,
  initialTab,
}: {
  initialEvent: WeddingEvent;
  initialEventGuests: EventGuest[];
  initialExpenses: EventExpense[];
  expensesMissing: boolean;
  initialSteps: PlanningTask[];
  guests: Guest[];
  vendors: Vendor[];
  userName: string;
  style: WeddingStyleRow;
  initialTab?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const supabase = createClient();
  const [event, setEvent] = useState(initialEvent);
  const [eventGuests, setEventGuests] = useState(initialEventGuests);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [steps, setSteps] = useState(initialSteps);
  const [newStep, setNewStep] = useState("");
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "overview");
  const [error, setError] = useState("");
  const pending = useRef<Partial<WeddingEvent>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function scheduleSave(patch: Partial<WeddingEvent>) {
    setEvent((c) => ({ ...c, ...patch }));
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const p = pending.current;
      pending.current = {};
      const { error } = await supabase.from("wedding_events").update(p).eq("id", event.id);
      if (error) setError(error.message);
    }, 700);
  }

  async function setGuestStatus(guestId: string, status: EventGuestStatus) {
    const existing = eventGuests.find((eg) => eg.guest_id === guestId);
    if (existing) {
      setEventGuests((egs) => egs.map((eg) => (eg.id === existing.id ? { ...eg, status } : eg)));
      await supabase.from("event_guests").update({ status }).eq("id", existing.id);
    } else {
      const { data, error } = await supabase.from("event_guests").insert({ event_id: event.id, guest_id: guestId, status }).select().single();
      if (error) setError(error.message);
      else if (data) setEventGuests((egs) => [...egs, data as EventGuest]);
    }
  }
  const statusFor = (guestId: string): EventGuestStatus => eventGuests.find((eg) => eg.guest_id === guestId)?.status ?? "invited";

  async function addExpense() {
    setError("");
    const { data, error } = await supabase.from("event_expenses").insert({ event_id: event.id, sort_order: expenses.length }).select().single();
    if (error) setError(error.message);
    else setExpenses((x) => [...x, data as EventExpense]);
  }
  function patchExpense(id: string, patch: Partial<EventExpense>, now = false) {
    setExpenses((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(expTimers.current[key]);
    const save = async () => {
      const { error } = await supabase.from("event_expenses").update(patch).eq("id", id);
      if (error) setError(error.message);
    };
    if (now) void save();
    else expTimers.current[key] = setTimeout(save, 600);
  }
  async function removeExpense(id: string) {
    setExpenses((xs) => xs.filter((x) => x.id !== id));
    await supabase.from("event_expenses").delete().eq("id", id);
  }

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    if (!newStep.trim()) return;
    const { data, error } = await supabase
      .from("planning_tasks")
      .insert(blankTask("todo", { title: newStep.trim(), category: EVENT_TASK_CATEGORY[event.key ?? ""] ?? "Other", due_date: event.event_date, template_key: `event:${event.id}:${crypto.randomUUID()}` }))
      .select()
      .single();
    if (error) return setError(error.message);
    setSteps((s) => [...s, data as PlanningTask]);
    setNewStep("");
  }
  async function toggleStep(t: PlanningTask) {
    const status = t.status === "done" ? "todo" : "done";
    setSteps((s) => s.map((x) => (x.id === t.id ? { ...x, status } : x)));
    await supabase.from("planning_tasks").update({ status }).eq("id", t.id);
  }

  async function duplicate() {
    const { id, created_at, updated_at, key, ...rest } = event;
    void id; void created_at; void updated_at; void key;
    const { data, error } = await supabase.from("wedding_events").insert({ ...rest, key: null, title: `${event.title} (copy)`, sort_order: 200 }).select().single();
    if (error) setError(error.message);
    else router.push(`/events/${(data as WeddingEvent).id}`);
  }
  async function removeEvent() {
    if (!(await confirm(`Remove ${event.title}? Its guest replies and budget lines go with it.`))) return;
    const { error } = await supabase.from("wedding_events").delete().eq("id", event.id);
    if (error) setError(error.message);
    else router.push("/guests/events");
  }

  const counts = eventCounts(event, guests, eventGuests);
  const cats = inviteLabel(event);
  const invitedGuests = cats === "All guests" ? guests : guests.filter((g) => cats.split(" + ").includes(g.category));
  const done = eventStepsDone(event, expenses);
  const stepList = [
    { key: "place", label: "Date & place", ok: done.place, tab: "overview" as Tab },
    { key: "menu", label: "Menu", ok: done.menu, tab: "menu" as Tab },
    { key: "vendor", label: "Vendor", ok: done.vendor, tab: "vendors" as Tab },
    { key: "budget", label: "Budget", ok: done.budget, tab: "budget" as Tab },
  ];
  const vendor = vendors.find((v) => v.id === event.vendor_id);
  const cost = eventCost(event, expenses);
  const paid = expenses.filter((x) => x.paid).reduce((t, x) => t + x.amount, 0);
  const photo = event.photo_url || EVENT_PHOTOS[event.sort_order % EVENT_PHOTOS.length];
  const feelIsCustom = Boolean(event.tag) && !TAG_SUGGESTIONS.includes(event.tag ?? "");

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-ink-2">
          <Link href="/guests/events" className="hover:text-wine">Events</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span className="font-semibold text-wine">{event.title}</span>
        </div>

        <section className="relative overflow-hidden rounded-2xl text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,color-mix(in_srgb,var(--wine)_92%,black)_0%,color-mix(in_srgb,var(--wine)_62%,transparent)_48%,rgba(20,8,10,0.25)_100%)]" />
          <div className="relative px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">Wedding weekend</p>
            <input aria-label="Event title" value={event.title} onChange={(e) => scheduleSave({ title: e.target.value })} className="mt-2 w-full max-w-3xl rounded-lg border border-transparent bg-transparent font-serif text-4xl font-medium text-white outline-none placeholder:text-white/50 focus:border-white/30 focus:bg-black/10 sm:text-6xl" />
            <p className="mt-3 max-w-xl font-serif text-xl text-white/90 sm:text-2xl">{event.description?.trim() || event.notes.trim() || "A thoughtful gathering for the people sharing this weekend with you."}</p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/95">
              <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden />{prettyDate(event.event_date)}{event.time ? ` · ${event.time}` : ""}</span>
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden />{event.location || "Location to be decided"}</span>
              <span className="flex items-center gap-2"><Users className="h-4 w-4" aria-hidden />{counts.invited} invited</span>
            </div>
            <p aria-hidden className="absolute right-8 top-1/2 hidden -translate-y-1/2 -rotate-6 text-right font-script text-4xl leading-[1.05] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] lg:block">
              Good people make
              <br />
              great weekends ♡
            </p>
          </div>
        </section>

        <div className="mt-5"><StyleStrip style={style} focus="tables" /></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-line">
          <div role="tablist" aria-label="Event sections" className="flex flex-wrap gap-x-7 gap-y-1">
            {TABS.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`border-b-2 pb-3 text-base capitalize ${tab === t ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
                {t === "guests" ? `Guest List (${counts.invited})` : t}
              </button>
            ))}
          </div>
          <Link href="/guests/events" className={`mb-2 flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>
            View on wedding weekend <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>

        {error && <p role="alert" className="mt-3 rounded-xl border border-wine/30 bg-wine/10 px-4 py-3 text-sm text-wine">{error}</p>}

        <ol aria-label="Event progress" className="mt-5 grid grid-cols-2 gap-y-3 sm:grid-cols-4">
          {stepList.map((s, i) => (
            <li key={s.key} className={`px-2 sm:px-5 ${i > 0 ? "sm:border-l sm:border-line" : ""}`}>
              <button onClick={() => setTab(s.tab)} className={`flex items-center gap-3 rounded-full py-1 text-left ${FOCUS_RING}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.ok ? "bg-surface-olive text-white" : "border border-line bg-paper text-ink-2"}`}>
                  {s.ok ? <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden /> : <span className="text-sm">{i + 1}</span>}
                </span>
                <span>
                  <span className="block font-serif text-base font-medium">{s.label}</span>
                  <span className={`block text-xs ${s.ok ? "text-ink-2" : "text-wine"}`}>{s.ok ? "Ready" : "Needs attention"}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            {tab === "overview" && (
              <section className={PANEL} aria-label="Plan the gathering">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-wine">The essentials</p>
                <h2 className="font-serif text-3xl font-medium">Plan the gathering</h2>
                <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  <label><span className={LABEL}>Date</span><input type="date" value={event.event_date ?? ""} onChange={(e) => scheduleSave({ event_date: e.target.value || null })} className={FIELD} /></label>
                  <label><span className={LABEL}>Time</span><input value={event.time} onChange={(e) => scheduleSave({ time: e.target.value })} placeholder="6:30 PM" className={FIELD} /></label>
                  <label><span className={LABEL}>Location</span><input value={event.location} onChange={(e) => scheduleSave({ location: e.target.value })} placeholder="Venue or neighbourhood" className={FIELD} /></label>
                  <label><span className={LABEL}>Dress code</span><input value={event.dress_code} onChange={(e) => scheduleSave({ dress_code: e.target.value })} placeholder="Relaxed garden party" className={FIELD} /></label>
                  <label className="sm:col-span-2"><span className={LABEL}>One line for the overview</span><input value={event.description ?? ""} onChange={(e) => scheduleSave({ description: e.target.value })} maxLength={150} placeholder="Kick off the weekend with good food, drinks and great company." className={FIELD} /></label>
                  <label><span className={LABEL}>Capacity</span><input type="number" value={event.capacity ?? ""} onChange={(e) => scheduleSave({ capacity: e.target.value === "" ? null : +e.target.value })} placeholder="Number of guests" className={FIELD} /></label>
                </div>
                <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <p className={LABEL}>Event feel</p>
                    <div role="group" aria-label="Event feel" className="mt-2 flex flex-wrap gap-2">
                      {[...TAG_SUGGESTIONS, "Custom"].map((t) => {
                        const on = t === "Custom" ? feelIsCustom : event.tag === t;
                        return (
                          <button key={t} aria-pressed={on} onClick={() => scheduleSave({ tag: t === "Custom" ? (feelIsCustom ? "" : "Custom") : event.tag === t ? "" : t })} className={`rounded-full border px-4 py-2.5 text-sm font-semibold ${on ? "border-wine/40 bg-[color-mix(in_srgb,var(--surface-blush)_25%,var(--paper))]" : "border-line hover:bg-bg"} ${FOCUS_RING}`}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    {feelIsCustom && <input aria-label="Custom feel" value={event.tag === "Custom" ? "" : event.tag} onChange={(e) => scheduleSave({ tag: e.target.value || "Custom" })} placeholder="e.g. Rustic & relaxed" className={`${FIELD} max-w-xs`} />}
                  </div>
                  <label className="min-w-0 sm:w-64"><span className={LABEL}>Photo link</span><input type="url" value={event.photo_url ?? ""} onChange={(e) => scheduleSave({ photo_url: e.target.value })} placeholder="https://…" className={FIELD} /></label>
                </div>
              </section>
            )}

            {tab === "guests" && (
              <section className={PANEL} aria-label="Guest list">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-wine">Who&apos;s invited</p><h2 className="font-serif text-3xl font-medium">{cats === "All guests" ? "Everyone on the guest list" : cats}</h2></div>
                  <p className="text-sm text-ink-2">{counts.attending} attending · {counts.declined} declined · {counts.awaiting} awaiting</p>
                </div>
                <ul className="mt-4 divide-y divide-line">
                  {invitedGuests.length === 0 && <li className="py-4 text-sm text-ink-2">Add guests on the Guests page first.</li>}
                  {invitedGuests.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 truncate text-sm font-semibold">{g.name}</span>
                      <select aria-label={`RSVP status for ${g.name}`} value={statusFor(g.id)} onChange={(e) => setGuestStatus(g.id, e.target.value as EventGuestStatus)} className={`max-w-36 shrink-0 rounded-full border border-line bg-bg px-3 py-2 text-xs font-semibold ${FOCUS_RING}`}>
                        {EVENT_GUEST_STATUS_ORDER.map((s) => <option key={s} value={s}>{EVENT_GUEST_STATUS_LABELS[s]}</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tab === "menu" && (
              <section className={PANEL} aria-label="Menu">
                <div className="flex items-center gap-2"><Utensils className="h-5 w-5 text-wine" aria-hidden /><h2 className="font-serif text-3xl font-medium">Menu</h2></div>
                <label className="mt-4 block"><span className="sr-only">Menu</span><textarea value={event.menu} onChange={(e) => scheduleSave({ menu: e.target.value })} rows={10} placeholder="Courses, dietary options, drinks…" className={FIELD} /></label>
              </section>
            )}

            {tab === "budget" && (
              <section className={PANEL} aria-label="Event budget">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-wine">Feeds the wedding budget</p><h2 className="font-serif text-3xl font-medium">Event budget</h2></div>
                  <div className="text-right"><p className="font-serif text-3xl font-medium">{fmt(cost)}</p><p className="text-xs text-ink-2">{expenses.length > 0 ? `${fmt(paid)} paid so far` : "rough estimate"}</p></div>
                </div>
                {expensesMissing ? (
                  <p className="mt-4 text-sm text-ink-2">Line items need one small database update (migration 040) before they can be saved.</p>
                ) : (
                  <>
                    <ul className="mt-4 flex flex-col gap-3">
                      {expenses.length === 0 && <li className="text-sm text-ink-2">No line items yet. Add the restaurant, food, drinks, décor, tips… and the total flows into Budget → Wedding weekend.</li>}
                      {expenses.map((x) => (
                        <li key={x.id} className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] items-center gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_7rem_auto_auto]">
                          <select aria-label="Category" value={x.category} onChange={(e) => patchExpense(x.id, { category: e.target.value }, true)} className={`${FIELD} mt-0 col-span-3 sm:col-span-1`}>
                            {EVENT_EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                          </select>
                          <input aria-label="What for" defaultValue={x.label} onChange={(e) => patchExpense(x.id, { label: e.target.value })} className={`${FIELD} mt-0`} />
                          <input aria-label="Amount" type="number" min={0} defaultValue={x.amount} onChange={(e) => patchExpense(x.id, { amount: +e.target.value || 0 })} className={`${FIELD} mt-0`} />
                          <label className="flex items-center gap-1.5 text-xs text-ink-2"><input type="checkbox" checked={x.paid} onChange={(e) => patchExpense(x.id, { paid: e.target.checked }, true)} className="h-4 w-4 accent-sage-deep" />Paid</label>
                          <button onClick={() => removeExpense(x.id)} aria-label={`Remove ${x.label}`} className={`flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:text-wine ${FOCUS_RING}`}><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
                        </li>
                      ))}
                    </ul>
                    <button onClick={addExpense} className={`mt-4 flex items-center gap-1.5 rounded-full border border-ink/25 px-5 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}><Plus className="h-4 w-4" aria-hidden />Add expense</button>
                  </>
                )}
                <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
                  <label><span className={LABEL}>Rough estimate ($)</span><input type="number" min={0} value={event.budget_estimate ?? ""} onChange={(e) => scheduleSave({ budget_estimate: e.target.value === "" ? null : +e.target.value })} className={FIELD} /><span className="mt-1 block text-xs text-ink-2">Used until you add line items.</span></label>
                  <label><span className={LABEL}>What it covers</span><textarea rows={2} value={event.budget_notes} onChange={(e) => scheduleSave({ budget_notes: e.target.value })} className={FIELD} /></label>
                </div>
                <Link href="/budget" className={`mt-4 inline-block rounded text-sm font-semibold text-green underline underline-offset-2 ${FOCUS_RING}`}>See it in the wedding budget →</Link>
              </section>
            )}

            {tab === "vendors" && (
              <section className={PANEL} aria-label="Vendor">
                <div className="flex items-center gap-2"><Store className="h-5 w-5 text-wine" aria-hidden /><h2 className="font-serif text-3xl font-medium">Vendor</h2></div>
                <label className="mt-4 block"><span className={LABEL}>Linked vendor</span>
                  <select value={event.vendor_id ?? ""} onChange={(e) => scheduleSave({ vendor_id: e.target.value || null })} className={FIELD}>
                    <option value="">No vendor linked</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.category}</option>)}
                  </select>
                </label>
                {vendor && <p className="mt-3 text-sm text-ink-2">{[vendor.contact_name, vendor.phone, vendor.email].filter(Boolean).join(" · ") || "No contact details saved for this vendor."}</p>}
                <Link href="/vendors" className={`mt-4 inline-block rounded text-sm font-semibold text-green underline underline-offset-2 ${FOCUS_RING}`}>Find or add a vendor →</Link>
              </section>
            )}

            {tab === "notes" && (
              <section className={PANEL} aria-label="Notes">
                <h2 className="font-serif text-3xl font-medium">Notes &amp; atmosphere</h2>
                <label className="mt-4 block"><span className="sr-only">Notes</span><textarea value={event.notes} onChange={(e) => scheduleSave({ notes: e.target.value })} rows={10} placeholder="The feeling, plan, reminders, and details you do not want to lose…" className={FIELD} /></label>
              </section>
            )}

            {tab === "overview" && (
              <section className={PANEL} aria-label="Next steps">
                <h2 className="font-serif text-2xl font-medium">Next steps</h2>
                <p className="text-sm text-ink-2">Ticks itself as you fill things in. Your own steps also appear on the Planning Board.</p>
                <ul className="mt-4 flex flex-col gap-1">
                  {[
                    { label: "Confirm date and location", ok: done.place, tab: "overview" as Tab },
                    { label: "Decide on menu", ok: done.menu, tab: "menu" as Tab },
                    { label: "Book or link your vendor", ok: done.vendor, tab: "vendors" as Tab },
                    { label: "Set the event budget", ok: done.budget, tab: "budget" as Tab },
                  ].map((s) => (
                    <li key={s.label}>
                      <button onClick={() => setTab(s.tab)} className={`flex w-full items-center gap-3 rounded-lg py-2 text-left text-sm ${FOCUS_RING}`}>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${s.ok ? "border-transparent bg-surface-olive text-white" : "border-ink-2"}`}>{s.ok && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}</span>
                        <span className={s.ok ? "text-ink-2 line-through" : ""}>{s.label}</span>
                      </button>
                    </li>
                  ))}
                  {steps.map((t) => (
                    <li key={t.id}>
                      <button role="checkbox" aria-checked={t.status === "done"} onClick={() => toggleStep(t)} className={`flex w-full items-center gap-3 rounded-lg py-2 text-left text-sm ${FOCUS_RING}`}>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${t.status === "done" ? "border-transparent bg-surface-olive text-white" : "border-ink-2"}`}>{t.status === "done" && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}</span>
                        <span className={t.status === "done" ? "text-ink-2 line-through" : ""}>{t.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={addStep} className="mt-3 flex gap-2">
                  <input aria-label="Add a next step" value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Send invitations…" className={`${FIELD} mt-0`} />
                  <button className="shrink-0 rounded-full bg-surface-green px-5 py-2.5 text-sm font-semibold text-white">Add</button>
                </form>
              </section>
            )}
          </div>

          <aside className="flex flex-col gap-6">
            <section className={PANEL} aria-label="Event snapshot">
              <h2 className="font-serif text-2xl font-medium">Event snapshot</h2>
              <dl className="mt-4 divide-y divide-line">
                {[
                  { Icon: Users, label: "RSVP", value: `${counts.invited} invited`, note: `${counts.attending} attending · ${counts.declined} declined · ${counts.awaiting} awaiting` },
                  { Icon: CircleDollarSign, label: "Budget", value: cost > 0 ? fmt(cost) : "Not set", note: expenses.length > 0 ? `${expenses.length} line item${expenses.length === 1 ? "" : "s"} · ${fmt(paid)} paid` : event.budget_notes || "Add what this estimate includes" },
                  { Icon: Store, label: "Vendor", value: vendor?.name || "Not linked", note: vendor?.category || "Choose from your vendors" },
                  { Icon: Shirt, label: "Dress code", value: event.dress_code || "Not set", note: event.tag || "Add the feel of the event" },
                ].map(({ Icon, label, value, note }) => (
                  <div key={label} className="grid grid-cols-[1.75rem_1fr] gap-3 py-3">
                    <Icon className="mt-1 h-4 w-4 text-wine" strokeWidth={1.6} aria-hidden />
                    <div><dt className="text-xs font-semibold text-ink-2">{label}</dt><dd className="font-serif text-lg">{value}</dd><dd className="line-clamp-2 text-xs text-ink-2">{note}</dd></div>
                  </div>
                ))}
              </dl>
            </section>

            <section className={PANEL} aria-label="Quick actions">
              <h2 className="font-serif text-2xl font-medium">Quick actions</h2>
              <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {[
                  { Icon: Users, label: "Manage guest list", run: () => setTab("guests") },
                  { Icon: Store, label: "Add or link a vendor", run: () => setTab("vendors") },
                  { Icon: CircleDollarSign, label: "Set a budget", run: () => setTab("budget") },
                  { Icon: Copy, label: "Duplicate this event", run: duplicate },
                  { Icon: Trash2, label: "Delete this event", run: removeEvent },
                ].map(({ Icon, label, run }) => (
                  <li key={label}>
                    <button onClick={run} className={`flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left text-sm hover:text-wine ${FOCUS_RING}`}><Icon className="h-4 w-4 text-wine" strokeWidth={1.5} aria-hidden />{label}</button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
