import { calcVenue, SHARED_LINES, TAX_RATE, type Assumptions, type BudgetLine, type Venue } from "@/lib/venues";

// The six display groups the whole budget breakdown (venue lines, shared
// lines, and custom expenses) gets sorted into, on both Overview and Builder.
export const BUDGET_GROUPS = [
  "Venue & catering",
  "Photography & video",
  "Flowers & décor",
  "Attire & beauty",
  "Travel & accommodation",
  "DIY projects",
  "Wedding weekend",
  "Other",
] as const;
export type BudgetGroup = (typeof BUDGET_GROUPS)[number];

// Costs entered on other pages (DIY, Events, Wedding Party). Budget only reads them, so each
// number lives in exactly one place; href sends you back to where it's edited.
// venueIds set = only counts in those venue scenarios (a potential vendor added to a scenario); unset = every scenario.
export type LinkedCost = { group: BudgetGroup; label: string; amount: number; href: string; source: string; venueIds?: string[] };
export const linkedFor = (items: LinkedCost[], venueId: string) => items.filter((l) => !l.venueIds || l.venueIds.includes(venueId));
export const linkedTotalFor = (items: LinkedCost[], venueId: string) => linkedFor(items, venueId).reduce((t, l) => t + l.amount, 0);
export const LINKED_GROUPS: readonly BudgetGroup[] = ["DIY projects", "Wedding weekend"];

// SHARED_LINES is a fixed list (see lib/venues.ts) — this maps each label to
// the display group it belongs in. New custom expenses just pick a group
// directly instead of needing an entry here.
export const SHARED_LINE_GROUPS: Record<string, BudgetGroup> = {
  "Day-of coordinator": "Other",
  "Photographer (documentary, full day)": "Photography & video",
  "Childcare (2–3 sitters, evening)": "Other",
  "Officiant + marriage paperwork": "Other",
  "Attire (dress, suit, shoes, alterations)": "Attire & beauty",
  "Hair & makeup": "Attire & beauty",
  "Simple florals": "Flowers & décor",
  "Décor, café lights, signage (DIY)": "Flowers & décor",
  "Wedding website (paperless invites)": "Other",
  "Couple's cake + Mlle Cupcake": "Other",
  "Music via app + sound/AV": "Other",
  "Gifts, favours, thank-yous": "Other",
  "SOCAN + Re:Sound tariff": "Other",
};

export type ExpenseUnit = "flat" | "adult" | "kid" | "adult+kid" | "hour";

export type BudgetExpense = {
  id: string;
  category: string;
  label: string;
  rate: number;
  unit: ExpenseUnit;
  qty: number;
  venue_id: string | null;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// venueId only matters for "Venue & catering" -- that's the only group tied
// to whichever venue is currently selected. Every other category applies
// regardless of venue, so it stays null (shows up no matter which venue
// you're comparing against).
export function blankExpense(category: BudgetGroup, sortOrder: number, venueId: string | null = null): Partial<BudgetExpense> {
  return {
    category,
    label: "New expense",
    rate: 0,
    unit: "flat",
    qty: 1,
    venue_id: category === "Venue & catering" ? venueId : null,
    notes: "",
    sort_order: sortOrder,
  };
}

// A "Venue & catering" expense tagged to a specific venue only counts
// toward that venue's breakdown -- otherwise adding one while comparing
// Venue A would silently show up under every other venue too. Untagged
// rows (venue_id null) and every non-catering category stay global.
export function expenseAppliesTo(e: Pick<BudgetExpense, "category" | "venue_id">, venueId: string): boolean {
  return e.category !== "Venue & catering" || e.venue_id === null || e.venue_id === venueId;
}

// Only "Venue & catering" custom expenses pick up the venue's service
// charge — matches how the venue's own lines and the fixed shared-cost
// list already work (shared lines never get a service charge either).
// "hour" uses the expense's own qty (e.g. a 5-hour open bar) instead of a
// guest count, since hours aren't derived from the guest list.
export function expenseTotal(e: Pick<BudgetExpense, "rate" | "unit" | "category" | "qty">, adults: number, kids: number, svcPct: number, tax: boolean) {
  const qty = e.unit === "adult" ? adults : e.unit === "kid" ? kids : e.unit === "adult+kid" ? adults + kids : e.unit === "hour" ? e.qty || 1 : 1;
  const svc = e.category === "Venue & catering" ? 1 + svcPct / 100 : 1;
  const taxMul = tax ? TAX_RATE : 1;
  return e.rate * qty * svc * taxMul;
}

export type PaymentStatus = "upcoming" | "paid" | "overdue";

export type Payment = {
  id: string;
  label: string;
  vendor: string;
  vendor_id?: string | null; // set once migration 046 has run; the vendor record is the source of truth
  category: string;
  amount: number;
  due_date: string | null;
  status: "upcoming" | "paid";
  method: string;
  confirmation_number: string;
  notes: string;
  link: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function blankPayment(over: Partial<Payment> = {}): Partial<Payment> {
  return {
    label: "New payment",
    vendor: "",
    category: "Other",
    amount: 0,
    due_date: null,
    status: "upcoming",
    method: "",
    confirmation_number: "",
    notes: "",
    link: "",
    sort_order: 0,
    ...over,
  };
}

// "overdue" isn't stored — it's just an unpaid payment whose due date has
// passed, computed fresh so it never goes stale.
export function paymentStatus(p: Pick<Payment, "status" | "due_date">): PaymentStatus {
  if (p.status === "paid") return "paid";
  if (p.due_date && p.due_date < new Date().toISOString().slice(0, 10)) return "overdue";
  return "upcoming";
}

export function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// A venue's own budget_lines always sort under "Venue & catering" — no
// per-label mapping needed like the shared lines.
export function venueLineTotal(rate: number, unit: BudgetLine[2], adults: number, kids: number, svcPct: number, tax: boolean, noSvc?: 0) {
  const qty = unit === "adult" ? adults : unit === "kid" ? kids : unit === "adult+kid" ? adults + kids : 1;
  const svc = noSvc === 0 ? 1 : 1 + svcPct / 100;
  const taxMul = tax ? TAX_RATE : 1;
  return rate * qty * svc * taxMul;
}

export type BreakdownItem = { label: string; total: number; note?: string; editable: "venue-line" | "shared-line" | "expense" | "fixed" | "linked"; ref?: number | string; href?: string; source?: string };
export type BreakdownGroup = { name: BudgetGroup; total: number; pct: number; items: BreakdownItem[] };
export type Breakdown = {
  groups: BreakdownGroup[];
  venueTotal: number;
  venueSource: "contracted" | "quoted" | "estimated";
  expensesTotal: number;
  contingency: number;
  grand: number;
  perGuest: number;
};

// The single place that turns a venue's line items + the fixed shared-cost
// list + your own custom expenses into the six grouped totals shown on both
// the Overview and the Builder. Contingency is applied on top of all three
// sources combined (calcVenue's own contingency math only knows about the
// venue + shared lines, since it predates custom expenses).
export function computeBreakdown(venue: Venue, as: Assumptions, sharedVals: number[], expenses: BudgetExpense[], linked: LinkedCost[] = []): Breakdown {
  const calc = calcVenue(venue, as, sharedVals);
  const byGroup = new Map<BudgetGroup, BreakdownItem[]>(BUDGET_GROUPS.map((g) => [g, []]));

  if (calc.venueSource !== "estimated") {
    byGroup.get("Venue & catering")!.push({ label: `Venue ${calc.venueSource} total`, total: calc.venueEffective, editable: "fixed" });
  } else {
    calc.rows.forEach((r, i) => byGroup.get("Venue & catering")!.push({ label: r.label, total: r.total, editable: "venue-line", ref: i }));
  }

  SHARED_LINES.forEach(([label, defaultAmount], i) => {
    const amount = (sharedVals[i] ?? defaultAmount) * (as.tax ? TAX_RATE : 1);
    const group = SHARED_LINE_GROUPS[label] ?? "Other";
    byGroup.get(group)!.push({ label, total: amount, editable: "shared-line", ref: i });
  });

  let expensesTotal = 0;
  expenses.filter((e) => expenseAppliesTo(e, venue.id)).forEach((e) => {
    const total = expenseTotal(e, as.adults, as.kids, as.svcPct, as.tax);
    expensesTotal += total;
    const group = (BUDGET_GROUPS as readonly string[]).includes(e.category) ? (e.category as BudgetGroup) : "Other";
    byGroup.get(group)!.push({ label: e.label, total, note: e.notes, editable: "expense", ref: e.id });
  });

  let linkedTotal = 0;
  for (const l of linkedFor(linked, venue.id)) {
    linkedTotal += l.amount;
    byGroup.get(l.group)!.push({ label: l.label, total: l.amount, editable: "linked", href: l.href, source: l.source });
  }

  const rawTotal = calc.venueEffective + calc.st + expensesTotal + linkedTotal;
  const contingency = rawTotal * (as.contPct / 100);
  const grand = rawTotal + contingency;
  const guestCount = as.adults + as.kids;

  const groups: BreakdownGroup[] = BUDGET_GROUPS.map((name) => {
    const items = byGroup.get(name)!;
    const total = items.reduce((s, it) => s + it.total, 0);
    return { name, total, pct: grand ? Math.round((total / grand) * 100) : 0, items };
  });

  return {
    groups,
    venueTotal: calc.venueEffective,
    venueSource: calc.venueSource,
    expensesTotal,
    contingency,
    grand,
    perGuest: guestCount ? grand / guestCount : 0,
  };
}
