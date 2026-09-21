"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, Circle, CircleCheck, CircleHelp, Hourglass, Plus } from "lucide-react";
import TimelineAxis from "@/components/TimelineAxis";
import { categoryColor, CATEGORIES, formatMonthYear, STATUS_LABELS, type PlanningTask } from "@/lib/planning-tasks";
import { daysBefore, effectiveDate, PERIODS, PLAN, periodByKey, periodOfDays, periodOfTask, periodRange, recalcUpdates, todayISO, type PeriodKey } from "@/lib/planning-timeline";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const QUICK = ["Venue", "Vendors", "Guests", "Attire", "Décor & Florals", "DIY", "Stationery", "Wedding Day"];
const MORE = CATEGORIES.filter((c) => !QUICK.includes(c));
const PHOTO_AFTER: Partial<Record<PeriodKey, { src: string; script: string }>> = {
  big: { src: "/photo-candlelit-table.jpg", script: "Everything else follows the place." },
  diy: { src: "/photo-flower-table.jpg", script: "Made by hand, with love." },
};

function StatusGlyph({ status }: { status: PlanningTask["status"] }) {
  const cls = "h-[22px] w-[22px]";
  if (status === "done") return <CircleCheck className={`${cls} fill-[color-mix(in_srgb,var(--sage)_30%,transparent)] text-sage-deep`} strokeWidth={1.75} aria-hidden />;
  if (status === "in_progress")
    return (
      <svg viewBox="0 0 24 24" className={`${cls} text-ink-2`} aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
      </svg>
    );
  if (status === "waiting") return <Hourglass className={`${cls} text-ink-2`} strokeWidth={1.5} aria-hidden />;
  if (status === "decision_needed") return <CircleHelp className={`${cls} text-ink-2`} strokeWidth={1.5} aria-hidden />;
  return <Circle className={`${cls} text-ink-2`} strokeWidth={1.5} aria-hidden />;
}

function Who({ v }: { v: PlanningTask["assigned_to"] }) {
  const dot = (l: string) => <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-paper bg-surface-sage-deep text-[10px] font-semibold text-white">{l}</span>;
  return (
    <span className="flex -space-x-1.5" title={v === "together" ? "Both of us" : v === "ariel" ? "Ariel" : "Fred"}>
      {v === "together" ? <>{dot("A")}{dot("F")}</> : dot(v === "ariel" ? "A" : "F")}
    </span>
  );
}

export default function Timeline({
  tasks,
  weddingDate,
  daysToGo,
  busy,
  onOpenTask,
  onToggleDone,
  onAdd,
  onSeed,
  onRecalc,
}: {
  tasks: PlanningTask[];
  weddingDate: string;
  daysToGo: number;
  busy: string;
  onOpenTask: (id: string) => void;
  onToggleDone: (t: PlanningTask) => void;
  onAdd: () => void;
  onSeed: (kind: "plan" | "decor") => void;
  onRecalc: () => void;
}) {
  const [category, setCategory] = useState("All");
  const [who, setWho] = useState<"all" | "ariel" | "fred" | "together">("all");
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const today = todayISO();

  const done = tasks.filter((t) => t.status === "done").length;
  const dated = (t: PlanningTask) => effectiveDate(t, weddingDate);

  // The next things to do: not done, soonest target first (anything already past comes first).
  const next = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "done" && dated(t))
        .sort((a, b) => dated(a)!.localeCompare(dated(b)!) || a.sort_order - b.sort_order)
        .slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, weddingDate],
  );

  const filtered = tasks.filter((t) => {
    if (category !== "All" && t.category !== category) return false;
    if (who === "ariel" || who === "fred") {
      if (t.assigned_to !== who && t.assigned_to !== "together") return false;
    } else if (who === "together" && t.assigned_to !== "together") return false;
    if (upcomingOnly && t.status === "done") return false;
    return true;
  });

  const byPeriod = new Map<string, PlanningTask[]>();
  for (const t of filtered) {
    const key = periodOfTask(t, weddingDate);
    byPeriod.set(key, [...(byPeriod.get(key) ?? []), t]);
  }
  for (const list of byPeriod.values()) list.sort((a, b) => (dated(a) ?? "9").localeCompare(dated(b) ?? "9") || a.sort_order - b.sort_order);

  const currentKey = periodOfDays(daysBefore(today, weddingDate)).key;
  const hasPlan = tasks.some((t) => t.template_key?.startsWith("plan:"));
  const hasDecor = tasks.some((t) => t.template_key?.startsWith("decor:"));
  const staleCount = recalcUpdates(tasks, weddingDate).length;
  const onTheDay = tasks.filter((t) => periodOfTask(t, weddingDate) !== "day" && Object.values(t.wedding_day ?? {}).some(Boolean));

  const sections = [...PERIODS.map((p) => p.key as string), "unscheduled"].filter((k) => k === "day" || (byPeriod.get(k)?.length ?? 0) > 0);
  const pill = (on: boolean) => `rounded-full border px-4 py-1.5 text-sm ${FOCUS_RING} ${on ? "border-surface-green bg-surface-green text-white" : "border-line bg-paper text-ink hover:border-sage-deep"}`;

  function taskRow(t: PlanningTask) {
    const d = dated(t);
    const behind = t.status !== "done" && d != null && d < today;
    return (
      <li key={t.id} className="flex items-start gap-3 py-2">
        <button
          onClick={() => onToggleDone(t)}
          aria-label={t.status === "done" ? `Mark “${t.title}” not done` : `Mark “${t.title}” done`}
          className={`mt-0.5 shrink-0 rounded-full pointer-coarse:p-2 ${FOCUS_RING}`}
        >
          <StatusGlyph status={t.status} />
        </button>
        <button onClick={() => onOpenTask(t.id)} className={`min-w-0 flex-1 rounded text-left ${FOCUS_RING}`}>
          <span className={`block leading-snug ${t.status === "done" ? "text-ink-2 line-through decoration-ink-2/40" : "text-ink"}`}>{t.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: categoryColor(t.category) }} />
            {t.category}
            {d && <span>· {formatMonthYear(d)}</span>}
            {t.status !== "done" && t.status !== "todo" && <span>· {STATUS_LABELS[t.status]}</span>}
            {(t.tags ?? []).length > 0 && <span>· {(t.tags ?? []).join(", ")}</span>}
            {behind && <span className="font-semibold text-wine">· Behind</span>}
          </span>
        </button>
        <Who v={t.assigned_to} />
      </li>
    );
  }

  return (
    <section className="mt-6" aria-labelledby="timeline-title">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-ink-2">Our wedding journey</p>
          <h2 id="timeline-title" className="mt-2 font-serif text-3xl font-light">Your Wedding Planning Timeline</h2>
          <TimelineAxis daysToGo={daysToGo} />
          <div className="mt-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink-2">Planning progress</span>
              <span className="text-ink">
                <b className="font-serif text-xl font-light">{done}</b> of {tasks.length} tasks complete
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={tasks.length} aria-label="Tasks complete">
              <div className="h-full rounded-full bg-sage-deep" style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} />
            </div>
            {next[0] && (
              <p className="mt-4 text-sm text-ink-2">
                Next milestone: <span className="font-medium text-ink">{next[0].title}</span> · due {formatMonthYear(dated(next[0])!)}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-[color-mix(in_srgb,var(--sage)_16%,var(--paper))] p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-ink-2">What&apos;s next</p>
          {next.length === 0 ? (
            <p className="mt-3 text-sm text-ink-2">{tasks.length === 0 ? "Add the suggested plan below and your next steps will appear here." : "Nothing is waiting on a date — you're all caught up."}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {next.map((t) => {
                const d = dated(t)!;
                return (
                  <li key={t.id}>
                    <button onClick={() => onOpenTask(t.id)} className={`block w-full rounded text-left ${FOCUS_RING}`}>
                      <span className="block font-serif text-lg leading-snug">{t.title}</span>
                      <span className={`text-sm ${d < today ? "font-semibold text-wine" : "text-ink-2"}`}>{d < today ? `Behind · ${formatMonthYear(d)}` : formatMonthYear(d)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {!hasPlan && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-paper p-5">
          <div className="max-w-xl">
            <p className="font-serif text-xl">Start with a suggested plan</p>
            <p className="mt-1 text-sm text-ink-2">
              About {PLAN.length} classic planning tasks, spread from 24 months out to after the wedding, with target dates worked out from your wedding day. They join your Planning Board as normal tasks — edit, move or delete any of them.
            </p>
          </div>
          <button onClick={() => onSeed("plan")} disabled={Boolean(busy)} className={`rounded-full bg-surface-wine px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 ${FOCUS_RING}`}>
            {busy === "plan" ? "Adding…" : "Add the suggested plan"}
          </button>
        </div>
      )}
      {staleCount > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold bg-[color-mix(in_srgb,var(--gold)_12%,var(--paper))] p-5">
          <p className="max-w-xl text-sm text-ink">
            Your wedding date has changed since these dates were suggested. {staleCount} suggested date{staleCount === 1 ? "" : "s"} can be recalculated — dates you chose yourselves stay exactly as they are.
          </p>
          <button onClick={onRecalc} disabled={Boolean(busy)} className={`rounded-full bg-surface-green px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60 ${FOCUS_RING}`}>
            {busy === "recalc" ? "Recalculating…" : "Recalculate suggested dates"}
          </button>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filter the timeline">
        {["All", ...QUICK].map((c) => (
          <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className={pill(category === c)}>
            {c}
          </button>
        ))}
        <select aria-label="More categories" value={MORE.includes(category as (typeof MORE)[number]) ? category : ""} onChange={(e) => e.target.value && setCategory(e.target.value)} className={`${pill(MORE.includes(category as (typeof MORE)[number]))} pr-3`}>
          <option value="">More</option>
          {MORE.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={() => setUpcomingOnly((v) => !v)} aria-pressed={upcomingOnly} className={pill(upcomingOnly)}>
          Show only upcoming
        </button>
        <div role="group" aria-label="Whose tasks" className="flex rounded-full border border-line bg-paper p-1">
          {([["all", "Everyone"], ["ariel", "Ariel"], ["fred", "Fred"], ["together", "Both"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setWho(k)} aria-pressed={who === k} className={`rounded-full px-3.5 py-1 text-sm ${FOCUS_RING} ${who === k ? "bg-surface-sage-deep text-white" : "text-ink hover:bg-bg"}`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={onAdd} className={`ml-auto flex items-center gap-2 rounded-full bg-surface-wine px-5 py-2 text-sm font-medium text-white ${FOCUS_RING}`}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Add task
        </button>
      </div>
      {!hasDecor && (
        <p className="mt-3 text-sm text-ink-2">
          Planning décor and florals?{" "}
          <button onClick={() => onSeed("decor")} disabled={Boolean(busy)} className={`rounded font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>
            {busy === "decor" ? "Adding…" : "Add the Décor & Florals checklist"}
          </button>{" "}
          — arch, aisle, centerpieces, bouquets and more, as ideas you can date whenever you&apos;re ready.
        </p>
      )}

      {tasks.length > 0 && filtered.length === 0 && <p className="mt-10 text-ink-2">No tasks match these filters.</p>}

      <ol className="relative mt-10 flex flex-col gap-10 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line">
        {sections.map((key) => {
          const p = periodByKey(key);
          const list = byPeriod.get(key) ?? [];
          const complete = list.length > 0 && list.every((t) => t.status === "done");
          const isOpen = open[key] ?? !complete;
          const doneN = list.filter((t) => t.status === "done").length;
          const isNow = key === currentKey;
          const isDay = key === "day";
          const photo = PHOTO_AFTER[key as PeriodKey];
          return (
            <li key={key} className="relative pl-9">
              <span
                aria-hidden
                className={`absolute left-0 top-2 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 ${
                  complete ? "border-sage-deep bg-sage-deep text-white" : isNow ? "border-wine bg-wine" : "border-line bg-paper"
                }`}
              >
                {complete && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>

              <div className={complete && !isOpen ? "opacity-70" : ""}>
                <button
                  onClick={() => list.length > 0 && setOpen((o) => ({ ...o, [key]: !isOpen }))}
                  aria-expanded={list.length > 0 ? isOpen : undefined}
                  className={`flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded text-left ${FOCUS_RING} ${list.length ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span>
                    <span className="block text-[11px] font-medium uppercase tracking-[0.24em] text-ink-2">
                      {p ? p.label : "Unscheduled"}
                      {isNow && <span className="ml-3 rounded-full bg-surface-wine px-2.5 py-0.5 tracking-[0.16em] text-white">Now</span>}
                    </span>
                    <span className={`mt-1 block font-serif font-light ${isDay ? "text-4xl" : "text-2xl"}`}>{complete && !isOpen ? `✓ ${p?.title}` : p ? p.title : "Not dated yet"}</span>
                  </span>
                  <span className="flex items-center gap-3 text-sm text-ink-2">
                    {p ? periodRange(p, weddingDate) : "Give these a target date to place them"}
                    {list.length > 0 && (
                      <>
                        <span className={complete ? "font-semibold text-sage-deep" : ""}>{doneN}/{list.length} complete</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.75} aria-hidden />
                      </>
                    )}
                  </span>
                </button>

                {complete && !isOpen && <p className="mt-1 text-sm text-ink-2">View completed tasks</p>}

                {isOpen && list.length > 0 && <ul className="mt-2 divide-y divide-line/60">{list.map(taskRow)}</ul>}

                {isDay && (
                  <div className="mt-3 text-sm text-ink-2">
                    <p>
                      Planning ends here — the day itself is run from{" "}
                      <Link href="/wedding-day" className={`inline-flex items-center gap-1 rounded font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>
                        Wedding Day <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      </Link>
                      .
                    </p>
                    {onTheDay.length > 0 && (
                      <ul className="mt-3 divide-y divide-line/60 text-ink">
                        {onTheDay.map((t) => (
                          <li key={t.id} className="py-2">
                            <button onClick={() => onOpenTask(t.id)} className={`block w-full rounded text-left ${FOCUS_RING}`}>
                              <span className="block">{t.title}</span>
                              <span className="text-sm text-ink-2">
                                {[t.wedding_day?.location, t.wedding_day?.person && `Setup by ${t.wedding_day.person}`, t.wedding_day?.ready_by && `Ready by ${t.wedding_day.ready_by}`].filter(Boolean).join(" · ")}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {photo && (
                <figure className="relative mt-8 overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src} alt="" loading="lazy" className="h-44 w-full object-cover sm:h-56" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/45 to-transparent" />
                  <figcaption className="absolute bottom-4 left-5 -rotate-2 font-script text-3xl text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">{photo.script}</figcaption>
                </figure>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
