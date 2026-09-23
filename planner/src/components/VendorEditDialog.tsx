"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import VendorPhotos from "@/components/VendorPhotos";
import { BTN, Field, FIELD, FOCUS_RING, Section } from "@/components/VendorUi";
import type { IdeaImage } from "@/lib/registry";
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_ORDER,
  COMMUNICATION_LABELS,
  COMMUNICATION_ORDER,
  DECISION_LABELS,
  DECISION_ORDER,
  fmtMoney,
  isBooked,
  PRICE_UNIT_LABELS,
  PRICE_UNIT_ORDER,
  REACTION_EMOJI,
  REACTION_LABELS,
  REACTION_ORDER,
  VENDOR_CATEGORIES,
  WORKS_WITH_VENUE_LABELS,
  WORKS_WITH_VENUE_ORDER,
  type Availability,
  type CommunicationStatus,
  type DecisionStatus,
  type PriceSource,
  type PriceUnit,
  type Reaction,
  type Vendor,
  type WorksWithVenue,
} from "@/lib/vendors";

type Save = { now: (patch: Partial<Vendor>) => void; later: (patch: Partial<Vendor>) => void };
const num = (v: string) => (v === "" ? null : +v);

function ReactionPicker({ label, value, onChange }: { label: string; value: Reaction | null; onChange: (r: Reaction | null) => void }) {
  return (
    <div role="group" aria-label={label} className="mt-1 flex gap-1">
      {REACTION_ORDER.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(value === r ? null : r)}
          aria-pressed={value === r}
          aria-label={`${label}: ${REACTION_LABELS[r]}`}
          title={REACTION_LABELS[r]}
          className={`flex h-11 w-11 items-center justify-center rounded-full border text-base ${FOCUS_RING} ${value === r ? "border-sage-deep bg-[color-mix(in_srgb,var(--sage)_28%,var(--paper))]" : "border-line bg-bg hover:border-sage-deep"}`}
        >
          {REACTION_EMOJI[r]}
        </button>
      ))}
    </div>
  );
}

// The full form: every field a vendor has. Changes save as you type. Prices are entered on the Pricing tab so their history is kept.
export default function VendorEditDialog({ vendor: v, ideas, save, onPhotos, onClose, onUnbook, onPrice }: { vendor: Vendor; ideas: IdeaImage[]; save: Save; onPhotos: (p: string[]) => void; onClose: () => void; onUnbook: () => void; onPrice: (source: PriceSource, amount: number, note?: string) => void }) {
  const dialogRef = useDialog(true, onClose);
  const booked = isBooked(v);
  const text = (key: keyof Vendor, props: { type?: string; placeholder?: string } = {}) => (
    <input type={props.type} defaultValue={(v[key] as string | null) ?? ""} placeholder={props.placeholder} onChange={(e) => save.later({ [key]: e.target.value } as Partial<Vendor>)} className={FIELD} />
  );
  const area = (key: keyof Vendor, rows = 3) => <textarea defaultValue={(v[key] as string) ?? ""} rows={rows} onChange={(e) => save.later({ [key]: e.target.value } as Partial<Vendor>)} className={FIELD} />;
  const number = (key: keyof Vendor) => <input type="number" min={0} defaultValue={(v[key] as number | null) ?? ""} onChange={(e) => save.later({ [key]: num(e.target.value) } as Partial<Vendor>)} className={FIELD} />;
  // A price typed here is saved on the vendor and, when you leave the box, also lands in the dated price history.
  const atFocus = useRef<Record<string, number | null>>({});
  const changed = (key: string, n: number | null) => n != null && n !== (atFocus.current[key] ?? null);
  const price = (key: "starting_price" | "quoted_total" | "contracted_total", source: PriceSource) => (
    <input
      type="number"
      min={0}
      defaultValue={(v[key] as number | null) ?? ""}
      onFocus={() => { atFocus.current[key] = (v[key] as number | null) ?? null; }}
      onChange={(e) => save.later({ [key]: num(e.target.value) } as Partial<Vendor>)}
      onBlur={(e) => changed(key, num(e.target.value)) && onPrice(source, num(e.target.value) as number)}
      className={FIELD}
    />
  );
  const estimate = (key: "price_low" | "price_high") => (
    <input
      type="number"
      min={0}
      defaultValue={(v[key] as number | null) ?? ""}
      onFocus={() => { atFocus.current[key] = (v[key] as number | null) ?? null; }}
      onChange={(e) => save.later({ [key]: num(e.target.value) } as Partial<Vendor>)}
      onBlur={(e) => {
        const n = num(e.target.value);
        if (!changed(key, n)) return;
        const other = (key === "price_low" ? v.price_high : v.price_low) ?? null;
        const lo = key === "price_low" ? (n as number) : other ?? (n as number);
        const hi = key === "price_high" ? (n as number) : other ?? (n as number);
        onPrice(v.estimate_source, Math.max(lo, hi), lo !== hi ? `Range ${fmtMoney(Math.min(lo, hi))}–${fmtMoney(Math.max(lo, hi))}` : undefined);
      }}
      className={FIELD}
    />
  );
  const check = (key: keyof Vendor, label: string) => (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" checked={Boolean(v[key])} onChange={(e) => save.now({ [key]: e.target.checked } as Partial<Vendor>)} className="h-4 w-4 accent-sage-deep" />
      {label}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Edit ${v.name}`} tabIndex={-1} className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-paper shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-2">Edit details</p>
            <p className="truncate font-serif text-xl">{v.name}</p>
          </div>
          <button onClick={onClose} className={`${BTN} shrink-0`}>Done</button>
          <button onClick={onClose} aria-label="Close" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-bg ${FOCUS_RING}`}><X className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
        </div>
        <p className="border-b border-line bg-bg px-5 py-2 text-xs text-ink-2">Changes save as you type. Estimates, quotes and contract totals live on the Pricing tab, which keeps the history.</p>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <Section title="Basics">
            <Field label="Name">{text("name")}</Field>
            <Field label="Category">
              <select value={v.category} onChange={(e) => save.now({ category: e.target.value })} className={FIELD}>
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Style in a few words" span2>{text("tagline", { placeholder: "e.g. Colourful garden-style florals" })}</Field>
            <Field label="Contact person">{text("contact_name")}</Field>
            <Field label="Website">{text("website", { placeholder: "https://…" })}</Field>
            <Field label="Email">{text("email", { type: "email" })}</Field>
            <Field label="Phone">{text("phone", { type: "tel" })}</Field>
            <Field label="Instagram / social">{text("social")}</Field>
            <Field label="Where we found them">{text("source", { placeholder: "Google, Instagram, referral, wedding show…" })}</Field>
          </Section>

          <Section title="Photos">
            <VendorPhotos vendorId={v.id} photos={v.photos} ideas={ideas} onChange={onPhotos} />
          </Section>

          <Section title="Location & availability">
            <Field label="City">{text("city")}</Field>
            <Field label="Address">{text("address")}</Field>
            <Field label="Distance from venue (km)">{number("distance_km")}</Field>
            <Field label="Travel radius">{text("travel_radius", { placeholder: "e.g. 50 km" })}</Field>
            {check("travel_included", "Travel included")}
            <span />
            <Field label="Our wedding date">
              <select value={v.availability} onChange={(e) => save.now({ availability: e.target.value as Availability })} className={FIELD}>
                {AVAILABILITY_ORDER.map((a) => (
                  <option key={a} value={a}>{AVAILABILITY_LABELS[a]}</option>
                ))}
              </select>
            </Field>
            <Field label="They answered on">
              <input type="date" defaultValue={v.availability_response_date ?? ""} onChange={(e) => save.later({ availability_response_date: e.target.value || null })} className={FIELD} />
            </Field>
            {!booked && (
              <Field label="Works with our venue?">
                <select value={v.works_with_venue} onChange={(e) => save.now({ works_with_venue: e.target.value as WorksWithVenue })} className={FIELD}>
                  {WORKS_WITH_VENUE_ORDER.map((w) => (
                    <option key={w} value={w}>{WORKS_WITH_VENUE_LABELS[w]}</option>
                  ))}
                </select>
              </Field>
            )}
          </Section>

          <Section title="What Budget and scenarios use">
            <p className="text-sm text-ink-2 sm:col-span-2">The most reliable price wins: contracted, then a quote, then an estimate, then the starting price. Anything left blank is unknown, never $0. Each price you enter is also kept in the price history on the Pricing tab.</p>
            <Field label="Estimated, from ($)">{estimate("price_low")}</Field>
            <Field label="Estimated, up to ($)">{estimate("price_high")}</Field>
            <Field label="Starting at ($)">{price("starting_price", "starting_price")}</Field>
            <Field label="Quoted ($)">{price("quoted_total", "quote")}</Field>
            <Field label="Contracted ($)">{price("contracted_total", "contracted")}</Field>
          </Section>

          <Section title="How they price">
            <Field label="Pricing method">
              <select value={v.price_unit} onChange={(e) => save.now({ price_unit: e.target.value as PriceUnit })} className={FIELD}>
                {PRICE_UNIT_ORDER.map((u) => (
                  <option key={u} value={u}>{PRICE_UNIT_LABELS[u]}</option>
                ))}
              </select>
            </Field>
            <Field label="Service charge %">{number("service_charge_pct")}</Field>
            <Field label="Travel fee">{number("travel_fee")}</Field>
            <Field label="Deposit amount">{number("deposit_amount")}</Field>
            <Field label="Deposit terms" span2>{text("deposit_required", { placeholder: "e.g. 30% at booking, balance 2 weeks before" })}</Field>
            <Field label="Required minimum spend">{number("minimum_spend")}</Field>
            {check("tax_included", "Taxes are included in their price")}
          </Section>

          <Section title="Services">
            <Field label="Packages / services" span2>{area("package_details", 2)}</Field>
            <Field label="What's included">{area("whats_included", 3)}</Field>
            <Field label="Add-ons">{area("add_ons", 3)}</Field>
            <Field label="Exclusions">{area("exclusions", 3)}</Field>
            <Field label="Important restrictions">{area("restrictions", 3)}</Field>
            <Field label="Setup">{area("setup_notes", 2)}</Field>
            <Field label="Teardown">{area("teardown_notes", 2)}</Field>
          </Section>

          <Section title="What we think">
            <Field label="Ariel"><ReactionPicker label="Ariel" value={v.ariel_reaction} onChange={(r) => save.now({ ariel_reaction: r })} /></Field>
            <Field label="Fred"><ReactionPicker label="Fred" value={v.fred_reaction} onChange={(r) => save.now({ fred_reaction: r })} /></Field>
            <Field label="Why we like them">{area("pros", 3)}</Field>
            <Field label="What we're unsure about">{area("concerns", 3)}</Field>
          </Section>

          {booked ? (
            <Section title="Wedding day">
              <Field label="Primary contact">{text("contact_name")}</Field>
              <Field label="Arrival time">{text("arrival_time", { placeholder: "e.g. 1:30 pm" })}</Field>
              <Field label="Day-of notes" span2>{area("day_of_notes", 3)}</Field>
              <div className="sm:col-span-2">
                <button type="button" onClick={onUnbook} className="text-sm font-semibold text-wine underline underline-offset-2">Move back to potential vendors</button>
              </div>
            </Section>
          ) : (
            <Section title="Where they stand">
              <Field label="Decision">
                <select value={v.decision_status} onChange={(e) => save.now({ decision_status: e.target.value as DecisionStatus })} className={FIELD}>
                  {DECISION_ORDER.map((d) => (
                    <option key={d} value={d}>{DECISION_LABELS[d]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Conversation">
                <select value={v.communication_status} onChange={(e) => save.now({ communication_status: e.target.value as CommunicationStatus })} className={FIELD}>
                  {COMMUNICATION_ORDER.map((s) => (
                    <option key={s} value={s}>{COMMUNICATION_LABELS[s]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Quote expires">
                <input type="date" defaultValue={v.quote_expiry ?? ""} onChange={(e) => save.later({ quote_expiry: e.target.value || null })} className={FIELD} />
              </Field>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
