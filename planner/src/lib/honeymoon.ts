import type { SupabaseClient } from "@supabase/supabase-js";

// The honeymoon is planned in two phases: dream and decide (a shortlist), then plan the trip. Its money is kept
// apart from the wedding's by default; the Budget can optionally show both together.
export type Reaction = "love" | null;

export type HoneymoonSettings = { start_date: string | null; end_date: string | null; budget_target: number | null; fund_offsets: boolean; notes: string };
export const BLANK_SETTINGS: HoneymoonSettings = { start_date: null, end_date: null, budget_target: null, fund_offsets: false, notes: "" };

export type Destination = {
  id: string;
  name: string;
  country: string;
  photo: string;
  est_cost: number | null;
  best_season: string;
  travel_time: string;
  pros: string;
  considerations: string;
  ariel_reaction: Reaction | string | null;
  fred_reaction: Reaction | string | null;
  is_selected: boolean;
  decision_option_id: string | null;
  sort_order: number;
};

export type ItemKind = "flight" | "stay" | "activity" | "transport" | "reservation" | "insurance" | "document" | "packing" | "other";
export type HoneymoonItem = {
  id: string;
  kind: ItemKind;
  title: string;
  detail: string;
  item_date: string | null;
  time: string;
  amount: number | null;
  paid: boolean;
  due_date: string | null;
  confirmation: string;
  link: string;
  done: boolean;
  sort_order: number;
};

export const SECTIONS: { kind: ItemKind; title: string; blurb: string; singular: string; costs: boolean; dated: boolean }[] = [
  { kind: "flight", title: "Flights", blurb: "Outbound, return, connections.", singular: "flight", costs: true, dated: true },
  { kind: "stay", title: "Accommodation", blurb: "Hotels, rentals, each night away.", singular: "stay", costs: true, dated: true },
  { kind: "activity", title: "Activities", blurb: "Tours, days out, things to do.", singular: "activity", costs: true, dated: true },
  { kind: "transport", title: "Transportation", blurb: "Trains, transfers, car hire.", singular: "transfer", costs: true, dated: true },
  { kind: "reservation", title: "Reservations", blurb: "Restaurants, spas, tickets.", singular: "reservation", costs: true, dated: true },
  { kind: "insurance", title: "Travel insurance", blurb: "Cover for the trip.", singular: "policy", costs: true, dated: false },
  { kind: "document", title: "Documents", blurb: "Passports, visas, vaccination records.", singular: "document", costs: false, dated: false },
  { kind: "packing", title: "Packing", blurb: "Tick things off as they go in the bag.", singular: "packing item", costs: false, dated: false },
  { kind: "other", title: "Other costs", blurb: "Anything else the trip will cost.", singular: "cost", costs: true, dated: false },
];
export const SECTION_BY_KIND = Object.fromEntries(SECTIONS.map((s) => [s.kind, s])) as Record<ItemKind, (typeof SECTIONS)[number]>;

// A cost with no amount is unknown, never $0. Documents and packing carry no cost at all.
export function tripBudget(items: HoneymoonItem[], destinationEstimate: number | null, target: number | null, contributions: number, fundOffsets: boolean) {
  const costed = items.filter((i) => SECTION_BY_KIND[i.kind].costs);
  const priced = costed.filter((i) => i.amount != null);
  const itemsTotal = priced.reduce((t, i) => t + (i.amount as number), 0);
  const unknown = costed.filter((i) => i.amount == null).length;
  const fromItems = priced.length > 0;
  const estimated = fromItems ? itemsTotal : destinationEstimate;
  const paid = priced.filter((i) => i.paid).reduce((t, i) => t + (i.amount as number), 0);
  return {
    estimated,
    basis: fromItems ? ("items" as const) : destinationEstimate != null ? ("destination" as const) : ("none" as const),
    unknown,
    paid,
    owed: itemsTotal - paid,
    remaining: target != null && estimated != null ? target - estimated : null,
    personal: fundOffsets && estimated != null ? Math.max(estimated - contributions, 0) : null,
  };
}

export type Deadline = { id: string; title: string; amount: number; due: string };
export function paymentDeadlines(items: HoneymoonItem[]): Deadline[] {
  return items
    .filter((i) => SECTION_BY_KIND[i.kind].costs && !i.paid && (i.amount ?? 0) > 0 && i.due_date)
    .map((i) => ({ id: i.id, title: i.title, amount: i.amount as number, due: i.due_date as string }))
    .sort((a, b) => a.due.localeCompare(b.due));
}

// The itinerary is a view of the same items, in date and time order. Nothing is entered twice.
export function itinerary(items: HoneymoonItem[]) {
  const dated = items.filter((i) => SECTION_BY_KIND[i.kind].dated && i.item_date).sort((a, b) => (a.item_date as string).localeCompare(b.item_date as string) || a.time.localeCompare(b.time));
  const days = new Map<string, HoneymoonItem[]>();
  for (const i of dated) days.set(i.item_date as string, [...(days.get(i.item_date as string) ?? []), i]);
  return { days, undated: items.filter((i) => SECTION_BY_KIND[i.kind].dated && !i.item_date) };
}

// Suggested steps. Each becomes one Planning Board task (template_key honeymoon:step:<key>) and is never duplicated.
export const STEPS: { key: string; title: string; notes: string }[] = [
  { key: "flights", title: "Book honeymoon flights", notes: "Check dates against the wedding weekend." },
  { key: "stay", title: "Book honeymoon accommodation", notes: "" },
  { key: "passports", title: "Check passports and visas", notes: "Many countries want six months' validity." },
  { key: "insurance", title: "Arrange travel insurance", notes: "" },
  { key: "itinerary", title: "Plan the honeymoon itinerary", notes: "" },
  { key: "packing", title: "Pack for the honeymoon", notes: "" },
];
export const stepKey = (k: string) => `honeymoon:step:${k}`;

const list = <T,>(v: T[] | null | undefined) => v ?? [];

// One light read for Budget and the Dashboard. Null when the tables aren't there yet or nothing has been chosen.
export async function loadHoneymoonSummary(supabase: SupabaseClient) {
  const [{ data: dest, error }, { data: items }, { data: settings }] = await Promise.all([
    supabase.from("honeymoon_destinations").select("id, name, est_cost").eq("is_selected", true).maybeSingle(),
    supabase.from("honeymoon_items").select("*"),
    supabase.from("honeymoon_settings").select("*").eq("id", true).maybeSingle(),
  ]);
  if (error || !dest) return null;
  const rows = list(items) as HoneymoonItem[];
  const b = tripBudget(rows, dest.est_cost, settings?.budget_target ?? null, 0, false);
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(today + "T12:00");
  soon.setDate(soon.getDate() + 30);
  const limit = soon.toISOString().slice(0, 10);
  const deadlines = paymentDeadlines(rows);
  return { name: dest.name as string, estimated: b.estimated, unknown: b.unknown, overdue: deadlines.filter((d) => d.due < today).length, dueSoon: deadlines.filter((d) => d.due >= today && d.due <= limit).length };
}
export type HoneymoonSummary = NonNullable<Awaited<ReturnType<typeof loadHoneymoonSummary>>>;
