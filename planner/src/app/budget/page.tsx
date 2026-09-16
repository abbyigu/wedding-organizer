import { createClient } from "@/lib/supabase/server";
import Budget from "@/components/Budget";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .order("sort_order", { ascending: true });

  const { settings, guestSummary } = await getBudgetContext(supabase);

  return (
    <Budget
      initialVenues={venues ?? []}
      userName={displayName(user?.email)}
      initialSettings={settings}
      guestSummary={guestSummary}
    />
  );
}
