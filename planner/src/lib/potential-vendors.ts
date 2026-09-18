export type Reaction = "love" | "like" | "maybe" | "no";
export type Availability = "unknown" | "available" | "unavailable" | "asked";
export type CommunicationStatus = "not_contacted" | "inquiry_sent" | "replied" | "meeting_booked" | "quote_received" | "follow_up_needed";
export type DecisionStatus = "researching" | "shortlisted" | "finalist" | "rejected";
export type WorksWithVenue = "approved" | "need_to_ask" | "external_fee" | "not_allowed";
export type PriceUnit = "flat" | "person" | "hour" | "package";

export type PotentialVendor = {
  id: string;
  name: string;
  category: string;
  contact_name: string;
  website: string;
  email: string;
  phone: string;
  social: string;
  cover_photo: string;
  photos: string[];
  price_low: number | null;
  price_high: number | null;
  price_unit: PriceUnit;
  tax_included: boolean;
  service_charge_pct: number | null;
  travel_fee: number | null;
  deposit_required: string;
  availability: Availability;
  availability_response_date: string | null;
  city: string;
  address: string;
  distance_km: number | null;
  travel_included: boolean;
  travel_radius: string;
  package_details: string;
  whats_included: string;
  add_ons: string;
  exclusions: string;
  minimum_spend: number | null;
  ariel_reaction: Reaction | null;
  fred_reaction: Reaction | null;
  notes: string;
  pros: string;
  concerns: string;
  communication_status: CommunicationStatus;
  quote_url: string;
  brochure_url: string;
  contract_url: string;
  date_discovered: string | null;
  date_contacted: string | null;
  follow_up_date: string | null;
  quote_expiry: string | null;
  source: string;
  decision_status: DecisionStatus;
  works_with_venue: WorksWithVenue;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const REACTION_ORDER: Reaction[] = ["love", "like", "maybe", "no"];
export const REACTION_EMOJI: Record<Reaction, string> = { love: "❤️", like: "👍", maybe: "🤔", no: "❌" };
export const REACTION_LABELS: Record<Reaction, string> = { love: "Love", like: "Like", maybe: "Maybe", no: "No" };

export const AVAILABILITY_ORDER: Availability[] = ["unknown", "available", "unavailable", "asked"];
export const AVAILABILITY_LABELS: Record<Availability, string> = {
  unknown: "Unknown",
  available: "Available",
  unavailable: "Unavailable",
  asked: "Asked",
};

export const COMMUNICATION_ORDER: CommunicationStatus[] = [
  "not_contacted",
  "inquiry_sent",
  "replied",
  "meeting_booked",
  "quote_received",
  "follow_up_needed",
];
export const COMMUNICATION_LABELS: Record<CommunicationStatus, string> = {
  not_contacted: "Not contacted",
  inquiry_sent: "Inquiry sent",
  replied: "Replied",
  meeting_booked: "Meeting booked",
  quote_received: "Quote received",
  follow_up_needed: "Follow-up needed",
};

export const DECISION_ORDER: DecisionStatus[] = ["researching", "shortlisted", "finalist", "rejected"];
export const DECISION_LABELS: Record<DecisionStatus, string> = {
  researching: "Researching",
  shortlisted: "Shortlisted",
  finalist: "Finalist",
  rejected: "Rejected",
};

export const WORKS_WITH_VENUE_ORDER: WorksWithVenue[] = ["approved", "need_to_ask", "external_fee", "not_allowed"];
export const WORKS_WITH_VENUE_LABELS: Record<WorksWithVenue, string> = {
  approved: "✓ Approved",
  need_to_ask: "? Need to ask",
  external_fee: "External vendor fee",
  not_allowed: "✕ Not allowed",
};

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  flat: "flat",
  person: "per person",
  hour: "per hour",
  package: "per package",
};

// Reuses the same category list as Booked Vendors, so a "moved" vendor
// keeps the same category on both sides of the pipeline.
export const POTENTIAL_VENDOR_CATEGORIES = [
  "Venue",
  "Catering",
  "Photography",
  "Videography",
  "Music & DJ",
  "Florist",
  "Hair & makeup",
  "Officiant",
  "Transportation",
  "Stationery",
  "Cake & desserts",
  "Rentals",
  "Other",
] as const;

export function blankPotentialVendor(sortOrder: number): Partial<PotentialVendor> {
  return {
    name: "New vendor",
    category: "Other",
    contact_name: "",
    website: "",
    email: "",
    phone: "",
    social: "",
    cover_photo: "",
    photos: [],
    price_low: null,
    price_high: null,
    price_unit: "package",
    tax_included: false,
    service_charge_pct: null,
    travel_fee: null,
    deposit_required: "",
    availability: "unknown",
    availability_response_date: null,
    city: "",
    address: "",
    distance_km: null,
    travel_included: false,
    travel_radius: "",
    package_details: "",
    whats_included: "",
    add_ons: "",
    exclusions: "",
    minimum_spend: null,
    ariel_reaction: null,
    fred_reaction: null,
    notes: "",
    pros: "",
    concerns: "",
    communication_status: "not_contacted",
    quote_url: "",
    brochure_url: "",
    contract_url: "",
    date_discovered: new Date().toISOString().slice(0, 10),
    date_contacted: null,
    follow_up_date: null,
    quote_expiry: null,
    source: "",
    decision_status: "researching",
    works_with_venue: "need_to_ask",
    sort_order: sortOrder,
  };
}

export function priceRange(v: Pick<PotentialVendor, "price_low" | "price_high" | "price_unit">): string {
  const { price_low, price_high, price_unit } = v;
  if (price_low == null && price_high == null) return "";
  const unit = price_unit === "flat" || price_unit === "package" ? "" : ` ${PRICE_UNIT_LABELS[price_unit]}`;
  if (price_low != null && price_high != null && price_low !== price_high) {
    return `$${price_low.toLocaleString()}–${price_high.toLocaleString()}${unit}`;
  }
  const single = price_low ?? price_high ?? 0;
  return `$${single.toLocaleString()}${unit}`;
}
