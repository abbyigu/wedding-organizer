import { axisPosition, AXIS_MONTHS } from "@/lib/planning-timeline";

// 24 months ── … ── Wedding Day, with a "You are here" marker placed from the real wedding date.
export default function TimelineAxis({ daysToGo }: { daysToGo: number }) {
  const pos = axisPosition(daysToGo);
  const left = daysToGo / 30.44;
  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative mx-14 min-w-[34rem] pb-14 pt-2">
        <div className="absolute left-0 right-0 top-[1.15rem] h-px bg-line" />
        <div className="absolute left-0 top-[1.15rem] h-px bg-sage-deep" style={{ width: `${pos * 100}%` }} />
        <ol className="relative flex justify-between">
          {AXIS_MONTHS.map((m) => (
            <li key={m} className="flex w-0 flex-col items-center">
              <span className={`h-3 w-3 rounded-full border-2 ${left <= m ? "border-sage-deep bg-sage-deep" : "border-line bg-paper"}`} />
              <span className="mt-2 whitespace-nowrap text-sm text-ink-2">{m === 0 ? "♡" : `${m}m`}</span>
            </li>
          ))}
        </ol>
        <div className="absolute top-[0.35rem] flex -translate-x-1/2 flex-col items-center" style={{ left: `${pos * 100}%` }}>
          <span className="h-4 w-4 rounded-full border-2 border-paper bg-surface-wine shadow-sm" />
          <span className="mt-[1.9rem] whitespace-nowrap rounded-full bg-surface-wine px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">You are here</span>
        </div>
      </div>
    </div>
  );
}
