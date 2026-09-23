import { createClient } from "@/lib/supabase/server";
import BudgetPayments from "@/components/BudgetPayments";
import type { Payment } from "@/lib/budget-extras";
import type { Venue } from "@/lib/venues";
import { planPayments, paymentVenue } from "@/lib/payment-plan";
import { loadActivePlan } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function BudgetPaymentsPage() {
  const supabase = await createClient();
  const [{ data: payments }, { data: vendors }, { data: venues }, plan] = await Promise.all([
    supabase.from("payments").select("*").order("sort_order", { ascending: true }),
    supabase.from("vendors").select("id, name, status, contracted_total").order("name", { ascending: true }),
    supabase.from("venues").select("id, name, is_final, contracted_total, deposit_amount, deposit_due, deposit_paid, balance_due, balance_paid"),
    loadActivePlan(supabase),
  ]);
  const rows = (payments ?? []) as Payment[];
  const list = (vendors ?? []).filter((v) => v.status === "booked" || v.status === "confirmed" || rows.some((p) => p.vendor_id === v.id));
  const venue = paymentVenue((venues ?? []) as Venue[], plan?.venueId ?? null);
  const venueRows = planPayments([], venue);
  const contracted = (venue?.contracted_total ?? 0) + (vendors ?? []).filter((v) => v.status === "booked" || v.status === "confirmed").reduce((t, v) => t + (v.contracted_total ?? 0), 0);

  return (
    <BudgetPayments
      initialPayments={rows}
      vendors={list.map((v) => ({ id: v.id, name: v.name }))}
      venuePayments={venueRows}
      summary={{ estimated: plan?.projected ?? null, target: plan?.target ?? null, contracted, planName: plan?.name ?? null }}
    />
  );
}
