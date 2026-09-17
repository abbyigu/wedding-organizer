export type IdeaVisibility = "shared" | "private";

export type IdeaPin = {
  id: string;
  owner_id: string;
  category: string;
  title: string;
  image_url: string;
  note: string;
  visibility: IdeaVisibility;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const IDEA_CATEGORIES = ["Dress", "Decor", "Flowers", "Attire", "Hair & Makeup", "Other"];

export function blankIdea(sortOrder: number): Partial<IdeaPin> {
  return { category: "Other", title: "New idea", image_url: "", note: "", visibility: "shared", sort_order: sortOrder };
}

// A pasted Pinterest link often comes without "https://" (e.g. "pinterest.com/pin/123"
// or "pin.it/abc"), which makes <a href> / <img src> resolve it as a path on this site
// instead of an external URL.
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function groupIdeasByCategory(ideas: IdeaPin[]): [string, IdeaPin[]][] {
  const map = new Map<string, IdeaPin[]>();
  for (const idea of ideas) {
    const key = idea.category || "Other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(idea);
  }
  return [...map.entries()];
}
