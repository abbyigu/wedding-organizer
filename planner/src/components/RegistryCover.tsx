import { Gift, HeartHandshake, PiggyBank, Plane, ShoppingBag, Sparkles, type LucideIcon } from "lucide-react";
import { normalizeUrl } from "@/lib/ideas";
import { coverUrl, typeOf, type IdeaImage, type RegistryEntry, type RegistryType } from "@/lib/registry";

export const TYPE_ICON: Record<RegistryType, LucideIcon> = {
  store: ShoppingBag,
  honeymoon: Plane,
  cash: PiggyBank,
  charity: HeartHandshake,
  experience: Sparkles,
  other: Gift,
};

// Soft tint per kind, used when there's no cover image.
const TINT: Record<RegistryType, string> = {
  store: "var(--sage)",
  honeymoon: "var(--gold)",
  cash: "var(--gold)",
  charity: "var(--wine)",
  experience: "var(--sage)",
  other: "var(--wood)",
};

// The cover: an uploaded image, an Inspiration pin's image, or a quiet tinted placeholder.
export function coverSrc(r: Pick<RegistryEntry, "image_path" | "idea_id">, ideas: IdeaImage[] = []): string {
  if (r.image_path) return coverUrl(r.image_path);
  const idea = r.idea_id ? ideas.find((i) => i.id === r.idea_id) : undefined;
  return idea?.image_url ? normalizeUrl(idea.image_url) : "";
}

export default function RegistryCover({ src, type, className = "" }: { src: string; type: RegistryType | undefined; className?: string }) {
  const t = typeOf({ type });
  const Icon = TYPE_ICON[t];
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: `color-mix(in srgb, ${TINT[t]} 28%, var(--paper))` }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.webp" alt="" aria-hidden loading="lazy" className="pointer-events-none absolute -right-4 -top-6 h-3/4 w-auto rotate-[10deg] opacity-30" />
          <Icon className="absolute inset-0 m-auto h-10 w-10 text-ink/40" strokeWidth={1.25} aria-hidden />
        </>
      )}
    </div>
  );
}
