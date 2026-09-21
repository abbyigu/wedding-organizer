import { createClient } from "@/lib/supabase/server";
import Dashboard, { type SearchItem } from "@/components/Dashboard";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";
import { DEFAULT_BUDGET_SETTINGS, GUEST_CAPACITY } from "@/lib/venues";
import { computeActionItems, computeJourney, computeRoadmap, daysUntil, decisionsWaiting } from "@/lib/dashboard";
import { guestSummary } from "@/lib/guests";
import type { Rating } from "@/lib/decisions";

// Always read fresh from Supabase — this page must never show stale data
// (e.g. a photo just added on a venue's profile) from Next's route cache.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = displayName(user?.email);

  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .order("sort_order", { ascending: true });

  const coverPaths = (venues ?? [])
    .map((v) => v.photos?.[0]?.path)
    .filter((p): p is string => Boolean(p));
  let photoUrls: Record<string, string> = {};
  if (coverPaths.length) {
    const { data } = await supabase.storage.from("venue-photos").createSignedUrls(coverPaths, 3600);
    photoUrls = Object.fromEntries((data ?? []).map((d) => [d.path ?? "", d.signedUrl ?? ""]));
  }

  const { assumptions, sharedVals, settings, guests } = await getBudgetContext(supabase);
  const capacitySummary = guestSummary(guests, GUEST_CAPACITY);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [
    { data: myRatings },
    { data: sharedIdeas },
    { data: customTasks },
    { data: upcomingEvents },
    { data: vendors },
    { data: planningTasks },
  ] = await Promise.all([
    user ? supabase.from("venue_ratings").select("*").eq("rater_id", user.id) : Promise.resolve({ data: [] as Rating[] }),
    supabase.from("idea_pins").select("id, title, image_url, category").eq("visibility", "shared").order("sort_order", { ascending: true }),
    supabase.from("custom_tasks").select("*").eq("done", false).order("created_at", { ascending: true }),
    supabase.from("upcoming_events").select("*").gte("event_date", todayStr).order("event_date", { ascending: true }).limit(5),
    supabase.from("vendors").select("id, status"),
    supabase.from("planning_tasks").select("title, category, status, due_date, period"),
  ]);

  const ideas = sharedIdeas ?? [];
  const { data: ideaReactions } = ideas.length
    ? await supabase.from("idea_reactions").select("idea_id, rater_id").in("idea_id", ideas.map((i) => i.id))
    : { data: [] as { idea_id: string; rater_id: string }[] };
  const votersByIdea = new Map<string, Set<string>>();
  for (const r of ideaReactions ?? []) {
    if (!votersByIdea.has(r.idea_id)) votersByIdea.set(r.idea_id, new Set());
    votersByIdea.get(r.idea_id)!.add(r.rater_id);
  }
  const ideaUndecidedCount = ideas.filter((i) => (votersByIdea.get(i.id)?.size ?? 0) < 2).length;

  const dw = decisionsWaiting(venues ?? [], myRatings ?? []);
  const roadmap = computeRoadmap({ venues: venues ?? [], guests, assumptions, sharedVals });
  const actionItems = computeActionItems({
    venues: venues ?? [],
    totalGuests: capacitySummary.totalWithKids,
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
      decisionsWaitingVenue={dw.venueName}
      journey={journey}
      planningTasks={planningTasks ?? []}
      weddingDate={weddingDate}
      actionItems={actionItems}
      initialCustomTasks={customTasks ?? []}
      initialEvents={upcomingEvents ?? []}
      searchItems={searchItems}
    />
  );
}
