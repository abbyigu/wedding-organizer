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
