export type EventType = "tour" | "deadline" | "call" | "payment" | "meeting" | "other";

export type UpcomingEvent = {
  id: string;
  title: string;
  event_date: string;
  type: EventType;
};

export const EVENT_TYPE_ORDER: EventType[] = ["tour", "deadline", "call", "payment", "meeting", "other"];

export const EVENT_TYPES: Record<EventType, string> = {
  tour: "Venue tour",
  deadline: "Deadline",
  call: "Call",
  payment: "Payment",
  meeting: "Meeting",
  other: "Other",
};

export function blankEvent(): Partial<UpcomingEvent> {
  return { title: "New event", event_date: new Date().toISOString().slice(0, 10), type: "other" };
}

export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
