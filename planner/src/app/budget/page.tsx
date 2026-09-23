import { createClient } from "@/lib/supabase/server";
import BudgetOverview from "@/components/BudgetOverview";
import { getLinkedCosts } from "@/lib/budget-linked";
import { getBudgetContext } from "@/lib/budget-context";
import { loadActivePlan } from "@/lib/plan";
import { loadHoneymoonSummary } from "@/lib/honeymoon";
import type { BudgetNote } from "@/components/BudgetNotes";
import type { BudgetExpense, Payment } from "@/lib/budget-extras";

export const dynamic = "force-dynamic";

export default async function BudgetOverviewPage({ searchParams }: { searchParams: Promise<{ together?: string }> }) {
  const { together } = await searchParams;
  const supabase = await createClient();
  // Everything starts at once. Only the vendor pricing has to wait for the guest counts, and it waits inside.
  const ctxP = getBudgetContext(supabase);
  const [{ data: venues }, { settings, guestSummary }, { items: linked }, { data: expenses }, { data: payments }, { data: notes, error: notesError }, plan, honeymoon] = await Promise.all([
    supabase.from("venues").select("*").order("sort_order", { ascending: true }),
    ctxP,
    getLinkedCosts(supabase, ctxP.then((c) => ({ adults: c.assumptions.adults, kids: c.assumptions.kids }))),
    supabase.from("budget_expenses").select("*").order("sort_order", { ascending: true }),
    supabase.from("payments").select("*"),
    supabase.from("budget_notes").select("*"),
    loadActivePlan(supabase),
    loadHoneymoonSummary(supabase),
  ]);

  return (
    <BudgetOverview
      venues={venues ?? []}
      settings={settings}
      guestSummary={guestSummary}
      expenses={(expenses ?? []) as BudgetExpense[]}
      payments={(payments ?? []) as Payment[]}
      notes={(notes ?? []) as BudgetNote[]}
      notesMissing={!!notesError}
      linked={linked}
      plan={plan}
      honeymoon={honeymoon}
      together={together === "1"}
    />
  );
}
