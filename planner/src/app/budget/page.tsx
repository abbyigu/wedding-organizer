import { createClient } from "@/lib/supabase/server";
import BudgetOverview from "@/components/BudgetOverview";
import { getBudgetContext } from "@/lib/budget-context";
import type { BudgetExpense, Payment } from "@/lib/budget-extras";

export const dynamic = "force-dynamic";

export default async function BudgetOverviewPage() {
  const supabase = await createClient();
  const { data: venues } = await supabase.from("venues").select("*").order("sort_order", { ascending: true });
  const { settings, guestSummary } = await getBudgetContext(supabase);
  const [{ data: expenses }, { data: payments }] = await Promise.all([
    supabase.from("budget_expenses").select("*").order("sort_order", { ascending: true }),
    supabase.from("payments").select("*"),
  ]);

  return (
    <BudgetOverview
      venues={venues ?? []}
      settings={settings}
      guestSummary={guestSummary}
      expenses={(expenses ?? []) as BudgetExpense[]}
      payments={(payments ?? []) as Payment[]}
    />
  );
}
