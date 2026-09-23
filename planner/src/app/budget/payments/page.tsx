import { createClient } from "@/lib/supabase/server";
import BudgetPayments from "@/components/BudgetPayments";
import type { Payment } from "@/lib/budget-extras";

export const dynamic = "force-dynamic";

export default async function BudgetPaymentsPage() {
  const supabase = await createClient();
  const [{ data: payments }, { data: vendors }] = await Promise.all([
    supabase.from("payments").select("*").order("sort_order", { ascending: true }),
    supabase.from("vendors").select("id, name, status").order("name", { ascending: true }),
  ]);
  const rows = (payments ?? []) as Payment[];
  const list = (vendors ?? []).filter((v) => v.status === "booked" || v.status === "confirmed" || rows.some((p) => p.vendor_id === v.id));

  return <BudgetPayments initialPayments={rows} vendors={list.map((v) => ({ id: v.id, name: v.name }))} />;
}
