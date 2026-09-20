import { BUDGET_CEILING, calcVenue, GUEST_CAPACITY, type Assumptions, type Venue } from "@/lib/venues";
import type { Guest } from "@/lib/guests";
import type { Rating } from "@/lib/decisions";

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = target.getTime() - todayLocal.getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export function greeting(name: string): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name ? `${time}, ${name}` : time;
}

// Only "all active venues have quotes" when that's actually true — the old
// logic fell through to this line whenever no venue was a finalist,
// in-progress, or missing capacity, even with zero quotes received.
export function nextVenueAction(venues: Venue[]): string {
  const active = venues.filter((v) => v.status !== "out");
  const needQuote = active.filter((v) => !v.quote_received).length;
  const quotesReceived = active.length - needQuote;
  const contacted = active.filter((v) => v.status !== "researching").length;

  if (active.length === 0) return "Add a venue to get started.";
  if (needQuote === 0) return "All active venues have quotes — time to compare and decide.";
  if (quotesReceived === 0 && contacted < 3) return "Choose three venues to contact first";

  const finalistNoQuote = active.find((v) => v.status === "finalist" && !v.quote_received);
  if (finalistNoQuote) return `Get the quote from ${finalistNoQuote.name}`;
  const inProgress = active.find((v) => (v.status === "contacted" || v.status === "tour_booked") && !v.quote_received);
  if (inProgress) return `Follow up on ${inProgress.name}`;
  const missingCapacity = active.find((v) => !v.capacity);
  if (missingCapacity) return `Confirm capacity at ${missingCapacity.name}`;
  return `Follow up to get the remaining ${needQuote} quote${needQuote === 1 ? "" : "s"}`;
}

export type RoadmapContext = { venues: Venue[]; guests: Guest[]; assumptions: Assumptions; sharedVals: number[] };

const PHASES: { label: string; milestone: string; done: (c: RoadmapContext) => boolean }[] = [
  { label: "Guest list drafted", milestone: "Add your guest list", done: (c) => c.guests.length > 0 },
  {
    label: "Venue research",
    milestone: "Shortlist at least three venues",
    done: (c) => c.venues.filter((v) => v.status !== "out").length >= 3,
  },
  {
    label: "Venues contacted",
    milestone: "Contact three venues",
    done: (c) => c.venues.filter((v) => v.status !== "out" && v.status !== "researching").length >= 3,
  },
  {
    label: "Quotes requested",
    milestone: "Request a quote from a contacted venue",
    done: (c) => c.venues.some((v) => v.status !== "out" && v.quote_received),
  },
  {
    label: "Quotes complete",
    milestone: "Three complete venue quotes",
    done: (c) => c.venues.filter((v) => v.status !== "out" && v.quote_received).length >= 3,
  },
  { label: "Venue decided", milestone: "Mark your final venue decision", done: (c) => c.venues.some((v) => v.is_final) },
  {
    label: "Budget confirmed",
    milestone: "Bring the total under the budget ceiling",
    done: (c) => {
      const finalVenue = c.venues.find((v) => v.is_final);
      return !!finalVenue && calcVenue(finalVenue, c.assumptions, c.sharedVals).grand <= BUDGET_CEILING;
    },
  },
  {
    label: "Guests confirmed",
    milestone: "Get every guest's RSVP in",
    done: (c) => c.guests.length > 0 && c.guests.every((g) => g.rsvp_status !== "pending"),
  },
];

export function computeRoadmap(ctx: RoadmapContext) {
  const idx = PHASES.findIndex((p) => !p.done(ctx));
  const currentIndex = idx === -1 ? PHASES.length - 1 : idx;
  return {
    phaseLabel: PHASES[currentIndex].label,
    step: currentIndex + 1,
    totalSteps: PHASES.length,
    nextMilestone: idx === -1 ? "All set — enjoy the day" : PHASES[currentIndex].milestone,
    previousPhaseLabel: currentIndex > 0 ? PHASES[currentIndex - 1].label : null,
    phasesDone: PHASES.map((p) => p.done(ctx)),
  };
}

export type JourneyStage = { key: string; label: string; pct: number; state: "complete" | "current" | "upcoming" };

// The five-step arc shown on the dashboard, every percentage derived from
// real roadmap phases and data — no stage is ever marked done by default.
export function computeJourney(o: { phasesDone: boolean[]; ideaCount: number; vendorsBooked: number; daysUntil: number }): JourneyStage[] {
  const raw: [string, string, boolean[]][] = [
    ["dream", "Dream", [o.phasesDone[0], o.ideaCount > 0]],
    ["decide", "Decide", o.phasesDone.slice(1, 6)],
    ["build", "Build", [o.phasesDone[6], o.vendorsBooked > 0]],
    ["coordinate", "Coordinate", [o.phasesDone[7]]],
    ["day", "Wedding Day", [o.daysUntil === 0]],
  ];
  const pcts = raw.map(([, , checks]) => Math.round((100 * checks.filter(Boolean).length) / checks.length));
  const currentIdx = pcts.findIndex((p) => p < 100);
  return raw.map(([key, label], i) => ({
    key,
    label,
    pct: pcts[i],
    state: currentIdx === -1 || i < currentIdx ? "complete" : i === currentIdx ? "current" : "upcoming",
  }));
}

export type ActionItem = { title: string; description: string; person: string; effort: string; href: string };

export type CustomTask = {
  id: string;
  title: string;
  description: string;
  person: string;
  effort: string;
  done: boolean;
};

export function blankCustomTask(userName: string): Partial<CustomTask> {
  return { title: "New task", description: "", person: userName, effort: "", done: false };
}

export function computeActionItems(ctx: {
  venues: Venue[];
  totalGuests: number;
  userName: string;
  myUnratedVenueName: string | null;
  assumptions: Assumptions;
  sharedVals: number[];
}): ActionItem[] {
  const items: ActionItem[] = [];
  const active = ctx.venues.filter((v) => v.status !== "out");
  const contactedCount = active.filter((v) => v.status !== "researching").length;
  const quotesReceived = active.filter((v) => v.quote_received).length;

  if (contactedCount < 3 && active.length > 0) {
    items.push({
      title: "Choose three venues to contact",
      description: "Narrow the list before requesting complete quotes.",
      person: "Together",
      effort: "15 min",
      href: "/venues",
    });
  }

  const over = ctx.totalGuests - GUEST_CAPACITY;
  if (over > 0) {
    items.push({
      title: `Review ${over} guest${over === 1 ? "" : "s"} over capacity`,
      description: "Move optional invitations into a second-tier list.",
      person: ctx.userName,
      effort: "10 min",
      href: "/guests/list",
    });
  }

  if (ctx.myUnratedVenueName) {
    items.push({
      title: `Rate ${ctx.myUnratedVenueName} privately`,
      description: "Your rating stays hidden until you submit it.",
      person: ctx.userName,
      effort: "5 min",
      href: "/decide/venue",
    });
  }

  if (active.length > 0) {
    const cheapest = Math.min(...active.map((v) => calcVenue(v, ctx.assumptions, ctx.sharedVals).grand));
    if (cheapest > BUDGET_CEILING) {
      items.push({
        title: "Bring the budget under the $45K ceiling",
        description: "Adjust line items or the guest count on the budget page.",
        person: "Together",
        effort: "20 min",
        href: "/budget",
      });
    }
  }

  if (contactedCount >= 3 && quotesReceived < contactedCount) {
    const remaining = contactedCount - quotesReceived;
    items.push({
      title: `Follow up on ${remaining} outstanding quote${remaining === 1 ? "" : "s"}`,
      description: "Chase the venues that haven't sent complete pricing yet.",
      person: "Together",
      effort: "10 min",
      href: "/",
    });
  }

  return items;
}

export function myUnratedVenue(venues: Venue[], myRatings: Rating[]): Venue | null {
  const ratedIds = new Set(myRatings.map((r) => r.venue_id));
  return venues.find((v) => v.status !== "out" && !ratedIds.has(v.id)) ?? null;
}

export function decisionsWaiting(venues: Venue[], myRatings: Rating[]) {
  const ratedIds = new Set(myRatings.map((r) => r.venue_id));
  const unrated = venues.filter((v) => v.status !== "out" && !ratedIds.has(v.id));
  return { count: unrated.length, venueName: unrated[0]?.name ?? null };
}
