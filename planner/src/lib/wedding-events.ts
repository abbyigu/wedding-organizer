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
