import type { SupabaseClient } from "@supabase/supabase-js";
import { getBudgetContext } from "@/lib/budget-context";
import type { Vendor } from "@/lib/vendors";
import type { DiyMaterial } from "@/lib/diy-projects";
import type { EventExpense } from "@/lib/wedding-events";
import type { BudgetExpense } from "@/lib/budget-extras";
import type { Venue } from "@/lib/venues";
import type { ChoiceRow, ScenarioRow, World } from "@/lib/wedding-scenarios";
import type { IdeaImage } from "@/lib/registry";

// Everything a scenario page needs, read once. Scenarios only store choices, so the records they point at
// (venues, vendors, DIY, events, wedding party, Budget expenses) are loaded here and priced live.
export async function loadScenarioWorld(supabase: SupabaseClient) {
  const [{ data: scenarios, error }, { data: choices }, { data: venues }, { data: diy }, { data: materials }, { data: events }, { data: eventExpenses }, { data: party }, { data: expenses }, ctx, { data: vendorRows }, { data: pins }] = await Promise.all([
    supabase.from("wedding_scenarios").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("scenario_choices").select("*"),
    supabase.from("venues").select("*").order("sort_order", { ascending: true }),
    supabase.from("diy_projects").select("id, title, cost_estimate, cost_actual"),
    supabase.from("diy_materials").select("*"),
    supabase.from("wedding_events").select("id, key, title, budget_estimate").order("sort_order", { ascending: true }),
    supabase.from("event_expenses").select("*"),
    supabase.from("wedding_party").select("id, name, cost").order("sort_order", { ascending: true }),
    supabase.from("budget_expenses").select("*").order("sort_order", { ascending: true }),
    getBudgetContext(supabase),
    supabase.from("vendors").select("*").order("sort_order", { ascending: true }),
    supabase.from("idea_pins").select("id, title, image_url").neq("image_url", "").order("sort_order", { ascending: true }),
  ]);

  const venueRows = ((venues ?? []) as Venue[]).map((v) => ({ ...v, budget_lines: v.budget_lines ?? [], photos: v.photos ?? [] }));
  const coverPaths = venueRows.map((v) => v.photos[0]?.path).filter((p): p is string => Boolean(p));
  let photoUrls: Record<string, string> = {};
  if (coverPaths.length) {
    const { data } = await supabase.storage.from("venue-photos").createSignedUrls(coverPaths, 3600);
    photoUrls = Object.fromEntries((data ?? []).map((d) => [d.path ?? "", d.signedUrl ?? ""]));
  }

  const gs = ctx.guestSummary;
  const world: World = {
    venues: venueRows,
    vendors: ((vendorRows ?? []) as Vendor[]).map((v) => ({ ...v, photos: v.photos ?? [], line_items: v.line_items ?? [] })),
    diy: diy ?? [],
    materials: (materials ?? []) as DiyMaterial[],
    events: events ?? [],
    eventExpenses: (eventExpenses ?? []) as EventExpense[],
    party: party ?? [],
    expenses: (expenses ?? []) as BudgetExpense[],
    base: ctx.assumptions,
    guests: { invited: gs.totalWithKids, expected: gs.confirmed > 0 ? gs.confirmed : gs.totalWithKids },
  };

  return {
    world,
    scenarios: ((scenarios ?? []) as ScenarioRow[]),
    choices: ((choices ?? []) as ChoiceRow[]),
    ideas: (pins ?? []) as IdeaImage[],
    photoUrls,
    weddingDate: ctx.settings.wedding_date,
    needsMigration: Boolean(error),
  };
}
