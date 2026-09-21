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
  photo_url?: string;
  attire_colour?: string;
  attire_hex?: string;
  flowers?: string;
  accessories?: string;
  cost?: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const ROLE_SUGGESTIONS = [
  "Maid of Honour",
  "Best Man",
  "Bridesmaid",
  "Groomsman",
  "Groomswoman",
  "Officiant",
  "Flower Girl",
  "Ring Bearer",
  "Usher",
];

export const SIDES: Side[] = ["Ariel", "Fred", "Both"];

export function blankWeddingPartyMember(sortOrder: number): Partial<WeddingPartyMember> {
  return { name: "New member", role: "", side: "Ariel", email: "", phone: "", attire: "", notes: "", sort_order: sortOrder };
}

export type PartyPhase = "before" | "morning" | "ceremony" | "reception";

export const PHASES: { key: PartyPhase; label: string; placeholder: string }[] = [
  { key: "before", label: "Before the wedding", placeholder: "e.g. Plan the shower" },
  { key: "morning", label: "Wedding morning", placeholder: "e.g. Bring the rings" },
  { key: "ceremony", label: "Ceremony", placeholder: "e.g. Do a reading" },
  { key: "reception", label: "Reception", placeholder: "e.g. Give a speech" },
];

export type PartyTask = {
  id: string;
  member_id: string | null;
  phase: PartyPhase;
  title: string;
  done: boolean;
  sort_order: number;
};

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

// "Bouquet, LEGO boutonnière" -> ["Bouquet", "LEGO boutonnière"]
export const splitList = (s?: string) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
