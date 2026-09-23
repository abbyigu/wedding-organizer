import { createClient } from "@/lib/supabase/server";
import BudgetBuilder from "@/components/BudgetBuilder";
import { getLinkedCosts } from "@/lib/budget-linked";
import { getBudgetContext } from "@/lib/budget-context";
import type { BudgetExpense } from "@/lib/budget-extras";

export const dynamic = "force-dynamic";

export default async function BudgetBuilderPage({ searchParams }: { searchParams: Promise<{ venue?: string; compare?: string }> }) {
  const supabase = await createClient();
  const ctxP = getBudgetContext(supabase);
  const [{ data: venues }, { settings, guestSummary }, { data: expenses }, linked, { venue, compare }] = await Promise.all([
    supabase.from("venues").select("*").order("sort_order", { ascending: true }),
    ctxP,
    supabase.from("budget_expenses").select("*").order("sort_order", { ascending: true }),
    getLinkedCosts(supabase, ctxP.then((c) => ({ adults: c.assumptions.adults, kids: c.assumptions.kids }))),
    searchParams,
  ]);

  return (
    <BudgetBuilder
      initialVenues={venues ?? []}
      initialSettings={settings}
      guestSummary={guestSummary}
      initialExpenses={(expenses ?? []) as BudgetExpense[]}
      initialVenueId={venue ?? null}
      linked={linked}
      initialCompare={compare === "1"}
    />
  );
}
