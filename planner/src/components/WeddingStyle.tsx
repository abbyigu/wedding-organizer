"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BTN, FIELD, FOCUS_RING } from "@/components/VendorUi";
import type { WeddingStyleRow } from "@/lib/wedding-style";

type ListKey = "feeling" | "tables_style" | "flowers_style" | "lighting_style" | "attire_palette" | "signature_details";

const LISTS: { key: ListKey; title: string; hint: string; placeholder: string }[] = [
  { key: "feeling", title: "How it should feel", hint: "A few words for the whole day.", placeholder: "e.g. warm, intimate, garden party" },
  { key: "tables_style", title: "Tables", hint: "Shapes, linens, place settings.", placeholder: "e.g. Long harvest tables" },
  { key: "flowers_style", title: "Flowers", hint: "What they look like and how they're made.", placeholder: "e.g. Bud vases" },
  { key: "lighting_style", title: "Lighting", hint: "How the evening glows.", placeholder: "e.g. Candles" },
  { key: "attire_palette", title: "Attire colours", hint: "What the wedding party wears.", placeholder: "e.g. Olive" },
  { key: "signature_details", title: "Signature details", hint: "The touches only you would do.", placeholder: "e.g. LEGO boutonnières" },
];

function Chips({ id, title, hint, placeholder, items, onChange }: { id: string; title: string; hint: string; placeholder: string; items: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((x) => x.trim()).filter((x) => x && !items.includes(x));
    if (parts.length) onChange([...items, ...parts]);
    setDraft("");
  };
  return (
    <section aria-labelledby={`${id}-h`} className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
      <h3 id={`${id}-h`} className="font-serif text-2xl font-light">{title}</h3>
      <p className="text-sm text-ink-2">{hint}</p>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((it) => (
            <li key={it} className="flex items-center gap-1 rounded-full border border-line bg-bg py-0.5 pl-4 pr-1 text-[15px]">
              {it}
              <button onClick={() => onChange(items.filter((x) => x !== it))} aria-label={`Remove ${it}`} className={`flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:text-wine ${FOCUS_RING}`}>
                <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="mt-3 flex gap-2">
        <label htmlFor={`${id}-in`} className="sr-only">Add to {title.toLowerCase()}</label>
        <input id={`${id}-in`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} className={`${FIELD} !mt-0 h-11`} />
        <button type="submit" className={BTN}><Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />Add</button>
      </form>
    </section>
  );
}

export default function WeddingStyle({ initial, paletteDecisionId }: { initial: WeddingStyleRow; paletteDecisionId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [style, setStyle] = useState(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [colour, setColour] = useState("#4f6b4b");

  async function save(patch: Partial<WeddingStyleRow>) {
    const before = style;
    setStyle({ ...style, ...patch });
    setSaved("Saving…");
    setError("");
    const { error: err } = await supabase.from("wedding_style").upsert({ id: true, ...patch, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (err) {
      setStyle(before);
      setSaved("");
      return setError(`${err.message} Has migration 049 been run?`);
    }
    setSaved("Saved");
    setTimeout(() => setSaved((s) => (s === "Saved" ? "" : s)), 1600);
  }

  return (
    <div>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-2">What we&apos;ve decided</p>
        <h1 className="mt-2 font-serif text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">Our wedding style</h1>
        <p className="mt-3 max-w-lg font-script text-2xl leading-snug text-ink-2">The mood board is for dreaming. This is what we chose.</p>
        <p className="mt-3 flex flex-wrap gap-x-5 text-sm">
          <Link href="/ideas" className={`rounded py-2 font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Back to the mood board</Link>
          <Link href={paletteDecisionId ? `/decide/${paletteDecisionId}` : "/decide"} className={`rounded py-2 font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Decide our palette together</Link>
          <span role="status" className="py-2 text-ink-2">{saved}</span>
        </p>
      </header>
      {error && <p role="alert" className="mt-3 text-sm text-wine">{error}</p>}

      <section aria-labelledby="pal-h" className="mt-8 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="pal-h" className="font-serif text-2xl font-light">Official colour palette</h2>
            <p className="text-sm text-ink-2">Shown on vendor, DIY and wedding-party pages.</p>
          </div>
          <div>
            <label htmlFor="pal-name" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Palette name</label>
            <input id="pal-name" defaultValue={style.palette_name} onBlur={(e) => e.target.value !== style.palette_name && save({ palette_name: e.target.value.trim() })} placeholder="e.g. Late summer garden" className={`${FIELD} h-11 sm:w-64`} />
          </div>
        </div>
        {style.palette.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-4">
            {style.palette.map((c, i) => (
              <li key={`${c}-${i}`} className="flex flex-col items-center gap-1">
                <span style={{ backgroundColor: c }} className="h-16 w-16 rounded-2xl border border-black/10" />
                <span className="text-xs tabular-nums text-ink-2">{c}</span>
                <button onClick={() => save({ palette: style.palette.filter((_, j) => j !== i) })} aria-label={`Remove colour ${c}`} className={`flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:text-wine ${FOCUS_RING}`}>
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-ink-2">No palette chosen yet. Pick colours here, or vote on options in Decide Together and apply the winner.</p>
        )}
        <form onSubmit={(e) => { e.preventDefault(); if (!style.palette.includes(colour)) save({ palette: [...style.palette, colour] }); }} className="mt-3 flex items-center gap-3">
          <label htmlFor="pal-colour" className="sr-only">Colour to add</label>
          <input id="pal-colour" type="color" value={colour} onChange={(e) => setColour(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-bg" />
          <button type="submit" className={BTN}><Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />Add colour</button>
        </form>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {LISTS.map((l) => (
          <Chips key={l.key} id={`st-${l.key}`} title={l.title} hint={l.hint} placeholder={l.placeholder} items={style[l.key]} onChange={(next) => save({ [l.key]: next } as Partial<WeddingStyleRow>)} />
        ))}
      </div>

      <section aria-labelledby="sn-h" className="mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h3 id="sn-h" className="font-serif text-2xl font-light">Notes</h3>
        <label htmlFor="sn" className="sr-only">Style notes</label>
        <textarea id="sn" rows={3} defaultValue={style.notes} onBlur={(e) => e.target.value !== style.notes && save({ notes: e.target.value })} placeholder="Anything a vendor should know about the look" className={`${FIELD} mt-2`} />
      </section>
    </div>
  );
}
