import { createClient } from "@/lib/supabase/server";
import BudgetBuilder from "@/components/BudgetBuilder";
import { getBudgetContext } from "@/lib/budget-context";
import type { BudgetExpense } from "@/lib/budget-extras";

export const dynamic = "force-dynamic";

export default async function BudgetBuilderPage({ searchParams }: { searchParams: Promise<{ venue?: string }> }) {
  const supabase = await createClient();
  const { data: venues } = await supabase.from("venues").select("*").order("sort_order", { ascending: true });
  const { settings, guestSummary } = await getBudgetContext(supabase);
  const { data: expenses } = await supabase.from("budget_expenses").select("*").order("sort_order", { ascending: true });
  const { venue } = await searchParams;

  return (
    <BudgetBuilder
      initialVenues={venues ?? []}
      initialSettings={settings}
      guestSummary={guestSummary}
      initialExpenses={(expenses ?? []) as BudgetExpense[]}
      initialVenueId={venue ?? null}
    />
  );
}
