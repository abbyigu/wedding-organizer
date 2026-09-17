import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";
import { DEFAULT_BUDGET_SETTINGS, GUEST_CAPACITY } from "@/lib/venues";
import { computeActionItems, computeRoadmap, daysUntil, decisionsWaiting, greeting } from "@/lib/dashboard";
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
  const [{ data: myRatings }, { data: sharedIdeas }, { data: customTasks }, { data: upcomingEvents }] = await Promise.all([
    user ? supabase.from("venue_ratings").select("*").eq("rater_id", user.id) : Promise.resolve({ data: [] as Rating[] }),
    supabase.from("idea_pins").select("id, title, image_url, category").eq("visibility", "shared"),
    supabase.from("custom_tasks").select("*").eq("done", false).order("created_at", { ascending: true }),
    supabase.from("upcoming_events").select("*").gte("event_date", todayStr).order("event_date", { ascending: true }).limit(5),
  ]);

  const ideas = sharedIdeas ?? [];
  const ideaThumbs = ideas.filter((i) => i.image_url).slice(0, 4);
  const ideaCollectionCount = new Set(ideas.map((i) => i.category)).size;

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

  return (
    <Dashboard
      initialVenues={venues ?? []}
      userName={userName}
      greetingText={greeting(userName)}
      photoUrls={photoUrls}
      assumptions={assumptions}
      sharedVals={sharedVals}
      daysUntilWedding={daysUntil(weddingDate)}
      guestTotal={capacitySummary.totalWithKids}
      guestAdults={capacitySummary.adults}
      guestKids={capacitySummary.kids}
      ideaThumbs={ideaThumbs}
      ideaCount={ideas.length}
      ideaCollectionCount={ideaCollectionCount}
      ideaUndecidedCount={ideaUndecidedCount}
      decisionsWaitingCount={dw.count}
      decisionsWaitingVenue={dw.venueName}
      roadmap={roadmap}
      actionItems={actionItems}
      initialCustomTasks={customTasks ?? []}
      initialEvents={upcomingEvents ?? []}
    />
  );
}
