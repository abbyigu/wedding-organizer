"use client";

import { useConfirm } from "@/components/ConfirmProvider";
import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Gift, Heart, MapPin, PieChart, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import DashboardTimeline from "@/components/DashboardTimeline";
import type { PlanningTask } from "@/lib/planning-tasks";
import DashboardTopBar, { type Notice, type SearchItem } from "@/components/DashboardTopBar";
import { BUDGET_CEILING, STATUSES, calcVenue, fmt, type Assumptions, type Venue } from "@/lib/venues";
import { blankCustomTask, type ActionItem, type CustomTask, type JourneyStage } from "@/lib/dashboard";
import { blankEvent, EVENT_TYPES, EVENT_TYPE_ORDER, formatEventDate, type EventType, type UpcomingEvent } from "@/lib/events";

export type { SearchItem };

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const STEP_COLORS = ["bg-surface-rose", "bg-surface-blush", "bg-surface-amber"];
const EVENT_DOT: Record<EventType, string> = {
  tour: "bg-surface-rose",
  deadline: "bg-surface-amber",
  call: "bg-gold",
  payment: "bg-surface-lavender",
  meeting: "bg-surface-plum",
  other: "bg-sage-deep",
};
const EYEBROW = "text-[11px] font-medium uppercase tracking-[0.24em] text-ink-2";

const subscribeNever = () => () => {};
function localDayPart() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function partnerOf(name: string) {
  return name.trim().toLowerCase() === "ariel" ? "Fred" : "Ariel";
}

function Donut({ parts, total }: { parts: { value: number; color: string }[]; total: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative h-[8.5rem] w-[8.5rem] shrink-0">
      <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
        {total > 0 &&
          parts.map((p, i) => {
            const len = (p.value / total) * c;
            const el = (
              <circle
                key={i}
                cx="56"
                cy="56"
                r={r}
                fill="none"
                stroke={p.color}
                strokeWidth="14"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl font-light leading-none">{total}</span>
        <span className="mt-1 text-sm text-ink-2">guests</span>
      </div>
    </div>
  );
}

function JourneyRing({ pct }: { pct: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14">
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="var(--surface-rose)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-ink">{pct}%</span>
    </div>
  );
}

export default function Dashboard({
  initialVenues,
  userName,
  photoUrls,
  assumptions,
  sharedVals,
  daysUntilWedding,
  weddingDateLabel,
  guestTotal,
  guestBreakdown,
  heroImageUrl,
  ideaCount,
  ideaUndecidedCount,
  decisionsWaitingCount,
  vendorFollowUps,
  decisionsWaitingVenue,
  journey,
  planningTasks,
  weddingDate,
  actionItems,
  initialCustomTasks,
  initialEvents,
  searchItems,
}: {
  initialVenues: Venue[];
  userName: string;
  photoUrls: Record<string, string>;
  assumptions: Assumptions;
  sharedVals: number[];
  daysUntilWedding: number;
  weddingDateLabel: string;
  guestTotal: number;
  guestBreakdown: { yes: number; pending: number; no: number };
  heroImageUrl: string | null;
  ideaCount: number;
  ideaUndecidedCount: number;
  decisionsWaitingCount: number;
  vendorFollowUps: { count: number; name: string };
  decisionsWaitingVenue: string | null;
  journey: JourneyStage[];
  planningTasks: Pick<PlanningTask, "title" | "category" | "status" | "due_date" | "period">[];
  weddingDate: string;
  actionItems: ActionItem[];
  initialCustomTasks: CustomTask[];
  initialEvents: UpcomingEvent[];
  searchItems: SearchItem[];
}) {
  const venues = initialVenues;
  const confirm = useConfirm();
  const [error, setError] = useState("");
  const [customTasks, setCustomTasks] = useState(initialCustomTasks);
  const [completingIds, setCompletingIds] = useState<string[]>([]);
  const [recentlyCompleted, setRecentlyCompleted] = useState<CustomTask[]>([]);
  const [events, setEvents] = useState(initialEvents);
  const [venueIdx, setVenueIdx] = useState(0);
  const taskTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const eventTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const as = assumptions;
  const partner = partnerOf(userName);

  // The greeting depends on the visitor's local clock, which the server can't know.
  const dayPart = useSyncExternalStore(subscribeNever, localDayPart, () => "Hello");

  const lowest = useMemo(() => {
    const active = venues.filter((v) => v.status !== "out");
    const costs = active.map((v) => calcVenue(v, as, sharedVals).grand).sort((a, b) => a - b);
    return costs[0] ?? 0;
  }, [venues, as, sharedVals]);

  const showcase = useMemo(() => {
    return venues
      .filter((v) => v.status !== "out")
      .sort((a, b) => Number(b.is_final) - Number(a.is_final) || Number(b.is_favourite) - Number(a.is_favourite))
      .slice(0, 5);
  }, [venues]);
  const shown = showcase[Math.min(venueIdx, Math.max(showcase.length - 1, 0))];
  const shownPhoto = shown?.photos?.[0] ? photoUrls[shown.photos[0].path] : null;
  const heroPhoto = showcase.map((v) => (v.photos?.[0] ? photoUrls[v.photos[0].path] : null)).find(Boolean) ?? heroImageUrl;

  async function addCustomTask() {
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.from("custom_tasks").insert(blankCustomTask(userName)).select().single();
    if (error) setError(error.message);
    else if (data) setCustomTasks((ts) => [...ts, data as CustomTask]);
  }

  function scheduleCustomTaskSave(id: string, patch: Partial<CustomTask>) {
    setCustomTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(taskTimers.current[key]);
    taskTimers.current[key] = setTimeout(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("custom_tasks").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function completeCustomTask(id: string) {
    setCompletingIds((ids) => [...ids, id]);
    const supabase = createClient();
    await supabase.from("custom_tasks").update({ done: true }).eq("id", id);
    setTimeout(() => {
      setCustomTasks((ts) => {
        const task = ts.find((t) => t.id === id);
        if (task) setRecentlyCompleted((rc) => [{ ...task, done: true }, ...rc]);
        return ts.filter((t) => t.id !== id);
      });
      setCompletingIds((ids) => ids.filter((x) => x !== id));
    }, 350);
  }

  async function removeCustomTask(id: string) {
    if (!(await confirm("Delete this task?"))) return;
    setCustomTasks((ts) => ts.filter((t) => t.id !== id));
    const supabase = createClient();
    await supabase.from("custom_tasks").delete().eq("id", id);
  }

  async function addEvent() {
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.from("upcoming_events").insert(blankEvent()).select().single();
    if (error) setError(error.message);
    else if (data) setEvents((es) => [...es, data as UpcomingEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)));
  }

  function scheduleEventSave(id: string, patch: Partial<UpcomingEvent>) {
    setEvents((es) => {
      const next = es.map((e) => (e.id === id ? { ...e, ...patch } : e));
      return patch.event_date ? [...next].sort((a, b) => a.event_date.localeCompare(b.event_date)) : next;
    });
    const key = id + Object.keys(patch)[0];
    clearTimeout(eventTimers.current[key]);
    eventTimers.current[key] = setTimeout(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("upcoming_events").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function removeEvent(id: string) {
    if (!(await confirm("Delete this event?"))) return;
    setEvents((es) => es.filter((e) => e.id !== id));
    const supabase = createClient();
    await supabase.from("upcoming_events").delete().eq("id", id);
  }

  const nextMoveQueue = useMemo(
    () => [
      ...actionItems.map((a) => ({ title: a.title, description: a.description, href: a.href })),
      ...customTasks.map((t) => ({ title: t.title, description: t.description || "Custom task", href: "#next-actions" })),
    ],
    [actionItems, customTasks],
  );
  const steps = nextMoveQueue.slice(0, 3);

  const notices: Notice[] = [];
  if (decisionsWaitingCount > 0) {
    notices.push({
      label: `${decisionsWaitingCount} private vote${decisionsWaitingCount === 1 ? " needs" : "s need"} your answer${decisionsWaitingVenue ? ` — ${decisionsWaitingVenue}` : ""}`,
      href: "/decide",
    });
  }
  if (vendorFollowUps.count > 0) {
    notices.push({ label: `${vendorFollowUps.count} vendor follow-up${vendorFollowUps.count === 1 ? " is" : "s are"} due${vendorFollowUps.count === 1 && vendorFollowUps.name ? ` — ${vendorFollowUps.name}` : ""}`, href: "/vendors" });
  }
  if (ideaUndecidedCount > 0) {
    notices.push({ label: `${ideaUndecidedCount} idea${ideaUndecidedCount === 1 ? " needs" : "s need"} a decision`, href: "/ideas" });
  }

  const budgetPct = lowest > 0 ? Math.round((lowest / BUDGET_CEILING) * 100) : 0;
  const guestParts = [
    { label: "Attending", value: guestBreakdown.yes, color: "var(--surface-olive)" },
    { label: "Pending", value: guestBreakdown.pending, color: "var(--surface-blush)" },
    { label: "Declined", value: guestBreakdown.no, color: "color-mix(in srgb, var(--wood) 55%, var(--paper))" },
  ];
  const guestPeople = guestParts.reduce((n, p) => n + p.value, 0);

  return (
    <div className="min-h-screen pb-16 lg:pl-56">
      <NavBar userName={userName} />

      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <DashboardTopBar userName={userName} partner={partner} items={searchItems} notices={notices} />

        {error && <p className="mt-3 text-sm text-wine">{error}</p>}

        <section className="mt-8 grid items-stretch gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col justify-center">
            <p className={EYEBROW}>
              {dayPart}, {userName || "there"} &amp; {partner}
            </p>
            <h1 className="mt-4 text-balance font-serif text-[2.75rem] font-light leading-[1.03] tracking-[-0.02em] sm:text-6xl xl:text-[4.25rem]">
              Your wedding is taking shape
            </h1>
            <div className="mt-6 flex items-start gap-3">
              <p className="font-serif text-4xl font-light sm:text-5xl">
                {daysUntilWedding.toLocaleString("en-US")} <span className="text-3xl sm:text-4xl">{daysUntilWedding === 1 ? "day" : "days"}</span>
              </p>
              <Heart className="mt-1 h-9 w-9 rotate-[14deg] text-gold" strokeWidth={1.25} aria-hidden />
            </div>
            <p className="mt-3 text-[12px] font-medium uppercase leading-[1.9] tracking-[0.24em] text-ink-2">
              Until your wedding day
              <br />
              {weddingDateLabel}
            </p>
            <Link
              href={steps[0]?.href ?? "/board"}
              className={`mt-7 inline-flex w-fit items-center gap-3 rounded-full bg-surface-olive px-8 py-4 text-lg text-white ${FOCUS_RING}`}
            >
              Continue planning
              <ArrowRight className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>

          <div className="relative min-h-[16rem] overflow-hidden rounded-3xl bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))] sm:min-h-[22rem]">
            {heroPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,color-mix(in_srgb,var(--gold)_35%,var(--paper)),color-mix(in_srgb,var(--surface-blush)_25%,var(--paper)))]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-l from-black/45 via-black/5 to-transparent" />
            <p className="absolute right-6 top-6 max-w-[11rem] -rotate-[8deg] text-right font-script text-3xl leading-[1.05] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.45)] sm:right-9 sm:top-8 sm:text-[2.6rem]">
              Good things are worth planning for.
            </p>
            <p className="absolute bottom-5 right-4 -rotate-2 bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-5 py-3 text-center text-[10px] font-medium uppercase leading-[1.8] tracking-[0.24em] text-ink shadow-sm sm:bottom-6 sm:right-6">
              Same love
              <br />
              Brighter days
            </p>
          </div>
        </section>

        <section className="mt-9">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-serif text-3xl font-light">Next three steps</h2>
            <Link href="/board" className={`rounded text-[11px] font-semibold uppercase tracking-[0.2em] text-surface-rose ${FOCUS_RING}`}>
              View all tasks <span aria-hidden>→</span>
            </Link>
          </div>
          {steps.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-line bg-paper p-5 text-ink-2">Nothing urgent — you&apos;re all caught up.</p>
          ) : (
            <ol className="mt-4 grid gap-3 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <Link
                    href={s.href}
                    className={`flex h-full items-center gap-4 rounded-2xl border border-line bg-paper px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${FOCUS_RING}`}
                  >
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-serif text-2xl text-white ${STEP_COLORS[i]}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-medium leading-snug text-ink">{s.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-ink-2">{s.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-ink" strokeWidth={1.5} aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="relative mt-9">
          <h2 className="font-serif text-3xl font-light">Your wedding journey</h2>
          <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 xl:mr-56">
          <ol className="relative grid min-w-[30rem] grid-cols-5 gap-2">
            <span aria-hidden className="absolute left-[10%] right-[10%] top-7 h-px bg-line" />
            {journey.map((s) => {
              const upcomingLabel = s.key === "day" ? "Coming soon" : "Upcoming";
              const stateLabel = s.state === "complete" ? "Complete" : s.state === "current" ? (s.pct > 0 ? "In progress" : "Up next") : upcomingLabel;
              const Icon = s.key === "build" ? Gift : s.key === "coordinate" ? Users : Heart;
              return (
                <li key={s.key} className="relative flex flex-col items-center text-center">
                  {s.state === "complete" ? (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-olive text-white">
                      <Check className="h-6 w-6" strokeWidth={2} aria-hidden />
                    </span>
                  ) : s.state === "current" && s.key !== "day" ? (
                    <span className="rounded-full bg-bg">
                      <JourneyRing pct={s.pct} />
                    </span>
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-paper text-ink">
                      <Icon className="h-6 w-6" strokeWidth={1.25} aria-hidden />
                    </span>
                  )}
                  <p className="mt-3 font-serif text-lg leading-tight text-ink sm:text-xl">{s.label}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-2 sm:text-[11px]">{stateLabel}</p>
                </li>
              );
            })}
          </ol>
          </div>
          <p className="pointer-events-none absolute bottom-0 right-0 hidden -rotate-6 text-right font-script text-3xl leading-[1.05] text-sage-deep xl:block">
            A beautiful
            <br />
            tomorrow
            <br />
            together
          </p>
        </section>

        <DashboardTimeline tasks={planningTasks} weddingDate={weddingDate} />

        <section className="mt-9 overflow-hidden rounded-3xl border border-line bg-paper shadow-sm">
          <div className="grid divide-y divide-line md:grid-cols-2 md:divide-y-0 lg:grid-cols-4 lg:divide-x">
            <div className="flex flex-col p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-serif text-lg">
                  <Users className="h-5 w-5" strokeWidth={1.5} aria-hidden /> Guest List
                </h3>
                <Link href="/guests" className={`rounded text-xs text-surface-rose ${FOCUS_RING}`}>View list →</Link>
              </div>
              {guestTotal === 0 ? (
                <p className="mt-6 flex-1 text-sm text-ink-2">No guests yet — start your list and this fills in.</p>
              ) : (
                <div className="mt-5 flex flex-1 items-center gap-5">
                  <Donut parts={guestParts.map((p) => ({ value: p.value, color: p.color }))} total={guestPeople} />
                  <ul className="flex flex-col gap-2 text-sm">
                    {guestParts.map((p) => (
                      <li key={p.label} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
                        <span className="text-ink-2">{p.label}</span>
                        <span className="ml-auto pl-3 font-medium tabular-nums">{p.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link
                href="/guests"
                className={`mt-5 self-start rounded-full bg-[color-mix(in_srgb,var(--surface-blush)_16%,var(--paper))] px-5 py-2.5 text-sm text-ink ${FOCUS_RING}`}
              >
                Manage guest list
              </Link>
            </div>

            <div className="relative flex flex-col p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-serif text-lg">
                  <PieChart className="h-5 w-5" strokeWidth={1.5} aria-hidden /> Budget
                </h3>
                <Link href="/budget" className={`rounded text-xs text-surface-rose ${FOCUS_RING}`}>View details →</Link>
              </div>
              {lowest > 0 ? (
                <>
                  <p className="mt-5 font-serif text-5xl font-light tracking-tight">{fmt(lowest)}</p>
                  <p className="mt-1 text-sm uppercase tracking-[0.2em] text-ink-2">of {fmt(BUDGET_CEILING)}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                      <div className={`h-full rounded-full ${budgetPct <= 100 ? "bg-surface-olive" : "bg-surface-rose"}`} style={{ width: `${Math.min(100, budgetPct)}%` }} />
                    </div>
                    <span className="text-sm tabular-nums text-ink">{budgetPct}%</span>
                  </div>
                  <p className="mt-2 text-xs text-ink-2">Cheapest active venue plus shared costs</p>
                  <p className="mt-3 -rotate-3 self-end font-script text-3xl text-sage-deep">
                    {budgetPct <= 100 ? "Right on track!" : "Time to adjust"}
                  </p>
                </>
              ) : (
                <p className="mt-6 flex-1 text-sm text-ink-2">Add a venue and your estimate shows up here.</p>
              )}
            </div>

            <div className="flex flex-col p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-serif text-lg">
                  <CalendarDays className="h-5 w-5" strokeWidth={1.5} aria-hidden /> Upcoming Milestones
                </h3>
                <Link href="#manage" className={`rounded text-xs text-surface-rose ${FOCUS_RING}`}>View all →</Link>
              </div>
              {events.length === 0 ? (
                <p className="mt-6 text-sm text-ink-2">
                  Nothing on the calendar yet. <Link href="#manage" className="text-sage-deep underline underline-offset-2">Add a date</Link>.
                </p>
              ) : (
                <ul className="mt-5 flex flex-col gap-3.5">
                  {events.map((ev) => (
                    <li key={ev.id} className="flex items-center gap-3 text-sm">
                      <span className={`h-3 w-3 shrink-0 rounded-full ${EVENT_DOT[ev.type]}`} aria-hidden />
                      <span className="w-14 shrink-0 text-[11px] uppercase tracking-[0.16em] text-ink-2">{formatEventDate(ev.event_date)}</span>
                      <span className="min-w-0 truncate text-ink">{ev.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-serif text-lg">
                  <MapPin className="h-5 w-5" strokeWidth={1.5} aria-hidden /> Venue
                </h3>
                <Link href={shown ? `/venues/${shown.id}` : "/venues"} className={`rounded text-xs text-surface-rose ${FOCUS_RING}`}>View details →</Link>
              </div>
              {!shown ? (
                <p className="mt-6 text-sm text-ink-2">
                  No venues yet. <Link href="/venues" className="text-sage-deep underline underline-offset-2">Start your shortlist</Link>.
                </p>
              ) : (
                <>
                  <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))]">
                    {shownPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shownPhoto} alt={shown.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-serif text-5xl font-light text-ink-2">{shown.name.charAt(0)}</div>
                    )}
                    <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink">
                      {shown.is_final ? "Final choice" : STATUSES[shown.status]}
                    </span>
                    {showcase.length > 1 && (
                      <>
                        <button
                          onClick={() => setVenueIdx((i) => (i - 1 + showcase.length) % showcase.length)}
                          aria-label="Previous venue"
                          className={`absolute left-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] text-ink ${FOCUS_RING}`}
                        >
                          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                        </button>
                        <button
                          onClick={() => setVenueIdx((i) => (i + 1) % showcase.length)}
                          aria-label="Next venue"
                          className={`absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] text-ink ${FOCUS_RING}`}
                        >
                          <ChevronRight className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="mt-3 font-serif text-xl leading-tight">{shown.name}</p>
                  {shown.location && <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-ink-2">{shown.location}</p>}
                  {showcase.length > 1 && (
                    <div className="mt-3 flex justify-center gap-1">
                      {showcase.map((v, i) => (
                        <button
                          key={v.id}
                          onClick={() => setVenueIdx(i)}
                          aria-label={`Show ${v.name}`}
                          aria-current={i === venueIdx}
                          className="flex h-6 w-4 items-center justify-center"
                        >
                          <span className={`h-2 w-2 rounded-full ${i === venueIdx ? "bg-ink" : "bg-line"}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        <section id="manage" className="mt-9 grid scroll-mt-6 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div id="next-actions" className="scroll-mt-6 rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-medium">All tasks</h2>
              <button
                onClick={addCustomTask}
                className={`rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}
              >
                ＋ Add
              </button>
            </div>
            {actionItems.length === 0 && customTasks.length === 0 ? (
              <p className="mt-4 text-sm text-ink-2">Nothing urgent — you&apos;re all caught up.</p>
            ) : (
              <ol className="mt-4 flex flex-col gap-3">
                {actionItems.slice(0, 3).map((item, i) => (
                  <li key={item.title} className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-bg p-3 sm:flex-nowrap">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sage-deep text-xs font-semibold text-white">{i + 1}</span>
                    <Link href={item.href} className={`min-w-0 flex-1 rounded ${FOCUS_RING}`}>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-ink-2">{item.description}</p>
                    </Link>
                    <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--gold)_20%,var(--paper))] px-2.5 py-1 text-xs font-semibold text-ink">
                      {item.person} · {item.effort}
                    </span>
                  </li>
                ))}
                {customTasks.map((task) => {
                  const completing = completingIds.includes(task.id);
                  return (
                    <li
                      key={task.id}
                      className={`flex flex-wrap items-start gap-2 rounded-xl border border-line bg-bg p-3 transition-all duration-300 motion-reduce:transition-none sm:flex-nowrap ${
                        completing ? "-translate-x-1 opacity-0" : "opacity-100"
                      }`}
                    >
                      <button
                        onClick={() => completeCustomTask(task.id)}
                        aria-label={`Mark "${task.title}" done`}
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-sage-deep text-xs transition-colors ${
                          completing ? "bg-surface-sage-deep text-white" : "text-transparent hover:bg-[color-mix(in_srgb,var(--sage)_20%,var(--paper))] hover:text-sage-deep"
                        }`}
                      >
                        ✓
                      </button>
                      <div className="min-w-0 flex-1">
                        <input
                          aria-label="Task title"
                          defaultValue={task.title}
                          onChange={(e) => scheduleCustomTaskSave(task.id, { title: e.target.value })}
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-semibold outline-none focus:border-line focus:bg-paper"
                        />
                        <input
                          aria-label="Task details"
                          defaultValue={task.description}
                          onChange={(e) => scheduleCustomTaskSave(task.id, { description: e.target.value })}
                          placeholder="Details…"
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-ink-2 outline-none focus:border-line focus:bg-paper"
                        />
                        <div className="mt-1 flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--gold)_20%,var(--paper))] px-2 py-0.5 text-xs font-semibold text-ink">
                          <input
                            aria-label="Who"
                            defaultValue={task.person}
                            onChange={(e) => scheduleCustomTaskSave(task.id, { person: e.target.value })}
                            placeholder="Who"
                            className="w-16 min-w-0 bg-transparent outline-none placeholder:font-normal placeholder:text-ink-2"
                          />
                          <span>·</span>
                          <input
                            aria-label="Effort"
                            defaultValue={task.effort}
                            onChange={(e) => scheduleCustomTaskSave(task.id, { effort: e.target.value })}
                            placeholder="Effort"
                            className="w-16 min-w-0 bg-transparent outline-none placeholder:font-normal placeholder:text-ink-2"
                          />
                        </div>
                      </div>
                      <button onClick={() => removeCustomTask(task.id)} aria-label={`Delete ${task.title}`} className="shrink-0 self-center px-2 text-sm text-wine">×</button>
                    </li>
                  );
                })}
              </ol>
            )}
            {recentlyCompleted.length > 0 && (
              <details className="mt-3 border-t border-line pt-3">
                <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-ink-2 marker:content-none">
                  <span className="mr-1 inline-block transition-transform [details[open]_&]:rotate-90">▸</span>
                  Recently completed ({recentlyCompleted.length})
                </summary>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {recentlyCompleted.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm text-ink-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-sage-deep text-[10px] text-white">✓</span>
                      <span className="truncate line-through decoration-ink-2/50">{t.title}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-medium">Dates &amp; milestones</h2>
              <button
                onClick={addEvent}
                className={`rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}
              >
                ＋ Add
              </button>
            </div>
            {events.length === 0 ? (
              <p className="mt-4 text-sm text-ink-2">Nothing on the calendar yet.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-2 rounded-xl border border-line bg-bg p-2.5">
                    <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${EVENT_DOT[ev.type]}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <input
                        aria-label="Event title"
                        defaultValue={ev.title}
                        onChange={(e) => scheduleEventSave(ev.id, { title: e.target.value })}
                        className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus:border-line focus:bg-paper"
                      />
                      <div className="flex flex-wrap items-center gap-2 px-1">
                        <input
                          aria-label="Event date"
                          type="date"
                          defaultValue={ev.event_date}
                          onChange={(e) => scheduleEventSave(ev.id, { event_date: e.target.value })}
                          className="rounded border border-transparent bg-transparent text-xs text-ink-2 outline-none focus:border-line focus:bg-paper"
                        />
                        <select
                          aria-label="Event type"
                          defaultValue={ev.type}
                          onChange={(e) => scheduleEventSave(ev.id, { type: e.target.value as UpcomingEvent["type"] })}
                          className="rounded border border-transparent bg-transparent text-xs text-ink-2 outline-none focus:border-line focus:bg-paper"
                        >
                          {EVENT_TYPE_ORDER.map((t) => (
                            <option key={t} value={t}>{EVENT_TYPES[t]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button onClick={() => removeEvent(ev.id)} aria-label={`Delete ${ev.title}`} className="shrink-0 px-2 text-sm text-wine">×</button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-ink-2">
              {ideaCount > 0 ? `${ideaCount} idea${ideaCount === 1 ? "" : "s"} saved on your ` : "Start collecting on your "}
              <Link href="/ideas" className="text-sage-deep underline underline-offset-2">Inspiration board</Link>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
