import { createClient } from "@/lib/supabase/server";
import Budget from "@/components/Budget";

export default async function BudgetPage() {
  const supabase = await createClient();
  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .order("sort_order", { ascending: true });

  return <Budget initialVenues={venues ?? []} />;
}
