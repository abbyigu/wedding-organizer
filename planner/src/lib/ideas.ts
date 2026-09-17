export type IdeaPin = {
  id: string;
  owner_id: string;
  category: string;
  title: string;
  pin_url: string;
  image_url: string;
  note: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const IDEA_CATEGORIES = ["Dress", "Decor", "Flowers", "Attire", "Hair & Makeup", "Other"];

export function blankIdea(sortOrder: number): Partial<IdeaPin> {
  return { category: "Other", title: "New idea", pin_url: "", image_url: "", note: "", sort_order: sortOrder };
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
