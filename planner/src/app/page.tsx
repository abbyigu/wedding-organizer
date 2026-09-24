import { createClient } from "@/lib/supabase/server";
import Dashboard, { type SearchItem } from "@/components/Dashboard";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";
import { DEFAULT_BUDGET_SETTINGS, DEFAULT_GUEST_TARGET } from "@/lib/venues";
import { computeActionItems, computeJourney, computeRoadmap, daysUntil, decisionsWaiting } from "@/lib/dashboard";
import { guestSummary } from "@/lib/guests";
import type { Rating } from "@/lib/decisions";
import { partnerName } from "@/lib/ideas";
import { loadActivePlan } from "@/lib/plan";
import { paymentTotals, paymentVenue, planPayments } from "@/lib/payment-plan";
import { buildAttention } from "@/lib/needs-attention";
import { loadHoneymoonSummary } from "@/lib/honeymoon";
import type { Payment } from "@/lib/budget-extras";
import type { Venue } from "@/lib/venues";

// Always read fresh from Supabase — this page must never show stale data
// (e.g. a photo just added on a venue's profile) from Next's route cache.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  // Two waves of queries instead of six: first what everything else depends on, then everything else at once.
  const [
    {
      data: { user },
    },
    { data: venues },
    { assumptions, sharedVals, settings, guests },
  ] = await Promise.all([supabase.auth.getUser(), supabase.from("venues").select("*").order("sort_order", { ascending: true }), getBudgetContext(supabase)]);
  const userName = displayName(user?.email);

  const coverPaths = (venues ?? [])
    .map((v) => v.photos?.[0]?.path)
    .filter((p): p is string => Boolean(p));
  const guestTarget = settings.guest_target ?? DEFAULT_GUEST_TARGET;
  const capacitySummary = guestSummary(guests, guestTarget);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [
    { data: myRatings },
    { data: sharedIdeas },
    { data: customTasks },
    { data: upcomingEvents },
    { data: vendors },
    { data: planningTasks },
    { data: vendorComms },
    { data: venueComms },
    { data: decisionRows },
    { data: optionRows },
    { data: voteRows },
    { data: diyRows },
    { data: paymentRows },
    plan,
    honeymoon,
    { data: allReactions },
    signed,
  ] = await Promise.all([
    user ? supabase.from("venue_ratings").select("*").eq("rater_id", user.id) : Promise.resolve({ data: [] as Rating[] }),
    supabase.from("idea_pins").select("id, title, image_url, category").eq("visibility", "shared").order("sort_order", { ascending: true }),
    supabase.from("custom_tasks").select("*").eq("done", false).order("created_at", { ascending: true }),
    supabase.from("upcoming_events").select("*").gte("event_date", todayStr).order("event_date", { ascending: true }).limit(5),
    supabase.from("vendors").select("id, name, status, communication_status, decision_status, quote_expiry"),
    supabase.from("planning_tasks").select("title, category, status, due_date, period"),
    supabase.from("vendor_communications").select("vendor_id, follow_up_date, follow_up_done"), // once migration 046 has run
    supabase.from("venue_communications").select("venue_id, follow_up_date, follow_up_done"), // once migration 049 has run
    supabase.from("decisions").select("id, is_final, link_href"),
    supabase.from("decision_options").select("id, decision_id, status"),
    supabase.from("decision_votes").select("decision_id, voter_id"),
    supabase.from("diy_projects").select("id, title, status, start_date"),
    supabase.from("payments").select("*"),
    loadActivePlan(supabase),
    loadHoneymoonSummary(supabase),
    supabase.from("idea_reactions").select("idea_id, rater_id"),
    coverPaths.length ? supabase.storage.from("venue-photos").createSignedUrls(coverPaths, 3600) : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
  ]);
  const photoUrls: Record<string, string> = Object.fromEntries((signed.data ?? []).map((d) => [d.path ?? "", d.signedUrl ?? ""]));
  const followUpsDue = (vendorComms ?? []).filter((c) => c.follow_up_date && !c.follow_up_done && c.follow_up_date <= todayStr);
  const followUpVendor = followUpsDue.length ? (vendors ?? []).find((v) => v.id === followUpsDue[0].vendor_id)?.name ?? "" : "";

  // Generic decisions: whose turn is it? (The venue decision is counted above from private ratings.)
  const userId = user?.id ?? "";
  const partner = partnerName(userName || "Ariel");
  let yourTurn = 0;
  let waitingOnPartner = 0;
  for (const d of (decisionRows ?? []).filter((d) => !d.is_final && d.link_href !== "/decide/venue")) {
    const opts = (optionRows ?? []).filter((o) => o.decision_id === d.id && o.status !== "out").length;
    if (opts === 0) continue;
    const votes = (voteRows ?? []).filter((v) => v.decision_id === d.id);
    const mine = votes.filter((v) => v.voter_id === userId).length;
    const theirs = votes.filter((v) => v.voter_id !== userId).length;
    if (mine < opts) yourTurn++;
    else if (theirs < opts) waitingOnPartner++;
  }
  const todayIso = new Date().toISOString().slice(0, 10);
  const planPay = paymentTotals(planPayments((paymentRows ?? []) as Payment[], paymentVenue((venues ?? []) as Venue[], plan?.venueId ?? null)), todayIso);
  const attention = buildAttention({
    today: todayIso,
    payments: planPay.unpaid,
    vendors: vendors ?? [],
    vendorFollowUps: vendorComms ?? [],
    venues: (venues ?? []).map((v) => ({ id: v.id, name: v.name })),
    venueFollowUps: venueComms ?? [],
    decisions: { yourTurn, waitingOnPartner, partner },
    guestsPending: guests.filter((g) => g.rsvp_status === "pending").reduce((n, g) => n + g.party_size + g.kids_count, 0),
    diy: diyRows ?? [],
    plan,
    honeymoon,
  });

  const ideas = sharedIdeas ?? [];
  const ideaIds = new Set(ideas.map((i) => i.id));
  const ideaReactions = (allReactions ?? []).filter((r) => ideaIds.has(r.idea_id));
  const votersByIdea = new Map<string, Set<string>>();
  for (const r of ideaReactions) {
    if (!votersByIdea.has(r.idea_id)) votersByIdea.set(r.idea_id, new Set());
    votersByIdea.get(r.idea_id)!.add(r.rater_id);
  }
  const ideaUndecidedCount = ideas.filter((i) => (votersByIdea.get(i.id)?.size ?? 0) < 2).length;

  const dw = decisionsWaiting(venues ?? [], myRatings ?? []);
  const roadmap = computeRoadmap({ venues: venues ?? [], guests, assumptions, sharedVals });
  const actionItems = computeActionItems({
    venues: venues ?? [],
    adults: capacitySummary.adults,
    guestTarget,
    userName,
    myUnratedVenueName: dw.venueName,
    assumptions,
    sharedVals,
  });

  const weddingDate = settings.wedding_date ?? DEFAULT_BUDGET_SETTINGS.wedding_date;
  const daysLeft = daysUntil(weddingDate);
  const bookedVendors = (vendors ?? []).filter((v) => v.status === "booked" || v.status === "confirmed").length;
  const journey = computeJourney({ phasesDone: roadmap.phasesDone, ideaCount: ideas.length, vendorsBooked: bookedVendors, daysUntil: daysLeft });

  // People (not households) by RSVP state, for the guest-list donut.
  const people = (status: string) =>
    guests.filter((g) => g.rsvp_status === status).reduce((n, g) => n + g.party_size + g.kids_count, 0);
  const guestBreakdown = { yes: people("yes"), pending: people("pending"), no: people("no") };

  const heroIdea = ideas.find((i) => i.image_url);
  const searchItems: SearchItem[] = [
    ...(venues ?? []).map((v) => ({ label: v.name, hint: "Venue", href: `/venues/${v.id}` })),
    ...(customTasks ?? []).map((t) => ({ label: t.title, hint: "Task", href: "/#next-actions" })),
    ...ideas.map((i) => ({ label: i.title, hint: "Idea", href: "/ideas" })),
  ];

  return (
    <Dashboard
      initialVenues={venues ?? []}
      userName={userName}
      photoUrls={photoUrls}
      assumptions={assumptions}
      sharedVals={sharedVals}
      daysUntilWedding={daysLeft}
      weddingDateLabel={new Date(weddingDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
      guestTotal={capacitySummary.totalWithKids}
      guestBreakdown={guestBreakdown}
      heroImageUrl={heroIdea?.image_url ?? null}
      ideaCount={ideas.length}
      ideaUndecidedCount={ideaUndecidedCount}
      decisionsWaitingCount={dw.count}
      vendorFollowUps={{ count: new Set(followUpsDue.map((c) => c.vendor_id)).size, name: followUpVendor }}
      decisionsWaitingVenue={dw.venueName}
      journey={journey}
      planningTasks={planningTasks ?? []}
      weddingDate={weddingDate}
      actionItems={actionItems}
      initialCustomTasks={customTasks ?? []}
      initialEvents={upcomingEvents ?? []}
      searchItems={searchItems}
      attention={attention}
      plan={plan ? { id: plan.id, name: plan.name, projected: plan.projected, unknownCount: plan.unknownCount, venueName: plan.venueName } : null}
    />
  );
}
