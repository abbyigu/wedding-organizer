"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarDays, ChevronRight, Clock, Heart, Landmark, ListChecks, Users, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import {
  BUDGET_CEILING,
  GUEST_CAPACITY,
  STARTERS,
  STATUS_ORDER,
  STATUSES,
  blankVenue,
  calcVenue,
  checklistPercent,
  fmt,
  type Assumptions,
  type Venue,
} from "@/lib/venues";
import { normalizeUrl } from "@/lib/ideas";
import { blankCustomTask, nextVenueAction, type ActionItem, type CustomTask } from "@/lib/dashboard";
import { blankEvent, EVENT_TYPES, EVENT_TYPE_ORDER, formatEventDate, type UpcomingEvent } from "@/lib/events";

const CARD_COLORS = ["var(--sage-deep)", "var(--wood)", "var(--wine)", "var(--green)", "var(--gold)", "var(--sage)"];
const MAX_COMPARE = 3;
const CARD_TRANSITION = "transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:transform-none";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

type IdeaThumb = { id: string; title: string; image_url: string };

export default function Dashboard({
  initialVenues,
  userName,
  greetingText,
  photoUrls,
  assumptions,
  sharedVals,
  daysUntilWedding,
  guestTotal,
  guestAdults,
  guestKids,
  ideaThumbs,
  ideaCount,
  ideaCollectionCount,
  ideaUndecidedCount,
  decisionsWaitingCount,
  decisionsWaitingVenue,
  roadmap,
  actionItems,
  initialCustomTasks,
  initialEvents,
}: {
  initialVenues: Venue[];
  userName: string;
  greetingText: string;
  photoUrls: Record<string, string>;
  assumptions: Assumptions;
  sharedVals: number[];
  daysUntilWedding: number;
  guestTotal: number;
  guestAdults: number;
  guestKids: number;
  ideaThumbs: IdeaThumb[];
  ideaCount: number;
  ideaCollectionCount: number;
  ideaUndecidedCount: number;
  decisionsWaitingCount: number;
  decisionsWaitingVenue: string | null;
  roadmap: { phaseLabel: string; step: number; totalSteps: number; nextMilestone: string; previousPhaseLabel: string | null };
  actionItems: ActionItem[];
  initialCustomTasks: CustomTask[];
  initialEvents: UpcomingEvent[];
}) {
  const router = useRouter();
  const [venues, setVenues] = useState(initialVenues);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [customTasks, setCustomTasks] = useState(initialCustomTasks);
  const [completingIds, setCompletingIds] = useState<string[]>([]);
  const [recentlyCompleted, setRecentlyCompleted] = useState<CustomTask[]>([]);
  const [events, setEvents] = useState(initialEvents);
  const taskTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const eventTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const as = assumptions;

  const stats = useMemo(() => {
    const active = venues.filter((v) => v.status !== "out");
    const withCost = active
      .map((v) => ({ v, g: calcVenue(v, as, sharedVals).grand }))
      .sort((a, b) => a.g - b.g);
    const needQuote = active.filter((v) => !v.quote_received).length;
    return {
      active: active.length,
      lowestNumeric: withCost[0]?.g ?? 0,
      lowest: withCost[0] ? fmt(withCost[0].g) : "—",
      needQuote,
      quotesReceived: active.length - needQuote,
      nextAction: nextVenueAction(venues),
    };
  }, [venues, as, sharedVals]);

  const sorted = useMemo(() => {
    return [...venues].sort((a, b) => {
      const oa = STATUS_ORDER.indexOf(a.status), ob = STATUS_ORDER.indexOf(b.status);
      if (oa !== ob) return oa - ob;
      return calcVenue(a, as, sharedVals).grand - calcVenue(b, as, sharedVals).grand;
    });
  }, [venues, as, sharedVals]);

  async function seed() {
    setSeeding(true);
    setError("");
    const supabase = createClient();
    const rows = STARTERS.map((s) => blankVenue(s));
    const { data, error } = await supabase.from("venues").insert(rows).select();
    if (error) setError(error.message);
    else if (data) setVenues((v) => [...v, ...(data as Venue[])]);
    setSeeding(false);
  }

  async function addPlace() {
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("venues")
      .insert(blankVenue({ name: "New place", sort_order: venues.length + 1 }))
      .select()
      .single();
    if (error) setError(error.message);
    else if (data) setVenues((v) => [...v, data as Venue]);
  }

  function toggleCompare(id: string) {
    setCompareIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= MAX_COMPARE) return ids;
      return [...ids, id];
    });
  }

  async function toggleFavourite(v: Venue) {
    const next = !v.is_favourite;
    setVenues((vs) => vs.map((x) => (x.id === v.id ? { ...x, is_favourite: next } : x)));
    const supabase = createClient();
    await supabase.from("venues").update({ is_favourite: next }).eq("id", v.id);
  }

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
    if (!confirm("Delete this task?")) return;
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
    if (!confirm("Delete this event?")) return;
    setEvents((es) => es.filter((e) => e.id !== id));
    const supabase = createClient();
    await supabase.from("upcoming_events").delete().eq("id", id);
  }

  const guestOver = guestTotal - GUEST_CAPACITY;
  const budgetPct = Math.min(100, Math.max(0, (stats.lowestNumeric / BUDGET_CEILING) * 100));

  const nextMoveQueue = useMemo(
    () => [
      ...actionItems.map((a) => ({ title: a.title, description: a.description, person: a.person, effort: a.effort, href: a.href })),
      ...customTasks.map((t) => ({
        title: t.title,
        description: t.description || "Custom task",
        person: t.person || userName,
        effort: t.effort || "—",
        href: "#next-actions",
      })),
    ],
    [actionItems, customTasks, userName],
  );
  const nextMove = nextMoveQueue[0] ?? null;
  const progressItems = nextMoveQueue.slice(1, 3);

  function venueCard(v: Venue, i: number) {
    const calc = calcVenue(v, as, sharedVals);
    const photo = v.photos?.[0];
    const pct = checklistPercent(v);
    const checked = compareIds.includes(v.id);
    const compareDisabled = !checked && compareIds.length >= MAX_COMPARE;
    return (
      <div key={v.id} className={`flex flex-col overflow-hidden rounded-[20px] border border-line bg-paper shadow-sm ${CARD_TRANSITION}`}>
        <Link href={`/venues/${v.id}`} className={`relative block aspect-video rounded-t-[18px] bg-line ${FOCUS_RING}`}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrls[photo.path]} alt={v.name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-serif text-4xl text-white"
              style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
            >
              {v.name.charAt(0)}
            </div>
          )}
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[color-mix(in_srgb,var(--paper)_85%,transparent)] px-2.5 py-0.5 text-xs font-semibold text-ink shadow-sm">
            {STATUSES[v.status]}
          </span>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-2.5 pt-7">
            <span className="block font-serif text-lg font-semibold text-white">{v.name}</span>
          </div>
        </Link>

        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between text-sm text-ink-2">
            <span>
              {calc.venueSource === "estimated" ? "≈ " : ""}
              <b className="text-ink">{fmt(calc.grand)}</b>
              {calc.venueSource !== "estimated" && (
                <span className="ml-1 text-xs font-semibold text-sage-deep">({calc.venueSource})</span>
              )}
            </span>
            <span>Capacity <b className="text-ink">{v.capacity || "TBD"}</b></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-sage-deep" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-xs font-semibold text-ink-2">{pct}% researched</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
            <label className={`flex items-center gap-1.5 text-sm font-semibold ${compareDisabled ? "text-ink-2 opacity-50" : "text-ink-2"}`}>
              <input
                type="checkbox"
                checked={checked}
                disabled={compareDisabled}
                onChange={() => toggleCompare(v.id)}
                className={`h-4 w-4 accent-sage-deep ${FOCUS_RING}`}
              />
              Compare
            </label>
            <button
              onClick={() => toggleFavourite(v)}
              aria-label={v.is_favourite ? "Remove favourite" : "Mark as favourite"}
              aria-pressed={v.is_favourite}
              className={`flex items-center gap-1.5 text-sm font-semibold text-ink-2 ${FOCUS_RING}`}
            >
              <Heart
                className={`h-4 w-4 ${v.is_favourite ? "fill-wine text-wine" : "text-ink-2"}`}
                strokeWidth={1.5}
                aria-hidden
              />
              Favourite
            </button>
          </div>
        </div>
      </div>
    );
  }

  const topVenues = sorted.slice(0, 3);

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="font-serif italic text-wine">Come as you are, stay as long as you like.</p>
            <h1 className="mt-1 font-serif text-3xl font-medium sm:text-4xl">{greetingText}</h1>
            <p className="mt-2 text-ink-2">Your wedding at a glance · early September 2029</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 shadow-sm">
              <CalendarDays className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />
              <span className="text-sm text-ink-2">
                <b className="font-serif text-base font-semibold text-ink">{daysUntilWedding}</b> days to go
              </span>
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              <p className="text-right font-serif text-[10px] uppercase leading-tight tracking-[0.15em] text-ink-2">
                A more
                <br />
                beautiful
                <br />
                together
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/botanical-accent.png" alt="" aria-hidden className="h-24 w-auto opacity-80" />
            </div>
          </div>
        </div>

        {venues.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
            <h2 className="font-serif text-2xl">Nothing here yet</h2>
            <p className="mt-2 text-ink-2">Start with the six venues from the original research, or add your own.</p>
            <button
              onClick={seed}
              disabled={seeding}
              className={`mt-4 rounded-full bg-sage-deep px-4 py-2 font-semibold text-white disabled:opacity-60 ${FOCUS_RING}`}
            >
              {seeding ? "Adding…" : "Add the 6 shortlisted venues"}
            </button>
            {error && <p className="mt-3 text-sm text-wine">{error}</p>}
          </div>
        ) : (
          <>
            {nextMove && (
              <div
                className="mt-8 flex flex-col gap-4 rounded-2xl p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                style={{ background: "color-mix(in srgb, var(--sage) 14%, var(--paper))" }}
              >
                <div className="flex items-start gap-4">
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-deep font-serif text-base font-semibold text-white">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Your next move</p>
                    <h2 className="mt-1 font-serif text-2xl font-medium sm:text-3xl">{nextMove.title}</h2>
                    <p className="mt-1 text-ink-2">{nextMove.description}</p>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-2">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      {nextMove.person} · {nextMove.effort}
                    </p>
                  </div>
                </div>
                <Link
                  href={nextMove.href}
                  className={`shrink-0 rounded-full bg-sage-deep px-5 py-2.5 text-center text-sm font-semibold text-white ${FOCUS_RING}`}
                >
                  Start task →
                </Link>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 divide-y divide-line rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
              <Link href="/guests" className={`flex items-center gap-3 p-5 ${FOCUS_RING}`}>
                <Users className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                <div className="min-w-0">
                  <p>
                    <b className="font-serif text-xl">{guestTotal}</b> <span className="text-sm text-ink-2">Guests</span>
                  </p>
                  <p className={`text-xs ${guestOver > 0 ? "font-semibold text-wine" : "text-ink-2"}`}>
                    {guestOver > 0 ? `${guestOver} over target` : `${guestAdults} adults + ${guestKids} kids`}
                  </p>
                </div>
              </Link>

              <Link href="/budget" className={`flex items-center gap-3 p-5 ${FOCUS_RING}`}>
                <Wallet className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                <div className="min-w-0">
                  <p>
                    <b className="font-serif text-xl">{stats.lowest}</b> <span className="text-sm text-ink-2">Estimate</span>
                  </p>
                  <p className="text-xs text-ink-2">{Math.round(budgetPct)}% of ceiling</p>
                </div>
              </Link>

              <Link href="#venues" className={`flex items-center gap-3 p-5 ${FOCUS_RING}`}>
                <Landmark className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                <div className="min-w-0">
                  <p>
                    <b className="font-serif text-xl">{stats.active}</b> <span className="text-sm text-ink-2">Venues</span>
                  </p>
                  <p className="text-xs text-ink-2">active</p>
                </div>
              </Link>

              <Link href="#next-actions" className={`flex items-center gap-3 p-5 ${FOCUS_RING}`}>
                <ListChecks className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                <div className="min-w-0">
                  <p>
                    <b className="font-serif text-xl">{actionItems.length + customTasks.length}</b>{" "}
                    <span className="text-sm text-ink-2">Open tasks</span>
                  </p>
                  <p className="text-xs text-ink-2">need attention</p>
                </div>
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-medium">Planning progress</h3>
                    <p className="mt-1 text-sm text-ink-2">Key steps to keep things moving forward.</p>
                  </div>
                  <Link href="/board" className={`shrink-0 text-sm font-semibold text-green rounded ${FOCUS_RING}`}>
                    View roadmap →
                  </Link>
                </div>
                <ol className="mt-4 flex flex-col divide-y divide-line">
                  {roadmap.previousPhaseLabel && (
                    <li className="flex items-center gap-3 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-deep text-xs text-white">✓</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink-2 line-through decoration-ink-2/50">{roadmap.previousPhaseLabel}</p>
                        <p className="text-xs text-ink-2">
                          Step {roadmap.step - 1} of {roadmap.totalSteps}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-ink-2">Completed</span>
                    </li>
                  )}
                  {progressItems.map((item, i) => (
                    <li key={item.title}>
                      <Link href={item.href} className={`flex flex-wrap items-center gap-3 rounded py-3 sm:flex-nowrap ${FOCUS_RING} hover:bg-bg`}>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--sage)_25%,var(--paper))] text-xs font-semibold text-sage-deep">
                          {(roadmap.previousPhaseLabel ? 2 : 1) + i}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-sm text-ink-2">{item.description}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--gold)_20%,var(--paper))] px-2.5 py-1 text-xs font-semibold text-ink">
                          {item.person} · {item.effort}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                      </Link>
                    </li>
                  ))}
                  {!roadmap.previousPhaseLabel && progressItems.length === 0 && (
                    <li className="py-3 text-sm text-ink-2">Nothing urgent — you&apos;re all caught up.</li>
                  )}
                </ol>
              </div>

              <div className="flex flex-col gap-4">
                <Link href="/decide" className={`flex items-center gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--wine)_20%,var(--paper))] p-4 shadow-sm ${CARD_TRANSITION} ${FOCUS_RING}`}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wine text-white">
                    <Heart className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-medium">Decisions waiting</h3>
                    <p className="text-sm text-ink-2">
                      {decisionsWaitingCount === 0
                        ? "You're all caught up"
                        : `${decisionsWaitingCount} private vote${decisionsWaitingCount === 1 ? "" : "s"} need${decisionsWaitingCount === 1 ? "s" : ""} your answer${decisionsWaitingVenue ? ` — ${decisionsWaitingVenue}` : ""}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-wine">Review →</span>
                </Link>

                <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-serif text-lg font-medium">
                      <CalendarClock className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />
                      Upcoming
                    </h3>
                    <button
                      onClick={addEvent}
                      className={`rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}
                    >
                      ＋ Add
                    </button>
                  </div>
                  {events.length === 0 ? (
                    <p className="mt-3 text-sm text-ink-2">Nothing on the calendar yet.</p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-2">
                      {events.map((ev) => (
                        <li key={ev.id} className="flex items-start gap-2 rounded-xl border border-line bg-bg p-2.5">
                          <span className="mt-0.5 shrink-0 rounded-lg bg-[color-mix(in_srgb,var(--sage)_22%,var(--paper))] px-2 py-1 text-center text-xs font-semibold text-green">
                            {formatEventDate(ev.event_date)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <input
                              defaultValue={ev.title}
                              onChange={(e) => scheduleEventSave(ev.id, { title: e.target.value })}
                              className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus:border-line focus:bg-paper"
                            />
                            <div className="flex items-center gap-2 px-1">
                              <input
                                type="date"
                                defaultValue={ev.event_date}
                                onChange={(e) => scheduleEventSave(ev.id, { event_date: e.target.value })}
                                className="rounded border border-transparent bg-transparent text-xs text-ink-2 outline-none focus:border-line focus:bg-paper"
                              />
                              <select
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
                          <button onClick={() => removeEvent(ev.id)} aria-label={`Delete ${ev.title}`} className="shrink-0 text-sm text-wine">×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Link href="/ideas" className={`flex items-center gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--sage)_16%,var(--paper))] p-4 shadow-sm ${CARD_TRANSITION} ${FOCUS_RING}`}>
                  <div className="grid shrink-0 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-xl" style={{ width: 64, height: 64 }}>
                    {ideaThumbs.length === 0 ? (
                      <div className="col-span-2 row-span-2 flex items-center justify-center rounded-xl bg-sage-deep text-lg">📌</div>
                    ) : (
                      ideaThumbs.map((thumb) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={thumb.id} src={normalizeUrl(thumb.image_url)} alt="" className="h-full w-full object-cover" />
                      ))
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-medium">Inspiration Board</h3>
                    <p className="text-sm text-ink-2">
                      {ideaCount} saved idea{ideaCount === 1 ? "" : "s"} across {ideaCollectionCount} collection{ideaCollectionCount === 1 ? "" : "s"}
                    </p>
                    {ideaUndecidedCount > 0 && (
                      <p className="text-sm text-ink-2">
                        {ideaUndecidedCount} idea{ideaUndecidedCount === 1 ? "" : "s"} need{ideaUndecidedCount === 1 ? "s" : ""} a decision
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-green">Open board →</span>
                </Link>
              </div>
            </div>

            <div id="next-actions" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-medium">All tasks</h2>
                <button
                  onClick={addCustomTask}
                  className={`rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}
                >
                  ＋ Add
                </button>
              </div>
              {actionItems.length === 0 && customTasks.length === 0 ? (
                <p className="mt-4 text-sm text-ink-2">Nothing urgent — you&apos;re all caught up.</p>
              ) : (
                <ol className="mt-4 flex flex-col gap-3">
                  {actionItems.slice(0, 3).map((item, i) => (
                    <li
                      key={item.title}
                      className={`flex flex-wrap items-start gap-3 rounded-xl border border-line bg-bg p-3 sm:flex-nowrap ${CARD_TRANSITION} hover:border-sage-deep`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-deep text-xs font-semibold text-white">
                        {i + 1}
                      </span>
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
                      className={`flex flex-wrap items-start gap-2 rounded-xl border border-line bg-bg p-3 transition-all duration-300 motion-reduce:transition-none sm:flex-nowrap hover:border-sage-deep hover:shadow-sm ${
                        completing ? "-translate-x-1 opacity-0" : "opacity-100"
                      }`}
                    >
                      <button
                        onClick={() => completeCustomTask(task.id)}
                        aria-label={`Mark "${task.title}" done`}
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-sage-deep text-xs transition-colors ${
                          completing ? "bg-sage-deep text-white" : "text-transparent hover:bg-[color-mix(in_srgb,var(--sage)_20%,var(--paper))] hover:text-sage-deep"
                        }`}
                      >
                        ✓
                      </button>
                      <div className="min-w-0 flex-1">
                        <input
                          defaultValue={task.title}
                          onChange={(e) => scheduleCustomTaskSave(task.id, { title: e.target.value })}
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-semibold outline-none focus:border-line focus:bg-paper"
                        />
                        <input
                          defaultValue={task.description}
                          onChange={(e) => scheduleCustomTaskSave(task.id, { description: e.target.value })}
                          placeholder="Details…"
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-ink-2 outline-none focus:border-line focus:bg-paper"
                        />
                        <div className="mt-1 flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--gold)_20%,var(--paper))] px-2 py-0.5 text-xs font-semibold text-ink">
                          <input
                            defaultValue={task.person}
                            onChange={(e) => scheduleCustomTaskSave(task.id, { person: e.target.value })}
                            placeholder="Who"
                            className="w-16 min-w-0 bg-transparent outline-none placeholder:font-normal placeholder:text-ink-2"
                          />
                          <span>·</span>
                          <input
                            defaultValue={task.effort}
                            onChange={(e) => scheduleCustomTaskSave(task.id, { effort: e.target.value })}
                            placeholder="Effort"
                            className="w-16 min-w-0 bg-transparent outline-none placeholder:font-normal placeholder:text-ink-2"
                          />
                        </div>
                      </div>
                      <button onClick={() => removeCustomTask(task.id)} aria-label={`Delete ${task.title}`} className="shrink-0 self-center text-sm text-wine">×</button>
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
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sage-deep text-[10px] text-white">✓</span>
                        <span className="truncate line-through decoration-ink-2/50">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            {topVenues.length > 0 && (
              <div className="mt-6">
                <div className="flex items-end justify-between gap-3">
                  <h3 className="font-serif text-lg font-medium">Your shortlist</h3>
                  <Link href="#venues" className={`text-sm font-semibold text-green rounded ${FOCUS_RING}`}>See all →</Link>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {topVenues.map((v, i) => venueCard(v, i))}
                </div>
              </div>
            )}

            <div id="venues" className="mt-10 scroll-mt-20 flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-serif text-2xl font-medium">Venue shortlist</h2>
                <p className="mt-1 text-sm text-ink-2">Choose 2–3 venues to compare side by side</p>
              </div>
              <button onClick={addPlace} className={`rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
                ＋ Add a place
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((v, i) => venueCard(v, i))}
            </div>
          </>
        )}
      </div>

      {compareIds.length >= 2 && (
        <button
          onClick={() => router.push(`/compare?ids=${compareIds.join(",")}`)}
          className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-green px-5 py-3 text-sm font-semibold text-white shadow-md ${FOCUS_RING}`}
        >
          Compare {compareIds.length} venue{compareIds.length === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}
