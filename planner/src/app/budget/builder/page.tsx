import { createClient } from "@/lib/supabase/server";
import BudgetBuilder from "@/components/BudgetBuilder";
import { getLinkedCosts } from "@/lib/budget-linked";
import { getBudgetContext } from "@/lib/budget-context";
import type { BudgetExpense } from "@/lib/budget-extras";

export const dynamic = "force-dynamic";

export default async function BudgetBuilderPage({ searchParams }: { searchParams: Promise<{ venue?: string; compare?: string }> }) {
  const supabase = await createClient();
  const { data: venues } = await supabase.from("venues").select("*").order("sort_order", { ascending: true });
  const { settings, guestSummary, assumptions } = await getBudgetContext(supabase);
  const { data: expenses } = await supabase.from("budget_expenses").select("*").order("sort_order", { ascending: true });
  const linked = await getLinkedCosts(supabase, { adults: assumptions.adults, kids: assumptions.kids });
  const { venue, compare } = await searchParams;

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
