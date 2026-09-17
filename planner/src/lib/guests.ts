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
  email: string;
  phone: string;
  address: string;
  dietary: string;
  accessibility: string;
  accommodation_needed: boolean;
  transportation_needed: boolean;
  invitation_sent: boolean;
  meal_selection: string;
  table_assignment: string;
  gift_received: boolean;
  thank_you_sent: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending: "Pending",
  yes: "Attending",
  no: "Declined",
};

export function blankGuest(over: Partial<Guest> = {}): Partial<Guest> {
  return {
    name: "New household",
    plus_one: "",
    category: "",
    group_label: "",
    party_size: 1,
    kids_count: 0,
    rsvp_status: "pending",
    notes: "",
    email: "",
    phone: "",
    address: "",
    dietary: "",
    accessibility: "",
    accommodation_needed: false,
    transportation_needed: false,
    invitation_sent: false,
    meal_selection: "",
    table_assignment: "",
    gift_received: false,
    thank_you_sent: false,
    sort_order: 0,
    ...over,
  };
}

export function guestSummary(guests: Guest[], target: number) {
  const adults = guests.reduce((n, g) => n + g.party_size, 0);
  const kids = guests.reduce((n, g) => n + g.kids_count, 0);
  const yes = guests.filter((g) => g.rsvp_status === "yes");
  const confirmedAdults = yes.reduce((n, g) => n + g.party_size, 0);
  const confirmedKids = yes.reduce((n, g) => n + g.kids_count, 0);
  const declined = guests.filter((g) => g.rsvp_status === "no").length;
  const pending = guests.filter((g) => g.rsvp_status === "pending").length;
  return {
    households: guests.length,
    adults,
    kids,
    totalWithKids: adults + kids,
    // Positive means over target, negative means under — the opposite of
    // the old "remaining" field, which read as -7 for 7 *over* target.
    overBy: adults - target,
    confirmed: confirmedAdults + confirmedKids,
    confirmedAdults,
    confirmedKids,
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

export const GUEST_GROUPS = [
  "Family of Bride",
  "Family of Groom",
  "Friends of Bride",
  "Friends of Groom",
  "Wedding Party",
  "Work Colleagues",
  "Plus-ones & Partners",
  "Other",
];

// Fixed groups first, then any custom ones already in use (e.g. existing
// data like "Core Family" or "Bride & Groom's People").
export function guestGroupOptions(guests: Pick<Guest, "category">[]): string[] {
  const extra = [...new Set(guests.map((g) => g.category).filter((c) => c && !GUEST_GROUPS.includes(c)))].sort();
  return [...GUEST_GROUPS, ...extra];
}

export function guestNeeds(g: Guest): string[] {
  const needs: string[] = [];
  if ((g.dietary ?? "").trim()) needs.push("dietary");
  if ((g.accessibility ?? "").trim()) needs.push("accessibility");
  if (g.accommodation_needed) needs.push("accommodation");
  if (g.transportation_needed) needs.push("transportation");
  return needs;
}

const CSV_COLUMNS: (keyof Guest)[] = [
  "name",
  "plus_one",
  "category",
  "group_label",
  "party_size",
  "kids_count",
  "rsvp_status",
  "email",
  "phone",
  "address",
  "dietary",
  "accessibility",
  "accommodation_needed",
  "transportation_needed",
  "invitation_sent",
  "meal_selection",
  "table_assignment",
  "gift_received",
  "thank_you_sent",
  "notes",
];

function csvCell(value: string | number | boolean): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function guestsToCsv(guests: Guest[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = guests.map((g) => CSV_COLUMNS.map((c) => csvCell(g[c] as string | number | boolean)).join(","));
  return [header, ...rows].join("\n");
}
