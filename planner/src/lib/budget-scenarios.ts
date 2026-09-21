import { GENERIC_LINES, SHARED_LINES, TAX_RATE, type Assumptions, type LineState, type Venue } from "@/lib/venues";
import { expenseAppliesTo, expenseTotal, type BudgetExpense } from "@/lib/budget-extras";

// A venue scenario = that venue's own cost lines + the shared wedding costs (settings +
// custom expenses), which are entered once and reused by every scenario.
export const BUCKETS = ["venue", "alcohol", "rentals", "accommodation", "transport", "shared", "linked"] as const;
export type BucketKey = (typeof BUCKETS)[number];

export const BUCKET_LABEL: Record<BucketKey, string> = {
  venue: "Venue & catering",
  alcohol: "Alcohol",
  rentals: "Rentals & décor",
  accommodation: "Accommodation",
  transport: "Transportation",
  shared: "Shared wedding costs",
  linked: "DIY, events & wedding party",
};

// Venue lines are free text, so sort them by what they're about.
export function bucketOfLabel(label: string): BucketKey {
  if (/suite|room|hotel|lodg|accommodat|overnight|cottage/i.test(label)) return "accommodation";
  if (/shuttle|transport|\bbus\b|parking|valet|limo/i.test(label)) return "transport";
  if (/rental|linen|d[ée]cor|uplift|furniture|\btent\b|lighting/i.test(label)) return "rentals";
  if (/\bbar\b|wine|cocktail(?![- ]hour)|alcohol|beer|spirit|champagne|drinks/i.test(label)) return "alcohol";
  return "venue";
}

export type CellKind = "amount" | "included" | "na" | "unknown" | "zero";
export type Cell = { kind: CellKind; amount: number; partial: boolean };

type Tally = { amount: number; lines: number; priced: number; zero: number; included: number; na: number; unknown: number };
const blank = (): Tally => ({ amount: 0, lines: 0, priced: 0, zero: 0, included: 0, na: 0, unknown: 0 });

export type Scenario = {
  cells: Record<BucketKey, Cell>;
  service: number;
  taxes: number;
  contingency: number;
  grand: number;
  perGuest: number;
  unknownCount: number;
  source: "contracted" | "quoted" | "estimated";
};

export function scenarioOf(v: Venue, as: Assumptions, sharedVals: number[], expenses: BudgetExpense[], linkedTotal = 0): Scenario {
  const T = as.tax ? TAX_RATE : 1;
  const svcRate = as.svcPct / 100;
  const t = Object.fromEntries(BUCKETS.map((b) => [b, blank()])) as Record<BucketKey, Tally>;
  let service = 0;
  let taxes = 0;
  const source = v.contracted_total != null ? "contracted" : v.quoted_total != null ? "quoted" : "estimated";

  const add = (b: BucketKey, base: number, svc: number) => {
    const tax = (base + svc) * (T - 1);
    t[b].amount += base;
    service += svc;
    taxes += tax;
  };

  if (source === "estimated") {
    for (const [label, rate, unit, noSvc, state] of v.budget_lines.length ? v.budget_lines : GENERIC_LINES) {
      const b = bucketOfLabel(label);
      t[b].lines++;
      if (state) {
        t[b][state]++;
        continue;
      }
      t[b].priced++;
      const qty = unit === "adult" ? as.adults : unit === "kid" ? as.kids : unit === "adult+kid" ? as.adults + as.kids : 1;
      const base = rate * qty;
      if (base === 0) t[b].zero++;
      add(b, base, noSvc === 0 ? 0 : base * svcRate);
    }
  } else {
    // A quote or contract is one all-in number — it stands in for every venue line.
    t.venue.lines = 1;
    t.venue.priced = 1;
    t.venue.amount = (v.contracted_total ?? v.quoted_total)!;
    for (const b of ["alcohol", "rentals", "accommodation", "transport"] as const) {
      t[b].lines = 1;
      t[b].included = 1;
    }
  }

  SHARED_LINES.forEach(([, amount], i) => add("shared", sharedVals[i] ?? amount, 0));
  for (const e of expenses.filter((e) => expenseAppliesTo(e, v.id))) {
    const total = expenseTotal(e, as.adults, as.kids, as.svcPct, as.tax);
    const base = total / T / (e.category === "Venue & catering" ? 1 + svcRate : 1);
    add(e.category === "Venue & catering" ? "venue" : "shared", base, e.category === "Venue & catering" ? base * svcRate : 0);
  }

  t.linked.amount = linkedTotal; // entered on the DIY, Events and Wedding Party pages, no tax added

  const raw = BUCKETS.reduce((s, b) => s + t[b].amount, 0) + service + taxes;
  const contingency = raw * (as.contPct / 100);
  const grand = raw + contingency;
  const guests = as.adults + as.kids;

  const cells = Object.fromEntries(
    BUCKETS.map((b) => {
      const x = t[b];
      const kind: CellKind =
        x.amount > 0 || b === "shared" || b === "linked" ? "amount"
        : x.lines === 0 || x.unknown > 0 ? "unknown"
        : x.zero > 0 ? "zero"
        : x.included > 0 ? "included"
        : "na";
      return [b, { kind, amount: x.amount, partial: x.amount > 0 && x.unknown > 0 } satisfies Cell];
    }),
  ) as Record<BucketKey, Cell>;
  const unknownCount = BUCKETS.filter((b) => cells[b].kind === "unknown" || cells[b].partial).length;

  return { cells, service, taxes, contingency, grand, perGuest: guests ? grand / guests : 0, unknownCount, source };
}

export const CELL_TEXT: Record<Exclude<CellKind, "amount">, string> = {
  included: "Included",
  na: "Not required",
  unknown: "Unknown",
  zero: "$0",
};

export const LINE_STATE_LABEL: Record<LineState, string> = { included: "Included", na: "Not required", unknown: "Unknown" };
