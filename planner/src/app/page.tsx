import { createClient } from "@/lib/supabase/server";
import Dashboard, { type OverviewCard } from "@/components/Dashboard";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";
import { DEFAULT_BUDGET_SETTINGS, GUEST_CAPACITY } from "@/lib/venues";
import { computeActionItems, computeRoadmap, daysUntil, decisionsWaiting, greeting } from "@/lib/dashboard";
import { guestSummary } from "@/lib/guests";
import { formatEventDate } from "@/lib/events";
import type { Rating } from "@/lib/decisions";
import type { WeddingEvent } from "@/lib/wedding-events";

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

  const { assumptions, sharedVals, settings, guests } = await getBudgetContext(supabase);
  const capacitySummary = guestSummary(guests, GUEST_CAPACITY);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [
    { data: myRatings },
    { data: sharedIdeas },
    { data: customTasks },
    { data: upcomingEvents },
    { data: celebrationEvents },
    { data: weddingDayEvents },
    { data: partyMembers },
    { data: vendors },
    { data: registries },
    { data: diyProjects },
  ] = await Promise.all([
    user ? supabase.from("venue_ratings").select("*").eq("rater_id", user.id) : Promise.resolve({ data: [] as Rating[] }),
    supabase.from("idea_pins").select("id, title, image_url, category").eq("visibility", "shared"),
    supabase.from("custom_tasks").select("*").eq("done", false).order("created_at", { ascending: true }),
    supabase.from("upcoming_events").select("*").gte("event_date", todayStr).order("event_date", { ascending: true }).limit(5),
    supabase.from("wedding_events").select("key, title, event_date, location").in("key", ["welcome-party", "rehearsal-dinner", "brunch"]),
    supabase.from("wedding_day_events").select("id"),
    supabase.from("wedding_party").select("id"),
    supabase.from("vendors").select("id, status"),
    supabase.from("registries").select("id"),
    supabase.from("diy_projects").select("id, status"),
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

  function eventStatus(ev?: Pick<WeddingEvent, "event_date" | "location">) {
    if (!ev?.event_date) return "Add a date";
    return [formatEventDate(ev.event_date), ev.location].filter(Boolean).join(" · ");
  }
  const eventByKey = (key: string) => (celebrationEvents ?? []).find((e) => e.key === key);

  const celebrationCards: OverviewCard[] = [
    { key: "welcome-party", title: "Welcome Party", status: eventStatus(eventByKey("welcome-party")), href: "/events/welcome-party" },
    { key: "rehearsal-dinner", title: "Rehearsal Dinner", status: eventStatus(eventByKey("rehearsal-dinner")), href: "/events/rehearsal-dinner" },
    {
      key: "wedding-day",
      title: "Wedding Day",
      status: weddingDayEvents?.length ? `${weddingDayEvents.length} moment${weddingDayEvents.length === 1 ? "" : "s"} planned` : "Plan your timeline",
      href: "/wedding-day",
    },
    { key: "brunch", title: "Brunch", status: eventStatus(eventByKey("brunch")), href: "/events/brunch" },
  ];

  const bookedVendors = (vendors ?? []).filter((v) => v.status === "booked" || v.status === "confirmed").length;

  const peopleCards: OverviewCard[] = [
    {
      key: "wedding-party",
      title: "Wedding Party",
      status: partyMembers?.length ? `${partyMembers.length} standing up with you` : "Add your wedding party",
      href: "/wedding-party",
    },
    {
      key: "vendors",
      title: "Vendors",
      status: vendors?.length ? `${bookedVendors} of ${vendors.length} booked` : "Start booking vendors",
      href: "/vendors",
    },
    {
      key: "registry",
      title: "Registry",
      status: registries?.length ? `${registries.length} registr${registries.length === 1 ? "y" : "ies"} linked` : "Start your registry",
      href: "/registry",
    },
  ];

  const diyInProgress = (diyProjects ?? []).filter((p) => p.status === "making" || p.status === "materials_needed").length;
  const diyFinished = (diyProjects ?? []).filter((p) => p.status === "finished").length;
  const diyStatus = !diyProjects?.length
    ? "Start a project"
    : diyInProgress > 0
      ? `${diyInProgress} in progress`
      : diyFinished === diyProjects.length
        ? `All ${diyProjects.length} finished`
        : `${diyProjects.length} project${diyProjects.length === 1 ? "" : "s"}`;

  const ideaCards: OverviewCard[] = [
    {
      key: "inspiration",
      title: "Inspiration Board",
      status: ideas.length
        ? `${ideas.length} idea${ideas.length === 1 ? "" : "s"}${ideaUndecidedCount > 0 ? ` · ${ideaUndecidedCount} need${ideaUndecidedCount === 1 ? "s" : ""} a decision` : ""}`
        : "Start a collection",
      href: "/ideas",
    },
    { key: "diy", title: "DIY Projects", status: diyStatus, href: "/diy" },
  ];

  return (
    <Dashboard
      initialVenues={venues ?? []}
      userName={userName}
      greetingText={greeting(userName)}
      assumptions={assumptions}
      sharedVals={sharedVals}
      daysUntilWedding={daysUntil(weddingDate)}
      guestTotal={capacitySummary.totalWithKids}
      guestAdults={capacitySummary.adults}
      guestKids={capacitySummary.kids}
      decisionsWaitingCount={dw.count}
      decisionsWaitingVenue={dw.venueName}
      roadmap={roadmap}
      actionItems={actionItems}
      initialCustomTasks={customTasks ?? []}
      initialEvents={upcomingEvents ?? []}
      celebrationCards={celebrationCards}
      peopleCards={peopleCards}
      ideaCards={ideaCards}
    />
  );
}
