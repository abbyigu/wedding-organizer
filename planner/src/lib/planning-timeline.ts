import type { PlanningTask } from "@/lib/planning-tasks";

// The Planning Board's tasks are the only records; the Timeline just arranges them by WHEN.
// A task's place comes from its target date (due_date) measured against the wedding date,
// or — before it has a date — from the suggested-plan period it was created for.

export type PeriodKey = "dream" | "big" | "team" | "look" | "guests" | "details" | "diy" | "together" | "finalize" | "pack" | "week" | "day" | "after";

export type Period = {
  key: PeriodKey;
  label: string; // "18–24 months"
  title: string;
  minDays: number; // a date belongs here when it is at least this many days before the wedding
  dueDays: number; // suggested target: this many days before the wedding
  startDays: number | null; // suggested start for DIY work
};

export const PERIODS: Period[] = [
  { key: "dream", label: "24+ months", title: "Dream & Define", minDays: 730, dueDays: 730, startDays: null },
  { key: "big", label: "18–24 months", title: "The Big Decisions", minDays: 548, dueDays: 548, startDays: 730 },
  { key: "team", label: "15–18 months", title: "Build Your Team", minDays: 457, dueDays: 457, startDays: 548 },
  { key: "look", label: "12–15 months", title: "The Look & Feel", minDays: 365, dueDays: 365, startDays: 457 },
  { key: "guests", label: "9–12 months", title: "Guests & Wedding Party", minDays: 274, dueDays: 274, startDays: 365 },
  { key: "details", label: "6–9 months", title: "Details Begin", minDays: 183, dueDays: 183, startDays: 274 },
  { key: "diy", label: "4–6 months", title: "DIY Season", minDays: 122, dueDays: 122, startDays: 183 },
  { key: "together", label: "2–4 months", title: "Bring It Together", minDays: 61, dueDays: 61, startDays: 122 },
  { key: "finalize", label: "1–2 months", title: "Finalize", minDays: 30, dueDays: 30, startDays: 61 },
  { key: "pack", label: "2–4 weeks", title: "Pack & Prepare", minDays: 8, dueDays: 14, startDays: 30 },
  { key: "week", label: "Wedding week", title: "Almost There", minDays: 1, dueDays: 3, startDays: 8 },
  { key: "day", label: "Wedding day", title: "The Day", minDays: 0, dueDays: 0, startDays: 0 },
  { key: "after", label: "After the wedding", title: "After the Wedding", minDays: -9999, dueDays: -14, startDays: 0 },
];

export const periodByKey = (key: string | null | undefined) => PERIODS.find((p) => p.key === key);

// ---- dates (local, ISO yyyy-mm-dd) ----
const toDate = (iso: string) => new Date(iso + "T00:00:00");
export const isoDate = (d: Date) => d.toLocaleDateString("en-CA");
export const todayISO = () => isoDate(new Date());

export function daysBefore(iso: string, weddingISO: string): number {
  return Math.round((toDate(weddingISO).getTime() - toDate(iso).getTime()) / 86400000);
}

export function dateDaysBefore(weddingISO: string, days: number): string {
  const d = toDate(weddingISO);
  d.setDate(d.getDate() - days);
  return isoDate(d);
}

export function periodOfDays(days: number): Period {
  return PERIODS.find((p) => days >= p.minDays) ?? PERIODS[PERIODS.length - 1];
}

// ---- where a task sits ----
export function effectiveDate(t: Pick<PlanningTask, "due_date" | "period">, weddingISO: string): string | null {
  if (t.due_date) return t.due_date;
  const p = periodByKey(t.period);
  return p ? dateDaysBefore(weddingISO, p.dueDays) : null;
}

export function periodOfTask(t: Pick<PlanningTask, "due_date" | "period">, weddingISO: string): PeriodKey | "unscheduled" {
  const d = effectiveDate(t, weddingISO);
  return d ? periodOfDays(daysBefore(d, weddingISO)).key : "unscheduled";
}

const monthYear = (iso: string) => toDate(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });

// "Sep 2026 – Mar 2027", from the real wedding date.
export function periodRange(p: Period, weddingISO: string): string {
  if (p.key === "day") return toDate(weddingISO).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  if (p.key === "after") return `From ${monthYear(dateDaysBefore(weddingISO, -1))}`;
  const end = monthYear(dateDaysBefore(weddingISO, p.minDays));
  if (p.startDays == null) return `Until ${end}`;
  const start = monthYear(dateDaysBefore(weddingISO, p.startDays));
  return start === end ? start : `${start} – ${end}`;
}

export function suggestedDates(periodKey: PeriodKey, weddingISO: string, diy: boolean) {
  const p = periodByKey(periodKey)!;
  return {
    due_date: dateDaysBefore(weddingISO, p.dueDays),
    start_date: diy && p.startDays != null ? dateDaysBefore(weddingISO, p.startDays) : null,
  };
}

// "Due this month" / "Due next month" / "Coming up" for the dashboard.
export function dueLabel(iso: string): string {
  const now = new Date();
  const d = toDate(iso);
  const diff = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
  if (iso < todayISO()) return "Overdue";
  return diff <= 0 ? "Due this month" : diff === 1 ? "Due next month" : "Coming up";
}

// ---- the suggested plan ----
type Template = { key: string; title: string; category: string; period: PeriodKey; diy?: boolean; tags?: string[] };

const t = (period: PeriodKey, category: string, title: string, extra: Partial<Template> = {}): Template => ({
  key: `plan:${period}:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  title,
  category,
  period,
  ...extra,
});

export const PLAN: Template[] = [
  t("dream", "Other", "Wedding vision"),
  t("dream", "Guests", "Initial guest estimate"),
  t("dream", "Budget", "Set working budget"),
  t("dream", "Venue", "Research venues"),
  t("dream", "Other", "Decide approximate wedding season"),
  t("big", "Venue", "Book venue"),
  t("big", "Ceremony", "Decide ceremony location"),
  t("big", "Travel & Stay", "Start accommodation planning"),
  t("big", "Photography", "Research photographer"),
  t("team", "Photography", "Book photographer"),
  t("team", "Food & Drink", "Book caterer"),
  t("team", "Décor & Florals", "Florist research"),
  t("team", "Stationery", "Stationery direction"),
  t("team", "Music", "Entertainment research"),
  t("look", "Attire", "Dress shopping"),
  t("look", "Décor & Florals", "Major rentals"),
  t("look", "Décor & Florals", "Décor plan"),
  t("look", "Guests", "Wedding website"),
  t("look", "Stationery", "Save-the-date design"),
  t("guests", "Wedding Party", "Wedding party attire"),
  t("guests", "Stationery", "Send save-the-dates"),
  t("guests", "Travel & Stay", "Hotel blocks"),
  t("guests", "Travel & Stay", "Transportation planning"),
  t("details", "Stationery", "Invitations"),
  t("details", "Food & Drink", "Cake & dessert"),
  t("details", "Beauty", "Hair & makeup"),
  t("details", "Registry", "Registry"),
  t("details", "Ceremony", "Ceremony ideas"),
  t("diy", "DIY", "Begin major DIY production", { diy: true }),
  t("diy", "DIY", "Wedding signage", { diy: true }),
  t("diy", "Décor & Florals", "Décor purchases"),
  t("diy", "DIY", "LEGO boutonnières", { diy: true, tags: ["DIY"] }),
  t("diy", "DIY", "Table décor", { diy: true }),
  t("diy", "DIY", "Guest book", { diy: true }),
  t("diy", "DIY", "Accessories", { diy: true }),
  t("together", "Guests", "Seating plan"),
  t("together", "Food & Drink", "Menus"),
  t("together", "Décor & Florals", "Table décor — final setup"),
  t("together", "Music", "Music"),
  t("together", "Ceremony", "Ceremony details"),
  t("together", "Attire", "Family outfits"),
  t("finalize", "Attire", "Final fittings"),
  t("finalize", "Guests", "RSVP deadline"),
  t("finalize", "Guests", "Seating chart"),
  t("finalize", "Vendors", "Vendor confirmations"),
  t("finalize", "DIY", "Finish DIY projects", { diy: true }),
  t("pack", "Décor & Florals", "Pack décor"),
  t("pack", "Décor & Florals", "Label décor boxes by location"),
  t("pack", "Guests", "Final guest count"),
  t("pack", "Stationery", "Print wedding materials"),
  t("pack", "Wedding Day", "Confirm setup responsibilities"),
  t("week", "Vendors", "Deliveries"),
  t("week", "Wedding Day", "Setup assignments"),
  t("week", "Wedding Day", "Emergency kit"),
  t("week", "Rehearsal Dinner", "Rehearsal"),
  t("week", "Vendors", "Vendor check-ins"),
  t("after", "Vendors", "Rental returns"),
  t("after", "Budget", "Vendor balances"),
  t("after", "Stationery", "Thank-you cards"),
  t("after", "Photography", "Photo selection"),
  t("after", "Décor & Florals", "Preserve, sell or store décor"),
];

// Optional checklist for the Décor & Florals area — added as undated ideas that join the
// timeline as soon as a date is chosen.
export const DECOR_CHECKLIST = [
  "Ceremony arch", "Aisle décor", "Aisle flowers", "Pew / chair markers", "Altar flowers", "Welcome sign", "Cocktail tables", "Centerpieces",
  "Table linens", "Charger plates", "Candles", "Table numbers", "Head / sweetheart table", "Lighting", "Guest book table", "Gift / card table",
  "Photo backdrop", "Lounge", "Bar styling", "Cake flowers / décor", "Personal flowers", "Bridal bouquet", "Bridesmaid bouquets", "Corsages",
  "LEGO boutonnières", "Hair flowers", "Flower girl", "Reception entrance", "Dance floor décor", "Restroom baskets", "Send-off station",
];

export function planRows(weddingISO: string, existingKeys: Set<string>) {
  return PLAN.filter((p) => !existingKeys.has(p.key)).map((p, i) => ({
    template_key: p.key,
    title: p.title,
    category: p.category,
    status: "todo",
    period: p.period,
    tags: p.tags ?? [],
    date_manual: false,
    suggested_for: weddingISO,
    sort_order: 1000 + i,
    ...suggestedDates(p.period, weddingISO, !!p.diy),
  }));
}

export function decorRows(existingKeys: Set<string>) {
  return DECOR_CHECKLIST.map((title) => ({ key: `decor:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, title }))
    .filter((d) => !existingKeys.has(d.key))
    .map((d, i) => ({ template_key: d.key, title: d.title, category: "Décor & Florals", status: "ideas", tags: [] as string[], sort_order: 2000 + i }));
}

// Suggested dates that still follow the wedding date — never a date the couple set themselves.
export function recalcUpdates(tasks: PlanningTask[], weddingISO: string) {
  return tasks
    .filter((t) => t.template_key?.startsWith("plan:") && !t.date_manual && t.suggested_for !== weddingISO && periodByKey(t.period))
    .map((t) => {
      const plan = PLAN.find((p) => p.key === t.template_key);
      return { id: t.id, ...suggestedDates(t.period as PeriodKey, weddingISO, !!plan?.diy), suggested_for: weddingISO };
    });
}

// ---- the journey axis ----
export const AXIS_MONTHS = [24, 18, 12, 9, 6, 3, 1, 0];

export function axisPosition(daysToGo: number): number {
  const left = daysToGo / 30.44;
  if (left >= AXIS_MONTHS[0]) return 0;
  for (let i = 0; i < AXIS_MONTHS.length - 1; i++) {
    const hi = AXIS_MONTHS[i];
    const lo = AXIS_MONTHS[i + 1];
    if (left <= hi && left >= lo) return (i + (hi - left) / (hi - lo)) / (AXIS_MONTHS.length - 1);
  }
  return 1;
}
