import { createClient } from "@/lib/supabase/server";
import BudgetPayments from "@/components/BudgetPayments";
import type { Payment } from "@/lib/budget-extras";

export const dynamic = "force-dynamic";

export default async function BudgetPaymentsPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase.from("payments").select("*").order("sort_order", { ascending: true });

  return <BudgetPayments initialPayments={(payments ?? []) as Payment[]} />;
}
