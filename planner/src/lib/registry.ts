import type { Guest } from "@/lib/guests";

export type RegistryType = "store" | "honeymoon" | "cash" | "charity" | "experience" | "other";

export type RegistryEntry = {
  id: string;
  store_name: string;
  url: string;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Migration 044 — absent until it has been run.
  type?: RegistryType;
  description?: string;
  image_path?: string | null; // an uploaded cover (public bucket)
  idea_id?: string | null; // OR an Inspiration pin, referenced not copied
  visible?: boolean;
  is_primary?: boolean;
  summary?: string; // typed by hand; the registry site stays the source of truth for items
};

export type RegistrySettings = { slug: string; couple: string; guest_note: string };

export type IdeaImage = { id: string; title: string; image_url: string };

export const DEFAULT_SETTINGS: RegistrySettings = {
  slug: "ariel-and-fred",
  couple: "Ariel & Fred",
  guest_note: "Your presence means the most, but if you'd like to give a gift, here are a few ways to help us start our next chapter together.",
};

// What each kind of registry says on its button, and what it's called on the guest page.
export const REGISTRY_TYPES: Record<RegistryType, { label: string; cta: string; kicker: string }> = {
  store: { label: "Store registry", cta: "View registry", kicker: "For our home" },
  honeymoon: { label: "Honeymoon fund", cta: "View fund", kicker: "For our adventures" },
  cash: { label: "Cash fund", cta: "View fund", kicker: "For our future" },
  charity: { label: "Charity", cta: "Learn more", kicker: "For a cause we love" },
  experience: { label: "Experience registry", cta: "View experiences", kicker: "For our experiences" },
  other: { label: "Other", cta: "Open link", kicker: "With love" },
};
export const REGISTRY_TYPE_ORDER: RegistryType[] = ["store", "honeymoon", "cash", "charity", "experience", "other"];

export const typeOf = (r: Pick<RegistryEntry, "type">): RegistryType => (r.type && r.type in REGISTRY_TYPES ? r.type : "store");

export function coverUrl(imagePath: string | null | undefined): string {
  return imagePath ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/registry-covers/${imagePath}` : "";
}

const COVER_MAX_DIMENSION = 1600; // long edge, in px — plenty for a 16:9 card at any screen size
const COVER_JPEG_QUALITY = 0.85;

// Downscale and re-encode a picked cover photo before it's uploaded, so a guest opening
// the public registry page on their phone isn't pulling a multi-megabyte source photo
// just to fill a small card. Falls back to the original file if canvas encoding fails.
export async function resizeCoverImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, COVER_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", COVER_JPEG_QUALITY));
    return blob ?? file;
  } catch {
    return file; // an unsupported format, say — ship the original rather than block the upload
  }
}

export const isVisible = (r: RegistryEntry) => r.visible !== false;

// Primary first, then the couple's own order.
export function sortRegistries(list: RegistryEntry[]): RegistryEntry[] {
  return [...list].sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary) || a.sort_order - b.sort_order);
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Registry setup: each suggestion is a Planning Board task, found again by its template_key.
export const SETUP_TASKS = [
  { key: "gifts", title: "Decide what kinds of gifts we want" },
  { key: "main", title: "Create main registry" },
  { key: "fund", title: "Create honeymoon / cash fund" },
  { key: "website", title: "Add registry to guest website" },
  { key: "shipping", title: "Check shipping address" },
  { key: "review", title: "Review registry before invitations" },
  { key: "ranges", title: "Include gifts at different price ranges" },
] as const;
export const setupKey = (key: string) => `registry:setup:${key}`;

// A thank-you is owed once a gift has been recorded on a household and hasn't been marked sent.
export const thankYouDue = (g: Pick<Guest, "gift_received" | "thank_you_required" | "thank_you_sent">) =>
  g.gift_received && g.thank_you_required !== false && !g.thank_you_sent;
