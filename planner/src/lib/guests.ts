export type RsvpStatus = "pending" | "yes" | "no";

export type Guest = {
  id: string;
  name: string;
  plus_one: string;
  category: string;
  group_label: string;
  party_size: number;
  kids_count: number;
  rsvp_status: RsvpStatus;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending: "Pending",
  yes: "Yes",
  no: "No",
};

export function blankGuest(over: Partial<Guest> = {}): Partial<Guest> {
  return {
    name: "New guest",
    plus_one: "",
    category: "",
    group_label: "",
    party_size: 1,
    kids_count: 0,
    rsvp_status: "pending",
    notes: "",
    sort_order: 0,
    ...over,
  };
}

export function guestSummary(guests: Guest[], target: number) {
  const adults = guests.reduce((n, g) => n + g.party_size, 0);
  const kids = guests.reduce((n, g) => n + g.kids_count, 0);
  const confirmed = guests.filter((g) => g.rsvp_status === "yes").reduce((n, g) => n + g.party_size + g.kids_count, 0);
  const declined = guests.filter((g) => g.rsvp_status === "no").length;
  const pending = guests.filter((g) => g.rsvp_status === "pending").length;
  return {
    households: guests.length,
    adults,
    kids,
    totalWithKids: adults + kids,
    remaining: target - adults,
    confirmed,
    declined,
    pending,
  };
}

export function groupByCategory(guests: Guest[]): [string, Guest[]][] {
  const map = new Map<string, Guest[]>();
  for (const g of guests) {
    const key = g.category || "Uncategorized";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }
  return [...map.entries()];
}
