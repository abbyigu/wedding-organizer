import Link from "next/link";
import { formatMonthYear, type PlanningTask } from "@/lib/planning-tasks";
import { dueLabel, effectiveDate } from "@/lib/planning-timeline";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

type Row = Pick<PlanningTask, "title" | "status" | "due_date" | "period" | "category">;

// A small preview of the Planning Timeline: the next few not-yet-done tasks, by target date.
export default function DashboardTimeline({ tasks, weddingDate }: { tasks: Row[]; weddingDate: string }) {
  const next = tasks
    .filter((t) => t.status !== "done")
    .map((t) => ({ t, d: effectiveDate(t, weddingDate) }))
    .filter((x): x is { t: Row; d: string } => x.d != null)
    .sort((a, b) => a.d.localeCompare(b.d))
    .slice(0, 3);

  return (
    <section className="mt-9" aria-labelledby="dash-timeline-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="dash-timeline-title" className="font-serif text-3xl font-light">Up next</h2>
        <Link href="/board?view=timeline" className={`rounded text-[11px] font-semibold uppercase tracking-[0.2em] text-surface-rose ${FOCUS_RING}`}>
          View timeline <span aria-hidden>→</span>
        </Link>
      </div>
      {next.length === 0 ? (
        <p className="mt-3 text-ink-2">
          Your planning timeline will show what&apos;s coming up here.{" "}
          <Link href="/board?view=timeline" className="font-semibold text-sage-deep underline underline-offset-2">Start with the suggested plan</Link>
        </p>
      ) : (
        <ul className="mt-4 grid gap-6 sm:grid-cols-3">
          {next.map(({ t, d }) => (
            <li key={t.title + d} className="border-t border-line pt-4">
              <p className="font-serif text-xl leading-snug">{t.title}</p>
              <p className={`mt-1 text-sm ${dueLabel(d) === "Overdue" ? "font-semibold text-wine" : "text-ink-2"}`}>
                {dueLabel(d)} · {formatMonthYear(d)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
