import { isOverdue, type PlanPayment } from "@/lib/payment-plan";
import type { PlanSummary } from "@/lib/plan";

// "Needs attention" is a smart view over records that already exist. It stores nothing and creates no tasks:
// every line points at the record that has to change, and disappears when that record is fixed.
export type AttentionItem = { id: string; text: string; href: string; tone: "urgent" | "soon" | "info"; area: string };

type Input = {
  today: string;
  payments: PlanPayment[];
  vendors: { id: string; name: string; status: string; communication_status: string; decision_status: string; quote_expiry: string | null }[];
  vendorFollowUps: { vendor_id: string; follow_up_date: string | null; follow_up_done: boolean }[];
  venues: { id: string; name: string }[];
  venueFollowUps: { venue_id: string; follow_up_date: string | null; follow_up_done: boolean }[];
  decisions: { yourTurn: number; waitingOnPartner: number; partner: string };
  guestsPending: number;
  diy: { id: string; title: string; status: string; start_date: string | null }[];
  plan: PlanSummary | null;
  honeymoon?: { name: string; unknown: number; overdue: number; dueSoon: number } | null;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const addDays = (date: string, n: number) => {
  const d = new Date(date + "T12:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const rank = { urgent: 0, soon: 1, info: 2 } as const;

export function buildAttention(i: Input): AttentionItem[] {
  const out: AttentionItem[] = [];
  const week = addDays(i.today, 7);

  const overdue = i.payments.filter((p) => isOverdue(p, i.today) && !p.paid);
  if (overdue.length) out.push({ id: "pay-overdue", text: `${plural(overdue.length, "payment")} overdue: ${overdue.slice(0, 2).map((p) => p.payee).join(", ")}`, href: "/budget/payments", tone: "urgent", area: "Payments" });
  const thisWeek = i.payments.filter((p) => !p.paid && p.due != null && p.due >= i.today && p.due <= week);
  if (thisWeek.length) out.push({ id: "pay-week", text: `${plural(thisWeek.length, "payment")} due in the next 7 days`, href: "/budget/payments", tone: "soon", area: "Payments" });
  const month = i.payments.filter((p) => !p.paid && p.due != null && p.due > week && p.due <= addDays(i.today, 30));
  if (month.length) out.push({ id: "pay-month", text: `${plural(month.length, "payment")} due in the next 30 days`, href: "/budget/payments", tone: "info", area: "Payments" });

  const lateVendors = new Map<string, number>();
  for (const c of i.vendorFollowUps) if (c.follow_up_date && !c.follow_up_done && c.follow_up_date <= i.today) lateVendors.set(c.vendor_id, (lateVendors.get(c.vendor_id) ?? 0) + 1);
  for (const [id] of lateVendors) {
    const v = i.vendors.find((x) => x.id === id);
    if (v) out.push({ id: `fu-vendor-${id}`, text: `Follow up with ${v.name}`, href: `/vendors/${id}?tab=communication`, tone: "urgent", area: "Vendors" });
  }
  const lateVenues = new Set(i.venueFollowUps.filter((c) => c.follow_up_date && !c.follow_up_done && c.follow_up_date <= i.today).map((c) => c.venue_id));
  for (const id of lateVenues) {
    const v = i.venues.find((x) => x.id === id);
    if (v) out.push({ id: `fu-venue-${id}`, text: `Follow up with ${v.name}`, href: `/venues/${id}?tab=contact`, tone: "urgent", area: "Venues" });
  }

  const review = i.vendors.filter((v) => v.communication_status === "quote_received" && v.status !== "booked" && v.status !== "confirmed" && v.decision_status !== "rejected");
  if (review.length) out.push({ id: "quotes-review", text: `${plural(review.length, "vendor quote")} need${review.length === 1 ? "s" : ""} reviewing`, href: "/vendors", tone: "soon", area: "Vendors" });
  const expiring = i.vendors.filter((v) => v.quote_expiry && v.quote_expiry >= i.today && v.quote_expiry <= addDays(i.today, 14) && v.status !== "booked" && v.status !== "confirmed");
  for (const v of expiring) out.push({ id: `expiry-${v.id}`, text: `${v.name}'s quote expires soon`, href: `/vendors/${v.id}?tab=pricing`, tone: "soon", area: "Vendors" });

  if (i.decisions.yourTurn > 0) out.push({ id: "dec-you", text: `${plural(i.decisions.yourTurn, "decision")} waiting for your vote`, href: "/decide", tone: "soon", area: "Decide Together" });
  if (i.decisions.waitingOnPartner > 0) out.push({ id: "dec-partner", text: `${plural(i.decisions.waitingOnPartner, "decision")} waiting for ${i.decisions.partner}`, href: "/decide", tone: "info", area: "Decide Together" });

  const soonDiy = i.diy.filter((p) => p.status !== "finished" && p.status !== "making" && p.start_date != null && p.start_date <= addDays(i.today, 30));
  for (const p of soonDiy.slice(0, 2)) out.push({ id: `diy-${p.id}`, text: `${p.title} should start ${p.start_date! <= i.today ? "now" : "this month"}`, href: `/diy/${p.id}`, tone: p.start_date! <= i.today ? "soon" : "info", area: "DIY" });

  if (i.guestsPending > 0) out.push({ id: "rsvp", text: `${plural(i.guestsPending, "guest")} ${i.guestsPending === 1 ? "has" : "have"} not responded`, href: "/guests/rsvp", tone: "info", area: "Guests" });

  if (i.plan) {
    if (i.plan.unknownCount > 0) out.push({ id: "plan-unknown", text: `${i.plan.name} has ${plural(i.plan.unknownCount, "unknown cost")}`, href: `/budget/scenarios/${i.plan.id}`, tone: "soon", area: "Our plan" });
    for (const [n, m] of i.plan.missing.filter((x) => x.kind === "unknown" && !x.href.startsWith("#")).slice(0, 3).entries()) out.push({ id: `plan-missing-${n}`, text: m.text, href: m.href, tone: "info", area: "Our plan" });
  }

  if (i.honeymoon) {
    const h = i.honeymoon;
    if (h.overdue > 0) out.push({ id: "hm-overdue", text: `${plural(h.overdue, "honeymoon payment")} overdue`, href: "/honeymoon", tone: "urgent", area: "Honeymoon" });
    if (h.dueSoon > 0) out.push({ id: "hm-soon", text: `${plural(h.dueSoon, "honeymoon payment")} due in the next 30 days`, href: "/honeymoon", tone: "soon", area: "Honeymoon" });
    if (h.unknown > 0) out.push({ id: "hm-unknown", text: `Honeymoon in ${h.name} has ${plural(h.unknown, "unknown cost")}`, href: "/honeymoon", tone: "info", area: "Honeymoon" });
  }

  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
