import type { SupabaseClient } from "@supabase/supabase-js";
import { projectCost, type DiyMaterial } from "@/lib/diy-projects";
import type { LinkedCost } from "@/lib/budget-extras";
import { eventCost, eventHref, type EventExpense } from "@/lib/wedding-events";

// Everything that costs money on another page and should count toward the wedding total.
export async function getLinkedCosts(supabase: SupabaseClient) {
  const [{ data: diy }, { data: events }, { data: party }, { data: eventExpenses }, { data: diyMaterials }] = await Promise.all([
    supabase.from("diy_projects").select("id, title, cost_estimate, cost_actual"),
    supabase.from("wedding_events").select("id, key, title, budget_estimate"),
    supabase.from("wedding_party").select("id, name, cost"), // "cost" exists once migration 039 has run
    supabase.from("event_expenses").select("event_id, amount"), // once migration 040 has run
    supabase.from("diy_materials").select("*"), // once migration 043 has run
  ]);

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
  return { items, diyCount, diyEstimated, diySpent };
}
