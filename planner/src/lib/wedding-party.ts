export type Side = "Ariel" | "Fred" | "Both";

export type WeddingPartyMember = {
  id: string;
  name: string;
  role: string;
  side: Side;
  email: string;
  phone: string;
  attire: string;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const ROLE_SUGGESTIONS = [
  "Maid of Honor",
  "Best Man",
  "Bridesmaid",
  "Groomsman",
  "Officiant",
  "Flower Girl",
  "Ring Bearer",
  "Usher",
];

export const SIDES: Side[] = ["Ariel", "Fred", "Both"];

export function blankWeddingPartyMember(sortOrder: number): Partial<WeddingPartyMember> {
  return { name: "New member", role: "", side: "Ariel", email: "", phone: "", attire: "", notes: "", sort_order: sortOrder };
}
