import type { BudgetGroup } from "@/lib/budget-extras";
import { normalizeUrl } from "@/lib/ideas";
import type { IdeaImage } from "@/lib/registry";

export type VendorStatus = "researching" | "contacted" | "booked" | "confirmed";
export type Reaction = "love" | "like" | "maybe" | "no";
export type Availability = "unknown" | "available" | "unavailable" | "asked";
export type CommunicationStatus = "not_contacted" | "inquiry_sent" | "replied" | "meeting_booked" | "quote_received" | "follow_up_needed";
export type DecisionStatus = "researching" | "shortlisted" | "finalist" | "rejected";
export type WorksWithVenue = "approved" | "need_to_ask" | "external_fee" | "not_allowed";
export type PriceUnit = "flat" | "person" | "adult" | "child" | "hour" | "package" | "custom";
export type PriceSource = "rough_estimate" | "website" | "starting_price" | "vendor_estimate" | "quote" | "contracted" | "actual";
export type LineItem = { label: string; amount: number };

// One record from first idea to signed contract. Booking a vendor changes `status`; nothing is copied.
export type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  social: string;
  tagline: string;
  status: VendorStatus;
  notes: string;
  sort_order: number;
  photos: string[];
  price_low: number | null;
  price_high: number | null;
  price_unit: PriceUnit;
  starting_price: number | null;
  quoted_total: number | null;
  contracted_total: number | null;
  estimate_source: PriceSource;
  line_items: LineItem[];
  tax_included: boolean;
  service_charge_pct: number | null;
  travel_fee: number | null;
  deposit_required: string;
  deposit_amount: number | null;
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
  setup_notes: string;
  teardown_notes: string;
  restrictions: string;
  ariel_reaction: Reaction | null;
  fred_reaction: Reaction | null;
  pros: string;
  concerns: string;
  communication_status: CommunicationStatus;
  quote_expiry: string | null;
  source: string;
  decision_status: DecisionStatus;
  works_with_venue: WorksWithVenue;
  booked_on: string | null;
  arrival_time: string;
  day_of_notes: string;
  created_at: string;
  updated_at: string;
};

export type VendorFile = { id: string; vendor_id: string; kind: string; name: string; url: string; storage_path: string; created_at: string };
export type VendorComm = { id: string; vendor_id: string; occurred_on: string; kind: string; contact: string; notes: string; follow_up_date: string | null; follow_up_done: boolean; file_id: string | null; created_at: string };
export type VendorPriceRow = { id: string; vendor_id: string; source: string; amount: number; note: string; recorded_on: string; created_at: string };
export type VendorPayment = { id: string; vendor_id: string | null; label: string; amount: number; due_date: string | null; status: string };

export const VENDOR_CATEGORIES = [
  "Venue",
  "Catering",
  "Photography",
  "Videography",
  "Music & DJ",
  "Florist",
  "Hair & Makeup",
  "Officiant",
  "Transportation",
  "Stationery",
  "Cake & Desserts",
  "Bar",
  "Rentals",
  "Entertainment",
  "Other",
] as const;

// The team checklist: the vendor types most weddings need. Venue is chosen on the Venues page.
export const TEAM_CATEGORIES = ["Venue", "Photography", "Catering", "Florist", "Music & DJ", "Hair & Makeup", "Cake & Desserts", "Officiant"] as const;

export const PLURAL: Record<string, string> = {
  Venue: "venues",
  Catering: "caterers",
  Photography: "photographers",
  Videography: "videographers",
  "Music & DJ": "music & DJ vendors",
  Florist: "florists",
  "Hair & Makeup": "hair & makeup artists",
  Officiant: "officiants",
  Transportation: "transportation vendors",
  Stationery: "stationery vendors",
  "Cake & Desserts": "cake & dessert vendors",
  Bar: "bar vendors",
  Rentals: "rental vendors",
  Entertainment: "entertainers",
  Other: "vendors",
};
export const SINGULAR: Record<string, string> = {
  Venue: "venue",
  Catering: "caterer",
  Photography: "photographer",
  Videography: "videographer",
  "Music & DJ": "music vendor",
  Florist: "florist",
  "Hair & Makeup": "hair & makeup artist",
  Officiant: "officiant",
  Transportation: "transportation vendor",
  Stationery: "stationery vendor",
  "Cake & Desserts": "cake vendor",
  Bar: "bar vendor",
  Rentals: "rental vendor",
  Entertainment: "entertainer",
  Other: "vendor",
};

export const isBooked = (v: Pick<Vendor, "status">) => v.status === "booked" || v.status === "confirmed";

export const REACTION_ORDER: Reaction[] = ["love", "like", "maybe", "no"];
export const REACTION_EMOJI: Record<Reaction, string> = { love: "❤️", like: "👍", maybe: "🤔", no: "❌" };
export const REACTION_LABELS: Record<Reaction, string> = { love: "Love", like: "Like", maybe: "Maybe", no: "No" };

export const AVAILABILITY_ORDER: Availability[] = ["unknown", "available", "unavailable", "asked"];
export const AVAILABILITY_LABELS: Record<Availability, string> = { unknown: "Unknown", available: "Available", unavailable: "Unavailable", asked: "Asked" };

export const COMMUNICATION_ORDER: CommunicationStatus[] = ["not_contacted", "inquiry_sent", "replied", "meeting_booked", "quote_received", "follow_up_needed"];
export const COMMUNICATION_LABELS: Record<CommunicationStatus, string> = {
  not_contacted: "Not contacted",
  inquiry_sent: "Inquiry sent",
  replied: "Replied",
  meeting_booked: "Meeting booked",
  quote_received: "Quote received",
  follow_up_needed: "Follow-up needed",
};

export const DECISION_ORDER: DecisionStatus[] = ["researching", "shortlisted", "finalist", "rejected"];
export const DECISION_LABELS: Record<DecisionStatus, string> = { researching: "Researching", shortlisted: "Shortlisted", finalist: "Finalist", rejected: "Rejected" };

export const WORKS_WITH_VENUE_ORDER: WorksWithVenue[] = ["approved", "need_to_ask", "external_fee", "not_allowed"];
export const WORKS_WITH_VENUE_LABELS: Record<WorksWithVenue, string> = { approved: "✓ Approved", need_to_ask: "? Need to ask", external_fee: "External vendor fee", not_allowed: "✕ Not allowed" };

export const PRICE_UNIT_ORDER: PriceUnit[] = ["flat", "package", "person", "adult", "child", "hour", "custom"];
export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = { flat: "Flat", package: "Per package", person: "Per person", adult: "Per adult", child: "Per child", hour: "Per hour", custom: "Custom" };
const UNIT_SUFFIX: Record<PriceUnit, string> = { flat: "", package: "", person: " per person", adult: " per adult", child: " per child", hour: " per hour", custom: "" };

export const PRICE_SOURCE_ORDER: PriceSource[] = ["rough_estimate", "website", "starting_price", "vendor_estimate", "quote", "contracted", "actual"];
export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  rough_estimate: "Rough estimate",
  website: "Website pricing",
  starting_price: "Starting price",
  vendor_estimate: "Vendor estimate",
  quote: "Quote received",
  contracted: "Contracted",
  actual: "Actual",
};

export const FILE_KINDS = ["quote", "contract", "invoice", "pricing_sheet", "menu", "portfolio", "insurance", "other"] as const;
export const FILE_KIND_LABELS: Record<string, string> = { quote: "Quote", contract: "Contract", invoice: "Invoice", pricing_sheet: "Pricing sheet", menu: "Menu", portfolio: "Portfolio", insurance: "Insurance", other: "Other" };

export const COMM_KINDS = ["inquiry", "response", "quote", "email", "call", "meeting", "follow_up", "note"] as const;
export const COMM_KIND_LABELS: Record<string, string> = { inquiry: "Inquiry sent", response: "Response received", quote: "Quote received", email: "Email", call: "Call", meeting: "Meeting", follow_up: "Follow-up", note: "Note" };

export function blankVendor(sortOrder: number, category = "Other"): Partial<Vendor> {
  return {
    name: "New vendor",
    category,
    contact_name: "",
    phone: "",
    email: "",
    website: "",
    social: "",
    tagline: "",
    status: "researching",
    notes: "",
    sort_order: sortOrder,
    photos: [],
    price_unit: "package",
    estimate_source: "rough_estimate",
    line_items: [],
    availability: "unknown",
    communication_status: "not_contacted",
    decision_status: "researching",
    works_with_venue: "need_to_ask",
    date_discovered: new Date().toISOString().slice(0, 10),
  } as Partial<Vendor>;
}

// ── Cover images ────────────────────────────────────────────────────────────
// A photo entry is a plain URL, "idea:<id>" (an Inspiration pin — referenced, never copied) or
// "up:<path>" (an upload in the public vendor-photos bucket). Index 0 is the cover.
export const PHOTO_BUCKET = "vendor-photos";

export function photoSrc(entry: string | undefined, ideas: Map<string, IdeaImage> | Record<string, IdeaImage>): string {
  if (!entry) return "";
  const get = (id: string) => (ideas instanceof Map ? ideas.get(id) : ideas[id]);
  if (entry.startsWith("idea:")) return normalizeUrl(get(entry.slice(5))?.image_url ?? "");
  if (entry.startsWith("up:")) return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${entry.slice(3)}`;
  return /^https?:\/\//i.test(entry) ? entry : entry ? `https://${entry}` : "";
}

// ── Pricing ─────────────────────────────────────────────────────────────────
export type PriceSourceKey = "contracted" | "quoted" | "estimated" | "starting";
export type PriceUsed = { amount: number | null; source: PriceSourceKey | null; label: string; note: string };
export const PRICE_USED_LABEL: Record<PriceSourceKey, string> = { contracted: "Contracted", quoted: "Quote", estimated: "Estimate", starting: "Starting price" };

// Unit prices need a headcount (or hours). Without one the answer is "unknown", never $0.
function scaled(amount: number, unit: PriceUnit, guests?: { adults: number; kids: number }): { amount: number | null; note: string } {
  if (unit === "person") return guests ? { amount: amount * (guests.adults + guests.kids), note: `${guests.adults + guests.kids} guests` } : { amount: null, note: "per person — needs a guest count" };
  if (unit === "adult") return guests ? { amount: amount * guests.adults, note: `${guests.adults} adults` } : { amount: null, note: "per adult — needs a guest count" };
  if (unit === "child") return guests ? { amount: amount * guests.kids, note: `${guests.kids} children` } : { amount: null, note: "per child — needs a guest count" };
  if (unit === "hour") return { amount: null, note: "hourly — hours not set" };
  return { amount, note: "" };
}

// Contracted, else quote, else estimate, else starting price. Always says which one it used.
export function vendorPrice(v: Pick<Vendor, "contracted_total" | "quoted_total" | "price_low" | "price_high" | "starting_price" | "price_unit">, guests?: { adults: number; kids: number }): PriceUsed {
  if (v.contracted_total != null) return { amount: v.contracted_total, source: "contracted", label: PRICE_USED_LABEL.contracted, note: "" };
  if (v.quoted_total != null) return { amount: v.quoted_total, source: "quoted", label: PRICE_USED_LABEL.quoted, note: "" };
  const est = v.price_high ?? v.price_low;
  if (est != null) {
    const s = scaled(est, v.price_unit, guests);
    return { amount: s.amount, source: "estimated", label: PRICE_USED_LABEL.estimated, note: s.note };
  }
  if (v.starting_price != null) {
    const s = scaled(v.starting_price, v.price_unit, guests);
    return { amount: s.amount, source: "starting", label: PRICE_USED_LABEL.starting, note: s.note };
  }
  return { amount: null, source: null, label: "Unknown", note: "No price yet" };
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
export const fmtMoney = money;

export function priceRange(v: Pick<Vendor, "price_low" | "price_high" | "price_unit" | "starting_price">): string {
  const { price_low: lo, price_high: hi, price_unit: unit } = v;
  const suffix = UNIT_SUFFIX[unit] ?? "";
  if (lo != null && hi != null && lo !== hi) return `${money(lo)}–${Math.round(hi).toLocaleString()}${suffix}`;
  const one = lo ?? hi;
  if (one != null) return `${money(one)}${suffix}`;
  if (v.starting_price != null) return `From ${money(v.starting_price)}${suffix}`;
  return "";
}

// Which Budget group a booked vendor's cost lands in. Venue costs come from the venue itself.
const BUDGET_GROUP_OF: Record<string, BudgetGroup> = {
  Catering: "Venue & catering",
  Bar: "Venue & catering",
  Photography: "Photography & video",
  Videography: "Photography & video",
  Florist: "Flowers & décor",
  Rentals: "Flowers & décor",
  "Hair & Makeup": "Attire & beauty",
  Transportation: "Travel & accommodation",
};
export const budgetGroupOf = (category: string): BudgetGroup => BUDGET_GROUP_OF[category] ?? "Other";

// The Budget's built-in placeholder line for the same job — the one to lower once the vendor is priced.
export const PLACEHOLDER_LINE_OF: Record<string, string> = {
  Photography: "Photographer",
  Florist: "Simple florals",
  "Hair & Makeup": "Hair & makeup",
  Officiant: "Officiant",
  "Music & DJ": "Music",
  "Cake & Desserts": "Cake",
};

// ── Payments (read from the central payments table) ─────────────────────────
export type PaymentSummary = { contracted: number | null; paid: number; scheduled: number; owed: number | null; next: VendorPayment | null; overdue: boolean };
export function paymentSummary(v: Pick<Vendor, "id" | "contracted_total">, payments: VendorPayment[], today = new Date().toISOString().slice(0, 10)): PaymentSummary {
  const mine = payments.filter((p) => p.vendor_id === v.id);
  const paid = mine.filter((p) => p.status === "paid").reduce((t, p) => t + p.amount, 0);
  const scheduled = mine.reduce((t, p) => t + p.amount, 0);
  const unpaid = mine.filter((p) => p.status !== "paid").sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const next = unpaid[0] ?? null;
  const total = v.contracted_total ?? (scheduled > 0 ? scheduled : null);
  return { contracted: v.contracted_total, paid, scheduled, owed: total == null ? null : Math.max(total - paid, 0), next, overdue: unpaid.some((p) => p.due_date != null && p.due_date < today) };
}

// ── Reactions and card state ────────────────────────────────────────────────
export const isFavourite = (v: Pick<Vendor, "ariel_reaction" | "fred_reaction">) => v.ariel_reaction === "love" || v.fred_reaction === "love";
export const isOurFavourite = (v: Pick<Vendor, "ariel_reaction" | "fred_reaction">) => v.ariel_reaction === "love" && v.fred_reaction === "love";

export type CardState = "booked" | "attention" | "quote" | "favourite" | "researching";
export const CARD_STATE_LABEL: Record<CardState, string> = { booked: "Booked", attention: "Needs attention", quote: "Quote received", favourite: "Favourite", researching: "Researching" };
// cream = researching, blush = favourite, champagne = quote, sage = booked, burgundy accent = needs attention.
export const CARD_STATE_STYLE: Record<CardState, string> = {
  researching: "border-line bg-[color-mix(in_srgb,var(--gold)_6%,var(--paper))] text-ink-2",
  favourite: "border-[color-mix(in_srgb,var(--wine)_25%,var(--line))] bg-[color-mix(in_srgb,var(--surface-blush)_16%,var(--paper))] text-ink",
  quote: "border-[color-mix(in_srgb,var(--gold)_45%,var(--line))] bg-[color-mix(in_srgb,var(--gold)_20%,var(--paper))] text-ink",
  booked: "border-sage-deep bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))] text-sage-deep",
  attention: "border-wine bg-[color-mix(in_srgb,var(--wine)_10%,var(--paper))] text-wine",
};

export type FollowUp = { vendor_id: string; date: string; note: string };
// Open follow-ups from the communication log, oldest first.
export function openFollowUps(comms: VendorComm[]): FollowUp[] {
  return comms
    .filter((c) => c.follow_up_date && !c.follow_up_done)
    .map((c) => ({ vendor_id: c.vendor_id, date: c.follow_up_date as string, note: c.notes || COMM_KIND_LABELS[c.kind] || "Follow up" }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function needsAttention(v: Vendor, followUps: FollowUp[], payments: VendorPayment[], today = new Date().toISOString().slice(0, 10)): string | null {
  if (followUps.some((f) => f.vendor_id === v.id && f.date <= today)) return "Follow-up due";
  if (isBooked(v)) return paymentSummary(v, payments, today).overdue ? "Payment overdue" : null;
  if (v.quote_expiry && v.quote_expiry < today && v.quoted_total != null) return "Quote expired";
  if (v.communication_status === "follow_up_needed") return "Follow-up needed";
  return null;
}

export function cardState(v: Vendor, attention: string | null): CardState {
  if (isBooked(v)) return attention ? "attention" : "booked";
  if (attention) return "attention";
  if (v.communication_status === "quote_received" || v.quoted_total != null) return "quote";
  if (isFavourite(v)) return "favourite";
  return "researching";
}

export function formatShortDate(d: string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(`${d}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
