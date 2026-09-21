export type WeddingEvent = {
  id: string;
  key: string | null;
  title: string;
  location: string;
  event_date: string | null;
  time: string;
  dress_code: string;
  capacity: number | null;
  notes: string;
  menu: string;
  vendor_id: string | null;
  budget_estimate: number | null;
  budget_notes: string;
  description?: string;
  tag?: string;
  photo_url?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EventGuestStatus = "invited" | "attending" | "not_attending" | "not_invited";

export type EventGuest = {
  id: string;
  event_id: string;
  guest_id: string;
  status: EventGuestStatus;
  created_at: string;
  updated_at: string;
};

export function blankWeddingEvent(sortOrder: number): Partial<WeddingEvent> {
  return {
    title: "New event",
    location: "",
    event_date: null,
    time: "",
    dress_code: "",
    capacity: null,
    notes: "",
    menu: "",
    vendor_id: null,
    budget_estimate: null,
    budget_notes: "",
    sort_order: sortOrder,
  };
}

// When set for an event's key, its invite list is limited to guests in
// these categories (see GUEST_GROUPS in lib/guests.ts) instead of everyone.
export const EVENT_INVITE_CATEGORIES: Record<string, string[]> = {
  "rehearsal-dinner": ["Family of Bride", "Family of Groom", "Wedding Party"],
};

export const EVENT_GUEST_STATUS_ORDER: EventGuestStatus[] = ["invited", "attending", "not_attending", "not_invited"];

export const EVENT_GUEST_STATUS_LABELS: Record<EventGuestStatus, string> = {
  invited: "Invited",
  attending: "Attending",
  not_attending: "Not attending",
  not_invited: "Not invited",
};

export const EVENT_SUGGESTIONS = [
  "Welcome Party",
  "Rehearsal Dinner",
  "Day-After Brunch",
  "Family Dinner",
  "Wedding Party Activity",
  "Boat Tour",
  "Winery Visit",
  "After Party",
  "Farewell Drinks",
];

export const TAG_SUGGESTIONS = ["Informal", "Casual", "Semi-formal", "Formal"];

// Stand-in photos until an event gets its own (photo_url).
export const EVENT_PHOTOS = ["/photo-candlelit-table.jpg", "/photo-flower-table.jpg"];

// Custom events have no key, so their page lives at /events/<id>.
export const eventHref = (e: Pick<WeddingEvent, "key" | "id">) => `/events/${e.key ?? e.id}`;

export function inviteLabel(e: Pick<WeddingEvent, "key">) {
  const cats = EVENT_INVITE_CATEGORIES[e.key ?? ""];
  return cats ? cats.join(" + ") : "All guests";
}

export function eventCounts(
  e: Pick<WeddingEvent, "id" | "key">,
  guests: { id: string; category: string }[],
  eventGuests: EventGuest[],
) {
  const cats = EVENT_INVITE_CATEGORIES[e.key ?? ""];
  const status = new Map(eventGuests.filter((x) => x.event_id === e.id).map((x) => [x.guest_id, x.status]));
  const c = { invited: 0, attending: 0, declined: 0, awaiting: 0 };
  for (const g of cats ? guests.filter((g) => cats.includes(g.category)) : guests) {
    const s = status.get(g.id) ?? "invited";
    if (s === "not_invited") continue;
    c.invited++;
    if (s === "attending") c.attending++;
    else if (s === "not_attending") c.declined++;
    else c.awaiting++;
  }
  return c;
}

export const EVENT_EXPENSE_CATEGORIES = ["Venue / restaurant", "Food", "Drinks", "Cake / dessert", "Décor", "Stationery", "Transportation", "Tips", "Other"];

export type EventExpense = { id: string; event_id: string; category: string; label: string; amount: number; paid: boolean; sort_order: number };

// What an event costs: its line items once there are any, otherwise the rough estimate.
export function eventCost(e: Pick<WeddingEvent, "budget_estimate">, expenses: Pick<EventExpense, "amount">[]) {
  const sum = expenses.reduce((t, x) => t + (x.amount || 0), 0);
  return sum > 0 ? sum : e.budget_estimate ?? 0;
}

export const eventStepsDone = (e: WeddingEvent, expenses: unknown[]) => ({
  place: Boolean(e.event_date && e.location.trim()),
  menu: Boolean(e.menu.trim()),
  vendor: Boolean(e.vendor_id),
  budget: e.budget_estimate != null || expenses.length > 0,
});

export type TimelineMoment = { id: string; moment_date: string; time: string; title: string; note: string; kind: string; sort_order: number };

export const MOMENT_KINDS = [
  { key: "free", label: "Guest free time" },
  { key: "checkin", label: "Hotel check-in" },
  { key: "transport", label: "Transportation" },
  { key: "getting-ready", label: "Getting ready" },
  { key: "photos", label: "Photos" },
  { key: "shuttle", label: "Shuttle" },
  { key: "after-party", label: "After-party" },
  { key: "other", label: "Other" },
];

// "6:00 PM – 10:00 PM" / "18:30" -> minutes since midnight, for ordering within a day.
export function parseMinutes(t: string): number {
  const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return 24 * 60;
  let h = +m[1];
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return h * 60 + +(m[2] ?? 0);
}

export const EVENT_TASK_CATEGORY: Record<string, string> = { "rehearsal-dinner": "Rehearsal Dinner", "welcome-party": "Welcome Party", brunch: "Brunch" };
