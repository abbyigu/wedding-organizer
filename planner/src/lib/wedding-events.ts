export type WeddingEvent = {
  id: string;
  title: string;
  location: string;
  event_date: string | null;
  time: string;
  dress_code: string;
  capacity: number | null;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EventGuestStatus = "invited" | "attending" | "not_attending";

export type EventGuest = {
  id: string;
  event_id: string;
  guest_id: string;
  status: EventGuestStatus;
  created_at: string;
  updated_at: string;
};

export function blankWeddingEvent(sortOrder: number): Partial<WeddingEvent> {
  return { title: "New event", location: "", event_date: null, time: "", dress_code: "", capacity: null, notes: "", sort_order: sortOrder };
}

export const EVENT_GUEST_STATUS_ORDER: EventGuestStatus[] = ["invited", "attending", "not_attending"];

export const EVENT_GUEST_STATUS_LABELS: Record<EventGuestStatus, string> = {
  invited: "Invited",
  attending: "Attending",
  not_attending: "Not attending",
};
