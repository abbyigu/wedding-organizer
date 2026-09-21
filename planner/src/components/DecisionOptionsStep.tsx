"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, GripVertical, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { fmt } from "@/lib/venues";
import { HEX, OPTION_INTRO, OPTION_TIPS, OPTION_TYPES, relevantIdeas, type DecisionOption, type GenericDecision, type IdeaRef, type OptionType, type VendorRef, type VenueRef } from "@/lib/decisions";

const FIELD = "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sage-deep";
const ICON_BTN = "flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep";

function IdeaPicker({ ideas, relevant, onPick, onLink, onClose }: { ideas: IdeaRef[]; relevant: IdeaRef[]; onPick: (i: IdeaRef) => void; onLink: (url: string) => void; onClose: () => void }) {
  const ref = useDialog(true, onClose);
  const [url, setUrl] = useState("");
  const rest = ideas.filter((i) => i.image_url && !relevant.some((r) => r.id === i.id));
  const tile = (i: IdeaRef) => (
    <li key={i.id}>
      <button onClick={() => onPick(i)} className="block w-full overflow-hidden rounded-xl border border-line text-left hover:border-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={i.image_url} alt={i.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
        <span className="block truncate px-2 py-1.5 text-xs font-semibold">{i.title}</span>
      </button>
    </li>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Choose from Inspiration" tabIndex={-1} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-light">Choose from your Inspiration Board</h2>
          <button onClick={onClose} aria-label="Close" className={ICON_BTN}><X className="h-4 w-4" aria-hidden /></button>
        </div>
        <p className="mt-1 text-sm text-ink-2">The option points at the saved idea. Nothing is copied.</p>
        {relevant.length > 0 && <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-2">Suggested for this decision</h3>}
        <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{relevant.map(tile)}</ul>
        {rest.length > 0 && <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-2">All saved ideas</h3>}
        <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{rest.map(tile)}</ul>
        {ideas.every((i) => !i.image_url) && <p className="mt-4 text-sm text-ink-2">No saved ideas with images yet. Add some on the Inspiration Board, or paste an image link below.</p>}
        <form
          className="mt-5 flex gap-2 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) onLink(url.trim());
          }}
        >
          <input aria-label="Image link" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Or paste an image link…" className={FIELD} />
          <button className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-bg">Use link</button>
        </form>
      </div>
    </div>
  );
}

function Swatches({ option, onChange }: { option: DecisionOption; onChange: (s: string[]) => void }) {
  const list = option.swatches ?? [];
  const [sel, setSel] = useState<number | null>(null);
  const cur = sel != null && sel < list.length ? sel : null;
  const set = (i: number, hex: string) => onChange(list.map((c, j) => (j === i ? hex : c)));
  const move = (i: number, to: number) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
    setSel(to);
  };
  return (
    <div>
      <ul className="flex flex-wrap items-center gap-2" aria-label="Colours">
        {list.map((hex, i) => (
          <li key={`${i}-${hex}`}>
            <button onClick={() => setSel(cur === i ? null : i)} aria-label={`Colour ${hex}, edit`} aria-pressed={cur === i} className={`h-10 w-10 rounded-full border border-line shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 ${cur === i ? "ring-2 ring-wine ring-offset-2" : ""}`} style={{ backgroundColor: hex }} />
          </li>
        ))}
        {list.length < 8 && (
          <li>
            <button
              onClick={() => {
                onChange([...list, "#d9cbb4"]);
                setSel(list.length);
              }}
              aria-label="Add a colour"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-ink-2 text-ink-2 hover:border-sage-deep hover:text-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </li>
        )}
      </ul>
      {cur != null && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-bg p-2">
          <input type="color" aria-label="Pick a colour" value={list[cur]} onChange={(e) => set(cur, e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-paper p-1" />
          <input aria-label="Hex colour" key={list[cur]} defaultValue={list[cur]} onChange={(e) => HEX.test(e.target.value) && set(cur, e.target.value.toLowerCase())} maxLength={7} className={`${FIELD} w-28 font-mono`} />
          <button onClick={() => move(cur, cur - 1)} disabled={cur === 0} aria-label="Move colour earlier" className={`${ICON_BTN} disabled:opacity-30`}>←</button>
          <button onClick={() => move(cur, cur + 1)} disabled={cur === list.length - 1} aria-label="Move colour later" className={`${ICON_BTN} disabled:opacity-30`}>→</button>
          <button onClick={() => { onChange(list.filter((_, j) => j !== cur)); setSel(null); }} aria-label="Remove colour" className={`${ICON_BTN} hover:text-wine`}><Trash2 className="h-4 w-4" aria-hidden /></button>
        </div>
      )}
    </div>
  );
}

export default function DecisionOptionsStep({
  decision,
  type,
  options,
  ideas,
  venueRefs,
  vendorRefs,
  saved,
  onSetType,
  onAdd,
  onUpdate,
  onRemove,
  onDuplicate,
  onReorder,
  onBack,
  onNext,
}: {
  decision: GenericDecision;
  type: OptionType;
  options: DecisionOption[];
  ideas: IdeaRef[];
  venueRefs: VenueRef[];
  vendorRefs: VendorRef[];
  saved: string;
  onSetType: (t: OptionType) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<DecisionOption>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const relevant = relevantIdeas(decision, type, ideas);
  const tips = OPTION_TIPS[type];

  function move(id: string, to: number) {
    const ids = options.map((o) => o.id);
    const from = ids.indexOf(id);
    if (from < 0 || to < 0 || to >= ids.length) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
    setLive(`${options[from].label} moved to position ${to + 1} of ${ids.length}`);
  }

  const imageOf = (o: DecisionOption) => ideas.find((i) => i.id === o.idea_id)?.image_url || o.image_url;
  const visual = type === "visual" || type === "palette";

  function card(o: DecisionOption, index: number) {
    const src = imageOf(o);
    const venue = venueRefs.find((v) => v.id === o.venue_id);
    const vendor = vendorRefs.find((v) => v.id === o.vendor_id);
    const taken = new Set(options.filter((x) => x.id !== o.id).map((x) => (type === "venue" ? x.venue_id : x.vendor_id)));
    return (
      <li
        key={o.id}
        onDragOver={(e) => dragId && e.preventDefault()}
        onDrop={() => {
          if (dragId && dragId !== o.id) move(dragId, index);
          setDragId(null);
        }}
        className={`flex gap-3 rounded-2xl border bg-bg/60 p-3 sm:gap-4 ${dragId === o.id ? "border-wine opacity-60" : "border-line"}`}
      >
        <button
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setDragImage(e.currentTarget.closest("li")!, 20, 20);
            setDragId(o.id);
          }}
          onDragEnd={() => setDragId(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); move(o.id, index - 1); }
            if (e.key === "ArrowDown") { e.preventDefault(); move(o.id, index + 1); }
          }}
          aria-label={`Reorder ${o.label}. Use the up and down arrow keys.`}
          className="flex w-6 shrink-0 cursor-grab items-center justify-center self-stretch rounded-lg text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>

        {visual && (
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-[color-mix(in_srgb,var(--sage)_18%,var(--paper))] sm:h-32 sm:w-40">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" className="h-full w-full object-cover" />
            ) : null}
            <button onClick={() => setPicker(o.id)} className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 rounded-full bg-paper/95 px-2 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-paper">
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />{src ? "Change" : "Add photo"}
            </button>
            {src && <button onClick={() => onUpdate(o.id, { idea_id: null, image_url: "" })} aria-label="Remove image" className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-paper/95 text-ink shadow-sm"><X className="h-3.5 w-3.5" aria-hidden /></button>}
          </div>
        )}

        {(type === "venue" || type === "vendor") && (
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-[color-mix(in_srgb,var(--sage)_18%,var(--paper))] sm:h-32 sm:w-40">
            {(venue?.cover || vendor?.cover) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(venue?.cover || vendor?.cover) as string} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {type === "venue" || type === "vendor" ? (
            <>
              <div className="flex items-start gap-2">
                <select
                  aria-label={type === "venue" ? "Venue" : "Vendor"}
                  value={(type === "venue" ? o.venue_id : o.vendor_id) ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    const name = type === "venue" ? venueRefs.find((v) => v.id === id)?.name : vendorRefs.find((v) => v.id === id)?.name;
                    onUpdate(o.id, type === "venue" ? { venue_id: id, label: name ?? "New option" } : { vendor_id: id, label: name ?? "New option" });
                  }}
                  className={`${FIELD} font-semibold`}
                >
                  <option value="">{type === "venue" ? "Choose a venue…" : "Choose a vendor…"}</option>
                  {(type === "venue" ? venueRefs : vendorRefs).filter((r) => !taken.has(r.id)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <RowActions onDuplicate={() => onDuplicate(o.id)} onRemove={() => onRemove(o.id)} label={o.label} />
              </div>
              {venue && (
                <dl className="mt-2 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2 text-ink-2">{[venue.location, venue.capacity && `Capacity ${venue.capacity}`].filter(Boolean).join(" · ") || "No location yet"}</div>
                  <div><dt className="inline text-ink-2">If we choose it: </dt><dd className="inline font-semibold">{venue.incomplete ? "≥ " : ""}{fmt(venue.total)}</dd></div>
                  <div><dt className="inline text-ink-2">Research: </dt><dd className="inline font-semibold">{venue.research}%</dd></div>
                  <div className="sm:col-span-2"><Link href={`/venues/${venue.id}`} className="inline-flex items-center gap-1 rounded font-semibold text-green underline-offset-2 hover:underline">View venue <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></div>
                </dl>
              )}
              {vendor && (
                <dl className="mt-2 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2 text-ink-2">{vendor.category}</div>
                  <div><dt className="inline text-ink-2">Quote: </dt><dd className="inline font-semibold">{vendor.quote}</dd></div>
                  <div><dt className="inline text-ink-2">Availability: </dt><dd className="inline font-semibold capitalize">{vendor.availability}</dd></div>
                  <div><dt className="inline text-ink-2">Status: </dt><dd className="inline font-semibold">{vendor.stage}</dd></div>
                  <div><Link href="/vendors" className="inline-flex items-center gap-1 rounded font-semibold text-green underline-offset-2 hover:underline">View vendor <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></div>
                </dl>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2">
              <input aria-label="Option name" value={o.label} onChange={(e) => onUpdate(o.id, { label: e.target.value })} className={`${FIELD} font-semibold`} />
              <RowActions onDuplicate={() => onDuplicate(o.id)} onRemove={() => onRemove(o.id)} label={o.label} />
            </div>
          )}
          {type === "palette" && <div className="mt-3"><Swatches option={o} onChange={(s) => onUpdate(o.id, { swatches: s })} /></div>}
          <textarea aria-label="Notes" value={o.notes} onChange={(e) => onUpdate(o.id, { notes: e.target.value })} placeholder="Notes (optional)" rows={2} className={`${FIELD} mt-3`} />
        </div>
      </li>
    );
  }

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6" aria-label="Options">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-medium">What are the options?</h2>
            <p className="text-sm text-ink-2">{OPTION_INTRO[type]}</p>
          </div>
          <span role="status" className="text-xs text-ink-2">{saved}</span>
        </div>
        <div role="group" aria-label="Option style" className="mt-4 flex flex-wrap gap-2">
          {OPTION_TYPES.map((t) => (
            <button key={t.key} aria-pressed={type === t.key} onClick={() => onSetType(t.key)} className={`rounded-full border px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep ${type === t.key ? "border-wine/40 bg-[color-mix(in_srgb,var(--surface-blush)_25%,var(--paper))]" : "border-line hover:bg-bg"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <ul className="mt-5 flex flex-col gap-3">{options.map(card)}</ul>
        <p className="sr-only" aria-live="polite">{live}</p>

        <button onClick={onAdd} className="mt-3 flex w-full items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-4 text-sm font-semibold text-ink-2 hover:border-sage-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep">
          <Plus className="h-4 w-4" aria-hidden /> Add an option
        </button>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={onBack} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:bg-bg">← Back</button>
          <button onClick={onNext} className="rounded-full bg-surface-wine px-5 py-2.5 text-sm font-semibold text-white">Continue to private vote →</button>
        </div>
      </section>

      <aside className="flex flex-col gap-6">
        <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm" aria-label="Need inspiration">
          <h2 className="font-serif text-xl font-medium">Need inspiration?</h2>
          <p className="text-sm text-ink-2">Ideas from your Inspiration Board</p>
          {relevant.length > 0 ? (
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {relevant.map((i) => (
                <li key={i.id} className="overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image_url} alt={i.title} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-2">Nothing saved yet that fits. Ideas you save on the Inspiration Board will show up here.</p>
          )}
          <Link href="/ideas" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:bg-bg">Browse more inspiration <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
        </section>

        {tips && (
          <section className="relative overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_20%,var(--paper))] p-5" aria-label="Tips">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/botanical-accent.webp" alt="" aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-20 w-auto rotate-12 opacity-40" />
            <h2 className="relative font-serif text-xl font-medium">Tips</h2>
            <ul className="relative mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink">{tips.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="relative mt-4 -rotate-2 font-script text-2xl leading-tight text-ink-2">There&apos;s no wrong choice,<br />only your perfect mix ♡</p>
          </section>
        )}
      </aside>

      {picker && (
        <IdeaPicker
          ideas={ideas}
          relevant={relevant}
          onClose={() => setPicker(null)}
          onPick={(i) => {
            onUpdate(picker, { idea_id: i.id, image_url: "" });
            setPicker(null);
          }}
          onLink={(url) => {
            onUpdate(picker, { idea_id: null, image_url: url });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function RowActions({ onDuplicate, onRemove, label }: { onDuplicate: () => void; onRemove: () => void; label: string }) {
  return (
    <div className="flex shrink-0">
      <button onClick={onDuplicate} aria-label={`Duplicate ${label}`} className={ICON_BTN}><Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
      <button onClick={onRemove} aria-label={`Remove ${label}`} className={`${ICON_BTN} hover:text-wine`}><Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
    </div>
  );
}
