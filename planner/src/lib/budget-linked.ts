import type { SupabaseClient } from "@supabase/supabase-js";
import { projectCost, type DiyMaterial } from "@/lib/diy-projects";
import type { LinkedCost } from "@/lib/budget-extras";
import { eventCost, eventHref, type EventExpense } from "@/lib/wedding-events";
import { budgetGroupOf, isBooked, vendorPrice, type Vendor } from "@/lib/vendors";

// Everything that costs money on another page and should count toward the wedding total.
// guests: headcount used to price per-person vendors. Without it those vendors stay "unknown" and are left out, never counted as $0.
type Guests = { adults: number; kids: number };
export async function getLinkedCosts(supabase: SupabaseClient, guestsIn?: Guests | Promise<Guests | undefined>) {
  const [{ data: diy }, { data: events }, { data: party }, { data: eventExpenses }, { data: diyMaterials }, { data: vendors }, { data: vendorScenarios }] = await Promise.all([
    supabase.from("diy_projects").select("id, title, cost_estimate, cost_actual"),
    supabase.from("wedding_events").select("id, key, title, budget_estimate"),
    supabase.from("wedding_party").select("id, name, cost"), // "cost" exists once migration 039 has run
    supabase.from("event_expenses").select("event_id, amount"), // once migration 040 has run
    supabase.from("diy_materials").select("*"), // once migration 043 has run
    supabase.from("vendors").select("id, name, category, status, contracted_total, quoted_total, price_low, price_high, price_unit, starting_price"), // once migration 046 has run
    supabase.from("vendor_scenarios").select("vendor_id, venue_id"),
  ]);

  const guests = await guestsIn; // may still be loading while the queries above run
  const items: LinkedCost[] = [];
  let diyCount = 0;
  let diyEstimated = 0;
  let diySpent = 0;
  for (const p of diy ?? []) {
    diyCount++;
    const c = projectCost(p, ((diyMaterials ?? []) as DiyMaterial[]).filter((m) => m.project_id === p.id));
    diyEstimated += c.estimated;
    diySpent += c.spent;
    // What the project should cost overall (materials you already own cost nothing new).
    if (c.projected > 0) items.push({ group: "DIY projects", label: p.title, amount: c.projected, href: `/diy/${p.id}`, source: "DIY Projects" });
  }
  for (const e of events ?? []) {
    const amount = eventCost(e, ((eventExpenses ?? []) as EventExpense[]).filter((x) => x.event_id === e.id));
    if (amount > 0) items.push({ group: "Wedding weekend", label: e.title, amount, href: `${eventHref(e)}?tab=budget`, source: "Events" });
  }
  for (const m of party ?? []) {
    if ((m.cost ?? 0) > 0) items.push({ group: "Wedding weekend", label: `${m.name} (wedding party)`, amount: m.cost, href: "/wedding-party", source: "Wedding Party" });
  }

  // Vendors: booked ones count everywhere at their most reliable price; a potential vendor only counts in the
  // venue scenarios it was added to. The venue itself is costed on the Venues page, so it's skipped here.
  const scenariosOf = new Map<string, string[]>();
  for (const s of vendorScenarios ?? []) scenariosOf.set(s.vendor_id, [...(scenariosOf.get(s.vendor_id) ?? []), s.venue_id]);
  for (const v of (vendors ?? []) as Pick<Vendor, "id" | "name" | "category" | "status" | "contracted_total" | "quoted_total" | "price_low" | "price_high" | "price_unit" | "starting_price">[]) {
    if (v.category === "Venue") continue;
    const venueIds = isBooked(v) ? undefined : scenariosOf.get(v.id);
    if (!isBooked(v) && !venueIds) continue;
    const price = vendorPrice(v, guests);
    if (price.amount == null || price.amount <= 0) continue;
    items.push({ group: budgetGroupOf(v.category), label: `${v.name} (${price.label.toLowerCase()})`, amount: price.amount, href: `/vendors/${v.id}?tab=pricing`, source: "Vendors", venueIds });
  }
  return { items, diyCount, diyEstimated, diySpent };
}
