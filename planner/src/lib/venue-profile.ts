import type { Venue } from "@/lib/venues";

const YN = ["Yes", "No", "Unsure"];
export type AmenityField = { key: string; label: string; options?: string[]; placeholder?: string };
export type AmenitySection = { title: string; fields: AmenityField[] };

// All optional. Answers live in venues.amenities (one jsonb column), keyed by field.
export const AMENITY_SECTIONS: AmenitySection[] = [
  {
    title: "Ceremony",
    fields: [
      { key: "ceremony_space", label: "Indoor / outdoor", options: ["Indoor", "Outdoor", "Both"] },
      { key: "ceremony_capacity", label: "Ceremony capacity" },
      { key: "ceremony_fee", label: "Ceremony fee" },
      { key: "ceremony_backup", label: "Backup ceremony space" },
      { key: "ceremony_rain_plan", label: "Rain plan" },
    ],
  },
  {
    title: "Reception",
    fields: [
      { key: "reception_capacity", label: "Reception capacity" },
      { key: "reception_long_tables", label: "Long-table friendly", options: YN },
      { key: "reception_furniture", label: "Tables & chairs included", options: YN },
      { key: "reception_dance_floor", label: "Dance floor", options: YN },
      { key: "reception_cocktail", label: "Cocktail space", options: YN },
      { key: "reception_terrace", label: "Outdoor terrace", options: YN },
    ],
  },
  {
    title: "Food & drink",
    fields: [
      { key: "food_inhouse", label: "In-house catering", options: YN },
      { key: "food_outside", label: "Outside catering allowed", options: YN },
      { key: "food_alcohol", label: "BYOW / alcohol rules" },
      { key: "food_corkage", label: "Corkage" },
      { key: "food_bar", label: "Bar options" },
      { key: "food_cake", label: "Cake policy" },
      { key: "food_latenight", label: "Late-night food", options: YN },
    ],
  },
  {
    title: "Accommodation",
    fields: [
      { key: "stay_onsite", label: "On-site accommodation", options: YN },
      { key: "stay_nearby", label: "Nearby accommodation" },
      { key: "stay_suite", label: "Couple's suite", options: YN },
      { key: "stay_getting_ready", label: "Getting-ready spaces", options: YN },
    ],
  },
  {
    title: "Logistics",
    fields: [
      { key: "log_parking", label: "Parking" },
      { key: "log_shuttle", label: "Shuttle access", options: YN },
      { key: "log_access", label: "Accessibility" },
      { key: "log_ferry", label: "Ferry considerations" },
      { key: "log_curfew", label: "Curfew" },
      { key: "log_noise", label: "Noise restrictions" },
      { key: "log_setup", label: "Setup time" },
      { key: "log_cleanup", label: "Cleanup requirements" },
    ],
  },
  {
    title: "DIY & décor",
    fields: [
      { key: "diy_freedom", label: "DIY freedom" },
      { key: "diy_candles", label: "Open flame / candles", options: YN },
      { key: "diy_hanging", label: "Hanging décor allowed", options: YN },
      { key: "diy_florist", label: "Florist restrictions" },
      { key: "diy_daybefore", label: "Setup day before", options: YN },
      { key: "diy_storage", label: "Storage available", options: YN },
    ],
  },
];

const has = (v: Venue, ...keys: string[]) => keys.some((k) => (v.amenities?.[k] ?? "").trim() !== "");

// Worked out from what's filled in, so it never needs updating by hand.
export function researchChecklist(v: Venue): { label: string; done: boolean }[] {
  return [
    { label: "Capacity confirmed", done: v.capacity.trim() !== "" },
    { label: "Contact information", done: v.contact.trim() !== "" },
    { label: "Initial estimate", done: v.budget_lines.length > 0 || v.quoted_total != null || v.contracted_total != null },
    { label: "Rain plan", done: has(v, "ceremony_rain_plan", "ceremony_backup") || !!v.quote_checklist?.rain_plan },
    { label: "Detailed quote", done: v.quote_received },
    { label: "Tour completed", done: v.amenities?.tour_done === "Yes" },
    { label: "Catering confirmed", done: has(v, "food_inhouse", "food_outside") },
    { label: "Alcohol policy confirmed", done: has(v, "food_alcohol", "food_corkage") },
    { label: "Rental requirements confirmed", done: has(v, "reception_furniture") },
    { label: "Accommodation researched", done: has(v, "stay_onsite", "stay_nearby") },
  ];
}

export function researchPercent(v: Venue): number {
  const list = researchChecklist(v);
  return Math.round((list.filter((i) => i.done).length / list.length) * 100);
}

// The contact is stored as one text line ("name · email · phone"); the page edits it as three boxes.
export function parseContact(s: string) {
  const parts = s.split(/\s*[·|;]\s*/).map((p) => p.trim()).filter(Boolean);
  const email = parts.find((p) => p.includes("@")) ?? "";
  const phone = parts.find((p) => !p.includes("@") && /\d{3}\D*\d{3,}/.test(p)) ?? "";
  const name = parts.filter((p) => p !== email && p !== phone).join(" · ");
  return { name, email, phone };
}
export const joinContact = (c: { name: string; email: string; phone: string }) => [c.name, c.email, c.phone].map((x) => x.trim()).filter(Boolean).join(" · ");

export const VENUE_TYPES = ["Vineyard / winery", "Historic building", "Hotel / resort", "Boat / waterfront", "Garden / park", "Barn / farm", "Museum / cultural", "Restaurant"];

export const ACTION_SUGGESTIONS: { key: string; label: string }[] = [
  { key: "quote", label: "Request detailed quote" },
  { key: "rain", label: "Ask about rain plan" },
  { key: "included", label: "Confirm what's included vs extra" },
  { key: "rentals", label: "Confirm rental requirements" },
  { key: "visit", label: "Schedule a visit" },
];

// Small palette so a colour word gets a swatch. Unknown words simply get no swatch.
const COLOURS: Record<string, string> = {
  green: "#4f6b4b", "deep green": "#2e4a32", sage: "#9fb39a", olive: "#6b7a3a", forest: "#2e4a32", emerald: "#1f6f50",
  grey: "#9a9a94", gray: "#9a9a94", "stone grey": "#a8a59c", stone: "#a8a59c", slate: "#5c6670", charcoal: "#3a3d40",
  white: "#f7f4ee", ivory: "#f3ecda", cream: "#f2e8d0", champagne: "#e6d3ad", beige: "#d8c8a8", tan: "#c4a77d", brown: "#7a5236", wood: "#a5764c",
  gold: "#c9a86a", yellow: "#e2c04a", orange: "#d9822b", terracotta: "#c26a4a", rust: "#a8502a", coral: "#e5806b",
  pink: "#e6a3b2", blush: "#e8c1bd", rose: "#d38a97", "dusty rose": "#c99aa0", red: "#a8322d", burgundy: "#6e2a36", wine: "#6e2a36", plum: "#6f4d92",
  purple: "#7a5ea6", lavender: "#a99ad6", lilac: "#b9a4cf", blue: "#3f6fa5", navy: "#1f2f4f", "dusty blue": "#8fa6bd", teal: "#2f7d7d", black: "#222222",
};
export function colourHex(name: string): string | undefined {
  const n = name.trim().toLowerCase();
  return COLOURS[n] ?? COLOURS[n.split(/\s+/).slice(-1)[0]];
}

export const splitTags = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);
