import type { PotentialVendor } from "@/lib/potential-vendors";

// A vendor is a favourite when either of you loves them; "our favourite" is when you both do.
export const isFavourite = (v: Pick<PotentialVendor, "ariel_reaction" | "fred_reaction">) => v.ariel_reaction === "love" || v.fred_reaction === "love";
export const isOurFavourite = (v: Pick<PotentialVendor, "ariel_reaction" | "fred_reaction">) => v.ariel_reaction === "love" && v.fred_reaction === "love";

export const isAwaitingQuote = (v: Pick<PotentialVendor, "communication_status">) =>
  ["inquiry_sent", "replied", "meeting_booked", "follow_up_needed"].includes(v.communication_status);

// Only flat / package prices count toward a spend estimate — per-person and hourly ones need a guest count or hours.
export function likelySpend(v: Pick<PotentialVendor, "price_low" | "price_high" | "price_unit">): number {
  if (v.price_unit !== "flat" && v.price_unit !== "package") return 0;
  return v.price_high ?? v.price_low ?? 0;
}

export type Stage = "follow_up" | "quote" | "available" | "in_touch" | "researching";

export function stageOf(v: Pick<PotentialVendor, "communication_status" | "availability">): Stage {
  if (v.communication_status === "follow_up_needed") return "follow_up";
  if (v.communication_status === "quote_received") return "quote";
  if (v.availability === "available") return "available";
  if (v.communication_status !== "not_contacted") return "in_touch";
  return "researching";
}

export const STAGE_LABEL: Record<Stage, string> = { follow_up: "Needs follow-up", quote: "Quote received", available: "Available", in_touch: "Contacted", researching: "Researching" };

// sage = available / booked, champagne = quote received, burgundy = needs attention, cream = researching.
export const STAGE_TINT: Record<Stage, string> = {
  follow_up: "color-mix(in srgb, var(--wine) 9%, var(--paper))",
  quote: "color-mix(in srgb, var(--gold) 20%, var(--paper))",
  available: "color-mix(in srgb, var(--sage) 22%, var(--paper))",
  in_touch: "color-mix(in srgb, var(--gold) 9%, var(--paper))",
  researching: "color-mix(in srgb, var(--gold) 4%, var(--paper))",
};
