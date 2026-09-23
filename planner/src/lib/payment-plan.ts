import type { Payment } from "@/lib/budget-extras";
import type { Venue } from "@/lib/venues";

// One list of everything owed, read from where each payment already lives: the payments table (vendors and anything
// else) and the contracted venue's own deposit and balance. Nothing is copied between them.
export type PlanPayment = { id: string; label: string; payee: string; amount: number; due: string | null; paid: boolean; href: string; source: "payment" | "venue" };

export function planPayments(payments: Payment[], venue: Venue | null): PlanPayment[] {
  const rows: PlanPayment[] = payments.map((p) => ({ id: p.id, label: p.label, payee: p.vendor || p.label, amount: p.amount, due: p.due_date, paid: p.status === "paid", href: p.vendor_id ? `/vendors/${p.vendor_id}?tab=pricing` : "/budget/payments", source: "payment" }));
  if (venue && venue.contracted_total != null) {
    const href = `/venues/${venue.id}?tab=costs`;
    if (venue.deposit_amount > 0) rows.push({ id: `venue-deposit-${venue.id}`, label: "Deposit", payee: venue.name, amount: venue.deposit_amount, due: venue.deposit_due, paid: venue.deposit_paid, href, source: "venue" });
    const balance = venue.contracted_total - venue.deposit_amount;
    if (balance > 0) rows.push({ id: `venue-balance-${venue.id}`, label: "Balance", payee: venue.name, amount: balance, due: venue.balance_due, paid: venue.balance_paid, href, source: "venue" });
  }
  return rows;
}

export const isOverdue = (p: PlanPayment, today: string) => !p.paid && p.due != null && p.due < today;

export function paymentTotals(items: PlanPayment[], today = new Date().toISOString().slice(0, 10)) {
  const unpaid = items.filter((p) => !p.paid).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const horizon = new Date(today + "T12:00");
  horizon.setDate(horizon.getDate() + 30);
  const limit = horizon.toISOString().slice(0, 10);
  return {
    paid: items.filter((p) => p.paid).reduce((t, p) => t + p.amount, 0),
    owed: unpaid.reduce((t, p) => t + p.amount, 0),
    unpaid,
    overdue: unpaid.filter((p) => isOverdue(p, today)),
    dueSoon: unpaid.filter((p) => p.due != null && p.due >= today && p.due <= limit),
  };
}

// The venue whose deal counts: the chosen one, or the one in the active plan.
export function paymentVenue(venues: Venue[], planVenueId: string | null): Venue | null {
  return venues.find((v) => v.id === planVenueId) ?? venues.find((v) => v.is_final) ?? null;
}
