import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  Flower2,
  MoreHorizontal,
  Plane,
  Shirt,
  UtensilsCrossed,
} from "lucide-react";
import { BUDGET_CEILING, fmt, resolveAssumptions, type BudgetSettings, type Venue } from "@/lib/venues";
import { computeBreakdown, formatDueDate, paymentStatus, type BudgetExpense, type BudgetGroup, type Payment } from "@/lib/budget-extras";

const GROUP_ICONS: Record<BudgetGroup, typeof UtensilsCrossed> = {
  "Venue & catering": UtensilsCrossed,
  "Photography & video": Camera,
  "Flowers & décor": Flower2,
  "Attire & beauty": Shirt,
  "Travel & accommodation": Plane,
  Other: MoreHorizontal,
};

export default function BudgetOverview({
  venues,
  settings,
  guestSummary,
  expenses,
  payments,
}: {
  venues: Venue[];
  settings: BudgetSettings;
  guestSummary: { adults: number; kids: number; confirmedAdults: number; confirmedKids: number };
  expenses: BudgetExpense[];
  payments: Payment[];
}) {
  if (venues.length === 0) {
    return <p className="text-ink-2">No venues yet — add some from the venue shortlist first.</p>;
  }

  const as = resolveAssumptions(settings, guestSummary);
  const cur = venues.find((v) => v.is_final) ?? venues.filter((v) => v.status !== "out")[0] ?? venues[0];
  const breakdown = computeBreakdown(cur, as, settings.shared_line_amounts, expenses);
  const ceilingPct = Math.min(100, Math.round((breakdown.grand / BUDGET_CEILING) * 100));
  const remaining = BUDGET_CEILING - breakdown.grand;

  const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const owed = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const upcoming = [...payments]
    .filter((p) => p.status !== "paid")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 3);
  const overdueCount = payments.filter((p) => paymentStatus(p) === "overdue").length;

  const leader = [...breakdown.groups].sort((a, b) => b.total - a.total)[0];

  const risks: string[] = [];
  if (!cur.is_final) risks.push("No venue marked as final yet — this overview is based on the cheapest active option.");
  if (cur.is_final && !cur.quote_received) risks.push(`${cur.name} hasn't sent a complete quote yet — the total below is still an estimate.`);
  if (breakdown.grand > BUDGET_CEILING) risks.push(`Estimated total is ${fmt(breakdown.grand - BUDGET_CEILING)} over your preferred ceiling.`);
  if (overdueCount > 0) risks.push(`${overdueCount} payment${overdueCount === 1 ? "" : "s"} overdue.`);
  const emptyGroup = breakdown.groups.find((g) => g.total === 0 && g.name !== "Other");
  if (emptyGroup) risks.push(`No costs recorded yet for ${emptyGroup.name}.`);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Estimated total</p>
          <b className="mt-1 block font-serif text-2xl">{fmt(breakdown.grand)}</b>
          <p className="text-sm text-ink-2">{fmt(breakdown.perGuest)} per guest</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Preferred ceiling</p>
          <b className={`mt-1 block font-serif text-2xl ${remaining < 0 ? "text-wine" : ""}`}>{fmt(Math.abs(remaining))}</b>
          <p className="text-sm text-ink-2">{remaining >= 0 ? "remaining" : "over ceiling"} · {ceilingPct}% used</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Paid so far</p>
          <b className="mt-1 block font-serif text-2xl">{fmt(paid)}</b>
          <p className="text-sm text-ink-2">of {fmt(paid + owed)} committed</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Still owed</p>
          <b className={`mt-1 block font-serif text-2xl ${overdueCount > 0 ? "text-wine" : ""}`}>{fmt(owed)}</b>
          <p className="text-sm text-ink-2">{overdueCount > 0 ? `${overdueCount} overdue` : "on track"}</p>
        </div>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${remaining >= 0 ? "bg-sage-deep" : "bg-wine"}`} style={{ width: `${ceilingPct}%` }} />
      </div>

      {leader && (
        <div className="rounded-2xl bg-[color-mix(in_srgb,var(--sage)_16%,var(--paper))] p-5 shadow-sm">
          <p className="text-sm text-ink">
            <span aria-hidden>🌿</span> Largest cost driver: <b>{leader.name}</b> · {leader.pct}% of your budget — based on {cur.name}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h2 className="font-serif text-xl font-medium">Category breakdown</h2>
          <div className="mt-4 flex flex-col gap-3">
            {breakdown.groups.map((g) => {
              const Icon = GROUP_ICONS[g.name];
              return (
                <div key={g.name} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                  <span className="w-40 shrink-0 text-sm">{g.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-sage-deep" style={{ width: `${g.pct}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm font-semibold">{fmt(g.total)}</span>
                  <span className="w-10 shrink-0 text-right text-xs text-ink-2">{g.pct}%</span>
                </div>
              );
            })}
          </div>
          <Link href="/budget/builder" className="mt-4 inline-block text-sm font-semibold text-sage-deep underline underline-offset-2">
            Open the budget builder →
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-medium">Upcoming payments</h2>
              <Link href="/budget/payments" className="text-sm font-semibold text-green">View all →</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-ink-2">Nothing due — you&apos;re all caught up.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {upcoming.map((p) => {
                  const status = paymentStatus(p);
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg p-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{p.label}</p>
                        <p className="text-xs text-ink-2">{p.due_date ? formatDueDate(p.due_date) : "No due date"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{fmt(p.amount)}</p>
                        {status === "overdue" && <p className="text-xs font-semibold text-wine">Overdue</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {risks.length > 0 && (
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-serif text-lg font-medium">
                <AlertTriangle className="h-4 w-4 text-gold" strokeWidth={1.5} aria-hidden />
                Worth a look
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
                {risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
