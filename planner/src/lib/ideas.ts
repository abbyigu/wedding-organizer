export type IdeaVisibility = "shared" | "private";
export type DecisionStatus = "match" | "needs_vote" | "discuss" | "diy";

export type IdeaPin = {
  id: string;
  owner_id: string;
  category: string;
  title: string;
  image_url: string;
  note: string;
  visibility: IdeaVisibility;
  decision_status: DecisionStatus | null;
  is_favourite: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const IDEA_CATEGORIES = ["Little Details", "Décor", "Attire", "Flowers", "Food & drinks", "DIY"];

export const DECISION_STATUS_ORDER: DecisionStatus[] = ["match", "needs_vote", "discuss", "diy"];

// sage / gold / wine / green, matching this app's existing palette.
export const DECISION_STATUS_COLOR: Record<DecisionStatus, string> = {
  match: "sage-deep",
  needs_vote: "gold",
  discuss: "wine",
  diy: "green",
};

export function decisionStatusLabel(status: DecisionStatus, partner: string): string {
  switch (status) {
    case "match":
      return "It's a match";
    case "needs_vote":
      return `Needs ${partner}'s vote`;
    case "discuss":
      return "Discuss together";
    case "diy":
      return "Added to DIY";
  }
}

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
    decision_status: null,
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
