export type Criterion = { key: string; label: string; weight: number };

export type Rating = {
  id: string;
  venue_id: string;
  rater_id: string;
  rater_name: string;
  scores: Record<string, number>;
  note: string;
  created_at: string;
  updated_at: string;
};

export type DecisionEvent = {
  id: string;
  venue_id: string | null;
  venue_name: string;
  event_type: "rating" | "final";
  actor_name: string;
  summary: string;
  created_at: string;
};

export const DEFAULT_CRITERIA: Criterion[] = [
  { key: "location", label: "Location & travel", weight: 3 },
  { key: "budget", label: "Budget fit", weight: 3 },
  { key: "food", label: "Food & bar", weight: 3 },
  { key: "character", label: "Character & atmosphere", weight: 3 },
  { key: "logistics", label: "Capacity & logistics", weight: 3 },
  { key: "gut", label: "Overall gut feeling", weight: 3 },
];

export const CRITERION_HELP: Record<string, string> = {
  location: "Ease for guests, parking, shuttles and nearby stays.",
  budget: "How comfortably it stays within your preferred ceiling.",
  food: "Menu quality, flexibility, drinks and dietary needs.",
  character: "How well the venue matches your wedding vision.",
  logistics: "Guest fit, accessibility, rain plan and setup.",
  gut: "How strongly you can picture getting married there.",
};

export const CRITERION_CONSIDERATIONS: Record<string, string[]> = {
  location: ["Driving time", "Out-of-town guest travel", "Parking", "Shuttle requirements", "Ferry access", "Nearby accommodations"],
  budget: ["Venue fee", "Food and beverage", "Service charges", "Required rentals", "Transportation", "Potential surprise expenses"],
  food: ["Food quality", "Menu flexibility", "Dietary needs", "Children's meals", "Bar options", "Late-night food"],
  character: ["Historic or modern character", "Natural setting", "Views", "Warmth and intimacy", "Indoor and outdoor spaces", "Existing décor"],
  logistics: ["Guest capacity", "Rain plan", "Accessibility", "Setup time", "Vendor restrictions", "Ceremony-to-reception transition"],
  gut: ["Can you picture yourselves getting married there?", "Did it feel welcoming?", "Are you excited to bring your families there?", "Does anything make you hesitate?"],
};

export function blankScores(criteria: Criterion[], value = 3): Record<string, number> {
  return Object.fromEntries(criteria.map((c) => [c.key, value]));
}

// A criterion with more importance (weight) counts for more in the average.
export function weightedScore(scores: Record<string, number>, criteria: Criterion[]): number | null {
  let sumWeight = 0;
  let sumWeighted = 0;
  for (const c of criteria) {
    const s = scores[c.key];
    if (s == null) continue;
    sumWeight += c.weight;
    sumWeighted += s * c.weight;
  }
  return sumWeight ? sumWeighted / sumWeight : null;
}

export function fmtScore(n: number | null): string {
  return n == null ? "—" : n.toFixed(1);
}

// Generic decision framework — any wedding decision, not just venues.
// The Venue decision keeps using venues/venue_ratings and only shows up
// here as a shortcut row (link_href set) pointing at its own page.

export type DecisionOption = {
  id: string;
  decision_id: string;
  label: string;
  image_url: string;
  notes: string;
  status: "active" | "out";
  // Absent until migration 042 has been run.
  swatches?: string[];
  idea_id?: string | null;
  venue_id?: string | null;
  vendor_id?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DecisionVote = {
  id: string;
  decision_id: string;
  option_id: string;
  voter_id: string;
  voter_name: string;
  scores: Record<string, number>;
  note: string;
  created_at: string;
  updated_at: string;
};

export type GenericDecision = {
  id: string;
  category: string;
  title: string;
  description: string;
  criteria: Criterion[];
  link_href: string | null;
  is_final: boolean;
  final_option_id: string | null;
  final_reason: string;
  option_type?: OptionType;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type OptionType = "text" | "visual" | "palette" | "venue" | "vendor";

export const OPTION_TYPES: { key: OptionType; label: string }[] = [
  { key: "text", label: "Text" },
  { key: "visual", label: "Photos" },
  { key: "palette", label: "Colour palettes" },
  { key: "venue", label: "Venues" },
  { key: "vendor", label: "Vendors" },
];

// Until someone picks a style, guess it from what's being decided.
export function optionTypeOf(d: Pick<GenericDecision, "option_type" | "title" | "category">): OptionType {
  if (d.option_type && d.option_type !== "text") return d.option_type;
  if (/colou?r|palette/i.test(d.title)) return "palette";
  if (d.category === "Vendors") return "vendor";
  return "text";
}

export const OPTION_INTRO: Record<OptionType, string> = {
  text: "Add the choices you're weighing. A name and a few notes is plenty.",
  visual: "Add the looks you're considering. You can include a name, a photo and notes.",
  palette: "Add the colour palettes you're considering. You can include a name, colours and notes.",
  venue: "Pick the venues from your shortlist. Their details stay on the venue page.",
  vendor: "Pick the vendors you're comparing. Their details stay on the vendor page.",
};

export const OPTION_TIPS: Partial<Record<OptionType, string[]>> = {
  palette: ["Consider the season, venue and natural surroundings.", "Think about how the colours will look in photos.", "Include neutrals or metallics to balance the palette.", "Don't forget wedding-party attire, flowers and stationery."],
  venue: ["Compare the whole-wedding total, not just the venue fee.", "Check the research % so you're comparing fairly."],
  vendor: ["Look at availability before falling in love with a quote.", "Ask what's included, and what costs extra."],
};

export const HEX = /^#[0-9a-f]{6}$/i;

export const DECISION_CATEGORIES = [
  "Venue",
  "Guests",
  "Budget",
  "Vendors",
  "Style & Details",
  "Ceremony",
  "Reception",
  "Travel & Logistics",
  "Other",
];

export function blankOption(decisionId: string, sortOrder: number): Partial<DecisionOption> {
  return { decision_id: decisionId, label: "New option", image_url: "", notes: "", status: "active", sort_order: sortOrder };
}

export function slugCriterionKey(label: string, existing: string[]): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "criterion";
  let key = base;
  let i = 1;
  while (existing.includes(key)) key = `${base}_${i++}`;
  return key;
}

export type DecisionStatusKind = "not_started" | "in_progress" | "your_turn" | "waiting_partner" | "ready_to_reveal" | "decided";

export type DecisionStatus = { kind: DecisionStatusKind; label: string; progress: number };

// Same status math for a venue decision (options = active venues) and a
// generic one (options = decision_options) — whoever has rated how many.
export function statusOf(optionCount: number, myCount: number, partnerCount: number, isFinal: boolean, partnerLabel: string): DecisionStatus {
  if (isFinal) return { kind: "decided", label: "Decided", progress: 1 };
  if (optionCount === 0) return { kind: "not_started", label: "Add options to begin", progress: 0 };
  const progress = (myCount + partnerCount) / (optionCount * 2);
  if (myCount === 0 && partnerCount === 0) return { kind: "not_started", label: "Not started", progress: 0 };
  if (myCount === optionCount && partnerCount === optionCount) return { kind: "ready_to_reveal", label: "Ready to reveal", progress };
  if (myCount === optionCount) return { kind: "waiting_partner", label: `Waiting on ${partnerLabel}`, progress };
  if (partnerCount === optionCount) return { kind: "your_turn", label: "Your turn", progress };
  return { kind: "in_progress", label: `In progress (${Math.round(progress * 100)}%)`, progress };
}

// Read-only summaries of records an option can point at (built on the server from the real records).
export type IdeaRef = { id: string; title: string; image_url: string; category: string; note: string };
export type VenueRef = { id: string; name: string; location: string; capacity: string; cover: string; total: number; incomplete: boolean; research: number; isFinal: boolean };
export type VendorRef = { id: string; name: string; category: string; cover: string; quote: string; availability: string; stage: string };
export type WeddingStyle = { palette: string[]; palette_name: string; source_decision_id: string | null };

// Saved ideas most useful for this decision: colour-related ones for palettes, otherwise a keyword match on the title.
export function relevantIdeas(d: Pick<GenericDecision, "title" | "category">, type: OptionType, ideas: IdeaRef[]): IdeaRef[] {
  const withImage = ideas.filter((i) => i.image_url);
  const words = d.title.toLowerCase().split(/[^a-zà-ÿ]+/).filter((w) => w.length >= 4 && !["choosing", "choose", "decide", "wedding"].includes(w));
  const score = (i: IdeaRef) => {
    const text = `${i.title} ${i.note} ${i.category}`.toLowerCase();
    let s = words.filter((w) => text.includes(w)).length * 2;
    if (type === "palette") {
      if (/colou?r/i.test(i.category)) s += 6;
      if (/colou?r|palette/i.test(`${i.title} ${i.note}`)) s += 3;
      if (/décor|decor|flower/i.test(i.category)) s += 1;
    }
    return s;
  };
  return [...withImage].sort((a, b) => score(b) - score(a)).slice(0, 4);
}
