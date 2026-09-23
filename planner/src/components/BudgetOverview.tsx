import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Calculator,
  Camera,
  CreditCard,
  Flower2,
  MoreHorizontal,
  PiggyBank,
  Plane,
  ReceiptText,
  Shirt,
  Tag,
  Users,
  UtensilsCrossed,
  PieChart,
  Hammer,
  PartyPopper,
} from "lucide-react";
import BudgetActions from "@/components/BudgetActions";
import BudgetNotes, { type BudgetNote } from "@/components/BudgetNotes";
import { BUDGET_CEILING, fmt, resolveAssumptions, type BudgetSettings, type Venue } from "@/lib/venues";
import { computeBreakdown, formatDueDate, type BudgetExpense, type BudgetGroup, type LinkedCost, type Payment } from "@/lib/budget-extras";
import { isOverdue, paymentTotals, paymentVenue, planPayments } from "@/lib/payment-plan";
import type { PlanSummary } from "@/lib/plan";
import { Heart } from "lucide-react";
import type { HoneymoonSummary } from "@/lib/honeymoon";

const GROUP_ICONS: Record<BudgetGroup, typeof UtensilsCrossed> = {
  "Venue & catering": UtensilsCrossed,
  "Photography & video": Camera,
  "Flowers & décor": Flower2,
  "Attire & beauty": Shirt,
  "Travel & accommodation": Plane,
  "DIY projects": Hammer,
  "Wedding weekend": PartyPopper,
  Other: MoreHorizontal,
};

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function BudgetOverview({
  venues,
  settings,
  guestSummary,
  expenses,
  payments,
  notes,
  notesMissing,
  linked,
  plan,
  honeymoon,
  together,
}: {
  venues: Venue[];
  settings: BudgetSettings;
  guestSummary: { adults: number; kids: number; confirmedAdults: number; confirmedKids: number };
  expenses: BudgetExpense[];
  payments: Payment[];
  notes: BudgetNote[];
  notesMissing: boolean;
  linked: LinkedCost[];
  plan: PlanSummary | null;
  honeymoon: HoneymoonSummary | null;
  together: boolean;
}) {
  if (venues.length === 0) {
    return <p className="text-ink-2">No venues yet — add some from the venue shortlist first.</p>;
  }

  const as = resolveAssumptions(settings, guestSummary);
  const cur = venues.find((v) => v.is_final) ?? venues.filter((v) => v.status !== "out")[0] ?? venues[0];
  const breakdown = computeBreakdown(cur, as, settings.shared_line_amounts, expenses, linked);
  // With an Active Wedding Plan the plan's numbers lead; otherwise it's the venue estimate as before.
  const grand = plan ? plan.projected : breakdown.grand;
  const perGuest = plan ? plan.perGuest : breakdown.perGuest;
  const target = plan ? plan.target : BUDGET_CEILING;
  const groups = plan ? plan.groups.map((g) => ({ name: g.name, total: g.total, pct: plan.projected ? Math.round((g.total / plan.projected) * 100) : 0 })) : breakdown.groups;
  const ceilingPct = Math.min(100, Math.round((grand / target) * 100));
  const remaining = target - grand;

  const today = new Date().toISOString().slice(0, 10);
  const items = planPayments(payments, paymentVenue(venues, plan?.venueId ?? null));
  const totals = paymentTotals(items, today);
  const paid = totals.paid;
  const owed = totals.owed;
  const upcoming = totals.unpaid.slice(0, 3);
  const overdueCount = totals.overdue.length;

  const leader = [...groups].sort((a, b) => b.total - a.total)[0];

  const risks: string[] = [];
  if (plan) {
    if (plan.unknownCount > 0) risks.push(`${plan.unknownCount} cost${plan.unknownCount === 1 ? " is" : "s are"} still unknown in ${plan.name}, so the total is a minimum.`);
    if (!plan.venueName) risks.push(`${plan.name} has no venue yet.`);
  } else {
    if (!cur.is_final) risks.push(`No venue chosen yet — this overview is based on ${cur.name}. Pick one in the budget builder or Decide Together.`);
    if (cur.is_final && !cur.quote_received) risks.push(`${cur.name} hasn't sent a complete quote yet — the total below is still an estimate.`);
  }
  if (grand > target) risks.push(`Estimated total is ${fmt(grand - target)} over ${plan ? "the plan's target" : "your preferred ceiling"}.`);
  if (overdueCount > 0) risks.push(`${overdueCount} payment${overdueCount === 1 ? "" : "s"} overdue.`);

  const exportRows: [string, string, number][] = plan ? plan.groups.map((g): [string, string, number] => [g.name, plan.name, Math.round(g.total)]) : breakdown.groups.flatMap((g) => g.items.map((it): [string, string, number] => [g.name, it.label, Math.round(it.total)]));
  const SECTION = "rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6";
  const PILL = `inline-flex items-center gap-1.5 rounded-full border border-ink/25 px-5 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Budget summary" className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {[
          { Icon: PiggyBank, label: "Estimated total", value: `${plan && plan.unknownCount > 0 ? "≥ " : ""}${fmt(grand)}`, note: `${fmt(perGuest)} per guest`, warn: false },
          { Icon: Calculator, label: remaining >= 0 ? "Remaining" : "Over ceiling", value: fmt(Math.abs(remaining)), note: `${ceilingPct}% used`, warn: remaining < 0 },
          { Icon: CreditCard, label: "Paid so far", value: fmt(paid), note: `of ${fmt(paid + owed)} committed`, warn: false },
          { Icon: ReceiptText, label: "Still owed", value: fmt(owed), note: overdueCount > 0 ? `${overdueCount} overdue` : "on track", warn: overdueCount > 0 },
        ].map(({ Icon, label, value, note, warn }) => (
          <div key={label} className="flex items-center gap-4 bg-paper p-5 sm:p-6">
            <Icon className={`h-9 w-9 shrink-0 ${warn ? "text-wine" : "text-sage-deep"}`} strokeWidth={1.1} aria-hidden />
            <div>
              <p className={`font-serif text-3xl font-medium ${warn ? "text-wine" : ""}`}>{value}</p>
              <p className="text-ink-2">{label}</p>
              <p className="text-sm text-ink-2">{note}</p>
            </div>
          </div>
        ))}
      </section>

      {plan && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border border-wine/25 bg-[color-mix(in_srgb,var(--wine)_6%,var(--paper))] px-5 py-4 sm:px-6">
          <p className="flex items-center gap-3 text-sm">
            <Heart className="h-5 w-5 shrink-0 fill-wine text-wine" strokeWidth={1.5} aria-hidden />
            <span>Working from our wedding plan, <b>{plan.name}</b>{plan.venueName ? ` at ${plan.venueName}` : ""}{plan.hasPrices ? ` · ${plan.confidencePct}% confirmed pricing` : ""}</span>
          </p>
          <Link href={`/budget/scenarios/${plan.id}`} className={`flex items-center gap-1.5 rounded text-sm font-semibold text-green ${FOCUS_RING}`}>
            Open the plan <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      )}

      {honeymoon && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border border-line bg-paper px-5 py-4 sm:px-6">
          <p className="flex items-center gap-3 text-sm">
            <Plane className="h-5 w-5 shrink-0 text-sage-deep" strokeWidth={1.4} aria-hidden />
            <span>
              Honeymoon in {honeymoon.name}, kept separate: <b>{honeymoon.estimated == null ? "cost unknown" : `${honeymoon.unknown > 0 ? "≥ " : ""}${fmt(honeymoon.estimated)}`}</b>
              {together && honeymoon.estimated != null && <> · Wedding + honeymoon: <b>{fmt(grand + honeymoon.estimated)}</b></>}
            </span>
          </p>
          <span className="flex gap-4 text-sm font-semibold">
            <Link href={together ? "/budget" : "/budget?together=1"} className={`rounded text-green underline underline-offset-2 ${FOCUS_RING}`}>{together ? "Show wedding only" : "Show both together"}</Link>
            <Link href="/honeymoon" className={`rounded text-green underline underline-offset-2 ${FOCUS_RING}`}>Open honeymoon</Link>
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div role="progressbar" aria-label="Budget used" aria-valuenow={ceilingPct} aria-valuemin={0} aria-valuemax={100} className="h-3 flex-1 overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full ${remaining >= 0 ? "bg-surface-green" : "bg-surface-wine"}`} style={{ width: `${ceilingPct}%` }} />
        </div>
        <span className="shrink-0 text-sm text-ink-2">{ceilingPct}% used</span>
      </div>

      {leader && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl bg-[color-mix(in_srgb,var(--sage)_16%,var(--paper))] px-5 py-4 sm:px-6">
          <p className="flex items-center gap-3 text-sm text-ink">
            <Flower2 className="h-6 w-6 shrink-0 text-sage-deep" strokeWidth={1.25} aria-hidden />
            <span>Largest cost driver: <b>{leader.name}</b> · {leader.pct}% of your budget{plan ? "" : ` — based on ${cur.name}`}</span>
          </p>
          <Link href="/budget/builder" className={`flex items-center gap-1.5 rounded text-sm font-semibold text-green ${FOCUS_RING}`}>
            View details <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      )}

      {risks.length > 0 && (
        <ul aria-label="Worth a look" className="flex flex-col gap-1 rounded-2xl border border-wine/25 px-5 py-3 text-sm text-wine">
          {risks.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section aria-label="Category breakdown" className={SECTION}>
            <h2 className="font-serif text-2xl font-medium">Category breakdown</h2>
            <p className="text-sm text-ink-2">See where your budget is going.</p>
            <ul className="mt-5 flex flex-col gap-4">
              {groups.map((g) => {
                const Icon = GROUP_ICONS[g.name as BudgetGroup] ?? MoreHorizontal;
                return (
                  <li key={g.name} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto_2.5rem] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[1.25rem_11rem_minmax(0,1fr)_5.5rem_2.5rem]">
                    <Icon className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0 text-sm">{g.name}</span>
                    <div className="order-last col-span-4 h-2 overflow-hidden rounded-full bg-line sm:order-none sm:col-span-1">
                      <div className="h-full rounded-full bg-surface-green" style={{ width: `${g.pct}%` }} />
                    </div>
                    <span className="text-right text-sm font-semibold">{fmt(g.total)}</span>
                    <span className="text-right text-xs text-ink-2">{g.pct}%</span>
                  </li>
                );
              })}
            </ul>
            <Link href="/budget/builder" className={`${PILL} mt-6`}>
              Open budget builder <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </Link>
          </section>

          <section aria-label="Your budget at a glance" className={SECTION}>
            <h2 className="font-serif text-2xl font-medium">Your budget at a glance</h2>
            <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {[
                { Icon: Users, n: String(as.adults + as.kids), label: "Guests" },
                { Icon: Tag, n: fmt(perGuest), label: "Per guest" },
                { Icon: PieChart, n: `${ceilingPct}%`, label: "Used" },
              ].map(({ Icon, n, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="h-9 w-9 shrink-0 text-wine" strokeWidth={1.1} aria-hidden />
                  <div>
                    <dd className="font-serif text-3xl font-medium leading-none">{n}</dd>
                    <dt className="mt-1 text-ink-2">{label}</dt>
                  </div>
                </div>
              ))}
            </dl>
            <div className="relative mt-6 flex min-h-[7rem] items-center overflow-hidden rounded-xl bg-[color-mix(in_srgb,var(--sage)_18%,var(--paper))]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/photo-flower-table.jpg" alt="" className="absolute inset-y-0 left-0 h-full w-2/5 object-cover" />
              <p className="ml-[45%] py-5 pr-5 font-script text-2xl leading-tight text-ink-2">
                Small choices,
                <br />
                big beautiful moments.
              </p>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section aria-label="Upcoming payments" className={SECTION}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-serif text-2xl font-medium">Upcoming payments</h2>
              <Link href="/budget/payments" className={`flex items-center gap-1 rounded py-1 text-sm font-semibold text-green ${FOCUS_RING}`}>View all <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /></Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="mt-3 flex gap-3 rounded-xl bg-bg/70 p-4">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-wine" strokeWidth={1.25} aria-hidden />
                <div className="text-sm">
                  <p className="font-semibold">Nothing due — you&apos;re all caught up!</p>
                  <p className="text-ink-2">Add vendors and payment dates to see upcoming payments here.</p>
                </div>
              </div>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-line">
                {upcoming.map((p) => {
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-3 text-sm">
                      <div className="min-w-0">
                        <Link href={p.href} className={`block truncate rounded font-semibold text-ink hover:underline ${FOCUS_RING}`}>{p.payee}{p.source === "venue" ? ` · ${p.label.toLowerCase()}` : ""}</Link>
                        <p className="text-xs text-ink-2">{p.due ? formatDueDate(p.due) : "No due date"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{fmt(p.amount)}</p>
                        {isOverdue(p, today) && <p className="text-xs font-semibold text-wine">Overdue</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Budget notes" className={SECTION}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-serif text-2xl font-medium">Budget notes</h2>
              <Link href="/budget/notes" className={`flex items-center gap-1 rounded py-1 text-sm font-semibold text-green ${FOCUS_RING}`}>View all <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /></Link>
            </div>
            <BudgetNotes initialNotes={notes} missing={notesMissing} preview />
          </section>

          <section aria-label="Quick actions" className={SECTION}>
            <h2 className="font-serif text-2xl font-medium">Quick actions</h2>
            <BudgetActions rows={exportRows} />
          </section>
        </div>
      </div>
    </div>
  );
}
