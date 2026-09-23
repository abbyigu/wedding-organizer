import Link from "next/link";
import { hasStyle, type WeddingStyleRow } from "@/lib/wedding-style";

// A quiet reminder of what's been decided, shown where it helps (vendors, DIY, events).
export default function StyleStrip({ style, focus }: { style: WeddingStyleRow; focus?: "flowers" | "tables" | "lighting" | "attire" | "details" }) {
  if (!hasStyle(style)) return null;
  const extra = focus === "flowers" ? style.flowers_style : focus === "tables" ? style.tables_style : focus === "lighting" ? style.lighting_style : focus === "attire" ? style.attire_palette : focus === "details" ? style.signature_details : [];
  const words = [...style.feeling.slice(0, 5), ...extra.slice(0, 3)];
  return (
    <aside aria-label="Our wedding style" className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--gold)_8%,var(--paper))] px-4 py-2.5 text-sm">
      {style.palette.length > 0 && (
        <ul className="flex gap-1" aria-label={`Wedding palette${style.palette_name ? `: ${style.palette_name}` : ""}`}>
          {style.palette.map((c, i) => <li key={`${c}-${i}`} title={c} style={{ backgroundColor: c }} className="h-5 w-5 rounded-full border border-black/10" />)}
        </ul>
      )}
      {words.length > 0 && <p className="min-w-0 flex-1 text-ink-2">{words.join(" · ")}</p>}
      <Link href="/style" className="shrink-0 rounded py-2 font-medium text-green underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep">Our style</Link>
    </aside>
  );
}
