import type { SupabaseClient } from "@supabase/supabase-js";
import type { LinkedCost } from "@/lib/budget-extras";
import { eventHref } from "@/lib/wedding-events";

// Everything that costs money on another page and should count toward the wedding total.
export async function getLinkedCosts(supabase: SupabaseClient) {
  const [{ data: diy }, { data: events }, { data: party }] = await Promise.all([
    supabase.from("diy_projects").select("id, title, cost_estimate, cost_actual"),
    supabase.from("wedding_events").select("id, key, title, budget_estimate"),
    supabase.from("wedding_party").select("id, name, cost"), // "cost" exists once migration 039 has run
  ]);

  const items: LinkedCost[] = [];
  let diyCount = 0;
  let diyEstimated = 0;
  let diySpent = 0;
  for (const p of diy ?? []) {
    diyCount++;
    diyEstimated += p.cost_estimate ?? 0;
    diySpent += p.cost_actual ?? 0;
    // Once a project has a real cost, that replaces its estimate.
    const amount = p.cost_actual ?? p.cost_estimate ?? 0;
    if (amount > 0) items.push({ group: "DIY projects", label: p.title, amount, href: "/diy", source: "DIY Projects" });
  }
  for (const e of events ?? []) {
    if ((e.budget_estimate ?? 0) > 0) items.push({ group: "Events & party", label: e.title, amount: e.budget_estimate, href: eventHref(e), source: "Events" });
  }
  for (const m of party ?? []) {
    if ((m.cost ?? 0) > 0) items.push({ group: "Events & party", label: `${m.name} (wedding party)`, amount: m.cost, href: "/wedding-party", source: "Wedding Party" });
  }
  return { items, diyCount, diyEstimated, diySpent };
}
