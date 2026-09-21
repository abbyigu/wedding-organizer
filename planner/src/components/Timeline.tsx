"use client";

import { useState, type ComponentType } from "react";
import {
  Camera,
  Cake,
  Check,
  ChevronDown,
  Flower2,
  Gem,
  Gift,
  Heart,
  Landmark,
  ListChecks,
  Mail,
  Plus,
  Shirt,
  Sparkles,
  Users,
} from "lucide-react";
import {
  formatDueDate,
  STATUS_LABELS,
  type PlanningTask,
} from "@/lib/planning-tasks";
import {
  axisPosition,
  currentMilestoneMonths,
  MILESTONES,
  milestoneState,
  type MilestoneState,
} from "@/lib/planning-timeline";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;
const ICONS: Record<string, Icon> = {
  venue: Landmark,
  camera: Camera,
  mail: Mail,
  cake: Cake,
  flower: Flower2,
  shirt: Shirt,
  sparkles: Sparkles,
  gem: Gem,
  users: Users,
  heart: Heart,
  gift: Gift,
  list: ListChecks,
};

const TINTS = [
  "var(--surface-blush)",
  "var(--sage)",
  "var(--gold)",
  "var(--surface-rose)",
  "var(--sage)",
  "var(--gold)",
  "var(--surface-blush)",
];
const PHOTOS: Record<number, string> = {
  24: "/photo-candlelit-table.jpg",
  0: "/photo-flower-table.jpg",
};

const axisLabel = (months: number) =>
  months === 0
    ? "♡"
    : months === 12 || months >= 18
      ? `${months}m`
      : `${months}m`;

function StatePill({
  state,
  open,
  opensIn,
}: {
  state: MilestoneState;
  open: number;
  opensIn: number;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold";
  switch (state) {
    case "due":
      return (
        <span className={`${base} bg-surface-wine text-white`}>
          Due now · {open} open
        </span>
      );
    case "behind":
      return (
        <span className={`${base} border border-wine text-wine`}>
          Behind · {open} open
        </span>
      );
    case "done":
      return (
        <span className={`${base} bg-surface-olive text-white`}>
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden /> Done
        </span>
      );
    case "empty":
      return (
        <span className={`${base} bg-paper text-ink-2`}>
          Nothing planned yet
        </span>
      );
    case "final":
      return (
        <span className={`${base} bg-surface-olive text-white`}>
          You&apos;re here
        </span>
      );
    default:
      return (
        <span className={`${base} bg-paper text-ink-2`}>
          Opens in {opensIn} month{opensIn === 1 ? "" : "s"}
        </span>
      );
  }
}

export default function Timeline({
  tasks,
  daysToGo,
  onOpenTask,
  onAddTask,
}: {
  tasks: PlanningTask[];
  daysToGo: number;
  onOpenTask: (id: string) => void;
  onAddTask: (category: string) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const current = currentMilestoneMonths(daysToGo);
  const pos = axisPosition(daysToGo);

  return (
    <section className="mt-6" aria-labelledby="timeline-title">
      <h2 id="timeline-title" className="font-serif text-3xl font-light">
        Your Wedding Planning Timeline
      </h2>
      <p className="mt-1 text-ink-2">
        From “we&apos;re getting married!” to “today&apos;s the day.”
      </p>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="relative mx-14 min-w-[34rem] pb-14 pt-2">
          <div className="absolute left-0 right-0 top-[1.15rem] h-px bg-line" />
          <div
            className="absolute left-0 top-[1.15rem] h-px bg-sage-deep"
            style={{ width: `${pos * 100}%` }}
          />
          <ol className="relative flex justify-between">
            {MILESTONES.map((m) => {
              const months = m.months === 0 ? 1 : m.months;
              const passed = daysToGo / 30.44 <= months;
              return (
                <li key={m.months} className="flex w-0 flex-col items-center">
                  <span
                    className={`h-3 w-3 rounded-full border-2 ${passed ? "border-sage-deep bg-sage-deep" : "border-line bg-paper"}`}
                  />
                  <span className="mt-2 whitespace-nowrap text-sm text-ink-2">
                    {axisLabel(months)}
                  </span>
                </li>
              );
            })}
            <li className="flex w-0 flex-col items-center">
              <span className="h-3 w-3 rounded-full border-2 border-line bg-paper" />
              <span className="mt-2 text-sm text-ink-2">♡</span>
            </li>
          </ol>
          <div
            className="absolute top-[0.35rem] flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${pos * 100}%` }}
          >
            <span className="h-4 w-4 rounded-full border-2 border-paper bg-surface-wine shadow-sm" />
            <span className="mt-[1.9rem] whitespace-nowrap rounded-full bg-surface-wine px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              You are here
            </span>
          </div>
        </div>
      </div>

      <ol className="mt-4 flex flex-col gap-5">
        {MILESTONES.map((m, i) => {
          const { related, open, state, opensIn } = milestoneState(
            m,
            tasks,
            daysToGo,
            current ?? -1,
          );
          const isOpen = expanded === m.months;
          const photo = PHOTOS[m.months];
          const panelId = `milestone-${m.months}`;
          return (
            <li
              key={m.months}
              className="grid gap-3 md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-6"
            >
              <div className="flex items-baseline gap-2 md:flex-col md:items-end md:gap-0 md:pt-6 md:text-right">
                <p className="font-serif text-4xl font-light leading-none">
                  {m.months === 0 ? "Final" : m.months}
                </p>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-2">
                  {m.months === 0 ? "month" : "months"}
                </p>
              </div>
              <div
                className={`overflow-hidden rounded-2xl ${state === "upcoming" ? "opacity-80" : ""}`}
                style={{
                  background: `color-mix(in srgb, ${TINTS[i]} 18%, var(--paper))`,
                }}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 p-5">
                      <button
                        onClick={() =>
                          m.categories.length &&
                          setExpanded(isOpen ? null : m.months)
                        }
                        aria-expanded={m.categories.length ? isOpen : undefined}
                        aria-controls={
                          m.categories.length ? panelId : undefined
                        }
                        className={`flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3 rounded text-left ${FOCUS_RING} ${m.categories.length ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-ink-2">
                            {m.title}
                          </p>
                          {m.items.length > 0 && (
                            <ul className="mt-3 flex flex-wrap gap-2">
                              {m.items.map((it) => {
                                const Ic = ICONS[it.icon] ?? Sparkles;
                                return (
                                  <li
                                    key={it.label}
                                    className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-sm text-ink"
                                  >
                                    <Ic
                                      className="h-4 w-4 text-ink-2"
                                      strokeWidth={1.5}
                                      aria-hidden
                                    />
                                    {it.label}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {m.note && (
                            <p className="mt-3 -rotate-1 font-script text-2xl leading-tight text-sage-deep">
                              {m.note}
                            </p>
                          )}
                        </div>
                        <span className="flex items-center gap-2">
                          <StatePill
                            state={state}
                            open={open.length}
                            opensIn={opensIn}
                          />
                          {m.categories.length > 0 && (
                            <ChevronDown
                              className={`h-4 w-4 text-ink-2 transition-transform ${isOpen ? "rotate-180" : ""}`}
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          )}
                        </span>
                      </button>
                      <button
                        onClick={() => onAddTask(m.categories[0] ?? "Other")}
                        aria-label={`Add a ${m.categories[0] ?? "new"} task to ${m.title}`}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-wine text-white ${FOCUS_RING}`}
                      >
                        <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                    {isOpen && (
                      <div
                        id={panelId}
                        className="border-t border-line/70 px-5 pb-5 pt-4"
                      >
                        {related.length === 0 ? (
                          <p className="text-sm text-ink-2">
                            No {m.categories.join(" / ")} tasks on your board
                            yet.
                          </p>
                        ) : (
                          <ul className="flex flex-col gap-1.5">
                            {related.map((t) => (
                              <li key={t.id}>
                                <button
                                  onClick={() => onOpenTask(t.id)}
                                  className={`flex w-full items-center gap-3 rounded-xl bg-paper px-4 py-2.5 text-left text-sm ${FOCUS_RING}`}
                                >
                                  {t.status === "done" ? (
                                    <Check
                                      className="h-4 w-4 shrink-0 text-sage-deep"
                                      strokeWidth={2.25}
                                      aria-hidden
                                    />
                                  ) : (
                                    <span
                                      className="h-4 w-4 shrink-0 rounded-full border border-line"
                                      aria-hidden
                                    />
                                  )}
                                  <span
                                    className={`min-w-0 flex-1 ${t.status === "done" ? "text-ink-2 line-through" : "font-medium text-ink"}`}
                                  >
                                    {t.title}
                                  </span>
                                  <span className="shrink-0 text-xs text-ink-2">
                                    {STATUS_LABELS[t.status]}
                                    {t.due_date
                                      ? ` · ${formatDueDate(t.due_date)}`
                                      : ""}
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      loading="lazy"
                      className="h-40 w-full object-cover md:h-auto md:w-56"
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
