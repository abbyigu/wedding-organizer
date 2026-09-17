export type IdeaVisibility = "shared" | "private";

export type IdeaPin = {
  id: string;
  owner_id: string;
  category: string;
  title: string;
  image_url: string;
  note: string;
  visibility: IdeaVisibility;
  is_favourite: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ReactionValue = "love_it" | "maybe" | "not_for_us" | "needs_discussion";

export type IdeaReaction = {
  id: string;
  idea_id: string;
  rater_id: string;
  reaction: ReactionValue;
  created_at: string;
  updated_at: string;
};

export const REACTION_ORDER: ReactionValue[] = ["love_it", "maybe", "not_for_us", "needs_discussion"];

export const REACTION_LABELS: Record<ReactionValue, string> = {
  love_it: "Love it",
  maybe: "Maybe",
  not_for_us: "Not for us",
  needs_discussion: "Needs discussion",
};

export type Verdict = "match" | "discuss" | "passed";

export const VERDICT_LABELS: Record<Verdict, string> = {
  match: "It's a match",
  discuss: "Discuss together",
  passed: "Passed",
};

// sage / wine / ink-2, matching this app's existing palette.
export const VERDICT_COLOR: Record<Verdict, string> = {
  match: "sage-deep",
  discuss: "wine",
  passed: "ink-2",
};

export function combinedVerdict(a: ReactionValue, b: ReactionValue): Verdict {
  if (a === "love_it" && b === "love_it") return "match";
  if (a === "not_for_us" && b === "not_for_us") return "passed";
  return "discuss";
}

export const IDEA_CATEGORIES = ["Little Details", "Décor", "Attire", "Flowers", "Food & drinks", "DIY"];

// Only two accounts exist in this app — the other person is whoever you're not.
export function partnerName(name: string): string {
  return name.trim().toLowerCase() === "ariel" ? "Fred" : "Ariel";
}

export function blankIdea(sortOrder: number, category: string, title: string): Partial<IdeaPin> {
  return {
    category,
    title,
    image_url: "",
    note: "",
    visibility: "shared",
    is_favourite: false,
    sort_order: sortOrder,
  };
}

// A pasted Pinterest link often comes without "https://" (e.g. "pinterest.com/pin/123"
// or "pin.it/abc"), which makes <a href> / <img src> resolve it as a path on this site
// instead of an external URL.
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Fixed collections first (even if empty), then any custom ones already in use.
export function collectionTabs(ideas: Pick<IdeaPin, "category">[]): string[] {
  const extra = [...new Set(ideas.map((i) => i.category).filter((c) => !IDEA_CATEGORIES.includes(c)))].sort();
  return [...IDEA_CATEGORIES, ...extra];
}
