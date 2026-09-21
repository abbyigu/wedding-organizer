import Link from "next/link";
import { Check } from "lucide-react";
import TimelineAxis from "@/components/TimelineAxis";
import { currentMilestoneMonths, MILESTONES, milestoneState } from "@/lib/planning-timeline";
import type { PlanningTask } from "@/lib/planning-tasks";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

// A compact read of the Planning Board's Timeline view: where you are, and how each stage is going.
export default function DashboardTimeline({ tasks, daysToGo }: { tasks: Pick<PlanningTask, "category" | "status">[]; daysToGo: number }) {
  const current = currentMilestoneMonths(daysToGo);
  const now = MILESTONES.find((m) => m.months === current);
  return (
    <section className="mt-9" aria-labelledby="dash-timeline-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dash-timeline-title" className="font-serif text-3xl font-light">Your planning timeline</h2>
          <p className="mt-1 text-ink-2">{now ? `Right now: ${now.title.toLowerCase()}.` : "Your first stage opens 24 months before the wedding."}</p>
        </div>
        <Link href="/board?view=timeline" className={`rounded text-[11px] font-semibold uppercase tracking-[0.2em] text-surface-rose ${FOCUS_RING}`}>
          Open full timeline <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="mt-4 rounded-3xl border border-line bg-paper p-5 shadow-sm sm:p-6">
        <TimelineAxis daysToGo={daysToGo} />
        <ol className="mt-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {MILESTONES.map((m) => {
            const { open, state, opensIn } = milestoneState(m, tasks, daysToGo, current ?? -1);
            const label =
              state === "due" ? `Due now · ${open.length} open`
              : state === "behind" ? `Behind · ${open.length} open`
              : state === "done" ? "Done"
              : state === "empty" ? "Nothing planned"
              : state === "final" ? "You're here"
              : `Opens in ${opensIn} mo`;
            return (
              <li key={m.months} className={`rounded-2xl bg-bg p-3 ${state === "due" ? "ring-2 ring-surface-wine/40" : ""}`}>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-2">{m.months === 0 ? "Final month" : `${m.months} months`}</p>
                <p className="mt-1 font-serif text-base leading-snug">{m.title}</p>
                <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${state === "due" ? "text-wine" : state === "behind" ? "text-wine" : state === "done" || state === "final" ? "text-sage-deep" : "text-ink-2"}`}>
                  {state === "done" && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
                  {label}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
