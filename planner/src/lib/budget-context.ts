import type { SupabaseClient } from "@supabase/supabase-js";
import { guestSummary } from "@/lib/guests";
import { DEFAULT_BUDGET_SETTINGS, resolveAssumptions, type BudgetSettings } from "@/lib/venues";

// Loaded by every page that shows a cost estimate, so the dashboard, the
// comparison table, a venue profile and the budget builder all price things
// the same way, off the same guest counts and the same shared settings.
export async function getBudgetContext(supabase: SupabaseClient) {
  const [{ data: guests }, { data: settingsRow }] = await Promise.all([
    supabase.from("guests").select("*"),
    supabase.from("budget_settings").select("*").eq("id", true).maybeSingle(),
  ]);

  const settings: BudgetSettings = settingsRow ?? DEFAULT_BUDGET_SETTINGS;
  const gs = guestSummary(guests ?? [], 80);
  const assumptions = resolveAssumptions(settings, gs);
  const sharedVals = settings.shared_line_amounts?.length
    ? settings.shared_line_amounts
    : DEFAULT_BUDGET_SETTINGS.shared_line_amounts;

  return { settings, assumptions, sharedVals, guestSummary: gs, guests: guests ?? [] };
}
